import os
from typing import Dict, Any, Optional
from openai import OpenAI
from openai.types.chat import ChatCompletion


class AttentionAgent:
    """
    Attention & Focus Agent for Attocus.
    
    Combines:
    1. Browser Tab Switching (tab away duration, frequency of switching)
    2. Computer Vision / Camera Inputs (phone detection, sleeping, gaze)
    3. User interaction telemetry (time idle without scrolling or notes)
    """

    def __init__(self, api_key: Optional[str] = None):
        self.client = OpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY"))

    def evaluate_attention(
        self,
        tab_switches_count: int,
        last_away_duration_seconds: float,
        total_away_seconds: float,
        time_since_interaction: float = 0,
        cv_data: Optional[Dict[str, Any]] = None,
        current_topic: str = "your lecture",
        language: str = "ar"
    ) -> Dict[str, Any]:
        """
        Evaluates the student's current attention and decides whether to intervene.
        """
        # 1. Check Computer Vision state first (highest priority if camera is on)
        cv_state = (cv_data or {}).get("state", "unknown")
        cv_confidence = (cv_data or {}).get("confidence", 0.0)

        # A: Student sleeping / eyes closed
        if cv_state == "sleeping" and cv_confidence >= 0.6:
            return {
                "state": "sleeping",
                "urgency": "high",
                "should_alert": True,
                "alert_type": "sleeping_modal",
                "recommended_action": "pomodoro_break",
                "coach_nudge": "لاحظت أنك تشعر بالنعاس! 💤 خذ استراحة قصيرة واشرب ماء لتستعيد نشاطك." if language == "ar" 
                               else "You look tired! 💤 Take a 5-minute breather, hydrate, and come back fresh."
            }

        # B: Student using phone
        if cv_state == "using_phone" and cv_confidence >= 0.6:
            return {
                "state": "using_phone",
                "urgency": "medium",
                "should_alert": True,
                "alert_type": "phone_modal",
                "recommended_action": "refocus_nudge",
                "coach_nudge": "خلي الجوال بعيد عنك شوية 📱 وركز على شريحة اليوم لننهي جلستك بإتقان!" if language == "ar"
                               else "Put the phone aside for a moment 📱 Let's wrap up this topic strong!"
            }

        # C: Browser Tab Switching Analysis
        # 1) User was away for a long time (> 40 seconds)
        if last_away_duration_seconds >= 40:
            nudge = self._generate_warm_nudge(
                reason="long_tab_absence",
                topic=current_topic,
                duration=int(last_away_duration_seconds),
                language=language
            )
            return {
                "state": "tab_drift",
                "urgency": "medium",
                "should_alert": True,
                "alert_type": "toast",
                "recommended_action": "refocus_nudge",
                "coach_nudge": nudge
            }

        # 2) User switches tabs frequently (e.g. 4+ switches in current session)
        if tab_switches_count >= 4 and last_away_duration_seconds >= 10:
            return {
                "state": "frequent_switching",
                "urgency": "low",
                "should_alert": True,
                "alert_type": "toast",
                "recommended_action": "quick_quiz",
                "coach_nudge": "يبدو أن تركيزك تشتت بين الصفحات 💡 هل تود تجربة كويز سريع لتنشيط ذهنك؟" if language == "ar"
                               else "Noticing some multitasking 💡 How about a quick 2-minute quiz to test your memory?"
            }

        # D: Idle on slide without interaction (> 90s)
        if time_since_interaction >= 100:
            return {
                "state": "idle",
                "urgency": "low",
                "should_alert": True,
                "alert_type": "toast",
                "recommended_action": "explain_offer",
                "coach_nudge": f"هل الشريحة تحتاج توضيح أكثر؟ اضغط على زر الشرح لمساعدتك في {current_topic}." if language == "ar"
                               else f"Stuck on this slide? Ask Attocus to break down {current_topic} simply."
            }

        # E: Focused / Normal
        return {
            "state": "focused",
            "urgency": "none",
            "should_alert": False,
            "alert_type": "none",
            "recommended_action": "none",
            "coach_nudge": "أداء رائع وتركيز مستمر! 🎯" if language == "ar" else "Great focus, keep going! 🎯"
        }

    def _generate_warm_nudge(self, reason: str, topic: str, duration: int, language: str) -> str:
        """Generates dynamic empathetic coaching nudges."""
        try:
            prompt = f"""You are Attocus, a warm, supportive AI study buddy.
A student switched away from their study tab for {duration} seconds while studying '{topic}'.
Write a super short (1 sentence), kind, encouraging welcoming-back toast message.
Language: {language} (ar for Arabic, en for English).
Do NOT sound like a surveillance monitor or punitive boss. Sound like a caring friend.
"""
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],  # type: ignore
                max_tokens=60,
                temperature=0.7,
                stream=False
            )
            if isinstance(response, ChatCompletion) and response.choices:
                content = response.choices[0].message.content or ""
                if content.strip():
                    return content.strip().replace('"', '')
        except Exception:
            pass

        if language == "ar":
            return f"أهلاً بعودتك! 👋 لنكمل مذاكرة {topic} بكل هدوء وتركيز."
        return f"Welcome back! 👋 Let's dive back into {topic}."
