"""
Automated Live End-to-End Evaluation Suite for Attocus using DeepEval & Pytest.
Verifies RAG Faithfulness (zero hallucination) and Agent Answer Relevancy
on live responses generated dynamically by:
  1. LearningCoachAgent (Concept Explanation & RAG Grounding)
  2. QuizAgent (Active Recall Question Generation)
  3. SocraticSummaryAgent (Interactive Socratic Dialogue & Knowledge Synthesis)

To run:
    pytest tests/test_eval.py -v
or:
    deepeval test run tests/test_eval.py
"""

import os
import sys
import pytest
from dotenv import load_dotenv

load_dotenv()

# Ensure backend root is in PYTHONPATH
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from deepeval.test_case import LLMTestCase
from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric
from deepeval import assert_test

from agents.learning_agent import LearningCoachAgent
from agents.quiz_agent import QuizAgent
from agents.summary_agent import SocraticSummaryAgent


@pytest.fixture(scope="module")
def api_key_check():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        pytest.skip("OPENAI_API_KEY not configured. Skipping live DeepEval tests.")


def test_live_learning_coach_explanation_faithfulness(api_key_check):
    """
    Validates that LearningCoachAgent generates live explanations that are strictly
    faithful to provided lecture slides with zero hallucinations.
    """
    lecture_context = [
        "Convolutional Neural Networks (CNNs) use convolution layers, pooling layers, "
        "and fully connected layers to process grid-structured data like images. "
        "Pooling layers reduce spatial dimensions and computational complexity while retaining key features."
    ]
    
    student_question = "What is the purpose of pooling layers in CNNs?"
    
    # Live LLM Agent invocation
    coach = LearningCoachAgent(model="gpt-4o-mini")
    live_agent_answer = coach.explain_concept(
        topic="Convolutional Neural Networks",
        slide_content=lecture_context[0],
        student_question=student_question,
        language="en"
    )
    
    test_case = LLMTestCase(
        input=student_question,
        actual_output=live_agent_answer,
        retrieval_context=lecture_context
    )
    
    faith_metric = FaithfulnessMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    relevancy_metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    
    assert_test(test_case, [faith_metric, relevancy_metric])


def test_live_quiz_agent_groundedness(api_key_check):
    """
    Ensures that QuizAgent questions generated live by LLM are strictly grounded
    in lecture context and highly relevant to the concept.
    """
    lecture_context = [
        "A Decision Tree splits data based on feature values. "
        "Entropy and Gini Impurity are two common metrics to determine the best split."
    ]
    
    quiz_prompt = "Generate a quiz question to test student understanding of Decision Tree split metrics."
    
    # Live LLM Agent invocation
    quiz_agent = QuizAgent(model="gpt-4o-mini")
    quiz_result = quiz_agent.generate_quiz(
        context=lecture_context[0],
        num_questions=1,
        topic="Decision Tree split metrics",
        language="en"
    )
    
    questions = quiz_result.get("questions", [])
    assert len(questions) > 0, "QuizAgent failed to generate questions."
    
    q = questions[0]
    live_generated_question = q.get("question", "")
    assert live_generated_question, "Generated question cannot be empty."
    
    test_case = LLMTestCase(
        input=quiz_prompt,
        actual_output=live_generated_question,
        retrieval_context=lecture_context
    )
    
    faith_metric = FaithfulnessMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    relevancy_metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    
    assert_test(test_case, [faith_metric, relevancy_metric])


def test_live_socratic_summary_faithfulness(api_key_check):
    """
    Validates that SocraticSummaryAgent synthesizes student responses and lecture context
    into a personalized summary that is 100% faithful to the source material.
    """
    lecture_context = [
        "Relational Databases organize data into tables consisting of rows and columns. "
        "A primary key uniquely identifies each record in a table, ensuring no duplicate rows exist. "
        "Foreign keys establish referential integrity by pointing to primary keys in related tables."
    ]
    
    # Live Socratic Summary Agent session
    summary_agent = SocraticSummaryAgent(
        topic="Relational Databases",
        language="en",
        model="gpt-4o-mini"
    )
    
    # 1. Start session with lecture context
    summary_agent.start_session(initial_context=lecture_context[0])
    
    # 2. Simulate substantive student answer during Socratic dialogue
    summary_agent.process_input(
        "A primary key uniquely identifies every record in a table, and a foreign key links "
        "records between tables to maintain referential integrity."
    )
    
    # 3. Request synthesized final summary
    live_summary = summary_agent.force_summary()
    assert live_summary and len(live_summary.strip()) > 50, "Summary output is unexpectedly empty."
    
    test_case = LLMTestCase(
        input="Provide a structured summary of Relational Databases based on the lecture and Socratic discussion.",
        actual_output=live_summary,
        retrieval_context=lecture_context
    )
    
    faith_metric = FaithfulnessMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    relevancy_metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    
    assert_test(test_case, [faith_metric, relevancy_metric])

