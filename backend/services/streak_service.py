import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("AttocusGamification")
logger.setLevel(logging.INFO)

# Guardrail constants
MAX_POINTS_PER_30_MIN = 20
WINDOW_SECONDS = 1800  # 30 minutes


class StreakAndPointsService:
    """
    Score Clamping & Streak Protection Guardrail:
    Prevents exploitation of gamification by strictly capping point accumulation
    at 20 points per 30-minute sliding window, and accurately managing streaks.
    """

    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data",
            "gamification_state.json"
        )
        self.window_seconds = WINDOW_SECONDS
        self.max_points_per_window = MAX_POINTS_PER_30_MIN
        self._ensure_storage()

    def _ensure_storage(self):
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            if not os.path.exists(self.storage_path):
                with open(self.storage_path, "w", encoding="utf-8") as f:
                    json.dump({"students": {}}, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Could not initialize gamification storage: {e}")

    def _load_data(self) -> Dict[str, Any]:
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Error loading gamification data: {e}")
        return {"students": {}}

    def _save_data(self, data: Dict[str, Any]):
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Error saving gamification data: {e}")

    def record_points(
        self,
        student_id: str,
        requested_points: int,
        reason: str = "Focus Session",
        language: str = "ar"
    ) -> Dict[str, Any]:
        """
        Awards focus/quiz points with Score Clamping Guardrail enforcement:
        Enforces a hard cap of 20 points per 30 minutes window.
        """
        now = time.time()
        data = self._load_data()
        students = data.setdefault("students", {})
        student = students.setdefault(student_id, {
            "total_points": 0,
            "current_streak": 1,
            "longest_streak": 1,
            "last_active_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "history": []
        })

        # 1. Clean history older than 30 minutes
        valid_history = []
        recent_points_sum = 0
        cutoff = now - self.window_seconds

        for event in student.get("history", []):
            if event.get("timestamp", 0) >= cutoff:
                valid_history.append(event)
                recent_points_sum += event.get("points", 0)

        # 2. Score Clamping Guardrail calculation
        remaining_quota = max(0, self.max_points_per_window - recent_points_sum)
        granted_points = min(requested_points, remaining_quota)
        is_clamped = granted_points < requested_points

        if granted_points > 0:
            student["total_points"] = student.get("total_points", 0) + granted_points
            valid_history.append({
                "timestamp": now,
                "date": datetime.now(timezone.utc).isoformat(),
                "points": granted_points,
                "reason": reason
            })

        student["history"] = valid_history
        self._update_streak(student)
        self._save_data(data)

        msg_ar = (
            f"تم احتساب {granted_points} نقطة بنجاح."
            if not is_clamped
            else f"تم منحك {granted_points} نقطة فقط. تم تطبيق سقف حماية النقاط (أقصى حد: 20 نقطة لكل 30 دقيقة)."
        )
        msg_en = (
            f"Successfully awarded {granted_points} points."
            if not is_clamped
            else f"Awarded {granted_points} points. Score clamping guardrail active (Max 20 points per 30 mins)."
        )

        return {
            "student_id": student_id,
            "requested_points": requested_points,
            "granted_points": granted_points,
            "is_clamped": is_clamped,
            "recent_points_in_window": recent_points_sum + granted_points,
            "max_window_capacity": self.max_points_per_window,
            "total_points": student["total_points"],
            "current_streak": student.get("current_streak", 1),
            "longest_streak": student.get("longest_streak", 1),
            "message": msg_ar if language == "ar" else msg_en
        }

    def _update_streak(self, student: Dict[str, Any]):
        """Updates consecutive daily study streak."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        last_date_str = student.get("last_active_date")

        if not last_date_str:
            student["last_active_date"] = today
            student["current_streak"] = 1
            return

        if last_date_str == today:
            return  # Already recorded today

        last_date = datetime.strptime(last_date_str, "%Y-%m-%d").date()
        today_date = datetime.strptime(today, "%Y-%m-%d").date()
        diff = (today_date - last_date).days

        if diff == 1:
            # Consecutive day
            student["current_streak"] = student.get("current_streak", 0) + 1
            student["longest_streak"] = max(student.get("longest_streak", 1), student["current_streak"])
        elif diff > 1:
            # Broken streak unless frozen
            student["current_streak"] = 1

        student["last_active_date"] = today

    def get_student_gamification(self, student_id: str = "STU_101") -> Dict[str, Any]:
        """Returns total points, current streak, and remaining window allowance."""
        now = time.time()
        cutoff = now - self.window_seconds
        data = self._load_data()
        student = data.get("students", {}).get(student_id, {
            "total_points": 0,
            "current_streak": 1,
            "longest_streak": 1,
            "history": []
        })

        recent_points = sum(
            e.get("points", 0) for e in student.get("history", [])
            if e.get("timestamp", 0) >= cutoff
        )

        return {
            "student_id": student_id,
            "total_points": student.get("total_points", 0),
            "current_streak": student.get("current_streak", 1),
            "longest_streak": student.get("longest_streak", 1),
            "points_in_last_30_min": recent_points,
            "remaining_allowance_in_30_min": max(0, self.max_points_per_window - recent_points),
            "max_points_per_30_min": self.max_points_per_window
        }


# Global singleton
streak_service = StreakAndPointsService()
