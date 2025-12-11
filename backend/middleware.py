"""
EISLAW API Middleware

- Correlation ID injection for request tracing
- Request/Response logging
- Performance timing
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from backend.logging_config import (
    logger,
    set_correlation_id,
    get_correlation_id,
)


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Middleware to inject and track correlation IDs across requests."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get or generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID")
        if not correlation_id:
            correlation_id = f"req-{uuid.uuid4().hex[:12]}"
        
        # Set in context for logging
        set_correlation_id(correlation_id)
        
        # Log request start
        start_time = time.time()
        logger.info(
            "Request started",
            method=request.method,
            path=str(request.url.path),
            query=str(request.query_params) if request.query_params else None,
            client_ip=request.client.host if request.client else None,
        )
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = round((time.time() - start_time) * 1000, 2)
            
            # Log request completion
            log_method = logger.warning if response.status_code >= 400 else logger.info
            log_method(
                "Request completed",
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                duration_ms=duration_ms,
            )
            
            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id
            
            return response
            
        except Exception as e:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.exception(
                "Request failed with exception",
                method=request.method,
                path=str(request.url.path),
                duration_ms=duration_ms,
                error=str(e),
            )
            raise


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Lightweight middleware for basic request logging without correlation ID."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        
        # Only log slow requests or errors
        if duration_ms > 1000 or response.status_code >= 400:
            logger.warning(
                "Slow or failed request",
                method=request.method,
                path=str(request.url.path),
                status_code=response.status_code,
                duration_ms=duration_ms,
            )
        
        return response
