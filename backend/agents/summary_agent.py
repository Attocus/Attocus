import os
import re
import json
import logging
from typing import Optional, List, Dict, Any, Tuple
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
    from agents.security import (
        check_sql_injection,
        check_prompt_injection,
        check_student_distress,
        check_topic_boundary,
        get_safe_rejection_response,
        get_prompt_injection_rejection,
        get_distress_intervention_response,
        get_topic_boundary_rejection,
    )
except ImportError:
    try:
        from backend.agents.security import (
            check_sql_injection,
            check_prompt_injection,
            check_student_distress,
            check_topic_boundary,
            get_safe_rejection_response,
            get_prompt_injection_rejection,
            get_distress_intervention_response,
            get_topic_boundary_rejection,
        )
    except ImportError:
        from security import (
            check_sql_injection,
            check_prompt_injection,
            check_student_distress,
            check_topic_boundary,
            get_safe_rejection_response,
            get_prompt_injection_rejection,
            get_distress_intervention_response,
            get_topic_boundary_rejection,
        )


class SocraticSummaryAgent:
    MAX_ANSWER_CHARS = 500 

    def __init__(
        self,
        topic: str,
        api_key: Optional[str] = None,
        max_turns: int = 5,
        rag: Optional[Any] = None,
        language: str = "ar",
        model: Optional[str] = None
    ):
        api_key_to_use = api_key or os.environ.get("OPENAI_API_KEY") or "sk-dummy"
        self.client = wrap_client(OpenAI(api_key=api_key_to_use))
        self.topic = topic
        self.rag = rag
        self.context = ""
        self.turn_count = 0
        self.max_turns = max_turns
        self.student_answers: List[str] = []
        self.finished = False
        self.final_summary: Optional[str] = None
        self.structured_summary: Optional[Dict[str, Any]] = None
        self.messages: List[Dict[str, Any]] = []
        self.slide_axes: List[str] = []
        self.covered_axes: List[str] = []
        self.current_axis_index: int = 0
        self.language = language
        self.model = model or os.environ.get("SUMMARY_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4o-mini"))

    def _get_system_prompt(self, context: str) -> str:
        axes_section = ""
        if self.slide_axes:
            formatted_axes = "\n".join(f"  {i+1}. {axis}" for i, axis in enumerate(self.slide_axes))
            curr_axis = self.slide_axes[min(self.current_axis_index, len(self.slide_axes) - 1)]
            covered_str = ", ".join(self.covered_axes) if self.covered_axes else ("لا يوجد بعد" if self.language == "ar" else "None yet")
            
            axes_section = f"""

KEY AXES OF THIS TOPIC (المحاور الأساسية للموضوع):
{formatted_axes}

ACTIVE AXIS PROGRESS:
- Target Axis for this turn: "{curr_axis}"
- Covered Axes so far: [{covered_str}]

AXIS-DRIVEN PEDAGOGICAL FLOW:
- In Turn 1: Present the axes briefly to the student as an inspiring study roadmap (1-2 friendly sentences), then ask your first question focusing specifically on the first axis ("{self.slide_axes[0]}").
- Intermediate Turns: Evaluate the student's answer. When they demonstrate understanding of the current axis, celebrate briefly and guide the next question towards the target axis: "{curr_axis}". Ensure balanced coverage across all axes."""

        lang_instruction = "Respond in Arabic." if self.language == "ar" else ("Respond in English." if self.language == "en" else "Match the student's language.")

        return f"""You are 'Attocus', an interactive, patient, and highly intelligent Socratic Study Coach.
Your goal is to help the student summarize a specific academic topic by extracting knowledge from them step-by-step.

SOURCE MATERIAL (Context from Lecture RAG):
{context}
{axes_section}

RULES:
1. Turn 1: Open with a welcoming tone, briefly present the roadmap of key axes, and ask ONE open-ended conceptual question about the first axis. NEVER ask questions about slide numbers, file titles, presentation outlines, or document structure (e.g. NEVER ask "What did you understand about Slide 1?").
2. Turns 2 to {self.max_turns - 1}: Read the student's answer. Compare to the current target axis. If accurate, validate and advance to the next axis. If there is a conceptual gap, ask ONE targeted follow-up question. Never re-ask what they already explained well.
3. Handling "I don't know" / Stuck: If the student says "I don't know" or is stuck, DO NOT give the direct answer. Reassure them, give a small hint or intuitive analogy, and break the target axis into a simpler step.
4. Final Turn: STOP asking. Compile the summary using the STUDENT'S OWN WORDS, correct misconceptions gently, and praise their strengths.

Tone: Friendly, encouraging, academic, sharp Socratic tutor.
Language: {lang_instruction}
IMPORTANT: Ask exactly ONE question at a time."""

    def _generate_response(self) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.messages, 
                temperature=0.7,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                return response.choices[0].message.content or ""
            return ""
        except Exception as e:
            logging.getLogger("SummaryAgent").error(f"Chat completion error: {e}", exc_info=True)
            if self.language == "ar":
                return "عذراً، حدث انقطاع مؤقت في الاتصال بالمعلم الذكي. يمكنك المحاولة مجدداً أو كتابة 'خلاص' للحصول على الملخص النهائي مباشرة."
            else:
                return "Sorry, a temporary connection hiccup occurred. You can try again or type 'finish' to get your summary immediately."

    def extract_slide_axes(self) -> List[str]:
        """
        يستخرج المحاور الأساسية من محتوى الشريحة/المحاضرة
        ويعرضها للطالب كـ roadmap قبل بدء الأسئلة التفاعلية.
        يحتوي على آلية استرداد ذكية وفولباك لضمان عدم إرجاع قائمة فارغة إطلاقاً.
        """
        content_to_analyze = (self.context or "").strip()
        if not content_to_analyze and self.rag:
            try:
                chunks = self.rag.retrieve_context(self.topic, k=4)
                if chunks:
                    content_to_analyze = self.rag.format_context(chunks)
                    self.context = content_to_analyze
            except Exception as rag_err:
                logging.getLogger("SummaryAgent").warning(f"RAG retrieval during axes extraction: {rag_err}")

        if not content_to_analyze:
            content_to_analyze = f"Topic Name: {self.topic}"

        lang_instruction = (
            "Return the axes strictly in Arabic."
            if self.language == "ar"
            else ("Return the axes strictly in English." if self.language == "en" else "Match the language of the source material or student topic.")
        )

        prompt = f"""You are an expert academic content analyzer.

TOPIC: {self.topic}

SOURCE MATERIAL:
{content_to_analyze}

TASK:
Extract 3 to 5 CORE LEARNING AXES (المحاور الأساسية) of this lecture/concept.
Each axis must represent a distinct fundamental concept or mechanism the student needs to master.

RULES:
- Each axis should be a clear, concise phrase (3 to 7 words max).
- Order logically: Foundational definition -> Core mechanism -> Conditions / Applications.
- {lang_instruction}
- Do NOT mention slide numbers, file names, or metadata.
- Return ONLY valid JSON with an "axes" key containing an array of strings.

Example:
{{"axes": ["تعريف الانحدار الخطي والهدف منه", "دالة التكلفة Mean Squared Error", "خوارزمية Gradient Descent وضبط المعاملات", "معدل التعلم وتأثيره على التقارب"]}}
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You extract key learning axes from academic content. Return JSON only with an 'axes' array."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                raw_text = response.choices[0].message.content or "{}"
                clean_json = raw_text.strip()
                if clean_json.startswith("```"):
                    clean_json = re.sub(r"^```[a-zA-Z]*\n?", "", clean_json)
                    clean_json = re.sub(r"\n?```$", "", clean_json).strip()

                result = json.loads(clean_json)
                axes = []
                if isinstance(result, list):
                    axes = [str(x).strip() for x in result if str(x).strip()]
                elif isinstance(result, dict):
                    raw_axes = result.get("axes", result.get("محاور", result.get("points", [])))
                    if isinstance(raw_axes, list):
                        axes = [str(x).strip() for x in raw_axes if str(x).strip()]

                if axes:
                    return axes[:5]
        except Exception as e:
            logging.getLogger("SummaryAgent").error(f"Failed to extract slide axes via LLM: {e}")

        # Intelligent Academic Fallback Axes
        if self.language == "ar":
            return [
                f"المفهوم الجوهري لـ {self.topic}",
                f"المبادئ والآليات الأساسية",
                f"العلاقات والمحددات الرئيسية",
                f"التطبيقات والأثر الأكاديمي"
            ]
        else:
            return [
                f"Core Definition of {self.topic}",
                f"Fundamental Mechanics & Architecture",
                f"Key Relationships & Constraints",
                f"Practical Takeaways & Applications"
            ]

    @traceable_agent(name="SocraticSummaryAgent.start_session", run_type="chain")
    def start_session(self, initial_context: str = "") -> str:
        """
        Starts the session. If initial_context is brief, absent, or contains placeholders, queries Shared RAG.
        Extracts slide axes (المحاور الأساسية) and embeds them into the Socratic flow.
        """
        is_placeholder = False
        if initial_context:
            lower_ctx = initial_context.lower()
            if (
                "visual and conceptual takeaways" in lower_ctx
                or "visual presentation content" in lower_ctx
                or "section notes and key lecture points" in lower_ctx
                or len(initial_context.strip()) < 35
            ):
                is_placeholder = True

        context_to_use = initial_context
        if (not context_to_use or is_placeholder) and self.rag:
            try:
                chunks = self.rag.retrieve_context(self.topic, k=4)
                if chunks:
                    context_to_use = self.rag.format_context(chunks)
            except Exception as rag_err:
                logging.getLogger("SummaryAgent").warning(f"RAG retrieval error: {rag_err}")

        self.context = context_to_use

        # Extract key axes and initialize progress tracking
        self.slide_axes = self.extract_slide_axes()
        self.covered_axes = []
        self.current_axis_index = 0

        self.messages = [
            {"role": "system", "content": self._get_system_prompt(self.context)}
        ]

        agent_reply = self._generate_response()
        self.messages.append({"role": "assistant", "content": agent_reply})
        return agent_reply

    @traceable_agent(name="SocraticSummaryAgent.process_input", run_type="chain")
    def process_input(self, user_input: str, new_context: Optional[str] = None) -> Tuple[str, bool]:
        """
        Processes user input, systematically tracks covered axes, and handles termination.
        """
        if self.finished:
            return self.final_summary or "Session already ended.", True

        # Guardrail 1: SQL Injection Protection
        if check_sql_injection(user_input):
            return get_safe_rejection_response(self.language), False

        # Guardrail 2: Prompt Injection & Jailbreak Defense
        if check_prompt_injection(user_input):
            return get_prompt_injection_rejection(self.language), False

        # Guardrail 3: Student Emotional Distress & Burnout Intervention
        if check_student_distress(user_input):
            return get_distress_intervention_response(self.language), False

        # Guardrail 4: Out-of-Scope / Non-Academic Topic Boundary
        if check_topic_boundary(user_input):
            return get_topic_boundary_rejection(topic=self.topic, language=self.language), False

        if new_context and new_context != self.context:
            self.context = new_context

        cleaned_input = user_input.strip()
        # Store substantive answers for compilation
        if len(cleaned_input.split()) >= 2:
            self.student_answers.append(cleaned_input[:self.MAX_ANSWER_CHARS])

        self.messages.append({"role": "user", "content": user_input})
        self.turn_count += 1

        # Advance axis tracking across turns
        if self.slide_axes:
            curr_idx = min(self.current_axis_index, len(self.slide_axes) - 1)
            curr_axis = self.slide_axes[curr_idx]
            if curr_axis not in self.covered_axes:
                self.covered_axes.append(curr_axis)

            target_idx = int((self.turn_count / max(1, self.max_turns)) * len(self.slide_axes))
            self.current_axis_index = min(target_idx, len(self.slide_axes) - 1)

        # Update system prompt with refreshed axis state
        if self.messages and self.messages[0].get("role") == "system":
            self.messages[0] = {"role": "system", "content": self._get_system_prompt(self.context)}

        # Comprehensive termination triggers (Arabic & English)
        end_signals = [
            "end it", "stop", "quit", "exit", "finish", "done", "summary please", "give me summary",
            "وقف", "خلاص", "انتهي", "انتهيت", "كافي", "يكفي", "خلصت", "لخص لي", "عطني الملخص",
            "لخص", "بس", "تم", "أنهِ الجلسة", "انهي الجلسة", "اعطني الملخص", "كفاية", "ملخص"
        ]
        lower_input = cleaned_input.lower()
        wants_to_end = any(sig in lower_input for sig in end_signals)

        is_finished = (self.turn_count >= self.max_turns) or wants_to_end

        if is_finished:
            reason = "Student requested early summary." if wants_to_end else "Session reached planned max turns."
            return self._generate_final_summary(reason=reason)

        agent_reply = self._generate_response()
        self.messages.append({"role": "assistant", "content": agent_reply})
        return agent_reply, False

    def force_summary(self) -> str:
        """Called when the user presses the 'Give me the summary now' button."""
        if self.finished:
            return self.final_summary or "No summary yet."
        summary, _ = self._generate_final_summary(reason="Student requested summary directly.")
        return summary

    @traceable_agent(name="SocraticSummaryAgent._generate_final_summary", run_type="chain")
    def _generate_final_summary(self, reason: str = "Session ended.") -> tuple[str, bool]:
        """Generate the final summary in a separate, isolated LLM call."""

        if not self.student_answers:
            if self.language == "ar":
                summary = (
                    "📝 ملخصك بأسلوبك الخاص:\n\n"
                    "• لم يتم تسجيل إجابات كافية أثناء هذه الجلسة لصياغة ملخص مخصص.\n\n"
                    "🔍 تصويبات وملاحظات:\n"
                    "- تفاعل مع الأسئلة التفاعلية في الجلسات القادمة لبناء استيعاب راسخ.\n\n"
                    "✨ نقاط قوتك:\n"
                    "- بدأت خطوة المذاكرة واستكشاف محاور الدرس."
                )
            else:
                summary = (
                    "📝 Your Summary in Your Own Words:\n\n"
                    "• No substantive answers were recorded for this concept.\n\n"
                    "🔍 Corrections:\n"
                    "- Please engage with the Socratic questions to build your personalized study synthesis.\n\n"
                    "✨ Your Strengths:\n"
                    "- Session was too short to assess."
                )
            self.finished = True
            self.final_summary = summary
            self.structured_summary = self._parse_or_build_structured_summary(summary)
            return summary, True

        lang_rule = "Respond in Arabic." if self.language == "ar" else ("Respond in English." if self.language == "en" else "Match the student's language.")
        axes_list_str = "\n".join(f"- {ax}" for ax in self.slide_axes) if self.slide_axes else f"- {self.topic}"

        summary_header = "ملخصك بأسلوبك الخاص" if self.language == "ar" else "Your Summary in Your Own Words"
        corrections_header = "التصحيحات" if self.language == "ar" else "Corrections"
        strengths_header = "نقاط قوتك" if self.language == "ar" else "Your Strengths"

        summary_prompt = f"""You are producing a FINAL SUMMARY for a Socratic study session.

