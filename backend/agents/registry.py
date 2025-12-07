"""
Agent Registry

Defines all available agents and their configurations.
Each agent has:
- ID: Unique identifier
- Name: Display name (English)
- name_he: Display name (Hebrew)
- Description: What the agent does
- Tools: List of tool IDs the agent can use
- Triggers: Events that can activate the agent
- approval_required: Whether actions need human approval
- enabled: Whether the agent is currently active
"""

from typing import Dict, List, Optional
from enum import Enum
from dataclasses import dataclass, field


class RiskLevel(str, Enum):
    """Risk levels for agent actions"""
    LOW = "low"        # Read-only operations
    MEDIUM = "medium"  # Create/update internal records
    HIGH = "high"      # External communications, irreversible actions


@dataclass
class AgentConfig:
    """Configuration for a single agent"""
    id: str
    name: str
    name_he: str
    description: str
    tools: List[str]
    triggers: List[str]
    approval_required: bool = True
    enabled: bool = True


# Agent Registry - All available agents
AGENTS: Dict[str, AgentConfig] = {
    "privacy": AgentConfig(
        id="privacy",
        name="Privacy Assessment Agent",
        name_he="סוכן הערכת פרטיות",
        description="Auto-process privacy form submissions and generate recommendations",
        tools=[
            "get_privacy_submission",
            "calculate_privacy_score",
            "draft_privacy_email",
            "send_privacy_email",
            "publish_privacy_report"
        ],
        triggers=["new_privacy_submission", "manual"],
        approval_required=True,
        enabled=True
    ),
    "task": AgentConfig(
        id="task",
        name="Task Management Agent",
        name_he="סוכן ניהול משימות",
        description="Create and manage tasks from natural language commands",
        tools=[
            "search_clients",
            "get_client_details",
            "create_task",
            "update_task_status",
            "search_tasks",
            "get_system_summary"
        ],
        triggers=["manual"],
        approval_required=False,
        enabled=True
    ),
    "intake": AgentConfig(
        id="intake",
        name="Client Intake Agent",
        name_he="סוכן קליטת לקוחות",
        description="Process new client inquiries and create initial records",
        tools=[
            "search_clients",
            "create_client",
            "create_task",
            "send_notification"
        ],
        triggers=["new_inquiry", "manual"],
        approval_required=True,
        enabled=False  # Phase 3
    ),
    "document": AgentConfig(
        id="document",
        name="Document Analysis Agent",
        name_he="סוכן ניתוח מסמכים",
        description="Classify, tag, and extract information from uploaded documents",
        tools=[
            "transcribe_document",
            "extract_entities",
            "classify_document",
            "tag_document"
        ],
        triggers=["new_document_upload", "manual"],
        approval_required=False,
        enabled=False  # Phase 3
    )
}


def get_agent(agent_id: str) -> Optional[AgentConfig]:
    """Get agent configuration by ID"""
    return AGENTS.get(agent_id)


def list_agents(enabled_only: bool = True) -> List[AgentConfig]:
    """List all agents, optionally filtering by enabled status"""
    agents = list(AGENTS.values())
    if enabled_only:
        agents = [a for a in agents if a.enabled]
    return agents


def get_agent_tools(agent_id: str) -> List[str]:
    """Get list of tool IDs for an agent"""
    agent = get_agent(agent_id)
    return agent.tools if agent else []


def is_agent_enabled(agent_id: str) -> bool:
    """Check if an agent is enabled"""
    agent = get_agent(agent_id)
    return agent.enabled if agent else False
