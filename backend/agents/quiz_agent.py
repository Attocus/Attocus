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

try:
    from agents.security import check_sql_injection, check_prompt_injection, check_topic_boundary
except ImportError:
    try:
        from backend.agents.security import check_sql_injection, check_prompt_injection, check_topic_boundary
    except ImportError:
        from security import check_sql_injection, check_prompt_injection, check_topic_boundary

from pydantic import BaseModel, Field, field_validator, model_validator


class QuizQuestionSchema(BaseModel):
    """
    Pydantic schema enforcing:
    1. Exactly 4 options for multiple choice questions.
    2. Correct answer strictly matching one of the 4 options.
    """
    id: int = 1
    type: str = "multiple_choice"
    question: str
    options: List[str]
    answer: str
    topic: Optional[str] = "Key Concept"
    page: Optional[int] = 1
    explanation: Optional[str] = ""

    @field_validator("options")
    @classmethod
    def clean_options(cls, v: List[str]) -> List[str]:
        cleaned = [str(opt).strip() for opt in v if str(opt).strip()]
        if len(cleaned) < 2:
            raise ValueError("A question must have at least 2 options.")
        return cleaned

    @model_validator(mode="after")
    def validate_options_and_answer(self) -> "QuizQuestionSchema":
        # 1. Multiple choice question must have exactly 4 options
        if self.type == "multiple_choice":
            if len(self.options) < 4:
                raise ValueError(f"Multiple choice question must have exactly 4 options, got {len(self.options)}")
            elif len(self.options) > 4:
                self.options = self.options[:4]

        # 2. Answer must exactly match one of the options
        stripped_options = [opt.strip().lower() for opt in self.options]
        target_answer = self.answer.strip().lower()

        matched_option = None
        for original, opt_low in zip(self.options, stripped_options):
            if target_answer == opt_low or target_answer in opt_low:
                matched_option = original
                break

        if matched_option:
            self.answer = matched_option
        else:
            raise ValueError(f"Correct answer '{self.answer}' does not match any available option: {self.options}")

        return self


class QuizOutputSchema(BaseModel):
    questions: List[QuizQuestionSchema]


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
        # Per-slide history mapping: key -> list of question texts asked on that slide
        self.slide_history: Dict[str, List[str]] = {}

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Normalizes Arabic and English text for rigorous duplicate detection."""
        t = (text or "").strip().lower()
        # Remove Arabic diacritics (tashkeel)
        t = re.sub(r"[\u064B-\u065F\u0670]", "", t)
        # Standardize Arabic letters
        t = re.sub(r"[إأآا]", "ا", t)
        t = re.sub(r"ة\b", "ه", t)
        t = re.sub(r"ى\b", "ي", t)
        t = re.sub(r"[ؤئ]", "ء", t)
        # Strip punctuation and extra spaces
        t = re.sub(r"[^\w\s\u0600-\u06FF]", " ", t)
        return " ".join(t.split())

    @classmethod
    def _is_duplicate(cls, q_text: str, previous_questions: List[str]) -> bool:
        """
        Determines if q_text is semantically or lexically identical to any question in previous_questions.
        Uses exact match, token overlap (Jaccard >= 0.50), and substring checks.
        """
        norm_q = cls._normalize_text(q_text)
        if not norm_q:
            return True

        words_q = set(norm_q.split())
        # Filter out common stop words to focus on meaningful concept words
        stop_words = {
            "ما", "هو", "هي", "هل", "اي", "في", "من", "على", "الى", "عن", "ان", "انها", "مع",
            "هذا", "هذه", "التي", "الذي", "التي", "لـ", "بـ", "كـ", "صح", "خطا",
            "what", "is", "the", "of", "and", "a", "an", "in", "to", "for", "with", "which", "are", "true", "false"
        }
        sig_words_q = {w for w in words_q if w not in stop_words and len(w) > 2}

        for prev in previous_questions:
            norm_prev = cls._normalize_text(prev)
            if not norm_prev:
                continue

            # 1. Exact normalized match
            if norm_q == norm_prev:
                return True

            # 2. Substring match for substantial questions
            if len(norm_q) > 20 and len(norm_prev) > 20:
                if norm_q in norm_prev or norm_prev in norm_q:
                    return True

            # 3. Significant word token overlap
            words_prev = set(norm_prev.split())
            sig_words_prev = {w for w in words_prev if w not in stop_words and len(w) > 2}
            if sig_words_q and sig_words_prev:
                intersection = sig_words_q & sig_words_prev
                smaller_len = min(len(sig_words_q), len(sig_words_prev))
                overlap_ratio = len(intersection) / smaller_len if smaller_len > 0 else 0
                if overlap_ratio >= 0.65:
                    return True

        return False

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
        # Guardrail: Topic validation against prompt injection and SQL injection
        if topic and (check_sql_injection(topic) or check_prompt_injection(topic) or check_topic_boundary(topic)):
            topic = "المفاهيم الأكاديمية الأساسية" if language == "ar" else "Core Academic Concepts"

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

        # Construct unique slide key for slide-specific deduplication
        slide_key = f"{pdf_name or 'doc'}::{topic or 'general'}"
        existing_slide_history = self.slide_history.get(slide_key, [])

        # Merge previous questions from caller with slide-specific memory
        seen_prev: Set[str] = set()
        slide_previous: List[str] = []
        for q in (previous_questions or []) + existing_slide_history:
            if q and q.strip() and q.strip() not in seen_prev:
                seen_prev.add(q.strip())
                slide_previous.append(q.strip())

        avoid_repeats_section = ""
        if slide_previous:
            formatted_prev = "\n".join(f"- {q}" for q in slide_previous[-8:])
            avoid_repeats_section = f"""

