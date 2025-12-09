"""
EISLAW Agent Orchestrator - Langfuse Integration (FIXED)
Created by Alex (AOS-026, fixed in AOS-026-FIX)

LANGFUSE SDK VERSION: 3.x
Official Docs: https://langfuse.com/docs/sdk/python

Comprehensive Langfuse tracing integration per PRD §4:
- Singleton Langfuse client management
- LangChain CallbackHandler for automatic LLM tracing
- TracedWorkflow context manager for manual span creation
- Token usage and cost tracking
- Session management for related workflows

CORRECTED PATTERNS (based on Langfuse 3.x API):
1. Client: Langfuse() with explicit params
2. Traces/Spans: Use start_span() for manual spans
3. Nested spans: span.start_span(name)
4. CallbackHandler: Initialize with NO parameters, pass session/user/tags via config metadata

Usage:
    from .langfuse_integration import (
        get_langfuse_client,
        get_langchain_callback,
        TracedWorkflow,
    )

    # Auto-trace LangChain calls
    handler, meta = get_langchain_callback(session_id="workflow-123")
    llm.invoke(
        prompt,
        config={"callbacks": [handler], "metadata": meta}
    )

    # Manual tracing
    with TracedWorkflow("workflow-name", session_id="TASK-001") as wf:
        with wf.span("step-1") as span:
            # do work
            span.update(output={"result": "done"})
"""
import os
import logging
import functools
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Callable, Any, TypeVar, ParamSpec
from contextlib import contextmanager

from .config import config

logger = logging.getLogger(__name__)

# Type variables for decorator
P = ParamSpec("P")
T = TypeVar("T")

# =============================================================================
# Conditional Imports (Langfuse is optional)
# =============================================================================

try:
    from langfuse import Langfuse, observe
    # In Langfuse 3.x, callback handler is in langfuse.langchain
    try:
        from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
        logger.info("Langfuse LangChain callback handler loaded")
    except ImportError as cb_err:
        LangfuseCallbackHandler = None
        logger.warning(f"Langfuse callback handler not available: {cb_err}")
    LANGFUSE_AVAILABLE = True
    logger.info("Langfuse SDK loaded successfully (v3.x)")
except ImportError as e:
    LANGFUSE_AVAILABLE = False
    Langfuse = None
    LangfuseCallbackHandler = None
    logger.warning(f"Langfuse not installed - tracing disabled: {e}")

    # Stub decorator when Langfuse not available
    def observe(*args, **kwargs):
        """No-op decorator when Langfuse is not available."""
        def decorator(func):
            return func
        return decorator if args and callable(args[0]) else decorator


# =============================================================================
# Singleton Client Management
# =============================================================================

_langfuse_client: Optional["Langfuse"] = None


def get_langfuse_client() -> Optional["Langfuse"]:
    """
    Get or create the singleton Langfuse client.

    Uses configuration from config.langfuse (loaded from environment variables):
    - LANGFUSE_SECRET_KEY
    - LANGFUSE_PUBLIC_KEY
    - LANGFUSE_HOST (default: http://20.217.86.4:3001)

    Returns:
        Langfuse client instance, or None if not configured/available.

    Example:
        client = get_langfuse_client()
        if client:
            span = client.start_span(name="my-trace")
    """
    global _langfuse_client

    if not LANGFUSE_AVAILABLE:
        logger.debug("Langfuse SDK not available")
        return None

    if not config.langfuse.is_configured:
        logger.debug("Langfuse not configured (missing API keys)")
        return None

    if _langfuse_client is None:
        try:
            _langfuse_client = Langfuse(
                secret_key=config.langfuse.secret_key,
                public_key=config.langfuse.public_key,
                host=config.langfuse.host,
            )
            logger.info(f"Langfuse client initialized: {config.langfuse.host}")
        except Exception as e:
            logger.error(f"Failed to initialize Langfuse client: {e}")
            return None

    return _langfuse_client


def flush_langfuse() -> None:
    """
    Flush any pending Langfuse events.

    Call this before process exit to ensure all traces are sent.
    """
    global _langfuse_client
    if _langfuse_client:
        try:
            _langfuse_client.flush()
            logger.debug("Langfuse events flushed")
        except Exception as e:
            logger.warning(f"Failed to flush Langfuse: {e}")


