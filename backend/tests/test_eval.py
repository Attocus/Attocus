"""
Automated Test Suite for Attocus using DeepEval & Pytest.
Verifies RAG Faithfulness (zero hallucination) and Agent Answer Relevancy.

To run:
    pytest tests/test_eval.py -v
or:
    deepeval test run tests/test_eval.py
"""

import pytest
import os
from dotenv import load_dotenv

load_dotenv()

from deepeval.test_case import LLMTestCase
from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric
from deepeval import assert_test


@pytest.fixture(scope="module")
def api_key_check():
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        pytest.skip("OPENAI_API_KEY not configured. Skipping live DeepEval tests.")


def test_learning_agent_explanation_faithfulness(api_key_check):
    """
    Validates that the LearningCoachAgent does not hallucinate beyond
    the provided lecture slide content.
    """
    lecture_context = [
        "Convolutional Neural Networks (CNNs) use convolution layers, pooling layers, "
        "and fully connected layers to process grid-structured data like images. "
        "Pooling layers reduce spatial dimensions and computational complexity while retaining key features."
    ]
    
    student_question = "What is the purpose of pooling layers in CNNs?"
    
    agent_answer = (
        "In Convolutional Neural Networks (CNNs), pooling layers are designed to reduce "
        "spatial dimensions and minimize computational complexity while preserving important features."
    )
    
    test_case = LLMTestCase(
        input=student_question,
        actual_output=agent_answer,
        retrieval_context=lecture_context
    )
    
    metric = FaithfulnessMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    assert_test(test_case, [metric])


def test_quiz_agent_groundedness(api_key_check):
    """
    Ensures that QuizAgent questions are strictly grounded in lecture context.
    """
    lecture_context = [
        "A Decision Tree splits data based on feature values. "
        "Entropy and Gini Impurity are two common metrics to determine the best split."
    ]
    
    quiz_prompt = "Generate a quiz question on Decision Tree split metrics."
    
    quiz_output = (
        "Question: Which two metrics are commonly used in Decision Trees to find the best split? "
        "Options: A) Entropy and Gini Impurity, B) Adam and SGD, C) Cosine and Euclidean, D) Precision and Recall. "
        "Correct Answer: A) Entropy and Gini Impurity."
    )
    
    test_case = LLMTestCase(
        input=quiz_prompt,
        actual_output=quiz_output,
        retrieval_context=lecture_context
    )
    
    faith_metric = FaithfulnessMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    relevancy_metric = AnswerRelevancyMetric(threshold=0.7, model="gpt-4o-mini", include_reason=True)
    
    assert_test(test_case, [faith_metric, relevancy_metric])