TOPIC: {self.topic}

LEARNING AXES:
{axes_list_str}

SOURCE MATERIAL (Context):
{self.context}

REASON FOR ENDING: {reason}

STUDENT'S EXACT ANSWERS (in order, verbatim):
{json.dumps(self.student_answers, ensure_ascii=False, indent=2)}

===============================================================
TASK: Produce the final summary in EXACTLY this format.
===============================================================

{summary_header}:
[Write a structured synthesis composed of 2 to 3 distinct paragraphs separated by blank lines. 
Use ONLY the student's own words, explanations, and phrasings. 
Organize their understanding logically across the covered axes:
Paragraph 1: Core definition and intuitive understanding.
Paragraph 2: Mechanics, relationships, or conditions they discussed.
Paragraph 3 (optional): Main conclusions or significance they identified.
CRITICAL: DO NOT write as a single block or monolithic paragraph. You MUST separate each paragraph with a blank line.]

{corrections_header}:
- [Point 1: Clearly specify any misconception, factual inaccuracy, or omitted nuance identified from their explanations in bullet format starting with - ]
- [Point 2: Additional clarification or critical correction in bullet format starting with - ]
(CRITICAL: The Corrections section MUST be formatted strictly as bullet points starting with `- `, NEVER as a continuous paragraph.)

