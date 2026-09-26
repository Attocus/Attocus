"""
Unit Tests for Attocus Multi-Agent System.
Tests:
1. OrchestratorAgent (Prioritized Telemetry Intervention & Routing).
2. QuizAgent (Pydantic Schema, Anti-Duplication, and Automated Grading).
3. SummaryAgent (Axes Extraction & Socratic Dialogue).
4. LearningCoachAgent (Spaced Repetition Scheduling).
5. AttentionAgent (Distraction Matrix & Nudges).
"""

import pytest
from typing import Dict, Any, List
from agents.orchestrator import OrchestratorAgent
from agents.quiz_agent import QuizAgent, QuizQuestionSchema
from agents.summary_agent import SocraticSummaryAgent
from agents.learning_agent import LearningCoachAgent
from agents.attention_agent import AttentionAgent


class TestOrchestratorAgent:
    """Tests central orchestrator prioritization and session management."""

    @pytest.fixture
    def orchestrator(self):
        return OrchestratorAgent(api_key="sk-test-dummy")

    def test_session_creation_and_isolation(self, orchestrator):
        session_a = orchestrator.get_or_create_session("sess_101", topic="Neural Networks")
        session_b = orchestrator.get_or_create_session("sess_102", topic="Operating Systems")

        assert session_a["session_id"] == "sess_101"
        assert session_b["session_id"] == "sess_102"
        assert session_a["topic"] != session_b["topic"]

    def test_prioritizes_attention_over_learning_when_distracted(self, orchestrator):
        """If student is distracted by phone, Attention Agent must alert immediately."""
        telemetry = {
            "slide_title": "Backpropagation",
            "slide_number": 3,
            "time_spent_seconds": 200,
            "expected_seconds": 90,  # Overrun ratio > 1.6
            "cv_data": {
                "state": "using_phone",
                "label": "phone",
                "confidence": 0.88
            }
        }
        intervention = orchestrator.evaluate_telemetry("sess_test", telemetry)
        assert intervention["intervention_type"] == "attention"
        assert intervention["urgency"] in ["medium", "high"]

    def test_triggers_stuck_learning_intervention_when_overrun(self, orchestrator):
        """If student is focused but spent > 1.6x expected time on slide, offer help."""
        telemetry = {
            "slide_title": "Eigenvalues & Eigenvectors",
            "slide_number": 4,
            "time_spent_seconds": 180,
            "expected_seconds": 90,  # Overrun = 2.0x
            "cv_data": {
                "state": "focused",
                "label": "focused",
                "confidence": 0.95
            },
            "language": "ar"
        }
        intervention = orchestrator.evaluate_telemetry("sess_test_stuck", telemetry)
        assert intervention["intervention_type"] == "learning_nudge"
        assert "سؤال" in intervention["message"] or "أشرح" in intervention["message"]

    def test_no_intervention_when_focused_within_normal_time(self, orchestrator):
        telemetry = {
            "slide_title": "Introduction",
            "slide_number": 1,
            "time_spent_seconds": 45,
            "expected_seconds": 90,
            "cv_data": {
                "state": "focused",
                "label": "focused",
                "confidence": 0.95
            }
        }
        intervention = orchestrator.evaluate_telemetry("sess_normal", telemetry)
        assert intervention["intervention_type"] == "none"


class TestQuizAgent:
    """Tests MCQ formatting, Pydantic schema validation, and grading logic."""

    def test_quiz_schema_requires_exactly_four_options(self):
        valid_question = QuizQuestionSchema(
            id=1,
            type="multiple_choice",
            question="What is the time complexity of binary search?",
            options=["O(1)", "O(n)", "O(log n)", "O(n^2)"],
            answer="O(log n)",
            explanation="Binary search divides the search space in half each step.",
            topic="Algorithms",
            page=1
        )
        assert len(valid_question.options) == 4
        assert valid_question.answer in valid_question.options

    def test_quiz_schema_rejects_mismatched_correct_answer(self):
        with pytest.raises(ValueError):
            QuizQuestionSchema(
                id=1,
                type="multiple_choice",
                question="What is 2 + 2?",
                options=["1", "2", "3", "4"],
                answer="5",  # Not in options!
                explanation="2+2 equals 4",
                topic="Math",
                page=1
            )

    def test_anti_duplication_filter(self):
        previous = [
            "What is the definition of supervised learning?",
            "How does gradient descent update model weights?"
        ]
        assert QuizAgent._is_duplicate("What is the definition of supervised learning?", previous) is True
        assert QuizAgent._is_duplicate("Explain how decision trees split features?", previous) is False

    def test_quiz_grading_accuracy_and_scoring(self):
        student_answers = [
            {"student_answer": "O(log n)", "correct_answer": "O(log n)"},
            {"student_answer": "O(1)", "correct_answer": "O(n)"},
            {"student_answer": "4", "correct_answer": "4"},
            {"student_answer": "8", "correct_answer": "8"}
        ]
        results = QuizAgent.grade_quiz(student_answers)
        assert results["total"] == 4
        assert results["score"] == 3
        assert results["percentage"] == 75.0
        assert len(results["results"]) == 4


