from typing import Dict, Any, Optional, List
from .attention_agent import AttentionAgent
from .learning_agent import LearningCoachAgent
from .quiz_agent import QuizAgent
from .summary_agent import SocraticSummaryAgent

try:
    from .security import (
        check_sql_injection,
        check_prompt_injection,
        check_student_distress,
        check_topic_boundary,
        get_safe_rejection_response,
        get_prompt_injection_rejection,
        get_distress_intervention_response,
        get_topic_boundary_rejection
    )
except ImportError:
    try:
        from security import (
            check_sql_injection,
            check_prompt_injection,
            check_student_distress,
            check_topic_boundary,
            get_safe_rejection_response,
            get_prompt_injection_rejection,
            get_distress_intervention_response,
            get_topic_boundary_rejection
        )
    except ImportError:
        from backend.agents.security import (
            check_sql_injection,
            check_prompt_injection,
            check_student_distress,
            check_topic_boundary,
            get_safe_rejection_response,
            get_prompt_injection_rejection,
            get_distress_intervention_response,
            get_topic_boundary_rejection
        )

try:
    from ..rag_service import SharedRAGService
except Exception:
    try:
        from rag_service import SharedRAGService
    except Exception:
        from backend.rag_service import SharedRAGService  

try:
    from ..services.observability import traceable_agent
except Exception:
    traceable_agent = lambda *a, **k: (lambda f: f)