def shutdown_langfuse() -> None:
    """
    Shutdown the Langfuse client gracefully.

    Flushes pending events and closes the client connection.
    """
    global _langfuse_client
    if _langfuse_client:
        try:
            _langfuse_client.flush()
            _langfuse_client.shutdown()
            logger.info("Langfuse client shutdown complete")
        except Exception as e:
            logger.warning(f"Error during Langfuse shutdown: {e}")
        finally:
            _langfuse_client = None


# =============================================================================
# LangChain Callback Integration (FIXED)
# =============================================================================

def get_langchain_callback(
    trace_name: Optional[str] = None,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    tags: Optional[list[str]] = None,
) -> Optional[tuple["LangfuseCallbackHandler", dict]]:
    """
    Create a LangChain callback handler for automatic LLM tracing.

    CORRECTED IMPLEMENTATION (Langfuse 3.x):
    - CallbackHandler() takes NO constructor parameters
    - Session/user/tags are passed via config["metadata"] when invoking LLM

    This handler automatically traces all LangChain LLM calls, including:
    - Prompts and completions
    - Token usage (input/output/total)
    - Model name and parameters
    - Latency

    Args:
        trace_name: Optional name for the trace (passed via metadata)
        session_id: Optional session ID for grouping related traces
        user_id: Optional user ID for filtering in dashboard
        metadata: Optional dict of metadata to attach to trace
        tags: Optional list of tags for filtering

    Returns:
        Tuple of (handler, config_metadata) where:
        - handler: LangfuseCallbackHandler instance
        - config_metadata: dict to pass to llm.invoke(config={"metadata": config_metadata})

        Returns (None, {}) if Langfuse not available.

    Example:
        handler, meta = get_langchain_callback(
            trace_name="alex-task",
            session_id="workflow-123",
            user_id="Alex",
            metadata={"task_id": "CLI-009"},
            tags=["implementation"]
        )
        llm = ChatAnthropic(model="claude-sonnet-4-5-20250929")
        response = llm.invoke(
            messages,
            config={
                "callbacks": [handler],
                "metadata": meta
            }
        )
    """
    if not LANGFUSE_AVAILABLE or LangfuseCallbackHandler is None:
        logger.debug("LangChain callback not available - Langfuse not installed")
        return None, {}

    try:
        client = get_langfuse_client()
        if not client:
            logger.debug("LangChain callback not available - Langfuse not configured")
            return None, {}

        # FIXED: CallbackHandler takes NO parameters
        handler = LangfuseCallbackHandler()

        # Build metadata dict to pass via config
        config_metadata = {}
        if session_id:
            config_metadata["langfuse_session_id"] = session_id
        if user_id:
            config_metadata["langfuse_user_id"] = user_id
        if tags:
            config_metadata["langfuse_tags"] = tags
        if trace_name:
            config_metadata["langfuse_trace_name"] = trace_name
        if metadata:
            # Merge custom metadata (prefix with langfuse_ to avoid collisions)
            for key, value in metadata.items():
                if not key.startswith("langfuse_"):
                    config_metadata[f"langfuse_{key}"] = value
                else:
                    config_metadata[key] = value

        logger.debug(f"Created LangChain callback with metadata: {config_metadata}")
        return handler, config_metadata

    except Exception as e:
        logger.error(f"Failed to create LangChain callback: {e}")
        return None, {}


# =============================================================================
# TracedWorkflow Context Manager (FIXED)
# =============================================================================

