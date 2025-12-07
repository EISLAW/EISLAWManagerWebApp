"""
Routers package for EISLAW API
Each module handles a specific domain of endpoints.
"""
from .clients import router as clients_router
from .tasks import router as tasks_router
from .privacy import router as privacy_router
from .quote_templates import router as quote_templates_router
from .metrics import router as metrics_router
from .agents import router as agents_router

__all__ = [
    "clients_router",
    "tasks_router",
    "privacy_router",
    "quote_templates_router",
    "metrics_router",
    "agents_router",
]
