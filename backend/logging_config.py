"""
EISLAW Structured Logging Configuration

Industry-standard logging with:
- JSON structured format
- Correlation IDs for request tracing
- Log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Automatic context injection (service, timestamp, etc.)
- PII filtering
"""

import logging
import json
import sys
import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from contextvars import ContextVar

# PII filtering
try:
    from backend.pii_filter import pii_filter
except ImportError:
    try:
        from pii_filter import pii_filter
    except ImportError:
        # Fallback - no PII filtering
        class DummyFilter:
            def filter(self, data):
                return data
        pii_filter = DummyFilter()

# Context variable for correlation ID (thread-safe)
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="-")


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging with PII filtering."""

    def __init__(self, service: str = "api", filter_pii: bool = True):
        super().__init__()
        self.service = service
        self.filter_pii = filter_pii

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": self.service,
            "correlation_id": correlation_id_var.get(),
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add location info for errors
        if record.levelno >= logging.WARNING:
            log_entry["location"] = {
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName,
            }

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add extra fields if provided
        extra_fields = getattr(record, "extra_fields", None)
        if extra_fields:
            # Filter PII from extra fields
            if self.filter_pii:
                log_entry["details"] = pii_filter.filter(extra_fields)
            else:
                log_entry["details"] = extra_fields

        return json.dumps(log_entry, ensure_ascii=False, default=str)


class EISLAWLogger:
    """Enhanced logger with structured output and context support."""

    def __init__(self, name: str, service: str = "api", filter_pii: bool = True):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        self.service = service
        self.filter_pii = filter_pii

        # Remove existing handlers
        self.logger.handlers.clear()

        # Add JSON handler to stdout
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.DEBUG)
        handler.setFormatter(JSONFormatter(service=service, filter_pii=filter_pii))
        self.logger.addHandler(handler)

        # Prevent propagation to root logger
        self.logger.propagate = False

    def _log(self, level: int, message: str, **kwargs):
        """Internal log method with extra fields support."""
        extra = {"extra_fields": kwargs} if kwargs else {}
        self.logger.log(level, message, extra=extra)

    def debug(self, message: str, **kwargs):
        self._log(logging.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs):
        self._log(logging.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs):
        self._log(logging.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs):
        self._log(logging.ERROR, message, **kwargs)

    def critical(self, message: str, **kwargs):
        self._log(logging.CRITICAL, message, **kwargs)

    def exception(self, message: str, **kwargs):
        """Log with exception traceback."""
        extra = {"extra_fields": kwargs} if kwargs else {}
        self.logger.exception(message, extra=extra)


def get_correlation_id() -> str:
    """Get current correlation ID."""
    return correlation_id_var.get()


def set_correlation_id(cid: Optional[str] = None) -> str:
    """Set correlation ID for current context. Generates new one if not provided."""
    if cid is None:
        cid = f"req-{uuid.uuid4().hex[:12]}"
    correlation_id_var.set(cid)
    return cid


def get_logger(name: str, service: str = "api", filter_pii: bool = True) -> EISLAWLogger:
    """Factory function to get a configured logger."""
    return EISLAWLogger(name, service, filter_pii)


# Default logger instance for the API
logger = get_logger("eislaw.api")