class OrchestratorAgent:
    """
    Central Orchestrator for the Attocus Learning Platform.
    
    Coordinates:
    - SharedRAGService: Shared Firestore vector search and PDF chunk embeddings.
    - AttentionAgent: Monitors tab switching and CV distraction.
    - LearningCoachAgent: Handles explanations, difficulty interventions, and performance analysis.
    - QuizAgent: Generates and grades retention quizzes grounded in RAG.
    - SocraticSummaryAgent: Guides multi-turn dialogue to compile student-centered summaries.
    """

    def __init__(self, api_key: Optional[str] = None, firestore_db = None, rag = None):
        self.api_key = api_key
        self.rag = rag or SharedRAGService(openai_api_key=api_key)
        self.db = firestore_db or self.rag.db
        
        # Instantiate sub-agents with Shared RAG
        self.attention_agent = AttentionAgent(api_key=api_key)
        self.learning_agent = LearningCoachAgent(api_key=api_key, firestore_db=self.db, rag=self.rag)
        self.quiz_agent = QuizAgent(api_key=api_key, rag=self.rag)
        
        # Session state store: session_id -> state dict
        self.sessions: Dict[str, Dict[str, Any]] = {}

    def get_or_create_session(self, session_id: str, topic: str = "General Study") -> Dict[str, Any]:
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "session_id": session_id,
                "topic": topic,
                "summary_agent": SocraticSummaryAgent(topic=topic, api_key=self.api_key, rag=self.rag),
                "quiz_history": [],
                "attention_log": [],
                "declined_interventions": set()
            }
        return self.sessions[session_id]

    @traceable_agent(name="OrchestratorAgent.evaluate_telemetry", run_type="chain")
    def evaluate_telemetry(self, session_id: str, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Receives real-time telemetry from the browser frontend.
        Decides whether to trigger an agent intervention.
        """
        session = self.get_or_create_session(session_id, topic=telemetry.get("slide_title", "Lecture"))
        
        # Extract telemetry fields
        tab_switches_count = telemetry.get("tab_switches_count", 0)
        last_away_seconds = telemetry.get("last_away_duration_seconds", 0.0)
        total_away_seconds = telemetry.get("total_away_seconds", 0.0)
        time_on_slide = telemetry.get("time_spent_seconds", 0)
        expected_seconds = telemetry.get("expected_seconds", 90)
        time_since_interaction = telemetry.get("time_since_interaction", 0)
        cv_data = telemetry.get("cv_data", None)
        slide_number = telemetry.get("slide_number", 1)
        current_topic = telemetry.get("slide_title", "Current Topic")
        language = telemetry.get("language", "ar")

        # -------------------------------------------------------------
        # 1. PRIORITY 1: ATTENTION CHECK (Distraction, Sleeping, Tab Drift)
        # -------------------------------------------------------------
        attention_eval = self.attention_agent.evaluate_attention(
            tab_switches_count=tab_switches_count,
            last_away_duration_seconds=last_away_seconds,
            total_away_seconds=total_away_seconds,
            time_since_interaction=time_since_interaction,
            cv_data=cv_data,
            current_topic=current_topic,
            language=language
        )

        if attention_eval.get("should_alert"):
            return {
                "intervention_type": "attention",
                "alert_kind": attention_eval.get("alert_type"),
                "urgency": attention_eval.get("urgency"),
                "recommended_action": attention_eval.get("recommended_action"),
                "message": attention_eval.get("coach_nudge"),
                "data": attention_eval
            }

        # -------------------------------------------------------------
        # 2. PRIORITY 2: STUCK / LEARNING INTERVENTION
        # -------------------------------------------------------------
        # If student spent more than 1.6x expected time on slide without advancing
        overrun_ratio = (time_on_slide / expected_seconds) if expected_seconds > 0 else 1.0
        if overrun_ratio >= 1.6 and slide_number not in session["declined_interventions"]:
            session["declined_interventions"].add(slide_number)
            msg = (
                f"شريحة '{current_topic}' مليئة بالمعلومات المهمة. هل تود أن أشرح لك الفكرة الأساسية أو أختبر فهمك بسؤال سريع؟"
                if language == "ar"
                else f"Slide '{current_topic}' has heavy concepts. Would you like a 2-sentence breakdown or a quick self-check?"
            )
            return {
                "intervention_type": "learning_nudge",
                "alert_kind": "stuck_card",
                "urgency": "low",
                "recommended_action": "offer_explain_or_quiz",
                "message": msg,
                "data": {
                    "slide_number": slide_number,
                    "topic": current_topic
                }
            }

        # No intervention required right now
        return {
            "intervention_type": "none",
            "alert_kind": "none",
            "urgency": "none",
            "message": None,
            "data": None
        }

    # -------------------------------------------------------------
    # Agent Action Handlers
    # -------------------------------------------------------------
    def ingest_pdf(self, file_input: Any, pdf_name: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Ingests a PDF lecture into the shared RAG vector store in Firestore."""
        return self.rag.ingest_pdf(file_input=file_input, pdf_name=pdf_name, session_id=session_id)

    def retrieve_context(self, query: str, k: int = 5, pdf_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves top-k relevant lecture chunks using Shared RAG."""
        if check_sql_injection(query) or check_prompt_injection(query):
            return []
        return self.rag.retrieve_context(query=query, k=k, pdf_name=pdf_name)

    def get_rag_status(self) -> Dict[str, Any]:
        """Returns the status and health of the Shared RAG service."""
        return self.rag.get_status()

    def run_quiz(
        self,
        context: Any = None,
        num_questions: int = 4,
        topic: Optional[str] = None,
        pdf_name: Optional[str] = None,
        language: str = "ar",
        previous_questions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Triggers the Quiz Agent using explicit context or Shared RAG with anti-duplication."""
        has_prompt_attack = (topic and check_prompt_injection(topic)) or (isinstance(context, str) and check_prompt_injection(context))
        has_sql_attack = (topic and check_sql_injection(topic)) or (isinstance(context, str) and check_sql_injection(context))

        if has_prompt_attack or has_sql_attack:
            return {
                "questions": [],
                "total_questions": 0,
                "error": get_prompt_injection_rejection(language) if has_prompt_attack else get_safe_rejection_response(language)
            }
        return self.quiz_agent.generate_quiz(
            context=context,
            num_questions=num_questions,
            topic=topic,
            pdf_name=pdf_name,
            language=language,
            previous_questions=previous_questions
        )

    def grade_quiz_and_coach(
        self,
        session_id: str,
        student_answers: list,
        student_id: str = "STU_101",
        language: str = "ar"
    ) -> Dict[str, Any]:
        """Grades the quiz, runs learning coach analysis, and saves missed concepts to 3-day spaced repetition."""
        grade_result = self.quiz_agent.grade_quiz(student_answers)
        
        # Analyze with Learning Coach in target language
        coach_analysis = self.learning_agent.analyze_quiz_results(
            grade_result.get("results", []),
            language=language
        )
        
        # Save to Spaced Repetition scheduled for 3 days later
        saved = self.learning_agent.save_spaced_repetition(
            grade_result.get("results", []),
            student_id=student_id,
            days_interval=3
        )
        
        session = self.get_or_create_session(session_id)
        session["quiz_history"].append({
            "grade": grade_result,
            "analysis": coach_analysis,
            "spaced_repetition_saved": saved
        })

        return {
            "grade": grade_result,
            "coach_analysis": coach_analysis,
            "spaced_repetition_scheduled_in_days": 3
        }

    def explain_slide(
        self,
        topic: str,
        slide_content: str,
        student_question: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        language: str = "ar"
    ) -> str:
        """Triggers the Learning Coach explanation with multi-layer guardrails."""
        if student_question:
            if check_sql_injection(student_question):
                return get_safe_rejection_response(language)
            if check_prompt_injection(student_question):
                return get_prompt_injection_rejection(language)
            if check_student_distress(student_question):
                return get_distress_intervention_response(language)
            if check_topic_boundary(student_question):
                return get_topic_boundary_rejection(topic, language)
        return self.learning_agent.explain_concept(
            topic=topic,
            slide_content=slide_content,
            student_question=student_question,
            chat_history=chat_history,
            language=language
        )

    def extract_takeaways(
        self,
        slide_title: str,
        slide_text: str,
        topic: str = "",
        language: str = "ar"
    ) -> Dict[str, Any]:
        """Extracts exam-critical core takeaways from a slide using LLM."""
        return self.learning_agent.extract_takeaways(
            slide_title=slide_title,
            slide_text=slide_text,
            topic=topic,
            language=language
        )

    def get_spaced_repetition_due(self, student_id: str = "STU_101") -> List[Dict[str, Any]]:
        """Retrieves questions currently due for spaced repetition review."""
        return self.learning_agent.get_due_reviews(student_id=student_id)

    def get_spaced_repetition_queue(self, student_id: str = "STU_101") -> List[Dict[str, Any]]:
        """Retrieves all scheduled spaced repetition questions with time remaining."""
        return self.learning_agent.get_all_scheduled_reviews(student_id=student_id)

    def mark_spaced_repetition_result(self, item_id: str, is_correct: bool) -> bool:
        """Updates spaced repetition status for a question."""
        return self.learning_agent.mark_review_completed(item_id=item_id, is_correct=is_correct)

    def start_summary(self, session_id: str, topic: str, context: str = "", language: str = "ar") -> str:
        """Starts Socratic Summary session with Shared RAG and extracts slide axes."""
        session = self.get_or_create_session(session_id, topic=topic)
        session["summary_agent"] = SocraticSummaryAgent(
            topic=topic,
            api_key=self.api_key,
            rag=self.rag,
            language=language
        )
        first_reply = session["summary_agent"].start_session(initial_context=context)
        session["slide_axes"] = session["summary_agent"].slide_axes
        session["covered_axes"] = session["summary_agent"].covered_axes
        return first_reply

    def step_summary(self, session_id: str, user_input: str) -> Dict[str, Any]:
        """Steps Socratic Summary dialogue."""
        session = self.get_or_create_session(session_id)
        agent = session.get("summary_agent")
        if not agent:
            return {
                "reply": "No active summary session found.",
                "is_finished": True,
                "final_summary": None,
                "slide_axes": [],
                "covered_axes": [],
                "structured_summary": None
            }

        if check_sql_injection(user_input):
            lang = getattr(agent, "session_language", getattr(agent, "language", "ar"))
            return {
                "reply": get_safe_rejection_response(lang),
                "is_finished": False,
                "final_summary": None,
                "slide_axes": getattr(agent, "slide_axes", []),
                "covered_axes": getattr(agent, "covered_axes", []),
                "structured_summary": None
            }

        reply, is_finished = agent.process_input(user_input)
        session["slide_axes"] = agent.slide_axes
        session["covered_axes"] = agent.covered_axes
        return {
            "reply": reply,
            "is_finished": is_finished,
            "final_summary": agent.final_summary if is_finished else None,
            "slide_axes": agent.slide_axes,
            "covered_axes": agent.covered_axes,
            "structured_summary": getattr(agent, "structured_summary", None)
        }

    def force_summary(self, session_id: str) -> str:
        """Forces immediate summary generation."""
        session = self.get_or_create_session(session_id)
        agent = session.get("summary_agent")
        if not agent:
            return "No active summary session found."
        res = agent.force_summary()
        session["slide_axes"] = agent.slide_axes
        session["covered_axes"] = agent.covered_axes
        return res