class TracedWorkflow:
    """
    Context manager for tracing a workflow with Langfuse.

    CORRECTED IMPLEMENTATION (Langfuse 3.x):
    - Uses start_span() to create root span
    - Nested spans created with root.start_span()
    - Context manager auto-ends spans

    Example:
        with TracedWorkflow("POC-Workflow", task_id="CLI-009", session_id="workflow-123") as wf:
            wf.update_metadata({"agent": "Alex"})

            with wf.span("agent-execution") as span:
                result = agent.invoke(task)
                span.update(output={"result": result})

            wf.set_status("completed")
    """

    def __init__(
        self,
        name: str,
        task_id: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        tags: Optional[list[str]] = None,
    ):
        self.name = name
        self.task_id = task_id
        self.session_id = session_id
        self.user_id = user_id
        self.metadata = metadata or {}
        self.tags = tags or []
        self._client = None
        self._root_span = None

    def __enter__(self) -> "TracedWorkflow":
        """Enter the context and create the root span."""
        try:
            self._client = get_langfuse_client()
            if self._client:
                # FIXED: Create root span using start_span()
                span_metadata = {**self.metadata}
                if self.task_id:
                    span_metadata["task_id"] = self.task_id
                if self.session_id:
                    span_metadata["session_id"] = self.session_id
                if self.user_id:
                    span_metadata["user_id"] = self.user_id

                self._root_span = self._client.start_span(
                    name=self.name,
                    metadata=span_metadata,
                )
                logger.debug(f"Created root span: {self.name}")
        except Exception as e:
            logger.warning(f"Failed to create root span: {e}")

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context and end the root span."""
        if self._root_span:
            try:
                # Update with final status
                status = "error" if exc_type else "completed"
                output = {"status": status}
                if exc_val:
                    output["error"] = str(exc_val)

                self._root_span.update(output=output)
                self._root_span.end()
                logger.debug(f"Ended root span: {self.name}")
            except Exception as e:
                logger.warning(f"Failed to end root span: {e}")

        # Flush to ensure data is sent
        flush_langfuse()

        # Don't suppress exceptions
        return False

    @contextmanager
    def span(
        self,
        name: str,
        metadata: Optional[dict] = None,
        input_data: Optional[Any] = None,
    ):
        """
        Create a nested span within this workflow.

        FIXED: Uses root_span.start_span() for nested spans.

        Args:
            name: Span name
            metadata: Optional span metadata
            input_data: Optional input data

        Yields:
            Langfuse span object (or None if tracing disabled)

        Example:
            with wf.span("agent-execution", metadata={"agent": "Alex"}) as span:
                result = agent.invoke(task)
                span.update(output={"result": result})
        """
        span = None
        if self._root_span:
            try:
                # FIXED: Correct nested span creation
                span = self._root_span.start_span(
                    name=name,
                    metadata=metadata or {},
                    input=input_data,
                )
                logger.debug(f"Created nested span: {name}")
            except Exception as e:
                logger.warning(f"Failed to create span '{name}': {e}")

        try:
            yield span
        finally:
            if span:
                try:
                    span.end()
                    logger.debug(f"Ended span: {name}")
                except Exception as e:
                    logger.warning(f"Failed to end span '{name}': {e}")

    def update(self, output: Optional[dict] = None, metadata: Optional[dict] = None) -> None:
        """
        Update the root span with output and/or metadata.

        Args:
            output: Optional output data to set on the span
            metadata: Optional metadata to merge into span metadata
        """
        if self._root_span:
            try:
                if output:
                    self._root_span.update(output=output)
                if metadata:
                    self.metadata.update(metadata)
                    self._root_span.update(metadata=self.metadata)
            except Exception as e:
                logger.warning(f"Failed to update span: {e}")

    def update_metadata(self, metadata: dict) -> None:
        """Update the root span metadata."""
        if self._root_span:
            try:
                self.metadata.update(metadata)
                self._root_span.update(metadata=self.metadata)
            except Exception as e:
                logger.warning(f"Failed to update metadata: {e}")

    def set_status(self, status: str) -> None:
        """Set the workflow status."""
        if self._root_span:
            try:
                self._root_span.update(output={"status": status})
            except Exception as e:
                logger.warning(f"Failed to set status: {e}")

    def score(self, name: str, value: float, comment: Optional[str] = None) -> None:
        """
        Add a score to the workflow trace.

        Args:
            name: Score name (e.g., "review_verdict")
            value: Score value (typically 0.0 to 1.0)
            comment: Optional comment about the score

        Note: In Langfuse 3.x, scoring might need to be done via the span's update method
        or via separate API. For now, we store as metadata.
        """
        if self._root_span:
            try:
                score_metadata = {
                    f"score_{name}": value,
                    f"score_{name}_comment": comment or "",
                }
                self.update_metadata(score_metadata)
                logger.debug(f"Recorded score: {name}={value}")
            except Exception as e:
                logger.warning(f"Failed to record score: {e}")

    @property
    def trace(self):
        """Get the underlying Langfuse trace/span object."""
        return self._root_span

    @property
    def trace_id(self) -> Optional[str]:
        """Get the trace ID if available."""
        if self._root_span:
            return getattr(self._root_span, "trace_id", None)
        return None


# =============================================================================
# Cost Estimation Utilities (unchanged)
# =============================================================================

PRICING = {
    # Anthropic Claude (per 1M tokens)
    "claude-opus-4-20250514": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0},
    "claude-sonnet-3-5-20241022": {"input": 3.0, "output": 15.0},
    "claude-haiku-3-5-20241022": {"input": 0.80, "output": 4.0},
    # OpenAI (per 1M tokens)
    "gpt-4-turbo": {"input": 10.0, "output": 30.0},
    "gpt-4o": {"input": 5.0, "output": 15.0},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    # Google Gemini (per 1M tokens)
    "gemini-2.0-flash-exp": {"input": 0.10, "output": 0.30},
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """
    Estimate cost in USD for a model call.

    Args:
        model: Model identifier
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Estimated cost in USD, or 0.0 if model pricing unknown.
    """
    if model not in PRICING:
        return 0.0

    prices = PRICING[model]
    input_cost = (input_tokens / 1_000_000) * prices["input"]
    output_cost = (output_tokens / 1_000_000) * prices["output"]
    return input_cost + output_cost


def format_cost(cost: float) -> str:
    """Format cost as currency string."""
    if cost < 0.01:
        return f"${cost:.4f}"
    return f"${cost:.2f}"


# =============================================================================
# Simplified Agent Callback Wrapper (For use in agents.py)
# =============================================================================

def create_agent_callback(
    agent_name: str,
    task_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> Optional[tuple["LangfuseCallbackHandler", dict]]:
    """
    Create a callback handler configured for an agent invocation.

    This is a convenience wrapper around get_langchain_callback() for use
    in agents.py.

    Args:
        agent_name: Name of the agent (e.g., "Alex", "Jacob")
        task_id: Optional task ID
        session_id: Optional session ID (defaults to task_id)

    Returns:
        Tuple of (handler, config_metadata) or (None, {}) if unavailable.

    Example:
        handler, meta = create_agent_callback("Alex", task_id="CLI-009")
        response = llm.invoke(
            messages,
            config={"callbacks": [handler], "metadata": meta}
        )
    """
    return get_langchain_callback(
        trace_name=f"{agent_name}-{task_id or 'task'}",
        session_id=session_id or task_id,
        user_id=agent_name,
        metadata={"task_id": task_id} if task_id else {},
        tags=["agent", agent_name.lower()],
    )


# =============================================================================
# Agent Result Logging (For use in workflow.py)
# =============================================================================

def log_agent_result(
    trace: Any,
    agent_name: str,
    task_id: str,
    verdict: Optional[str] = None,
    duration_ms: int = 0,
    token_usage: Optional[dict] = None,
) -> None:
    """
    Log the result of an agent execution to a trace.

    Args:
        trace: Langfuse trace object (can be None if tracing disabled)
        agent_name: Name of the agent
        task_id: Task identifier
        verdict: Optional review verdict (for Jacob)
        duration_ms: Execution duration in milliseconds
        token_usage: Optional token usage dict

    Example:
        log_agent_result(
            trace,
            agent_name="Jacob",
            task_id="CLI-009",
            verdict="APPROVED",
            duration_ms=5000,
            token_usage={"input": 2000, "output": 500}
        )
    """
    if not trace:
        return

    try:
        output = {
            "agent": agent_name,
            "task_id": task_id,
            "duration_ms": duration_ms,
        }
        if verdict:
            output["verdict"] = verdict
        if token_usage:
            output["token_usage"] = token_usage

        # Update trace output
        trace.update(output=output)

        # Add verdict as a score if it's a review
        if verdict:
            verdict_value = {"APPROVED": 1.0, "NEEDS_FIXES": 0.5, "BLOCKED": 0.0}.get(
                verdict, 0.5
            )
            # Note: score_trace might not exist in 3.x SDK - using update instead
            logger.debug(f"Logged agent result: {agent_name} - {verdict}")
    except Exception as e:
        logger.warning(f"Failed to log agent result: {e}")
