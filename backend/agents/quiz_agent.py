import os
import re
import json
import logging
from typing import List, Dict, Any, Union, Optional, Set
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


class QuizAgent:
    def __init__(
        self,
        api_key: Optional[str] = None,
        rag: Optional[Any] = None,
        model: Optional[str] = None
    ):
        api_key_to_use = api_key or os.environ.get("OPENAI_API_KEY") or "sk-dummy"
        self.client = wrap_client(OpenAI(api_key=api_key_to_use))
        self.rag = rag
        self.model = model or os.environ.get("QUIZ_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4o-mini"))
        self.history_questions: Set[str] = set()

    @traceable_agent(name="QuizAgent.generate_quiz", run_type="chain")
    def generate_quiz(
        self,
        context: Optional[Union[List[Dict[str, Any]], str]] = None,
        num_questions: int = 4,
        topic: Optional[str] = None,
        pdf_name: Optional[str] = None,
        language: str = "ar",
        previous_questions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a quiz strictly from lecture content, preventing duplicate questions,
        and supporting explicit language selection with resilient fallbacks.
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
            search_query = topic or "lecture key concepts and theorems"
            retrieved = self.rag.retrieve_context(search_query, k=6, pdf_name=pdf_name)
            lecture_context = self.rag.format_context(retrieved) if retrieved else (topic or "Lecture Slides")
        else:
            lecture_context = topic or "General Course Lecture"

        # Combine previous questions from parameters and session history
        all_previous: List[str] = list(self.history_questions)
        if previous_questions:
            for q in previous_questions:
                if q and q.strip() and q not in all_previous:
                    all_previous.append(q.strip())

        avoid_repeats_section = ""
        if all_previous:
            recent_prev = all_previous[-10:]
            formatted_prev = "\n".join(f"- {q}" for q in recent_prev)
            avoid_repeats_section = f"""

PREVIOUSLY ASKED QUESTIONS (DO NOT REPEAT OR REPHRASE THESE):
{formatted_prev}

CRITICAL ANTI-DUPLICATION RULE:
- The student has already answered the questions above.
- You MUST generate entirely NEW, distinct questions covering other aspects, formulas, definitions, edge cases, or implications of the topic.
- Do NOT test the exact same fact with slightly different wording."""

        lang_instruction = (
            "Generate all questions, options, and explanations strictly in Arabic."
            if language == "ar"
            else ("Generate all questions, options, and explanations strictly in English." if language == "en" else "Match the language of the lecture content.")
        )

        prompt = f"""You are an attentive, academic Quiz Agent for the Attocus study platform.

Create a quiz ONLY from the lecture content provided below.

Create exactly {num_questions} questions:
- Balanced mix of True/False and 4-Option Multiple Choice.

Rules:
- {lang_instruction}
- Use ONLY academic knowledge and facts from the provided lecture content.
- NEVER generate questions about slide numbers, file names, lecture titles, or visual layout placeholders.
- Every question must test an actual concept, definition, theorem, mechanism, or fact taught in the lecture.
- Multiple choice questions must have exactly 4 distinct, plausible options.
- The correct answer MUST be an exact match with one of the items in 'options'.
- Include the topic and the source page number (default to 1 if unknown).
- Keep explanations clear, concise, and educational (1-2 sentences).
{avoid_repeats_section}

Return ONLY valid JSON matching this schema:
{{
  "questions": [
    {{
      "id": 1,
      "type": "true_false",
      "question": "Clear conceptual statement...",
      "options": ["صح", "خطأ"] if Arabic else ["True", "False"],
      "answer": "صح",
      "topic": "{topic or 'Key Concept'}",
      "page": 1,
      "explanation": "Brief explanation of why this answer is correct."
    }},
    {{
      "id": 2,
      "type": "multiple_choice",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "topic": "{topic or 'Key Concept'}",
      "page": 1,
      "explanation": "Brief explanation of why this answer is correct."
    }}
  ]
}}

LECTURE CONTENT:
{lecture_context}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You create academic quizzes strictly in JSON format without duplicates."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                raw_content = response.choices[0].message.content or "{}"
                clean_json = raw_content.strip()
                if clean_json.startswith("```"):
                    clean_json = re.sub(r"^```[a-zA-Z]*\n?", "", clean_json)
                    clean_json = re.sub(r"\n?```$", "", clean_json).strip()

                parsed = json.loads(clean_json)
                questions = parsed.get("questions", [])

                # Filter and record questions in anti-duplication history
                validated_questions = []
                for q in questions:
                    q_text = str(q.get("question", "")).strip()
                    if q_text:
                        self.history_questions.add(q_text)
                        validated_questions.append(q)

                if validated_questions:
                    return {
                        "questions": validated_questions,
                        "total_questions": len(validated_questions)
                    }

        except Exception as e:
            logging.getLogger("QuizAgent").error(f"Failed to generate quiz: {e}", exc_info=True)

        # Resilient Fallback Quiz (Guarantees app never receives an empty list)
        return self._generate_fallback_quiz(topic=topic or "المفهوم الأساسي", language=language, num_questions=num_questions)

    def _generate_fallback_quiz(self, topic: str, language: str, num_questions: int) -> Dict[str, Any]:
        """Provides high-quality academic fallback questions when LLM generation fails."""
        if language == "ar":
            fallback_items = [
                {
                    "id": 1,
                    "type": "true_false",
                    "question": f"يعتمد استيعاب {topic} على فهم المبادئ النظرية والتطبيقية المرتبطة به.",
                    "options": ["صح", "خطأ"],
                    "answer": "صح",
                    "topic": topic,
                    "page": 1,
                    "explanation": f"المبادئ الأساسية لـ {topic} تشكل الركيزة لأي تطبيق عملي في المقرر."
                },
                {
                    "id": 2,
                    "type": "multiple_choice",
                    "question": f"ما هو الهدف الأكاديمي الرئيسي عند دراسة موضوع {topic}؟",
                    "options": [
                        "تحليل العلاقات وبناء نموذج فهم شامل للمفهوم",
                        "حفظ الكلمات دون فهم الآليات الداخلية",
                        "تجاهل القيود والشروط الاستثنائية",
                        "الاكتفاء بالعناوين الفرعية فقط"
                    ],
                    "answer": "تحليل العلاقات وبناء نموذج فهم شامل للمفهوم",
                    "topic": topic,
                    "page": 1,
                    "explanation": "الهدف الأساسي هو استيعاب آلية العمل والعلاقات بين مكونات المفهوم."
                },
                {
                    "id": 3,
                    "type": "true_false",
                    "question": f"يمكن تطبيق مفاهيم {topic} في حل المسائل المعقدة دون الحاجة لمراعاة قيود النظام.",
                    "options": ["صح", "خطأ"],
                    "answer": "خطأ",
                    "topic": topic,
                    "page": 1,
                    "explanation": "أي نظام أكاديمي أو تقني يفرض شروطاً وقيوداً محددة يجب أخذها في الاعتبار."
                },
                {
                    "id": 4,
                    "type": "multiple_choice",
                    "question": f"أي مما يلي يمثل أفضل ممارسة عند مراجعة {topic} لترسيخ الفهم؟",
                    "options": [
                        "التلخيص بأسلوب الطالب الذاتي وحل تدريبات تفاعلية",
                        "قراءة السلايدات مرة واحدة على عجل",
                        "تخطي المفاهيم الصعبة",
                        "عدم تصحيح الفجوات المعرفية"
                    ],
                    "answer": "التلخيص بأسلوب الطالب الذاتي وحل تدريبات تفاعلية",
                    "topic": topic,
                    "page": 1,
                    "explanation": "التلخيص الذاتي والتطبيق التفاعلي يرسخان المعلومة في الذاكرة طويلة المدى."
                }
            ]
        else:
            fallback_items = [
                {
                    "id": 1,
                    "type": "true_false",
                    "question": f"Mastering {topic} requires understanding both theoretical foundations and operational mechanics.",
                    "options": ["True", "False"],
                    "answer": "True",
                    "topic": topic,
                    "page": 1,
                    "explanation": f"Core principles of {topic} form the foundation for all practical applications."
                },
                {
                    "id": 2,
                    "type": "multiple_choice",
                    "question": f"What is the primary learning objective when studying {topic}?",
                    "options": [
                        "Analyzing relationships and building a coherent conceptual model",
                        "Memorizing terms without understanding the underlying logic",
                        "Ignoring boundary conditions and assumptions",
                        "Focusing only on high-level titles"
                    ],
                    "answer": "Analyzing relationships and building a coherent conceptual model",
                    "topic": topic,
                    "page": 1,
                    "explanation": "The core goal is conceptual clarity and understanding how components interact."
                },
                {
                    "id": 3,
                    "type": "true_false",
                    "question": f"The principles of {topic} can be applied universally without respecting boundary constraints.",
                    "options": ["True", "False"],
                    "answer": "False",
                    "topic": topic,
                    "page": 1,
                    "explanation": "All academic and technical concepts have specific operational constraints."
                },
                {
                    "id": 4,
                    "type": "multiple_choice",
                    "question": f"Which strategy is most effective for long-term retention of {topic}?",
                    "options": [
                        "Active synthesis in own words and spaced practice",
                        "Passive reading right before the test",
                        "Skipping complex derivations",
                        "Avoiding feedback on mistakes"
                    ],
                    "answer": "Active synthesis in own words and spaced practice",
                    "topic": topic,
                    "page": 1,
                    "explanation": "Active synthesis and spaced testing lock knowledge into durable memory."
                }
            ]

        selected = fallback_items[:min(num_questions, len(fallback_items))]
        for q in selected:
            q_text = str(q.get("question", "")).strip()
            if q_text:
                self.history_questions.add(q_text)

        return {
            "questions": selected,
            "total_questions": len(selected),
            "is_fallback": True
        }

    @staticmethod
    def grade_quiz(student_answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Grades quiz answers with clean normalization.
        """
        results = []
        for item in student_answers:
            student_ans = str(item.get("student_answer", "")).strip().lower()
            correct_ans = str(item.get("correct_answer", "")).strip().lower()

            # Normalize true/false in Arabic and English
            true_set = {"true", "صح", "صواب", "نعم", "yes", "t"}
            false_set = {"false", "خطأ", "خطا", "لا", "no", "f"}
            if student_ans in true_set and correct_ans in true_set:
                is_correct = True
            elif student_ans in false_set and correct_ans in false_set:
                is_correct = True
            else:
                is_correct = (student_ans == correct_ans)

            results.append({
                **item,
                "correct": is_correct
            })

        score = sum(1 for r in results if r["correct"])
        total = len(results)
        percentage = round((score / total) * 100, 1) if total > 0 else 0.0

        return {
            "score": score,
            "total": total,
            "percentage": percentage,
            "results": results
        }
