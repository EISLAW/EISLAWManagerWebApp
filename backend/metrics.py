"""
EISLAW Prometheus Metrics

Exposes /metrics endpoint for Prometheus scraping.
"""

import time
from functools import wraps
from typing import Callable

# Try to import prometheus_client, gracefully handle if not installed
try:
    from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False


# Define metrics only if prometheus is available
if PROMETHEUS_AVAILABLE:
    # Request metrics
    REQUEST_COUNT = Counter(
        "eislaw_http_requests_total",
        "Total HTTP requests",
        ["method", "endpoint", "status"]
    )

    REQUEST_LATENCY = Histogram(
        "eislaw_http_request_duration_seconds",
        "HTTP request latency in seconds",
        ["method", "endpoint"],
        buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    )

    # Business metrics
    ACTIVE_CLIENTS = Gauge(
        "eislaw_active_clients",
        "Number of active clients"
    )

    TASKS_COUNT = Gauge(
        "eislaw_tasks_total",
        "Total tasks",
        ["status"]
    )

    # External API metrics
    EXTERNAL_API_CALLS = Counter(
        "eislaw_external_api_calls_total",
        "External API calls",
        ["provider", "status"]
    )

    EXTERNAL_API_LATENCY = Histogram(
        "eislaw_external_api_duration_seconds",
        "External API call latency",
        ["provider"],
        buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
    )


def get_metrics_response():
    """Generate Prometheus metrics response."""
    if not PROMETHEUS_AVAILABLE:
        return "# Prometheus client not installed\n", "text/plain"

    return generate_latest(), CONTENT_TYPE_LATEST


def track_request(method: str, endpoint: str, status: int, duration: float):
    """Track an HTTP request."""
    if not PROMETHEUS_AVAILABLE:
        return

    # Normalize endpoint to avoid high cardinality
    normalized_endpoint = normalize_endpoint(endpoint)

    REQUEST_COUNT.labels(method=method, endpoint=normalized_endpoint, status=str(status)).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=normalized_endpoint).observe(duration)


def track_external_api(provider: str, success: bool, duration: float):
    """Track an external API call."""
    if not PROMETHEUS_AVAILABLE:
        return

    status = "success" if success else "error"
    EXTERNAL_API_CALLS.labels(provider=provider, status=status).inc()
    EXTERNAL_API_LATENCY.labels(provider=provider).observe(duration)


def set_active_clients(count: int):
    """Set the active clients gauge."""
    if PROMETHEUS_AVAILABLE:
        ACTIVE_CLIENTS.set(count)


def set_tasks_count(pending: int, completed: int, in_progress: int):
    """Set task counts by status."""
    if PROMETHEUS_AVAILABLE:
        TASKS_COUNT.labels(status="pending").set(pending)
        TASKS_COUNT.labels(status="completed").set(completed)
        TASKS_COUNT.labels(status="in_progress").set(in_progress)


def normalize_endpoint(path: str) -> str:
    """
    Normalize endpoint path to reduce cardinality.
    Replaces UUIDs and IDs with placeholders.
    """
    import re

    # Replace UUIDs
    path = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '{id}', path, flags=re.I)

    # Replace numeric IDs
    path = re.sub(r'/\d+(?=/|$)', '/{id}', path)

    return path


def timed_external_call(provider: str):
    """
    Decorator to time external API calls.

    Usage:
        @timed_external_call("gemini")
        def call_gemini_api():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                track_external_api(provider, True, time.time() - start)
                return result
            except Exception as e:
                track_external_api(provider, False, time.time() - start)
                raise
        return wrapper
    return decorator
