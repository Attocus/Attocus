import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure backend directory is in python search path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from agents.orchestrator import OrchestratorAgent
except ImportError:
    from backend.agents.orchestrator import OrchestratorAgent

try:
    from services.observability import get_langsmith_status
except Exception:
    try:
        from backend.services.observability import get_langsmith_status
    except Exception:
        get_langsmith_status = lambda: {"langsmith_installed": False}  # type: ignore

try:
    from services.eval_service import eval_service
except Exception:
    try:
        from backend.services.eval_service import eval_service
    except Exception:
        eval_service = None  # type: ignore

try:
    from routers.detection import detection_router
except Exception:
    try:
        from backend.routers.detection import detection_router
    except Exception:
        detection_router = None  # type: ignore



# Load environment variables (.env in backend or root)
load_dotenv()
load_dotenv(dotenv_path="../.env")

app = FastAPI(
    title="Attocus Multi-Agent AI Backend",
    description="Orchestrator, Attention, Learning Coach, Quiz, Socratic Summary Agents, and Shared Firestore RAG",
    version="1.1.0"
)

# Enable CORS for React frontend (localhost:3000, 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the Central Orchestrator with Shared RAG
orchestrator = OrchestratorAgent(api_key=os.environ.get("OPENAI_API_KEY"))

# Include Computer Vision & YOLO Drowsiness/Phone Detection WebSocket
if detection_router:
    app.include_router(detection_router)


# -------------------------------------------------------------
# Pydantic Schemas for Type Safety
# -------------------------------------------------------------
class TelemetryRequest(BaseModel):
    session_id: str
    slide_number: int = 1
    slide_title: str = "Lecture Slide"
    slide_text: str = ""
    time_spent_seconds: float = 0.0
    expected_seconds: float = 90.0
    tab_switches_count: int = 0
    last_away_duration_seconds: float = 0.0
    total_away_seconds: float = 0.0
    time_since_interaction: float = 0.0
    cv_data: Optional[Dict[str, Any]] = None
    language: str = "ar"

class QuizGenerateRequest(BaseModel):
    context: Optional[Any] = None
    num_questions: int = 4
    topic: Optional[str] = None
    pdf_name: Optional[str] = None
    language: Optional[str] = "ar"
    previous_questions: Optional[List[str]] = None

class RAGRetrieveRequest(BaseModel):
    query: str
    k: int = 5
    pdf_name: Optional[str] = None

class QuizSubmitRequest(BaseModel):
    session_id: str
    student_id: str = "STU_101"
    student_answers: List[Dict[str, Any]]
    language: Optional[str] = "ar"

class ExplainRequest(BaseModel):
    topic: str
    slide_content: str
    student_question: Optional[str] = None
    chat_history: Optional[List[Dict[str, str]]] = None
    language: Optional[str] = "ar"

class SpacedRepetitionReviewRequest(BaseModel):
    item_id: str
    is_correct: bool

class SummaryStartRequest(BaseModel):
    session_id: str
    topic: str
    context: str
    language: Optional[str] = "ar"

class SummaryStepRequest(BaseModel):
    session_id: str
    user_input: str

class SummaryForceRequest(BaseModel):
    session_id: str

class EvalValidateRequest(BaseModel):
    input_query: str
    actual_output: str
    retrieval_context: List[str]
    expected_output: Optional[str] = None
    faithfulness_threshold: float = 0.7
    relevancy_threshold: float = 0.7

class TakeawaysRequest(BaseModel):
    slideTitle: Optional[str] = ""
    slideText: Optional[str] = ""
    topic: Optional[str] = ""
    courseSubject: Optional[str] = ""
    language: Optional[str] = "ar"


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@app.get("/health")
def health_check():
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))
    rag_status = orchestrator.get_rag_status()
    obs_status = get_langsmith_status()
    eval_status = eval_service.get_status() if eval_service else {"deepeval_installed": False}
    return {
        "status": "healthy",
        "service": "Attocus Agent Engine with Shared Firestore RAG",
        "has_openai_key": has_openai,
        "rag_status": rag_status,
        "observability": obs_status,
        "evaluation": eval_status
    }

