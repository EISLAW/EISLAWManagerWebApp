"""
Metrics Router - Exposes /metrics endpoint for Prometheus
"""

from fastapi import APIRouter, Response

try:
    from backend.metrics import get_metrics_response
except ImportError:
    from metrics import get_metrics_response

router = APIRouter(tags=["Monitoring"])


@router.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint.
    
    Returns metrics in Prometheus text format for scraping.
    """
    content, content_type = get_metrics_response()
    return Response(content=content, media_type=content_type)
