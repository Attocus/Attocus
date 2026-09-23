import os
import re
import json
import logging
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
        wrap_client = lambda c: c 
        traceable_agent = lambda *a, **k: (lambda f: f)  


class LearningCoachAgent:
    def __init__(
        self,
        api_key: Optional[str] = None,
        firestore_db = None,
        rag = None,
        model: Optional[str] = None
    ):
        api_key_to_use = api_key or os.environ.get("OPENAI_API_KEY") or "sk-dummy"
        self.client = wrap_client(OpenAI(api_key=api_key_to_use))
        self.db = firestore_db
        self.rag = rag
        self.model = model or os.environ.get("COACH_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4o-mini"))
        self.local_storage_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data",
            "spaced_repetition.json"
        )
        self._ensure_storage_ready()

    def _ensure_storage_ready(self):
        """Ensures local storage file exists for offline/local spaced repetition."""
        try:
            os.makedirs(os.path.dirname(self.local_storage_path), exist_ok=True)
            if not os.path.exists(self.local_storage_path):
                with open(self.local_storage_path, "w", encoding="utf-8") as f:
                    json.dump({"reviews": []}, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logging.getLogger("LearningCoach").warning(f"Could not initialize local storage: {e}")

    def analyze_quiz_results(
        self,
        quiz_results: List[Dict[str, Any]],
        language: str = "ar"
    ) -> Dict[str, Any]:
        """
        Analyzes the student's actual quiz results.
        Identifies: strong_topics, weak_topics, topics_to_review, recommendations.
        """
        lang_instruction = (
            "Write the recommendations and coach_encouragement strictly in Arabic."
            if language == "ar"
            else "Write the recommendations and coach_encouragement strictly in English."
        )

        prompt = f"""You are a gentle, supportive, and encouraging Learning Coach Agent for Attocus.

Analyze the student's actual quiz results below:
{json.dumps(quiz_results, indent=2, ensure_ascii=False)}

Tasks:
1. Identify strong topics (topics where questions were answered correctly).
2. Identify weak topics / gaps (topics where mistakes were made).
3. Specify topics that need immediate spaced repetition review.
4. Give 2-3 warm, actionable, concise study recommendations for this student.
5. Provide a personal encouragement message.

Rules:
- {lang_instruction}
- Do NOT repeat generic advice; refer directly to the actual topics tested.

Return ONLY valid JSON with this exact schema:
{{
  "strong_topics": ["topic1", "..."],
  "weak_topics": ["topic2", "..."],
  "topics_to_review": ["topic2", "..."],
  "recommendations": [
    "Actionable tip 1...",
    "Actionable tip 2..."
  ],
  "coach_encouragement": "A warm, personal 1-2 sentence message to the student."
}}
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
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
                raw = response.choices[0].message.content or "{}"
                clean_json = raw.strip()
                if clean_json.startswith("```"):
                    clean_json = re.sub(r"^```[a-zA-Z]*\n?", "", clean_json)
                    clean_json = re.sub(r"\n?```$", "", clean_json).strip()
                return json.loads(clean_json)

        except Exception as e:
            logging.getLogger("LearningCoach").error(f"Error analyzing quiz results: {e}", exc_info=True)

        # Fallback Analysis
        wrong_items = [r for r in quiz_results if not r.get("correct", False)]
        correct_items = [r for r in quiz_results if r.get("correct", False)]
        weak = list(set(r.get("topic", "المفاهيم الصعبة") for r in wrong_items))
        strong = list(set(r.get("topic", "المفاهيم الأساسية") for r in correct_items))

        if language == "ar":
            return {
                "strong_topics": strong if strong else ["المبادئ الأولية للمحاضرة"],
                "weak_topics": weak,
                "topics_to_review": weak,
                "recommendations": [
                    "راجع السلايدات المتعلقة بالمفاهيم التي تعثرت فيها وركز على أسباب الإجابة الصحيحة.",
                    "استخدم ميزة 'اسأل المعلم' لتفكيك أي نقطة غامضة خطوة بخطوة."
                ],
                "coach_encouragement": "أحسنت المحاولة! كل خطأ في الكويز هو فرصة حقيقية لترسيخ الفهم قبل الاختبار النهائي."
            }
        else:
            return {
                "strong_topics": strong if strong else ["Fundamental concepts"],
                "weak_topics": weak,
                "topics_to_review": weak,
                "recommendations": [
                    "Review the slides covering the missed topics, focusing on the underlying mechanics.",
                    "Use the 'Ask Coach' tool to walk through challenging definitions step by step."
                ],
                "coach_encouragement": "Great effort! Each mistake in practice is a stepping stone to mastery on the actual exam."
            }

    @traceable_agent(name="LearningCoachAgent.explain_concept", run_type="chain")
    def explain_concept(
        self,
        topic: str,
        slide_content: str,
        student_question: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        language: str = "ar"
    ) -> str:
        """
        Explains a difficult concept warmly, concisely, and builds upon chat history
        without repeating prior questions or basic introductions.
        """
        user_query = student_question or (
            f"اشرح لي الفكرة المحورية لموضوع {topic} ببساطة وبشكل تطبيقي."
            if language == "ar"
            else f"Can you explain the main idea of {topic} simply with a real-world analogy?"
        )

        rag_context_str = ""
        if self.rag:
            try:
                search_query = f"{topic}: {user_query}"
                chunks = self.rag.retrieve_context(search_query, k=3)
                if chunks:
                    rag_context_str = "\n\nRELEVANT LECTURE CONTEXT (From Shared RAG):\n" + self.rag.format_context(chunks)
            except Exception as rag_err:
                logging.getLogger("LearningCoach").warning(f"RAG retrieval error: {rag_err}")

        # Formulate non-duplication instruction based on previous chat
        history_instruction = ""
        if chat_history and len(chat_history) > 0:
            history_instruction = """
ANTI-REPETITION DIRECTIVE:
- Review the previous turns in the chat history carefully.
- DO NOT re-introduce the concept from scratch or repeat analogies already shared.
- Directly address the student's immediate doubt or next question and build deeper intuition."""

        lang_rule = "Respond in Arabic." if language == "ar" else "Respond in English."

        messages: List[Dict[str, Any]] = [
            {
                "role": "system",
                "content": f"""You are a warm, calm, academic tutor sitting right next to a university student.
Rules:
1. Explain warmly, clearly, and concisely in 2-3 brief, digestible paragraphs.
2. Ground your explanation first in the provided slide notes and lecture RAG context.
3. If citing facts, mention the relevant slide/page number if available.
4. Use a vivid real-world analogy to make abstract mechanisms tangible.
5. Conclude with a quick friendly check: 'هل الفكرة واضحة الآن، أم تحب نأخذ مثالاً إضافياً؟' (or English equivalent).
6. {lang_rule}
{history_instruction}

SLIDE CONTENT:
{slide_content}
{rag_context_str}
"""
            }
        ]

        if chat_history:
            for msg in chat_history[-6:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_query})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.6,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                return response.choices[0].message.content or ""
            return ""
        except Exception as e:
            logging.getLogger("LearningCoach").error(f"Error explaining concept: {e}", exc_info=True)
            if language == "ar":
                return f"أهلاً بك! واجه المعلم مشكلة مؤقتة في الاتصال: {str(e)}. يرجى إعادة إرسال سؤالك."
            return f"Error explaining concept: {str(e)}"

    def extract_takeaways(
        self,
        slide_title: str,
        slide_text: str,
        topic: str = "",
        language: str = "ar"
    ) -> Dict[str, Any]:
        """Analyzes a slide and extracts 2-4 standalone key takeaways in JSON format using LLM."""
        clean_text = re.sub(r'[●•·]', '-', slide_text or '').strip()
        full_slide_str = f"{slide_title or ''} {clean_text}"
        arabic_count = len(re.findall(r'[\u0600-\u06ff]', full_slide_str))
        latin_count = len(re.findall(r'[a-zA-Z]', full_slide_str))
        is_arabic_slide = arabic_count > latin_count

        system_prompt = (
            "You are an elite academic professor and learning coach. "
            "Analyze this academic slide and extract 2 to 4 ultra-concise, high-impact bullet takeaways (رؤوس أقلام مقتضبة).\n"
            "CRITICAL RULES:\n"
            "1. FORMAT AS 'رؤوس أقلام' (BULLET HEADLINES): Strictly 1 brief line per takeaway (maximum 6 to 12 words). "
            "Format as '[Key Concept / Term]: [Brief core definition or rule]'. DO NOT write long paragraphs or sentences.\n"
            f"2. STRICT LANGUAGE MATCHING: {'The slide is in ARABIC: Output in ARABIC ONLY (اللغة العربية - رؤوس أقلام).' if is_arabic_slide else 'The slide is in ENGLISH: Output in ENGLISH ONLY (Crisp English bullet headlines).'}\n"
            "3. Clean out all raw symbols (●, •, numbers).\n"
            "4. Return strictly valid JSON with key 'coreTakeaways' as an array of strings, and 'examRelevanceScore' as an integer (1-5)."
        )

        user_prompt = f"Slide Title: {slide_title}\nTopic: {topic}\nSlide Content:\n{clean_text}\n\nExtract top 2-4 ultra-concise bullet headlines (رؤوس أقلام) in the slide's exact language in JSON."

        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )
            raw = resp.choices[0].message.content or "{}"
            parsed = json.loads(raw)
            if "coreTakeaways" in parsed and isinstance(parsed["coreTakeaways"], list) and len(parsed["coreTakeaways"]) > 0:
                cleaned = [
                    re.sub(r'^[0-9]+[\.\-\)]\s*', '', re.sub(r'^[●•·\-\*]\s*', '', t)).strip()
                    for t in parsed["coreTakeaways"]
                    if len(t.strip()) > 3
                ]
                return {
                    "coreTakeaways": cleaned[:4],
                    "suggestedFocusFormula": parsed.get("suggestedFocusFormula"),
                    "examRelevanceScore": parsed.get("examRelevanceScore", 5)
                }
        except Exception as e:
            logging.getLogger("LearningCoach").warning(f"extract_takeaways LLM error: {e}")

        # Fallback
        lines = [re.sub(r'^[●•·\-\*]\s*', '', l).strip() for l in re.split(r'\n|\.\s+', clean_text) if len(l.strip()) > 15]
        fallback = [l[:70] for l in lines[:3]] if lines else [
            f"المفهوم المحوري: {slide_title}" if is_arabic_slide else f"Core Concept: {slide_title}",
            "الآليات الأساسية: فهم المدخلات والنتائج الرئيسية" if is_arabic_slide else "Key Mechanism: Understand primary inputs and outputs"
        ]
        return {
            "coreTakeaways": fallback,
            "examRelevanceScore": 4
        }

    # =========================================================================
    # Spaced Repetition 
    # =========================================================================

    def save_spaced_repetition(
        self,
        quiz_results: List[Dict[str, Any]],
        student_id: str = "STU_101",
        days_interval: int = 3
    ) -> bool:
        """
        Saves missed/weak questions to Spaced Repetition queue scheduled specifically
        for 3 days later (+days_interval), both to Firestore (if connected) and local JSON.
        """
        now = datetime.now(timezone.utc)
        due_date = now + timedelta(days=days_interval)
        due_iso = due_date.isoformat()

        saved_count = 0
        new_items = []

        for result in quiz_results:
            if not result.get("correct", False):
                item_data = {
                    "id": f"sr_{student_id}_{result.get('question_id', '')}_{int(now.timestamp())}",
                    "student_id": student_id,
                    "question_id": result.get("question_id"),
                    "question": result.get("question"),
                    "topic": result.get("topic", "Core Topic"),
                    "page": result.get("page", 1),
                    "options": result.get("options", []),
                    "correct_answer": result.get("correct_answer"),
                    "created_at": now.isoformat(),
                    "review_date": due_iso,
                    "days_interval": days_interval,
                    "status": "pending",
                    "review_count": 0
                }
                new_items.append(item_data)

        if not new_items:
            return True

        # 1. Save to local storage (Guaranteed persistent on device/server)
        try:
            current_data = {"reviews": []}
            if os.path.exists(self.local_storage_path):
                with open(self.local_storage_path, "r", encoding="utf-8") as f:
                    try:
                        current_data = json.load(f)
                    except Exception:
                        current_data = {"reviews": []}

            current_data.setdefault("reviews", []).extend(new_items)
            with open(self.local_storage_path, "w", encoding="utf-8") as f:
                json.dump(current_data, f, ensure_ascii=False, indent=2)
            saved_count += len(new_items)
        except Exception as e:
            logging.getLogger("LearningCoach").error(f"Local spaced repetition save failed: {e}")

        # 2. Save to Firestore if available
        if self.db:
            try:
                review_collection = self.db.collection("review_questions")
                for item in new_items:
                    review_collection.add(item)
            except Exception as err:
                logging.getLogger("LearningCoach").warning(f"Firestore save error: {err}")

        return saved_count > 0

    def get_due_reviews(self, student_id: str = "STU_101") -> List[Dict[str, Any]]:
        """
        Retrieves all questions that are DUE for spaced repetition review (review_date <= now).
        """
        now = datetime.now(timezone.utc)
        due_items = []

        if os.path.exists(self.local_storage_path):
            try:
                with open(self.local_storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data.get("reviews", []):
                        if item.get("student_id") == student_id and item.get("status") == "pending":
                            due_str = item.get("review_date")
                            if due_str:
                                try:
                                    due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
                                    if due_dt <= now:
                                        due_items.append(item)
                                except Exception:
                                    due_items.append(item)
            except Exception as e:
                logging.getLogger("LearningCoach").error(f"Error reading local reviews: {e}")

        # 2. Query Cloud Firestore if connected
        if self.db:
            try:
                review_coll = self.db.collection("review_questions")
                docs = review_coll.where("student_id", "==", student_id).where("status", "==", "pending").stream()
                for doc in docs:
                    item = doc.to_dict()
                    item["_firestore_id"] = doc.id
                    due_str = item.get("review_date")
                    if due_str:
                        try:
                            due_dt = datetime.fromisoformat(str(due_str).replace("Z", "+00:00"))
                            if due_dt <= now and not any(x.get("id") == item.get("id") for x in due_items):
                                due_items.append(item)
                        except Exception:
                            if not any(x.get("id") == item.get("id") for x in due_items):
                                due_items.append(item)
            except Exception as e:
                logging.getLogger("LearningCoach").warning(f"Firestore get_due_reviews notice: {e}")

        return due_items

    def get_all_scheduled_reviews(self, student_id: str = "STU_101") -> List[Dict[str, Any]]:
        """
        Returns all pending scheduled reviews (both due and upcoming in future days).
        Combines local and Firestore records, calculating days_remaining for each item.
        """
        now = datetime.now(timezone.utc)
        items = []
        seen_ids = set()

        # 1. Read from local storage
        if os.path.exists(self.local_storage_path):
            try:
                with open(self.local_storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data.get("reviews", []):
                        if item.get("student_id") == student_id and item.get("status") == "pending":
                            item_id = item.get("id")
                            if item_id:
                                seen_ids.add(item_id)
                            due_str = item.get("review_date")
                            days_remaining = 0
                            is_due = False
                            if due_str:
                                try:
                                    due_dt = datetime.fromisoformat(due_str.replace("Z", "+00:00"))
                                    diff = (due_dt - now).total_seconds()
                                    days_remaining = max(0, round(diff / 86400, 1))
                                    is_due = (due_dt <= now)
                                except Exception:
                                    pass

                            items.append({
                                **item,
                                "is_due": is_due,
                                "days_remaining": days_remaining
                            })
            except Exception as e:
                logging.getLogger("LearningCoach").error(f"Error fetching local scheduled reviews: {e}")

        # 2. Query Cloud Firestore if connected
        if self.db:
            try:
                review_coll = self.db.collection("review_questions")
                docs = review_coll.where("student_id", "==", student_id).where("status", "==", "pending").stream()
                for doc in docs:
                    item = doc.to_dict()
                    item_id = item.get("id") or doc.id
                    if item_id in seen_ids:
                        continue
                    seen_ids.add(item_id)

                    due_str = item.get("review_date")
                    days_remaining = 0
                    is_due = False
                    if due_str:
                        try:
                            due_dt = datetime.fromisoformat(str(due_str).replace("Z", "+00:00"))
                            diff = (due_dt - now).total_seconds()
                            days_remaining = max(0, round(diff / 86400, 1))
                            is_due = (due_dt <= now)
                        except Exception:
                            pass

                    items.append({
                        **item,
                        "id": item_id,
                        "_firestore_id": doc.id,
                        "is_due": is_due,
                        "days_remaining": days_remaining
                    })
            except Exception as e:
                logging.getLogger("LearningCoach").warning(f"Firestore get_all_scheduled_reviews notice: {e}")

        return items

    def mark_review_completed(self, item_id: str, is_correct: bool) -> bool:
        """
        Marks an item reviewed. If correct, marks as mastered.
        If incorrect, reschedules to next interval (+1 day).
        Updates both local storage and Cloud Firestore.
        """
        now = datetime.now(timezone.utc)
        updated = False

        # 1. Update local storage
        if os.path.exists(self.local_storage_path):
            try:
                with open(self.local_storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                for item in data.get("reviews", []):
                    if item.get("id") == item_id:
                        if is_correct:
                            item["status"] = "mastered"
                            item["review_count"] = item.get("review_count", 0) + 1
                        else:
                            item["status"] = "pending"
                            item["review_date"] = (now + timedelta(days=1)).isoformat()
                            item["days_interval"] = 1
                        updated = True
                        break

                if updated:
                    with open(self.local_storage_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                logging.getLogger("LearningCoach").error(f"Error marking local review completed: {e}")

        # 2. Update Cloud Firestore if connected
        if self.db:
            try:
                review_coll = self.db.collection("review_questions")
                docs = review_coll.where("id", "==", item_id).stream()
                for doc in docs:
                    update_dict: Dict[str, Any] = {
                        "status": "mastered" if is_correct else "pending",
                        "updated_at": now.isoformat()
                    }
                    if not is_correct:
                        update_dict["review_date"] = (now + timedelta(days=1)).isoformat()
                        update_dict["days_interval"] = 1
                    review_coll.document(doc.id).update(update_dict)
                    updated = True
            except Exception as e:
                logging.getLogger("LearningCoach").warning(f"Firestore update review error: {e}")

        return updated