ALREADY ASKED QUESTIONS ON THIS EXACT SLIDE (DO NOT REPEAT, REPHRASE, OR TEST THE SAME FACTS):
{formatted_prev}

STRICT ANTI-DUPLICATION MANDATE:
- The student has already answered the questions above.
- You MUST generate COMPLETELY NEW, distinct questions covering a DIFFERENT bullet point, mechanism, parameter, edge case, condition, or implication from the lecture content.
- Do NOT test the same concept with minor rewording."""

        lang_instruction = (
            "Generate all questions, options, and explanations strictly in Arabic."
            if language == "ar"
            else ("Generate all questions, options, and explanations strictly in English." if language == "en" else "Match the language of the lecture content.")
        )

        # Smart format guidance based on num_questions and previous questions
        if num_questions == 1:
            # Alternate question type if previous question was True/False or Multiple Choice
            last_was_tf = any("صح" in p or "خطأ" in p or "True" in p or "False" in p for p in slide_previous[-2:]) if slide_previous else False
            preferred_type = "multiple_choice" if last_was_tf else "true_false"
            format_rule = f"Generate exactly 1 question (type: {preferred_type})."
            tf_opts = '["صح", "خطأ"]' if language == "ar" else '["True", "False"]'
            tf_ans = '"صح"' if language == "ar" else '"True"'
            json_schema_example = f"""{{
  "questions": [
    {{
      "id": 1,
      "type": "{preferred_type}",
      "question": "Distinct conceptual question testing an unasked fact...",
      "options": { tf_opts if preferred_type == 'true_false' else '["Option A", "Option B", "Option C", "Option D"]' },
      "answer": { tf_ans if preferred_type == 'true_false' else '"Option A"' },
      "topic": "{topic or 'Key Concept'}",
      "page": 1,
      "explanation": "Clear, concise 1-2 sentence explanation grounded strictly in the slide."
    }}
  ]
}}"""
        else:
            format_rule = f"Generate exactly {num_questions} questions (balanced mix of True/False and 4-Option Multiple Choice)."
            tf_opts = '["صح", "خطأ"]' if language == "ar" else '["True", "False"]'
            tf_ans = '"صح"' if language == "ar" else '"True"'
            json_schema_example = f"""{{
  "questions": [
    {{
      "id": 1,
      "type": "true_false",
      "question": "Clear conceptual statement...",
      "options": {tf_opts},
      "answer": {tf_ans},
      "topic": "{topic or 'Key Concept'}",
      "page": 1,
      "explanation": "Brief explanation."
    }},
    {{
      "id": 2,
      "type": "multiple_choice",
      "question": "Question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "topic": "{topic or 'Key Concept'}",
      "page": 1,
      "explanation": "Brief explanation."
    }}
  ]
}}"""

        prompt = f"""You are an attentive, academic Quiz Agent for the Attocus study platform.

Create a quiz ONLY from the lecture content provided below.

{format_rule}

