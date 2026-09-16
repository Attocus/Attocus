import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
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


class LearningCoachAgent:
    def __init__(self, api_key: Optional[str] = None, firestore_db = None, rag = None):
        self.client = wrap_client(OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY")))
        self.db = firestore_db
        self.rag = rag

    def analyze_quiz_results(self, quiz_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes the student's actual quiz results.
        Identifies: strong_topics, weak_topics, topics_to_review, recommendations.
        """
        prompt = f"""You are a gentle, supportive, and encouraging Learning Coach Agent for Attocus.

Analyze the student's actual quiz results below:
{json.dumps(quiz_results, indent=2)}

Tasks:
1. Identify strong topics (topics where questions were answered correctly).
2. Identify weak topics / gaps (topics where mistakes were made).
3. Specify topics that need immediate spaced repetition review.
4. Give 2-3 warm, actionable, concise study recommendations for this student.

Return ONLY valid JSON with this exact schema:
{{
  "strong_topics": ["topic1", "..."],
  "weak_topics": ["topic2", "..."],
  "topics_to_review": ["topic2", "..."],
  "recommendations": [
    "Encouraging tip 1...",
    "Encouraging tip 2..."
  ],
  "coach_encouragement": "A warm, personal 1-2 sentence message to the student."
}}
"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an encouraging Learning Coach analyzing quiz results in JSON."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                content = response.choices[0].message.content or "{}"
                return json.loads(content)
            return {
                "error": "No completion choices returned",
                "strong_topics": [],
                "weak_topics": [],
                "topics_to_review": [],
                "recommendations": []
            }
        except Exception as e:
            return {
                "error": str(e),
                "strong_topics": [],
                "weak_topics": [],
                "topics_to_review": [],
                "recommendations": ["Review the lecture slides and test yourself again soon."]
            }

    @traceable_agent(name="LearningCoachAgent.explain_concept", run_type="chain")
    def explain_concept(
        self,
        topic: str,
        slide_content: str,
        student_question: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Explains a difficult concept warmly and concisely (Socratic/interactive explanation).
        Grounded in both the slide notes and retrieved Shared RAG context.
        """
        user_query = student_question or f"Can you explain the main idea of {topic} simply?"

        rag_context_str = ""
        if self.rag:
            try:
                search_query = f"{topic}: {user_query}"
                chunks = self.rag.retrieve_context(search_query, k=3)
                if chunks:
                    rag_context_str = "\n\nRELEVANT LECTURE CONTEXT (From Shared RAG):\n" + self.rag.format_context(chunks)
            except Exception as rag_err:
                print(f"[LearningCoach] RAG retrieval error: {rag_err}")

        messages: List[Dict[str, Any]] = [
            {
                "role": "system",
                "content": f"""You are a warm, calm, academic tutor sitting right next to a university student.
Rules:
1. Explain warmly, clearly, and concisely in 2-3 brief paragraphs.
2. Ground your explanation first in the provided slide notes and lecture RAG context.
3. If citing facts, mention the relevant slide/page number if available.
4. Use a clear real-world analogy to make abstract concepts click.
5. Conclude with a quick friendly check: 'Does this make sense, or would you like an example?'
6. Match the student's language (Arabic or English).

SLIDE CONTENT:
{slide_content}
{rag_context_str}
"""
            }
        ]

        if chat_history:
            for msg in chat_history[-4:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        user_query = student_question or f"Can you explain the main idea of {topic} simply?"
        messages.append({"role": "user", "content": user_query})

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages, # type: ignore
                temperature=0.6,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                return response.choices[0].message.content or ""
            return ""
        except Exception as e:
            return f"Error explaining concept: {str(e)}"

    def save_spaced_repetition(self, quiz_results: List[Dict[str, Any]], student_id: str = "STU_101"):
        """Saves wrong questions to Firestore for spaced repetition if db is configured."""
        if not self.db:
            return False

        try:
            tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
            review_collection = self.db.collection("review_questions")

            for result in quiz_results:
                if not result.get("correct", False):
                    review_data = {
                        "student_id": student_id,
                        "question_id": result.get("question_id"),
                        "question": result.get("question"),
                        "topic": result.get("topic"),
                        "page": result.get("page"),
                        "correct_answer": result.get("correct_answer"),
                        "review_date": tomorrow,
                        "status": "pending"
                    }
                    review_collection.add(review_data)
            return True
        except Exception as err:
            print(f"Firestore save error: {err}")
            return False
