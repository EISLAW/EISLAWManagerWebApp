"""
EISLAW Sentry Integration

Error tracking and performance monitoring.
"""

import os
from typing import Optional

# Only import sentry if available
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False


def init_sentry(dsn: Optional[str] = None) -> bool:
    """
    Initialize Sentry error tracking.

    Args:
        dsn: Sentry DSN. If not provided, reads from SENTRY_DSN env var.

    Returns:
        True if Sentry was initialized, False otherwise.
    """
    if not SENTRY_AVAILABLE:
        return False

    dsn = dsn or os.environ.get("SENTRY_DSN")
    if not dsn:
        return False

    sentry_sdk.init(
        dsn=dsn,
        # Performance monitoring
        traces_sample_rate=0.1,  # 10% of requests
        # Profiling
        profiles_sample_rate=0.1,
        # Environment
        environment=os.environ.get("ENVIRONMENT", "development"),
        # Release tracking
        release=os.environ.get("APP_VERSION", "0.1.0"),
        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
        ],
        # Filter sensitive data
        before_send=filter_sensitive_data,
        # Don't send PII by default
        send_default_pii=False,
    )
    return True


def filter_sensitive_data(event, hint):
    """
    Filter sensitive data from Sentry events.
    Removes API keys, tokens, passwords, and PII.
    """
    # List of sensitive keys to redact
    sensitive_keys = [
        "password", "passwd", "secret", "token", "api_key", "apikey",
        "authorization", "auth", "bearer", "credential", "private_key",
        "client_secret", "access_token", "refresh_token"
    ]

    def redact_dict(d):
        if not isinstance(d, dict):
            return d

        result = {}
        for key, value in d.items():
            key_lower = key.lower()
            if any(s in key_lower for s in sensitive_keys):
                result[key] = "[REDACTED]"
            elif isinstance(value, dict):
                result[key] = redact_dict(value)
            elif isinstance(value, list):
                result[key] = [redact_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
        return result

    # Redact request data
    if "request" in event:
        if "headers" in event["request"]:
            event["request"]["headers"] = redact_dict(event["request"]["headers"])
        if "data" in event["request"]:
            event["request"]["data"] = redact_dict(event["request"]["data"])

    # Redact extra context
    if "extra" in event:
        event["extra"] = redact_dict(event["extra"])

    return event


def capture_exception(exception: Exception, **context):
    """
    Capture an exception and send to Sentry with context.
    """
    if not SENTRY_AVAILABLE:
        return

    with sentry_sdk.push_scope() as scope:
        for key, value in context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_exception(exception)


def capture_message(message: str, level: str = "info", **context):
    """
    Capture a message and send to Sentry.
    """
    if not SENTRY_AVAILABLE:
        return

    with sentry_sdk.push_scope() as scope:
        for key, value in context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)