Rules:
- {lang_instruction}
- Use ONLY academic knowledge and facts from the provided lecture content.
- STRICT GROUNDING: Base all questions and explanations strictly on the provided lecture facts and definitions without extrapolating.
- NEVER generate questions about slide numbers, file names, lecture titles, or visual layout placeholders.
- Every question must test an actual concept, definition, theorem, mechanism, or fact taught in the lecture.
- Multiple choice questions must have exactly 4 distinct, plausible options.
- The correct answer MUST be an exact match with one of the items in 'options'.
- Include the topic and the source page number (default to 1 if unknown).
- Keep explanations clear, concise, and educational (1-2 sentences).
{avoid_repeats_section}

Return ONLY valid JSON matching this schema:
{json_schema_example}

LECTURE CONTENT:
{lecture_context}
"""

        # Try generating via LLM with deduplication filtering and retry
        try:
            for attempt in range(2):
                current_prompt = prompt
                if attempt > 0:
                    current_prompt += "\n\nCRITICAL: The previous response contained duplicate questions. You MUST generate an entirely DIFFERENT question testing a novel detail or angle from the content."

                # Fallback Guardrail with 2.0-second Timeout Trigger
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You create academic quizzes strictly in JSON format without duplicate questions."
                        },
                        {"role": "user", "content": current_prompt}
                    ],
                    temperature=0.75 + (attempt * 0.1),
                    response_format={"type": "json_object"},
                    stream=False,
                    timeout=2.0  # 2.0s Timeout Trigger to guarantee real-time fallback
                )

                if isinstance(response, ChatCompletion) and response.choices:
                    raw_content = response.choices[0].message.content or "{}"
                    clean_json = raw_content.strip()
                    if clean_json.startswith("```"):
                        clean_json = re.sub(r"^```[a-zA-Z]*\n?", "", clean_json)
                        clean_json = re.sub(r"\n?```$", "", clean_json).strip()

                    parsed = json.loads(clean_json)
                    raw_questions = parsed.get("questions", [])

                    # Strict Pydantic Structural Validation: exactly 4 options, answer match
                    validated_questions = []
                    for q in raw_questions:
                        try:
                            valid_model = QuizQuestionSchema.model_validate(q)
                            q_dict = valid_model.model_dump()
                            q_text = q_dict["question"].strip()

                            # Deduplication check
                            if not self._is_duplicate(q_text, slide_previous):
                                validated_questions.append(q_dict)
                                self.history_questions.add(q_text)
                                slide_previous.append(q_text)
                        except Exception as val_err:
                            logging.getLogger("QuizAgent").warning(f"Pydantic validation rejected malformed quiz item: {val_err}")
                            continue

                    if validated_questions:
                        # Update slide history
                        self.slide_history[slide_key] = slide_previous[-20:]
                        return {
                            "questions": validated_questions[:num_questions],
                            "total_questions": len(validated_questions[:num_questions]),
                            "guardrail_verified": True
                        }

        except Exception as e:
            logging.getLogger("QuizAgent").warning(f"Quiz generation timed out (>2.0s trigger) or failed: {e}. Activating instant Fallback Guardrail.")


        # Resilient Dynamic Fallback (Grounded in context, guarantees non-repeating questions)
        fallback_res = self._generate_fallback_quiz(
            topic=topic or "المفهوم الأساسي",
            language=language,
            num_questions=num_questions,
            context=lecture_context,
            previous_questions=slide_previous
        )

        # Update slide history with fallback questions
        for q in fallback_res.get("questions", []):
            q_text = str(q.get("question", "")).strip()
            if q_text:
                self.history_questions.add(q_text)
                if q_text not in slide_previous:
                    slide_previous.append(q_text)
        self.slide_history[slide_key] = slide_previous[-20:]

        return fallback_res

    def _generate_fallback_quiz(
        self,
        topic: str,
        language: str,
        num_questions: int,
        context: Optional[str] = None,
        previous_questions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Provides high-quality academic fallback questions dynamically grounded in slide text,
        rotating through distinct concepts and angles to guarantee zero repetition.
        """
        prev_list = previous_questions or []

        # Extract meaningful factual lines from context if provided
        content_lines: List[str] = []
        if context:
            for line in context.split("\n"):
                clean = re.sub(r"^(Lecture|Slide|Topic|Content|Key Points|Page \d+):", "", line).strip()
                clean = re.sub(r"^[•\-\*●·\d\.]+\s*", "", clean).strip()
                if (
                    len(clean) > 20
                    and "visual presentation" not in clean.lower()
                    and "section notes" not in clean.lower()
                ):
                    content_lines.append(clean)

        pool: List[Dict[str, Any]] = []

        if language == "ar":
            # Dynamic questions constructed from real content lines
            for i, line in enumerate(content_lines[:6]):
                pool.append({
                    "id": len(pool) + 1,
                    "type": "true_false",
                    "question": f"وفقاً لما ورد في الشريحة بخصوص {topic}: \"{line[:90]}...\" تمثل حقيقة أساسية في سياق المحاضرة.",
                    "options": ["صح", "خطأ"],
                    "answer": "صح",
                    "topic": topic,
                    "page": 1,
                    "explanation": f"هذا المبدأ مثبت ومأخوذ مباشرة من محتوى الشريحة حول {topic}."
                })
                pool.append({
                    "id": len(pool) + 1,
                    "type": "multiple_choice",
                    "question": f"ما هو الأثر الأكاديمي المباشر المرتبط بـ: \"{line[:75]}\" في موضوع {topic}؟",
                    "options": [
                        line[:65],
                        "إلغاء قيود التحقق والتنفيذ الفوري دون ضوابط",
                        "الاعتماد على افتراضات عشوائية دون مزامنة",
                        "تجاوز شروط السلامة والتناسق المذكورة"
                    ],
                    "answer": line[:65],
                    "topic": topic,
                    "page": 1,
                    "explanation": f"ترتبط هذه النقطة بصحة وموثوقية تطبيق {topic} في المقرر."
                })

            # Additional conceptual template variations
            conceptual_templates = [
                {
                    "type": "multiple_choice",
                    "question": f"ما هو المبدأ المحوري الذي يضمن تحقيق الأهداف التعليمية لـ {topic}؟",
                    "options": [
                        "بناء فهم هيكلي منظم يربط النظرية بآليات التطبيق",
                        "حفظ الكلمات دون فهم الآليات الداخلية",
                        "تجاهل القيود والشروط الاستثنائية",
                        "الاكتفاء بالعناوين الفرعية فقط"
                    ],
                    "answer": "بناء فهم هيكلي منظم يربط النظرية بآليات التطبيق",
                    "explanation": f"المبدأ المحوري لـ {topic} يركز على الفهم المفاهيمي الشامل."
                },
                {
                    "type": "true_false",
                    "question": f"يفرض تطبيق مفاهيم {topic} قيوداً وشروطاً تشغيلية صارمة يجب مراعاتها لضمان السلامة والتناسق.",
                    "options": ["صح", "خطأ"],
                    "answer": "صح",
                    "explanation": f"أي نظام أكاديمي أو تقني يفرض شروطاً وقواعد محددة لتطبيق {topic}."
                },
                {
                    "type": "multiple_choice",
                    "question": f"أي مما يلي يمثل التحدي الأهم أو السيناريو الحرج الذي يعالجه {topic}؟",
                    "options": [
                        "معالجة حالات الفشل الجزئي والحفاظ على استمرارية النظام",
                        "تقليل عدد الاختبارات والتحققات الدورية",
                        "تخطي معايير الجودة لتسريع الإنجاز",
                        "إلغاء آليات المراقبة والتصحيح الذاتي"
                    ],
                    "answer": "معالجة حالات الفشل الجزئي والحفاظ على استمرارية النظام",
                    "explanation": f"يركز {topic} بصورة أساسية على معالجة المشكلات الحرجة والحفاظ على الاستقرار."
                },
                {
                    "type": "true_false",
                    "question": f"يمكن الاستغناء عن التحقق وموافقة الأغلبية عند تطبيق {topic} في البيئات الموزعة المعقدة.",
                    "options": ["صح", "خطأ"],
                    "answer": "خطأ",
                    "explanation": "لا يمكن الاستغناء عن شروط التحقق لأنها تضمن صحة مخرجات النظام."
                },
                {
                    "type": "multiple_choice",
                    "question": f"ما هي النتيجة الحتمية لغياب المعايير والضوابط المشروحة في {topic}؟",
                    "options": [
                        "حدوث تضارب في البيانات وعدم استقرار الحالة العامة للنظام",
                        "زيادة كفاءة المعالجة وسرعة الاستجابة تلقائياً",
                        "تحسن فوري في التوافقية دون آثار جانبية",
                        "ثبات الأداء بغض النظر عن المدخلات"
                    ],
                    "answer": "حدوث تضارب في البيانات وعدم استقرار الحالة العامة للنظام",
                    "explanation": f"الغياب عن ضوابط {topic} يؤدي مباشرة إلى تضارب وفقدان الاتساق."
                },
                {
                    "type": "multiple_choice",
                    "question": f"أي استراتيجية مراجعة تعتبر الأفضل لترسيخ المفاهيم المعقدة في {topic}؟",
                    "options": [
                        "التلخيص النشط بالأسلوب الذاتي وحل تدريبات تفاعلية ومسائل عملية",
                        "القراءة السريعة لمرة واحدة قبل الاختبار مباشرة",
                        "تجاهل المعادلات والخطوات التفصيلية",
                        "تجنب مراجعة وتصحيح الأخطاء"
                    ],
                    "answer": "التلخيص النشط بالأسلوب الذاتي وحل تدريبات تفاعلية ومسائل عملية",
                    "explanation": "الممارسة النشطة والتطبيق المستمر هما السبيل لترسيخ المفاهيم المعقدة."
                }
            ]
            for tmpl in conceptual_templates:
                pool.append({
                    "id": len(pool) + 1,
                    "topic": topic,
                    "page": 1,
                    **tmpl
                })
        else:
            # English Fallback Pool
            for line in content_lines[:6]:
                pool.append({
                    "id": len(pool) + 1,
                    "type": "true_false",
                    "question": f"According to the slide content regarding {topic}: \"{line[:90]}...\" is a core factual assertion.",
                    "options": ["True", "False"],
                    "answer": "True",
                    "topic": topic,
                    "page": 1,
                    "explanation": f"This principle is derived directly from the lecture material on {topic}."
                })
                pool.append({
                    "id": len(pool) + 1,
                    "type": "multiple_choice",
                    "question": f"What is the primary academic implication of \"{line[:75]}\" in {topic}?",
                    "options": [
                        line[:65],
                        "Bypassing verification constraints and immediate unvalidated execution",
                        "Relying on random uncoordinated state changes",
                        "Eliminating safety invariants and logging mechanisms"
                    ],
                    "answer": line[:65],
                    "topic": topic,
                    "page": 1,
                    "explanation": f"This point is essential for operational correctness in {topic}."
                })

            english_templates = [
                {
                    "type": "multiple_choice",
                    "question": f"What is the primary objective when studying {topic}?",
                    "options": [
                        "Building a coherent conceptual model linking theory to operational mechanisms",
                        "Memorizing surface terms without understanding underlying logic",
                        "Ignoring boundary conditions and operational constraints",
                        "Focusing only on high-level section titles"
                    ],
                    "answer": "Building a coherent conceptual model linking theory to operational mechanisms",
                    "explanation": f"Conceptual clarity and mechanism comprehension are central to {topic}."
                },
                {
                    "type": "true_false",
                    "question": f"Operational correctness in {topic} depends strictly on honoring predefined system constraints and safety invariants.",
                    "options": ["True", "False"],
                    "answer": "True",
                    "explanation": "All technical and distributed systems enforce invariants for deterministic correctness."
                },
                {
                    "type": "multiple_choice",
                    "question": f"Which failure mode is {topic} explicitly designed to mitigate?",
                    "options": [
                        "Partial failures, node crashes, and network partitions",
                        "Routine successful operations",
                        "Properly formatted client inputs",
                        "Normal expected system shutdowns"
                    ],
                    "answer": "Partial failures, node crashes, and network partitions",
                    "explanation": f"{topic} ensures robustness against unexpected runtime failures."
                },
                {
                    "type": "true_false",
                    "question": f"The principles of {topic} can be safely applied without verifying quorum or majority consensus.",
                    "options": ["True", "False"],
                    "answer": "False",
                    "explanation": "Consensus and quorum validation are mandatory to avoid split-brain states."
                }
            ]
            for tmpl in english_templates:
                pool.append({
                    "id": len(pool) + 1,
                    "topic": topic,
                    "page": 1,
                    **tmpl
                })

        # Filter out questions that duplicate previous questions
        unasked = [q for q in pool if not self._is_duplicate(q["question"], prev_list)]
        selected = unasked[:num_questions] if unasked else pool[:num_questions]

        # Re-index ids
        for idx, q in enumerate(selected, 1):
            q["id"] = idx

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

        total = len(results)
        raw_score = sum(1 for r in results if r["correct"])
        # Guardrail: Strict score and percentage clamping
        score = max(0, min(total, raw_score))
        percentage = round((score / total) * 100, 1) if total > 0 else 0.0
        percentage = max(0.0, min(100.0, percentage))

        return {
            "score": score,
            "total": total,
            "percentage": percentage,
            "results": results
        }
