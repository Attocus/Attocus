import os
import json
from typing import List, Dict, Any, Union, Optional
from openai import OpenAI
from openai.types.chat import ChatCompletion

try:
    from services.observability import wrap_client, traceable_agent
except Exception:
    try:
        from backend.services.observability import wrap_client, traceable_agent
    except Exception:
        wrap_client = lambda c: c  # type: ignore
        traceable_agent = lambda *a, **k: (lambda f: f)  # type: ignore


class QuizAgent:
    def __init__(self, api_key: Optional[str] = None, rag: Optional[Any] = None):
        self.client = wrap_client(OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY")))
        self.rag = rag

    @traceable_agent(name="QuizAgent.generate_quiz", run_type="chain")
    def generate_quiz(
        self,
        context: Optional[Union[List[Dict[str, Any]], str]] = None,
        num_questions: int = 4,
        topic: Optional[str] = None,
        pdf_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a quiz strictly from the lecture content provided or retrieved from Shared RAG.
        Can receive either list of {page: int, text: str}, a formatted string, or query RAG.
        """
        is_placeholder = False
        if isinstance(context, str):
            lower_ctx = context.lower()
            if (
                "visual and conceptual takeaways" in lower_ctx
                or "visual presentation content" in lower_ctx
                or "section notes and key lecture points" in lower_ctx
                or len(context.strip()) < 35
            ):
                is_placeholder = True

        if isinstance(context, list):
            lecture_context = "\n\n".join(
                f"Page {item.get('page', 1)}:\n{item.get('text', '')}"
                for item in context
            )
        elif isinstance(context, str) and context.strip() and not is_placeholder:
            lecture_context = context
        elif self.rag:
            # Query Shared RAG for the most relevant lecture content
            search_query = topic or "lecture key concepts and theorems"
            retrieved = self.rag.retrieve_context(search_query, k=6, pdf_name=pdf_name)
            lecture_context = self.rag.format_context(retrieved) if retrieved else (topic or "Lecture Slides")
        else:
            lecture_context = topic or "General Course Lecture"

        prompt = f"""You are an attentive, academic Quiz Agent for the Attocus study platform.

Create a quiz ONLY from the lecture content provided below.

Create exactly {num_questions} questions:
- Balanced mix of True/False and 4-Option Multiple Choice.

Rules:
- Use ONLY academic knowledge and facts from the provided lecture content.
- NEVER generate questions about slide numbers, file names, lecture titles, or visual layout placeholders (e.g. NEVER ask "Does Slide 1 include takeaways?" or "What is the topic of the document?").
- Every question must test an actual concept, definition, theorem, mechanism, or fact taught in the lecture.
- Multiple choice questions must have exactly 4 options.
- Include the topic and the source page number.
- Keep questions clear, student-friendly, and educational.

Return ONLY valid JSON matching this schema:
{{
  "questions": [
    {{
      "id": 1,
      "type": "true_false",
      "question": "Statement...",
      "options": ["True", "False"],
      "answer": "True",
      "topic": "Topic Name",
      "page": 1,
      "explanation": "Brief 1-sentence why this is correct."
    }},
    {{
      "id": 2,
      "type": "multiple_choice",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "topic": "Topic Name",
      "page": 1,
      "explanation": "Brief 1-sentence why this is correct."
    }}
  ]
}}

LECTURE CONTENT:
{lecture_context}
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You create quizzes strictly from lecture content in JSON format."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                content = response.choices[0].message.content or "{}"
                return json.loads(content)
            return {
                "error": "No completion choices returned",
                "questions": []
            }
        except Exception as e:
            return {
                "error": str(e),
                "questions": []
            }

    @staticmethod
    def grade_quiz(student_answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Grades quiz answers:
        student_answers = [
            {
                "question_id": 1,
                "question": "...",
                "topic": "...",
                "page": 1,
                "student_answer": "...",
                "correct_answer": "..."
            }
        ]
        """
        results = []
        for item in student_answers:
            student_ans = str(item.get("student_answer", "")).strip().lower()
            correct_ans = str(item.get("correct_answer", "")).strip().lower()
            is_correct = (student_ans == correct_ans)

            results.append({
                **item,
                "correct": is_correct
            })

        score = sum(1 for r in results if r["correct"])
        total = len(results)

        return {
            "score": score,
            "total": total,
            "percentage": round((score / total * 100), 1) if total > 0 else 0,
            "results": results
        }
