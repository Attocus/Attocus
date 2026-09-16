"""
Observability and Tracing Service for Attocus using LangSmith.
Provides automatic tracing, latency monitoring, and token-cost tracking
for all agent interactions and OpenAI calls.
"""

import os
import functools
import logging
from typing import Any, Callable, Optional, Dict

logger = logging.getLogger("AttocusObservability")

try:
    from langsmith import traceable
    from langsmith.wrappers import wrap_openai
    HAS_LANGSMITH = True
except ImportError:
    HAS_LANGSMITH = False
    traceable = None  # type: ignore
    wrap_openai = None  # type: ignore


def is_tracing_enabled() -> bool:
    """Returns True if LangSmith tracing is active via environment variables."""
    api_key = os.environ.get("LANGCHAIN_API_KEY")
    tracing_v2 = os.environ.get("LANGCHAIN_TRACING_V2", "").lower() in ("true", "1")
    return bool(api_key and (tracing_v2 or api_key.startswith("lsv2_")))


def get_langsmith_status() -> Dict[str, Any]:
    """Returns the current observability status."""
    return {
        "langsmith_installed": HAS_LANGSMITH,
        "tracing_enabled": is_tracing_enabled(),
        "project": os.environ.get("LANGCHAIN_PROJECT", "Attocus-Platform"),
        "endpoint": os.environ.get("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com"),
        "has_api_key": bool(os.environ.get("LANGCHAIN_API_KEY"))
    }


def wrap_client(client: Any) -> Any:
    """
    Wraps an OpenAI client instance with LangSmith tracing.
    If LangSmith is not installed or no API key is provided, returns client unmodified.
    """
    if not HAS_LANGSMITH or not client:
        return client

    try:
        # wrap_openai instruments both completions and embeddings calls
        wrapped = wrap_openai(client)
        if is_tracing_enabled():
            logger.info(f"[LangSmith] Tracing enabled for client on project: {os.environ.get('LANGCHAIN_PROJECT', 'Attocus-Platform')}")
        return wrapped
    except Exception as err:
        logger.warning(f"[LangSmith] Failed to wrap client with LangSmith: {err}")
        return client


def traceable_agent(
    name: Optional[str] = None,
    run_type: str = "chain",
    tags: Optional[list] = None,
    metadata: Optional[dict] = None
) -> Callable:
    """
    Decorator to trace agent execution in LangSmith.
    Gracefully falls back to a no-op decorator if LangSmith is disabled.
    """
    def decorator(func: Callable) -> Callable:
        if HAS_LANGSMITH and is_tracing_enabled() and traceable:
            return traceable(
                name=name or func.__name__,
                run_type=run_type,
                tags=tags or ["attocus", "agent"],
                metadata=metadata or {}
            )(func)
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator
