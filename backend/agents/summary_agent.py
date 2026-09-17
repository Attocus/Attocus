import os
import json
from typing import Optional, List, Dict, Any, Tuple
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


class SocraticSummaryAgent:
    def __init__(self, topic: str, api_key: Optional[str] = None, max_turns: int = 5, rag: Optional[Any] = None):
        self.client = wrap_client(OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY")))
        self.topic = topic
        self.rag = rag
        self.context = ""
        self.turn_count = 0
        self.max_turns = max_turns
        self.student_answers: List[str] = []
        self.finished = False
        self.final_summary: Optional[str] = None
        self.messages: List[Dict[str, Any]] = []

    def _get_system_prompt(self, context: str) -> str:
        return f"""You are 'Attocus', an interactive, patient, and highly intelligent Socratic Study Coach.
Your goal is to help the student summarize a specific academic topic by extracting knowledge from them step-by-step.

SOURCE MATERIAL (Context from Lecture RAG):
{context}

RULES:
1. Turn 1: Ask ONE open-ended question about the core conceptual principle or definition. NEVER ask questions about slide numbers, file titles, presentation outlines, or document structure (e.g. NEVER ask "What did you understand about Slide 1?").
2. Turns 2 to {self.max_turns - 1}: Read the student's answer. Compare to Context. Identify the BIGGEST conceptual gap. Ask ONE targeted follow-up question. Never re-ask what they covered well.
3. Handling "I don't know" / Stuck: If the student says "I don't know" or is stuck, DO NOT give the direct answer. Reassure them, give a small hint or analogy, and break the question into a simpler step.
4. Final Turn: STOP asking. Compile the summary using the STUDENT'S OWN WORDS, correct misconceptions gently, and praise their strengths.

Tone: Friendly, encouraging, academic.
Language: Match the student's language.
IMPORTANT: Ask ONE question at a time."""

    def _generate_response(self) -> str:
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=self.messages, # type: ignore
                temperature=0.7,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                return response.choices[0].message.content or ""
            return ""
        except Exception as e:
            return f"API Error: {str(e)}"

    def start_session(self, initial_context: str = "") -> str:
        """
        Starts the session. If initial_context is brief, absent, or contains placeholders, queries Shared RAG.
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
                print(f"[SummaryAgent] RAG retrieval error: {rag_err}")

        self.context = context_to_use
        self.messages = [
            {"role": "system", "content": self._get_system_prompt(self.context)}
        ]

        agent_reply = self._generate_response()
        self.messages.append({"role": "assistant", "content": agent_reply})
        return agent_reply

    def process_input(self, user_input: str, new_context: Optional[str] = None) -> Tuple[str, bool]:
        """
        Processes user input. The Orchestrator CAN pass new context if the
        student's question/answer triggers a new RAG retrieval.
        """
        if self.finished:
            return self.final_summary or "Session already ended.", True

        if new_context and new_context != self.context:
            self.context = new_context
            self.messages[0] = {"role": "system", "content": self._get_system_prompt(self.context)}

        # Store only substantive answers
        if len(user_input.strip().split()) >= 3:
            self.student_answers.append(user_input)

        self.messages.append({"role": "user", "content": user_input})
        self.turn_count += 1

        # Detect termination signals
        end_signals = ["end it", "stop", "quit", "exit", "finish", "وقف", "خلاص", "انتهي"]
        wants_to_end = any(sig in user_input.lower() for sig in end_signals)

        is_finished = (self.turn_count >= self.max_turns) or wants_to_end

        if is_finished:
            reason = "Student ended session early." if wants_to_end else "Session reached max turns."
            return self._generate_final_summary(reason=reason)

        agent_reply = self._generate_response()
        self.messages.append({"role": "assistant", "content": agent_reply})
        return agent_reply, False

    def force_summary(self) -> str:
        """Called when the user presses the 'Give me the summary now' button."""
        if self.finished:
            return self.final_summary or "No summary yet."
        summary, _ = self._generate_final_summary(reason="Student requested summary.")
        return summary

    def _generate_final_summary(self, reason: str = "Session ended.") -> tuple[str, bool]:
        """Generate the final summary in a separate, isolated LLM call."""

        if not self.student_answers:
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
            return summary, True

        summary_prompt = f"""You are producing a FINAL SUMMARY for a Socratic study session.

TOPIC: {self.topic}

SOURCE MATERIAL (Context):
{self.context}

REASON FOR ENDING: {reason}

STUDENT'S EXACT ANSWERS (in order, verbatim):
{json.dumps(self.student_answers, ensure_ascii=False, indent=2)}

===============================================================
TASK: Produce the final summary in EXACTLY this format.
===============================================================

Your Summary in Your Own Words:
[Write a structured synthesis composed of 2 to 3 distinct paragraphs separated by blank lines. 
Use ONLY the student's own words, explanations, and phrasings. 
Organize their understanding logically:
Paragraph 1: Core definition and intuitive understanding.
Paragraph 2: Mechanics, relationships, or conditions they discussed.
Paragraph 3 (optional): Main conclusions or significance they identified.
CRITICAL: DO NOT write as a single block or monolithic paragraph. You MUST separate each paragraph with a blank line.]

Corrections:
- [Point 1: Clearly specify any misconception, factual inaccuracy, or omitted nuance identified from their explanations in bullet format.]
- [Point 2: Additional clarification or critical correction in bullet format.]
(CRITICAL: The Corrections section MUST be formatted strictly as bullet points starting with `- `, NEVER as a continuous paragraph.)

Your Strengths:
- [Bullet 1: Specific concepts or nuances the student explained accurately.]
- [Bullet 2: Clear evidence of solid comprehension shown in their answers.]
(CRITICAL: The Strengths section MUST be formatted strictly as bullet points starting with `- `.)

===============================================================
CRITICAL RULES:
- Match the student's language (if the student answered in Arabic, respond in Arabic. If English, respond in English).
- "Your Summary in Your Own Words" MUST contain 2 to 3 distinct paragraphs separated by a blank line (NEVER a single paragraph).
- "Corrections" MUST be formatted as bullet points (`- ...`).
- "Your Strengths" MUST be formatted as bullet points (`- ...`).
- Do NOT invent achievements or claim discussions that did not happen.
- Use ONLY what the student actually articulated in their answers.
- If the student gave minimal input or had no misconceptions, state so clearly in bullet points.
===============================================================
"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You produce honest, student-centered summaries for Socratic study sessions."
                    },
                    {"role": "user", "content": summary_prompt},
                ],
                temperature=0.5,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                summary = response.choices[0].message.content or ""
            else:
                summary = "Failed to generate summary."
        except Exception as e:
            summary = f"API Error while generating summary: {str(e)}"

        self.messages.append({"role": "assistant", "content": summary})
        self.finished = True
        self.final_summary = summary
        return summary, True

    def get_direct_summary(self, language: str = "auto") -> str:
        """
        Produce a direct summary of the TOPIC from the SOURCE MATERIAL.
        Independent of student answers.
        """
        lang_instruction = {
            "auto": "Match the language of the source material.",
            "en": "Respond in English.",
            "ar": "Respond in Arabic.",
        }.get(language, "Match the language of the source material.")

        prompt = f"""You are an expert study coach producing a DIRECT SUMMARY
of a topic for a student.

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
                model="gpt-4o-mini",
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
                return response.choices[0].message.content or ""
            return ""
        except Exception as e:
            return f"API Error while generating direct summary: {str(e)}"
