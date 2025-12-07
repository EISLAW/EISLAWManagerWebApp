"""
Prometheus Metrics Middleware for FastAPI

Automatically tracks request counts, latencies, and active requests.
"""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

try:
    from backend.metrics import track_request, PROMETHEUS_AVAILABLE
except ImportError:
    from metrics import track_request, PROMETHEUS_AVAILABLE

# Skip tracking for these endpoints
SKIP_ENDPOINTS = {
    "/metrics",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}


class PrometheusMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track HTTP request metrics for Prometheus.
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip metrics for certain endpoints
        if request.url.path in SKIP_ENDPOINTS:
            return await call_next(request)
        
        if not PROMETHEUS_AVAILABLE:
            return await call_next(request)
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            duration = time.time() - start_time
            
            track_request(
                method=request.method,
                endpoint=request.url.path,
                status=response.status_code,
                duration=duration
            )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            track_request(
                method=request.method,
                endpoint=request.url.path,
                status=500,
                duration=duration
            )
            raise
