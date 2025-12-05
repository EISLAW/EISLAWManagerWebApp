"""
EISLAW Worker Logging Configuration

Shared logging for background workers (email_sync, fillout_sync, etc.)
Uses same JSON format as main API for log aggregation.
"""

import logging
import json
import sys
from datetime import datetime, timezone
from typing import Optional


class WorkerJSONFormatter(logging.Formatter):
    """JSON formatter for worker logs."""

    def __init__(self, service: str = "worker"):
        super().__init__()
        self.service = service

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": self.service,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add location info for warnings and errors
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
            log_entry["details"] = extra_fields

        return json.dumps(log_entry, ensure_ascii=False, default=str)


class WorkerLogger:
    """Logger for background workers."""

    def __init__(self, name: str, service: str = "worker"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        self.service = service

        # Remove existing handlers
        self.logger.handlers.clear()

        # Add JSON handler to stdout
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.DEBUG)
        handler.setFormatter(WorkerJSONFormatter(service=service))
        self.logger.addHandler(handler)

        self.logger.propagate = False

    def _log(self, level: int, message: str, **kwargs):
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

    def exception(self, message: str, **kwargs):
        extra = {"extra_fields": kwargs} if kwargs else {}
        self.logger.exception(message, extra=extra)


def get_worker_logger(name: str, service: str = "sync") -> WorkerLogger:
    """Factory function to get a worker logger."""
    return WorkerLogger(name, service)
