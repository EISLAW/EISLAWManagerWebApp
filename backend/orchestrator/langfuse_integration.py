"""
EISLAW Agent Orchestrator - Langfuse Integration
Created by Alex (AOS-026)

Comprehensive Langfuse tracing integration per PRD §4:
- Singleton Langfuse client management
- LangChain CallbackHandler for automatic LLM tracing
- @observe decorator utilities for function tracing
- Token usage and cost tracking
- Session management for related workflows
- Score/evaluation tracking utilities

Usage:
    from .langfuse_integration import (
        get_langfuse_client,
        get_langchain_callback,
        create_trace,
        TracedWorkflow,
    )

    # Auto-trace LangChain calls
    callback = get_langchain_callback(trace_name="my-workflow")
    llm.invoke(prompt, config={"callbacks": [callback]})

    # Manual tracing
    with TracedWorkflow("workflow-name", task_id="TASK-001") as trace:
        span = trace.span("step-1")
        # do work
        span.end(output={"result": "done"})
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
    from langfuse.types import TraceContext
    # In Langfuse 3.x, callback handler is in langfuse.langchain
    try:
        from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
        logger.info("Langfuse LangChain callback handler loaded")
    except ImportError as cb_err:
        # Fallback - LangChain not installed or different version
        LangfuseCallbackHandler = None
        logger.warning(f"Langfuse callback handler not available: {cb_err}")
    LANGFUSE_AVAILABLE = True
    logger.info("Langfuse SDK loaded successfully (v3.x)")
except ImportError as e:
    LANGFUSE_AVAILABLE = False
    Langfuse = None
    LangfuseCallbackHandler = None
    TraceContext = None
    logger.warning(f"Langfuse not installed - tracing disabled: {e}")

    # Stub decorator when Langfuse not available
    def observe(*args, **kwargs):
        """No-op decorator when Langfuse is not available."""
        def decorator(func):
            return func
        return decorator if args and callable(args[0]) else decorator

    langfuse_context = None


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
            trace = client.trace(name="my-trace")
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
            # Verify connection
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
# LangChain Callback Integration
# =============================================================================

def get_langchain_callback(
    trace_name: Optional[str] = None,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    tags: Optional[list[str]] = None,
) -> Optional["LangfuseCallbackHandler"]:
    """
    Create a LangChain callback handler for automatic LLM tracing.

    This handler automatically traces all LangChain LLM calls, including:
    - Prompts and completions
    - Token usage (input/output/total)
    - Model name and parameters
    - Latency

    Args:
        trace_name: Optional name for the trace (default: auto-generated)
        session_id: Optional session ID for grouping related traces
        user_id: Optional user ID for filtering in dashboard
        metadata: Optional dict of metadata to attach to trace
        tags: Optional list of tags for filtering

    Returns:
        LangfuseCallbackHandler instance, or None if Langfuse not available.

    Example:
        callback = get_langchain_callback(
            trace_name="alex-task",
            session_id="workflow-123",
            metadata={"task_id": "CLI-009", "agent": "Alex"}
        )
        llm = ChatAnthropic(model="claude-sonnet-4-5-20250929")
        response = llm.invoke(messages, config={"callbacks": [callback]})
    """
    if not LANGFUSE_AVAILABLE or LangfuseCallbackHandler is None:
        logger.debug("LangChain callback not available - Langfuse not installed")
        return None

    try:
        client = get_langfuse_client()
        if not client:
            logger.debug("LangChain callback not available - Langfuse not configured")
            return None

        trace_context = TraceContext(trace_id=client.create_trace_id())

        handler = LangfuseCallbackHandler(
            public_key=config.langfuse.public_key,
            update_trace=True,
            trace_context=trace_context,
        )

        try:
            client.update_current_trace(
                user_id=user_id,
                session_id=session_id,
                metadata=metadata or {},
                tags=tags or [],
                name=trace_name,
            )
        except Exception as update_err:
            logger.debug(f"Could not update Langfuse trace context: {update_err}")

        logger.debug(
            f"Created LangChain callback: trace_name={trace_name}, trace_id={trace_context.trace_id}"
        )
        return handler
    except Exception as e:
        logger.error(f"Failed to create LangChain callback: {e}")
        return None


# =============================================================================
# Trace Creation Utilities
# =============================================================================

@dataclass
class TraceInfo:
    """Information about a created trace."""
    trace_id: str
    name: str
    session_id: Optional[str]
    created_at: datetime


def create_trace(
    name: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    tags: Optional[list[str]] = None,
    input_data: Optional[Any] = None,
) -> Optional[Any]:
    """
    Create a new Langfuse trace for tracking a workflow or task.

    Args:
        name: Name for the trace (e.g., "POC-AlexJacob:CLI-009")
        session_id: Optional session ID for grouping related traces
        user_id: Optional user ID (e.g., "Alex", "Jacob")
        metadata: Optional dict of metadata
        tags: Optional list of tags
        input_data: Optional input data to attach

    Returns:
        Langfuse trace object, or None if not available.

    Example:
        trace = create_trace(
            name="alex-implementation",
            session_id="workflow-123",
            metadata={"task_id": "CLI-009"}
        )
        if trace:
            span = trace.span(name="read-file")
            # do work
            span.end(output={"result": "file contents"})
    """
    client = get_langfuse_client()
    if not client:
        return None

    try:
        trace_context = TraceContext(trace_id=client.create_trace_id())
        root_span = client.start_span(
            trace_context=trace_context,
            name=name,
            input=input_data,
            metadata=metadata or {},
        )

        try:
            root_span.update_trace(
                user_id=user_id,
                session_id=session_id,
                metadata=metadata or {},
                tags=tags or [],
                name=name,
                input=input_data,
            )
        except Exception as update_err:
            logger.debug(f"Could not update Langfuse trace metadata: {update_err}")

        logger.debug(f"Created trace: {name} (id={root_span.trace_id})")
        return root_span
    except Exception as e:
        logger.error(f"Failed to create trace: {e}")
        return None


# =============================================================================
# Context Manager for Traced Workflows
# =============================================================================

class TracedWorkflow:
    """
    Context manager for creating a traced workflow with automatic cleanup.

    Provides convenient access to trace spans and automatic flush on exit.

    Example:
        with TracedWorkflow("my-workflow", task_id="CLI-009") as wf:
            # Create spans for each step
            with wf.span("step-1") as span:
                result = do_work()
                span.update(output={"result": result})

            # Add scores for evaluation
            wf.score("quality", 0.9, comment="Good implementation")
    """

    def __init__(
        self,
        name: str,
        task_id: Optional[str] = None,
        session_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        tags: Optional[list[str]] = None,
    ):
        """
        Initialize a traced workflow.

        Args:
            name: Workflow name for the trace
            task_id: Optional task ID (added to metadata)
            session_id: Optional session ID for grouping
            metadata: Optional additional metadata
            tags: Optional list of tags
        """
        self.name = name
        self.task_id = task_id
        self.session_id = session_id
        self._trace = None
        self.trace_context: Optional["TraceContext"] = None
        self._spans: list = []

        # Build metadata
        self.metadata = metadata or {}
        if task_id:
            self.metadata["task_id"] = task_id

        self.tags = tags or []

    def __enter__(self) -> "TracedWorkflow":
        """Enter the context and create the trace."""
        self._trace = create_trace(
            name=self.name,
            session_id=self.session_id,
            metadata=self.metadata,
            tags=self.tags,
        )
        if self._trace and TraceContext:
            self.trace_context = TraceContext(trace_id=self._trace.trace_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context, update trace status, and flush."""
        if self._trace:
            try:
                # Update trace with final status
                status = "error" if exc_type else "completed"
                output = {"status": status}
                if exc_val:
                    output["error"] = str(exc_val)

                self._trace.update_trace(output=output)
                self._trace.end()
            except Exception as e:
                logger.warning(f"Failed to update trace on exit: {e}")

        # Flush to ensure data is sent
        flush_langfuse()

        # Don't suppress exceptions
        return False

    @property
    def trace(self):
        """Get the underlying Langfuse trace object."""
        return self._trace

    @property
    def trace_id(self) -> Optional[str]:
        """Get the trace ID if available."""
        return getattr(self._trace, "trace_id", None)

    @contextmanager
    def span(
        self,
        name: str,
        metadata: Optional[dict] = None,
        input_data: Optional[Any] = None,
    ):
        """
        Create a span within this trace.

        Args:
            name: Span name
            metadata: Optional span metadata
            input_data: Optional input data

        Yields:
            Langfuse span object (or dummy if tracing disabled)

        Example:
            with wf.span("agent-execution", metadata={"agent": "Alex"}) as span:
                result = agent.invoke(task)
                span.update(output={"result": result})
        """
        span = None
        if self._trace:
            try:
                span = self._trace.start_span(
                    name=name,
                    metadata=metadata or {},
                    input=input_data,
                )
            except Exception as e:
                logger.warning(f"Failed to create span: {e}")

        try:
            yield span
        finally:
            if span:
                try:
                    span.end()
                except Exception as e:
                    logger.warning(f"Failed to end span: {e}")

    def generation(
        self,
        name: str,
        model: str,
        input_prompt: str,
        output_text: str,
        usage: Optional[dict] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        """
        Log an LLM generation (alternative to callback handler).

        Use this when not using the LangChain callback handler.

        Args:
            name: Generation name (e.g., "alex-response")
            model: Model name (e.g., "claude-sonnet-4-5-20250929")
            input_prompt: The prompt sent to the LLM
            output_text: The response from the LLM
            usage: Optional token usage dict {"input": N, "output": N, "total": N}
            metadata: Optional additional metadata

        Example:
            wf.generation(
                name="alex-implementation",
                model="claude-sonnet-4-5-20250929",
                input_prompt="Implement feature X...",
                output_text="Here is the implementation...",
                usage={"input": 1000, "output": 500, "total": 1500}
            )
        """
        if not self._trace:
            return

        try:
            generation = self._trace.start_observation(
                name=name,
                as_type="generation",
                model=model,
                input=input_prompt,
                output=output_text,
                usage_details=usage,
                metadata=metadata or {},
            )
            generation.end()
            logger.debug(f"Logged generation: {name} (model={model})")
        except Exception as e:
            logger.warning(f"Failed to log generation: {e}")

    def score(
        self,
        name: str,
        value: float,
        comment: Optional[str] = None,
        data_type: str = "NUMERIC",
    ) -> None:
        """
        Add a score/evaluation to the trace.

        Useful for tracking quality metrics, review outcomes, etc.

        Args:
            name: Score name (e.g., "quality", "review_verdict")
            value: Score value (0.0 to 1.0 for NUMERIC, or specific value)
            comment: Optional comment explaining the score
            data_type: Score type ("NUMERIC", "BOOLEAN", or "CATEGORICAL")

        Example:
            # Numeric quality score
            wf.score("code_quality", 0.85, comment="Good implementation")

            # Boolean for pass/fail
            wf.score("tests_passed", 1.0, data_type="BOOLEAN")

            # Categorical for review verdict
            wf.score("review_verdict", "APPROVED", data_type="CATEGORICAL")
        """
        if not self._trace:
            return

        try:
            self._trace.score_trace(
                name=name,
                value=value,
                comment=comment,
                data_type=data_type,
            )
            logger.debug(f"Added score: {name}={value}")
        except Exception as e:
            logger.warning(f"Failed to add score: {e}")

    def update(
        self,
        output: Optional[Any] = None,
        metadata: Optional[dict] = None,
        tags: Optional[list[str]] = None,
    ) -> None:
        """
        Update the trace with additional data.

        Args:
            output: Output data to attach
            metadata: Additional metadata to merge
            tags: Additional tags to add
        """
        if not self._trace:
            return

        try:
            update_kwargs = {}
            if output is not None:
                update_kwargs["output"] = output
            if metadata:
                update_kwargs["metadata"] = {**self.metadata, **metadata}
            if tags:
                update_kwargs["tags"] = self.tags + tags

            if update_kwargs:
                self._trace.update_trace(**update_kwargs)
        except Exception as e:
            logger.warning(f"Failed to update trace: {e}")


# =============================================================================
# Decorator for Traced Functions
# =============================================================================

def traced(
    name: Optional[str] = None,
    capture_input: bool = True,
    capture_output: bool = True,
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    Decorator to automatically trace a function.

    Creates a span for the function execution within the current trace context.

    Args:
        name: Optional span name (default: function name)
        capture_input: Whether to capture function arguments
        capture_output: Whether to capture return value

    Example:
        @traced(name="process-task")
        def process_task(task_id: str, data: dict) -> dict:
            # Function execution is automatically traced
            return {"status": "done"}
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        span_name = name or func.__name__

        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            client = get_langfuse_client()
            if not client:
                # No tracing, just run function
                return func(*args, **kwargs)

            # Create a trace for this function call
            input_data = None
            if capture_input:
                input_data = {"args": str(args), "kwargs": str(kwargs)}

            span = client.start_span(name=span_name, input=input_data)

            try:
                result = func(*args, **kwargs)

                if capture_output:
                    span.update(output={"result": str(result)[:1000]})

                return result
            except Exception as e:
                span.update(output={"error": str(e)})
                raise
            finally:
                try:
                    span.end()
                except Exception:
                    pass
                flush_langfuse()

        return wrapper
    return decorator


# =============================================================================
# Agent Tracing Utilities
# =============================================================================

def create_agent_callback(
    agent_name: str,
    task_id: str,
    session_id: Optional[str] = None,
) -> Optional["LangfuseCallbackHandler"]:
    """
    Create a LangChain callback handler pre-configured for an agent.

    Convenience wrapper around get_langchain_callback with agent-specific settings.

    Args:
        agent_name: Name of the agent (e.g., "Alex", "Jacob")
        task_id: Task identifier
        session_id: Optional workflow session ID

    Returns:
        LangfuseCallbackHandler configured for the agent.

    Example:
        callback = create_agent_callback("Alex", "CLI-009", session_id="wf-123")
        llm = ChatAnthropic(...)
        response = llm.invoke(messages, config={"callbacks": [callback]})
    """
    return get_langchain_callback(
        trace_name=f"{agent_name}:{task_id}",
        session_id=session_id,
        user_id=agent_name,
        metadata={
            "agent": agent_name,
            "task_id": task_id,
        },
        tags=[f"agent:{agent_name.lower()}", f"task:{task_id}"],
    )


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
        trace: Langfuse trace object
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

        trace.update_trace(output=output)

        # Add verdict as a score if it's a review
        if verdict:
            verdict_value = {"APPROVED": 1.0, "NEEDS_FIXES": 0.5, "BLOCKED": 0.0}.get(
                verdict, 0.5
            )
            trace.score_trace(
                name="review_verdict",
                value=verdict_value,
                comment=f"Jacob verdict: {verdict}",
            )
    except Exception as e:
        logger.warning(f"Failed to log agent result: {e}")


# =============================================================================
# Metrics and Cost Tracking
# =============================================================================

@dataclass
class UsageMetrics:
    """Token usage and cost metrics."""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0

    def to_dict(self) -> dict:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "estimated_cost_usd": self.estimated_cost_usd,
        }


# Cost per 1M tokens (as of Dec 2025)
MODEL_COSTS = {
    "claude-opus-4-5-20251101": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0},
    "gpt-4o": {"input": 2.5, "output": 10.0},
}


def estimate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> float:
    """
    Estimate the cost of an LLM call.

    Args:
        model: Model name
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Estimated cost in USD
    """
    costs = MODEL_COSTS.get(model, {"input": 5.0, "output": 20.0})
    input_cost = (input_tokens / 1_000_000) * costs["input"]
    output_cost = (output_tokens / 1_000_000) * costs["output"]
    return round(input_cost + output_cost, 6)


# =============================================================================
# Re-export observe decorator
# =============================================================================

# Re-export observe for convenient import
__all__ = [
    # Client management
    "get_langfuse_client",
    "flush_langfuse",
    "shutdown_langfuse",
    "LANGFUSE_AVAILABLE",
    # LangChain integration
    "get_langchain_callback",
    "create_agent_callback",
    # Tracing utilities
    "create_trace",
    "TracedWorkflow",
    "traced",
    "observe",
    # Agent utilities
    "log_agent_result",
    # Metrics
    "UsageMetrics",
    "estimate_cost",
    "MODEL_COSTS",
]