class TestSummaryAgent:
    """Tests slide axis extraction and structured summary generation."""

    def test_slide_axis_extraction_from_context(self):
        agent = SocraticSummaryAgent(
            topic="Database Systems",
            api_key="sk-test"
        )
        agent.context = (
            "Relational Database Concepts:\n"
            "- Entity Integrity: Primary keys must be unique.\n"
            "- Referential Integrity: Foreign keys must match."
        )
        axes = agent.extract_slide_axes()
        assert len(axes) >= 1
        assert any(len(ax.strip()) > 0 for ax in axes)

    def test_structured_summary_parser(self):
        agent = SocraticSummaryAgent(topic="Algorithms", api_key="sk-test")
        sample_markdown = (
            "📝 ملخصك بأسلوبك:\n"
            "خوارزمية الترتيب السريع تعتمد على مبدأ فرق تسد.\n\n"
            "🔍 التصويبات:\n"
            "- تأكد من اختيار عنصر المحور بشكل عشوائي لتجنب أسوأ حالة.\n\n"
            "✨ نقاط قوتك:\n"
            "- فهم ممتاز لخطوة التقسيم."
        )
        parsed = agent._parse_or_build_structured_summary(sample_markdown)
        assert "summary" in parsed or "paragraphs" in parsed or "overall_score" in parsed
        assert parsed["overall_score"] >= 0


class TestLearningAgentSpacedRepetition:
    """Tests the Leitner/SM-2 based Spaced Repetition scheduling logic."""

    def test_spaced_repetition_saves_missed_questions(self):
        agent = LearningCoachAgent(api_key="sk-test")
        missed_quiz = [
            {
                "question_id": "q101",
                "question": "What is polymorphism?",
                "topic": "OOP",
                "page": 2,
                "options": ["A", "B", "C", "D"],
                "correct_answer": "B",
                "correct": False
            }
        ]
        success = agent.save_spaced_repetition(
            quiz_results=missed_quiz,
            student_id="TEST_STU",
            days_interval=3
        )
        assert success is True

        all_reviews = agent.get_all_scheduled_reviews(student_id="TEST_STU")
        assert any(r.get("question_id") == "q101" for r in all_reviews)


class TestAttentionAgent:
    """Tests attention signal evaluation and nudge generation."""

    @pytest.fixture
    def attention_agent(self):
        return AttentionAgent(api_key="sk-test")

    def test_detects_prolonged_tab_switching(self, attention_agent):
        result = attention_agent.evaluate_attention(
            tab_switches_count=5,
            last_away_duration_seconds=45.0,
            total_away_seconds=90.0,
            time_since_interaction=30.0,
            cv_data=None,
            current_topic="Machine Learning Basics",
            language="ar"
        )
        assert result["should_alert"] is True
        assert result["alert_type"] == "toast"
        assert "Machine Learning Basics" in result["coach_nudge"]

    def test_detects_sleeping_and_recommends_pomodoro_break(self, attention_agent):
        result = attention_agent.evaluate_attention(
            tab_switches_count=0,
            last_away_duration_seconds=0,
            total_away_seconds=0,
            time_since_interaction=0,
            cv_data={
                "state": "sleeping",
                "confidence": 0.92
            },
            language="en"
        )
        assert result["should_alert"] is True
        assert result["state"] == "sleeping"
        assert result["recommended_action"] == "pomodoro_break"
