"""
DeepEval Validation and Evaluation Service for Attocus.
Provides automated evaluation for RAG pipelines, Hallucination detection (Faithfulness),
and Agent Response Relevancy.
"""

import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("AttocusEval")

try:
    from deepeval.test_case import LLMTestCase
    from deepeval.metrics import (
        FaithfulnessMetric,
        AnswerRelevancyMetric,
        ContextualRelevancyMetric
    )
    HAS_DEEPEVAL = True
except ImportError:
    HAS_DEEPEVAL = False
    LLMTestCase = None  # type: ignore
    FaithfulnessMetric = None  # type: ignore
    AnswerRelevancyMetric = None  # type: ignore
    ContextualRelevancyMetric = None  # type: ignore


class RAGEvalService:
    """
    Evaluation suite using DeepEval metrics:
    - Faithfulness: Hallucination detection between retrieved lecture context and generated output.
    - Answer Relevancy: How directly the agent addresses the student question.
    - Contextual Relevancy: Quality of Firestore Vector Search retrieval.
    """

    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model
        self.has_deepeval = HAS_DEEPEVAL

    def get_status(self) -> Dict[str, Any]:
        return {
            "deepeval_installed": self.has_deepeval,
            "eval_model": self.model,
            "has_openai_key": bool(os.environ.get("OPENAI_API_KEY"))
        }

    def evaluate_response(
        self,
        input_query: str,
        actual_output: str,
        retrieval_context: List[str],
        expected_output: Optional[str] = None,
        faithfulness_threshold: float = 0.7,
        relevancy_threshold: float = 0.7
    ) -> Dict[str, Any]:
        """
        Runs comprehensive DeepEval metrics on an agent response and retrieved context.
        """
        if not self.has_deepeval:
            return {
                "success": False,
                "error": "deepeval is not installed in environment.",
                "metrics": {}
            }

        if not os.environ.get("OPENAI_API_KEY"):
            return {
                "success": False,
                "error": "OPENAI_API_KEY is required for DeepEval metric evaluation.",
                "metrics": {}
            }

        # Filter and clean context
        clean_context = [c.strip() for c in retrieval_context if c and c.strip()]
        if not clean_context:
            clean_context = ["General course background context."]

        test_case = LLMTestCase(
            input=input_query,
            actual_output=actual_output,
            retrieval_context=clean_context,
            expected_output=expected_output
        )

        results = {
            "input": input_query,
            "output_preview": actual_output[:120] + ("..." if len(actual_output) > 120 else ""),
            "context_chunks_count": len(clean_context),
            "metrics": {},
            "all_passed": True
        }

        # 1. Faithfulness Metric (Hallucination Detection)
        try:
            faith_metric = FaithfulnessMetric(
                threshold=faithfulness_threshold,
                model=self.model,
                include_reason=True
            )
            faith_metric.measure(test_case)
            results["metrics"]["faithfulness"] = {
                "score": round(float(faith_metric.score), 3) if faith_metric.score is not None else 0.0,
                "passed": bool(faith_metric.is_successful()),
                "reason": getattr(faith_metric, "reason", "Faithful to context")
            }
            if not faith_metric.is_successful():
                results["all_passed"] = False
        except Exception as e:
            logger.warning(f"Faithfulness metric failed: {e}")
            results["metrics"]["faithfulness"] = {"error": str(e), "passed": False}
            results["all_passed"] = False

        # 2. Answer Relevancy Metric
        try:
            rel_metric = AnswerRelevancyMetric(
                threshold=relevancy_threshold,
                model=self.model,
                include_reason=True
            )
            rel_metric.measure(test_case)
            results["metrics"]["answer_relevancy"] = {
                "score": round(float(rel_metric.score), 3) if rel_metric.score is not None else 0.0,
                "passed": bool(rel_metric.is_successful()),
                "reason": getattr(rel_metric, "reason", "Relevant to question")
            }
            if not rel_metric.is_successful():
                results["all_passed"] = False
        except Exception as e:
            logger.warning(f"Answer relevancy metric failed: {e}")
            results["metrics"]["answer_relevancy"] = {"error": str(e), "passed": False}
            results["all_passed"] = False

        # 3. Contextual Relevancy Metric (if multiple chunks present)
        if len(clean_context) > 0:
            try:
                ctx_rel_metric = ContextualRelevancyMetric(
                    threshold=0.5,
                    model=self.model,
                    include_reason=True
                )
                ctx_rel_metric.measure(test_case)
                results["metrics"]["contextual_relevancy"] = {
                    "score": round(float(ctx_rel_metric.score), 3) if ctx_rel_metric.score is not None else 0.0,
                    "passed": bool(ctx_rel_metric.is_successful()),
                    "reason": getattr(ctx_rel_metric, "reason", "Retrieved chunks are relevant")
                }
            except Exception as e:
                logger.warning(f"Contextual relevancy metric failed: {e}")
                results["metrics"]["contextual_relevancy"] = {"error": str(e), "passed": False}

        results["success"] = True
        return results


# Global singleton instance
eval_service = RAGEvalService()