# -------------------------------------------------------------
# Shared RAG & PDF Ingestion Endpoints
# -------------------------------------------------------------
@app.post("/api/rag/upload")
async def upload_pdf_lecture(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form("default")
):
    """
    Uploads a PDF lecture document, extracts pages, chunks text,
    generates OpenAI embeddings, and stores them in Cloud Firestore 'pdf_embeddings'.
    """
    if not file.filename or not (file.filename.lower().endswith(".pdf") or file.filename.lower().endswith(".pptx")):
        raise HTTPException(status_code=400, detail="Only PDF and PPTX files are supported.")
    
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        result = orchestrator.ingest_pdf(
            file_input=content,
            pdf_name=file.filename,
            session_id=session_id
        )
        return result
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to ingest PDF: {str(err)}")

@app.post("/api/rag/retrieve")
def retrieve_rag_context(payload: RAGRetrieveRequest):
    """
    Vector search query against the Shared Firestore RAG.
    Returns nearest chunks and LLM-ready formatted context.
    """
    chunks = orchestrator.retrieve_context(
        query=payload.query,
        k=payload.k,
        pdf_name=payload.pdf_name
    )
    formatted = orchestrator.rag.format_context(chunks)
    return {
        "query": payload.query,
        "k": payload.k,
        "chunks_count": len(chunks),
        "chunks": chunks,
        "formatted_context": formatted
    }

@app.get("/api/rag/status")
def get_rag_status():
    """Returns Firestore connection status and vector storage statistics."""
    return orchestrator.get_rag_status()

@app.post("/api/orchestrator/telemetry")
def process_telemetry(payload: TelemetryRequest):
    """
    Called every few seconds or on key user events (e.g. returning to tab).
    The Orchestrator evaluates attention and slide pacing, and returns whether
    an intervention (Attention Toast, Stuck Card, Quiz Offer) is needed.
    """
    decision = orchestrator.evaluate_telemetry(
        session_id=payload.session_id,
        telemetry=payload.model_dump()
    )
    return decision

@app.post("/api/quiz/generate")
def generate_quiz(payload: QuizGenerateRequest):
    """Generates quiz questions strictly grounded in the slide context or Shared RAG with anti-duplication."""
    quiz_data = orchestrator.run_quiz(
        context=payload.context,
        num_questions=payload.num_questions,
        topic=payload.topic,
        pdf_name=payload.pdf_name,
        language=payload.language or "ar",
        previous_questions=payload.previous_questions
    )
    return quiz_data

@app.post("/api/quiz/submit")
def submit_quiz(payload: QuizSubmitRequest):
    """
    Grades quiz answers, executes the Learning Coach analysis,
    and records spaced repetition review items specifically scheduled for 3 days later.
    """
    results = orchestrator.grade_quiz_and_coach(
        session_id=payload.session_id,
        student_answers=payload.student_answers,
        student_id=payload.student_id,
        language=payload.language or "ar"
    )
    return results

@app.post("/api/learning/explain")
@app.post("/api/coach/explain")
def explain_concept(payload: ExplainRequest):
    """Socratic / tutor explanation for difficult slide concepts without repeating past chat content."""
    explanation = orchestrator.explain_slide(
        topic=payload.topic,
        slide_content=payload.slide_content,
        student_question=payload.student_question,
        chat_history=payload.chat_history,
        language=payload.language or "ar"
    )
    return {"explanation": explanation}

@app.post("/api/coach/takeaways")
def extract_takeaways(payload: TakeawaysRequest):
    """Extracts 2-4 standalone key takeaways from an academic slide using LLM."""
    return orchestrator.extract_takeaways(
        slide_title=payload.slideTitle or "",
        slide_text=payload.slideText or "",
        topic=payload.topic or "",
        language=payload.language or "ar"
    )

@app.get("/api/spaced-repetition/queue")
def get_spaced_repetition_queue(student_id: str = "STU_101"):
    """Returns scheduled questions for spaced repetition with days remaining."""
    queue = orchestrator.get_spaced_repetition_queue(student_id=student_id)
    return {
        "student_id": student_id,
        "queue": queue,
        "total_scheduled": len(queue),
        "due_count": sum(1 for q in queue if q.get("is_due", False))
    }