{strengths_header}:
- [Bullet 1: Specific concepts or nuances the student explained accurately starting with - ]
- [Bullet 2: Clear evidence of solid comprehension shown in their answers starting with - ]
(CRITICAL: The Strengths section MUST be formatted strictly as bullet points starting with `- `.)

===============================================================
CRITICAL RULES:
- {lang_rule}
- "{summary_header}" MUST contain 2 to 3 distinct paragraphs separated by a blank line (NEVER a single paragraph).
- "{corrections_header}" MUST be formatted as bullet points (`- ...`).
- "{strengths_header}" MUST be formatted as bullet points (`- ...`).
- Do NOT invent achievements or claim discussions that did not happen.
- Use ONLY what the student actually articulated in their answers.
- If the student gave minimal input or had no misconceptions, state so clearly in bullet points.
===============================================================
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You produce honest, student-centered summaries for Socratic study sessions."
                    },
                    {"role": "user", "content": summary_prompt},
                ],
                temperature=0.4,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                raw_summary = response.choices[0].message.content or ""
                summary = self._verify_faithfulness(raw_summary, self.context, language=self.language)
            else:
                summary = "Failed to generate summary."
        except Exception as e:
            logging.getLogger("SummaryAgent").error(f"Error generating summary: {e}", exc_info=True)
            summary = f"API Error while generating summary: {str(e)}"

        self.messages.append({"role": "assistant", "content": summary})
        self.finished = True
        self.final_summary = summary
        self.structured_summary = self._parse_or_build_structured_summary(summary)
        return summary, True

    def _verify_faithfulness(
        self,
        summary: str,
        context: str,
        language: str = "ar"
    ) -> str:
        """
        Self-Check Verification (Faithfulness Check Guardrail):
        Validates that factual claims in the generated summary are grounded in the lecture context.
        """
        if not summary or len(summary.strip()) < 50:
            return summary

        verification_prompt = f"""You are a strict Academic Faithfulness Verifier for lecture summaries.
Verify if the candidate summary contains any hallucinated facts not supported by the lecture context.

LECTURE CONTEXT:
{context}

CANDIDATE SUMMARY:
{summary}

Instructions:
1. If the candidate summary is faithful to the lecture context and student answers, return it without change.
2. If the summary introduces factual hallucinations unsupported by context, remove or correct them.
3. Return ONLY the final summary text matching the exact requested format.
"""
        try:
            check_resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a factual verification guardrail for academic summaries."},
                    {"role": "user", "content": verification_prompt}
                ],
                temperature=0.0,
                stream=False
            )
            if isinstance(check_resp, ChatCompletion) and check_resp.choices:
                verified = check_resp.choices[0].message.content or ""
                if verified and len(verified.strip()) > 30:
                    return verified.strip()
        except Exception as err:
            logging.getLogger("SummaryAgent").warning(f"Faithfulness verification skipped: {err}")

        return summary

    def _parse_or_build_structured_summary(self, summary_text: str) -> Dict[str, Any]:
        """
        Parses the Markdown summary text into a structured dictionary for native UI rendering,
        and scores axes coverage.
        """
        paragraphs: List[str] = []
        corrections: List[str] = []
        strengths: List[str] = []

        # Extract sections using robust bilingual regex
        summary_pattern = r"(?:(?:📝\s*)?(?:Your Summary in Your Own Words|ملخصك بأسلوبك(?: الخاص)?|الملخص في كلماتك|الملخص)):\s*\n(.*?)(?=\n(?:[🔍\s]*(?:Corrections|التصويبات|التصحيحات|تصويبات وملاحظات)):|\Z)"
        summary_match = re.search(summary_pattern, summary_text, re.DOTALL | re.IGNORECASE)
        if summary_match:
            raw_paras = summary_match.group(1).strip().split("\n\n")
            paragraphs = [p.strip() for p in raw_paras if p.strip() and not p.strip().startswith("- ")]

        corrections_pattern = r"(?:(?:🔍\s*)?(?:Corrections|التصويبات|التصحيحات|تصويبات وملاحظات)):[\s]*\n(.*?)(?=\n(?:[✨\s]*(?:Your Strengths|نقاط قوتك|نقاط القوة)):|\Z)"
        corrections_match = re.search(corrections_pattern, summary_text, re.DOTALL | re.IGNORECASE)
        if corrections_match:
            lines = corrections_match.group(1).strip().split("\n")
            corrections = [l.strip().lstrip("-*• ").strip() for l in lines if l.strip().startswith(("-", "*", "•"))]

        strengths_pattern = r"(?:(?:✨\s*)?(?:Your Strengths|نقاط قوتك|نقاط القوة)):[\s]*\n(.*?)(?=\Z)"
        strengths_match = re.search(strengths_pattern, summary_text, re.DOTALL | re.IGNORECASE)
        if strengths_match:
            lines = strengths_match.group(1).strip().split("\n")
            strengths = [l.strip().lstrip("-*• ").strip() for l in lines if l.strip().startswith(("-", "*", "•"))]

        # Axes mastery evaluation
        covered_set = set(self.covered_axes)
        axes_mastery = []
        for ax in self.slide_axes:
            is_mastered = ax in covered_set and len(self.student_answers) >= 2
            axes_mastery.append({
                "axis": ax,
                "status": "mastered" if is_mastered else "needs_review",
                "score": 90 if is_mastered else 65
            })

        # Calculate score based on answers count and axes covered
        coverage_ratio = len(self.covered_axes) / max(1, len(self.slide_axes))
        calculated_score = min(98, max(50, int(coverage_ratio * 70 + min(30, len(self.student_answers) * 8))))

        return {
            "topic": self.topic,
            "summary_paragraphs": paragraphs if paragraphs else [summary_text[:300]],
            "corrections": corrections,
            "strengths": strengths,
            "axes_mastery": axes_mastery,
            "overall_score": calculated_score,
            "slide_axes": self.slide_axes,
            "covered_axes": self.covered_axes
        }

    def get_direct_summary(self, language: str = "auto") -> str:
        """
        Produce a direct summary of the TOPIC from the SOURCE MATERIAL.
        Independent of student answers. Auto-pulls from RAG if context is empty.
        """
        if not self.context and self.rag:
            try:
                chunks = self.rag.retrieve_context(self.topic, k=4)
                if chunks:
                    self.context = self.rag.format_context(chunks)
            except Exception as rag_err:
                logging.getLogger("SummaryAgent").warning(f"RAG direct summary error: {rag_err}")

        target_lang = self.language if language == "auto" else language
        lang_instruction = {
            "ar": "Respond in Arabic.",
            "en": "Respond in English.",
        }.get(target_lang, "Match the language of the source material.")

        prompt = f"""You are an expert study coach producing a DIRECT SUMMARY of a topic for a student.

TOPIC: {self.topic}

SOURCE MATERIAL:
{self.context}

===============================================================
TASK:
Write a clear, beautifully structured summary of the topic.
===============================================================

FORMAT:
Overview:
[Write 2 distinct, well-crafted paragraphs separated by a blank line describing the topic, fundamental principles, and essential context. DO NOT merge into a single paragraph.]

Key Points:
- [Point 1: Core mechanism or rule]
- [Point 2: Key relationship or definition]
- [Point 3: Main implication]

Important Details:
- [Point 1: Key formulas, parameters, edge cases, or nuances in bullet format]
- [Point 2: Critical exam or application takeaways]

===============================================================
RULES:
- {lang_instruction}
- Be faithful to the SOURCE MATERIAL. Do not invent facts.
- Overview MUST be at least 2 distinct paragraphs separated by a blank line.
- Key Points and Important Details MUST be formatted as bullet points (`- ...`).
- Keep it concise: aim for 150-300 words.
- Do NOT reference a student, a session, or previous answers.
- Output the summary directly, no preamble.
===============================================================
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You write clean, accurate study summaries from source material.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                raw_direct = response.choices[0].message.content or ""
                return self._verify_faithfulness(raw_direct, self.context, language=target_lang)
            return ""
        except Exception as e:
            logging.getLogger("SummaryAgent").error(f"Error in direct summary: {e}", exc_info=True)
            if self.language == "ar":
                return f"حدث خطأ أثناء إعداد الملخص: {str(e)}"
            return f"API Error while generating direct summary: {str(e)}"
