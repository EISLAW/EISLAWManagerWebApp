# EISLAW Agent Orchestrator Service
# Created by Jane (DevOps) - AOS-019/020/021
# Enhanced by Alex (AOS-023) - config integration
# Enhanced by Alex (AOS-024) - agent definitions
# Enhanced by Alex (AOS-025) - POC workflow

from .config import config, load_config
from .main import app
from .agents import alex, jacob, get_agent, list_agents, AgentDefinition
from .workflow import (
    POCWorkflow,
    WorkflowResult,
    run_poc_workflow,
    parse_review_verdict,
    route_after_review,
    update_team_inbox,
)

__all__ = [
    # Main app
    "app",
    # Config
    "config",
    "load_config",
    # Agents
    "alex",
    "jacob",
    "get_agent",
    "list_agents",
    "AgentDefinition",
    # Workflow (AOS-025)
    "POCWorkflow",
    "WorkflowResult",
    "run_poc_workflow",
    "parse_review_verdict",
    "route_after_review",
    "update_team_inbox",
]