@app.get("/api/spaced-repetition/due")
def get_spaced_repetition_due(student_id: str = "STU_101"):
    """Returns questions that have reached their scheduled 3-day review date."""
    due_items = orchestrator.get_spaced_repetition_due(student_id=student_id)
    return {
        "student_id": student_id,
        "due_questions": due_items,
        "count": len(due_items)
    }

@app.post("/api/spaced-repetition/review")
def review_spaced_repetition(payload: SpacedRepetitionReviewRequest):
    """Marks a spaced repetition question as reviewed/mastered or rescheduled."""
    success = orchestrator.mark_spaced_repetition_result(
        item_id=payload.item_id,
        is_correct=payload.is_correct
    )
    return {"success": success}

@app.post("/api/summary/start")
def start_summary(payload: SummaryStartRequest):
    """Starts the multi-turn Socratic Summary agent and returns slide axes."""
    first_question = orchestrator.start_summary(
        session_id=payload.session_id,
        topic=payload.topic,
        context=payload.context,
        language=payload.language or "ar"
    )
    session = orchestrator.get_or_create_session(payload.session_id)
    return {
        "reply": first_question,
        "slide_axes": session.get("slide_axes", []),
        "covered_axes": session.get("covered_axes", [])
    }

@app.post("/api/summary/step")
def step_summary(payload: SummaryStepRequest):
    """Continues Socratic summary conversation."""
    step_result = orchestrator.step_summary(
        session_id=payload.session_id,
        user_input=payload.user_input
    )
    return step_result

@app.post("/api/summary/force")
def force_summary(payload: SummaryForceRequest):
    """Forces immediate compilation of the summary and returns slide axes."""
    final_summary = orchestrator.force_summary(session_id=payload.session_id)
    session = orchestrator.get_or_create_session(payload.session_id)
    agent = session.get("summary_agent")
    return {
        "final_summary": final_summary,
        "slide_axes": session.get("slide_axes", []),
        "covered_axes": session.get("covered_axes", []),
        "structured_summary": getattr(agent, "structured_summary", None) if agent else None
    }


# -------------------------------------------------------------
# DeepEval & LangSmith Evaluation & Observability Endpoints
# -------------------------------------------------------------
@app.get("/api/eval/status")
def get_evaluation_status():
    """Returns status of DeepEval and LangSmith services."""
    return {
        "evaluation": eval_service.get_status() if eval_service else {"installed": False},
        "observability": get_langsmith_status()
    }

@app.post("/api/eval/validate-response")
def validate_agent_response(payload: EvalValidateRequest):
    """
    Evaluates an agent's answer against retrieved lecture context using DeepEval metrics:
    - Faithfulness (Hallucination detection)
    - Answer Relevancy
    - Contextual Relevancy
    """
    if not eval_service:
        raise HTTPException(status_code=500, detail="DeepEval evaluation service not initialized.")

    result = eval_service.evaluate_response(
        input_query=payload.input_query,
        actual_output=payload.actual_output,
        retrieval_context=payload.retrieval_context,
        expected_output=payload.expected_output,
        faithfulness_threshold=payload.faithfulness_threshold,
        relevancy_threshold=payload.relevancy_threshold
    )
    return result

@app.get("/api/eval/run-benchmark")
def run_quick_benchmark():
    """
    Runs an automated DeepEval benchmark test on golden lecture samples
    to verify RAG faithfulness and agent relevancy.
    """
    if not eval_service:
        raise HTTPException(status_code=500, detail="DeepEval evaluation service not initialized.")

    sample_context = [
        "Gradient Descent is an optimization algorithm that minimizes the loss function by iteratively moving in the direction of steepest descent.",
        "The learning rate determines the size of the steps taken towards the minimum."
    ]
    sample_question = "What does the learning rate control in Gradient Descent?"
    sample_answer = "The learning rate dictates the step size taken towards the minimum of the loss function during each iteration of Gradient Descent."

    benchmark_result = eval_service.evaluate_response(
        input_query=sample_question,
        actual_output=sample_answer,
        retrieval_context=sample_context,
        expected_output="It controls the size of steps taken towards the loss minimum."
    )
    return {
        "benchmark_name": "RAG_LearningRate_Golden_Sample",
        "result": benchmark_result
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
