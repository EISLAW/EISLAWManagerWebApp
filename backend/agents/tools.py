"""
Tool Registry

Defines all tools available to agents with their:
- ID: Unique identifier matching function name
- Name: Display name
- Description: What the tool does
- Parameters: Expected input parameters
- risk_level: LOW/MEDIUM/HIGH
- requires_approval: Whether execution needs human approval
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from .registry import RiskLevel, get_agent


@dataclass
class ToolConfig:
    """Configuration for a single tool"""
    id: str
    name: str
    description: str
    parameters: Dict[str, Any]
    risk_level: RiskLevel
    requires_approval: bool = False

    def __post_init__(self):
        # HIGH risk tools always require approval
        if self.risk_level == RiskLevel.HIGH:
            self.requires_approval = True


# Tool Registry - All available tools
TOOLS: Dict[str, ToolConfig] = {
    # === Existing Tools (from ai_studio_tools.py) ===

    "search_clients": ToolConfig(
        id="search_clients",
        name="Search Clients",
        description="Search clients by name, email, or phone number",
        parameters={
            "query": {"type": "string", "required": True, "description": "Search query"}
        },
        risk_level=RiskLevel.LOW
    ),

    "get_client_details": ToolConfig(
        id="get_client_details",
        name="Get Client Details",
        description="Get full client information by ID",
        parameters={
            "client_id": {"type": "string", "required": True, "description": "Client ID"}
        },
        risk_level=RiskLevel.LOW
    ),

    "create_task": ToolConfig(
        id="create_task",
        name="Create Task",
        description="Create a new task in the system",
        parameters={
            "title": {"type": "string", "required": True, "description": "Task title"},
            "client_id": {"type": "string", "description": "Associated client ID"},
            "due_date": {"type": "string", "description": "Due date (YYYY-MM-DD)"},
            "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Priority level"}
        },
        risk_level=RiskLevel.MEDIUM
    ),

    "update_task_status": ToolConfig(
        id="update_task_status",
        name="Update Task Status",
        description="Update the status of an existing task",
        parameters={
            "task_id": {"type": "string", "required": True, "description": "Task ID"},
            "status": {"type": "string", "required": True, "enum": ["todo", "in_progress", "done"], "description": "New status"}
        },
        risk_level=RiskLevel.MEDIUM
    ),

    "search_tasks": ToolConfig(
        id="search_tasks",
        name="Search Tasks",
        description="Search tasks by title, status, or client",
        parameters={
            "query": {"type": "string", "description": "Search query"},
            "status": {"type": "string", "enum": ["todo", "in_progress", "done"], "description": "Filter by status"},
            "client_id": {"type": "string", "description": "Filter by client ID"}
        },
        risk_level=RiskLevel.LOW
    ),

    "get_system_summary": ToolConfig(
        id="get_system_summary",
        name="Get System Summary",
        description="Get summary of clients, tasks, and activity",
        parameters={},
        risk_level=RiskLevel.LOW
    ),

    # === Privacy Tools ===

    "get_privacy_submission": ToolConfig(
        id="get_privacy_submission",
        name="Get Privacy Submission",
        description="Fetch a privacy form submission by ID",
        parameters={
            "submission_id": {"type": "string", "required": True, "description": "Submission ID"}
        },
        risk_level=RiskLevel.LOW
    ),

    "calculate_privacy_score": ToolConfig(
        id="calculate_privacy_score",
        name="Calculate Privacy Score",
        description="Calculate security level and recommendations from submission answers",
        parameters={
            "submission_id": {"type": "string", "required": True, "description": "Submission ID"}
        },
        risk_level=RiskLevel.LOW
    ),

    "draft_privacy_email": ToolConfig(
        id="draft_privacy_email",
        name="Draft Privacy Email",
        description="Generate email draft for privacy assessment results",
        parameters={
            "submission_id": {"type": "string", "required": True, "description": "Submission ID"},
            "selected_modules": {"type": "array", "required": True, "description": "Selected compliance modules"},
            "selected_level": {"type": "string", "required": True, "description": "Selected security level"}
        },
        risk_level=RiskLevel.MEDIUM
    ),

    "send_privacy_email": ToolConfig(
        id="send_privacy_email",
        name="Send Privacy Email",
        description="Send email to client with privacy assessment (requires approval)",
        parameters={
            "submission_id": {"type": "string", "required": True, "description": "Submission ID"},
            "email_draft_id": {"type": "string", "required": True, "description": "Draft ID from draft_privacy_email"}
        },
        risk_level=RiskLevel.HIGH,
        requires_approval=True
    ),

    "publish_privacy_report": ToolConfig(
        id="publish_privacy_report",
        name="Publish Privacy Report",
        description="Publish PDF report for submission (requires approval)",
        parameters={
            "submission_id": {"type": "string", "required": True, "description": "Submission ID"}
        },
        risk_level=RiskLevel.HIGH,
        requires_approval=True
    ),

    # === Client Tools ===

    "create_client": ToolConfig(
        id="create_client",
        name="Create Client",
        description="Create a new client record",
        parameters={
            "name": {"type": "string", "required": True, "description": "Client name"},
            "email": {"type": "string", "description": "Email address"},
            "phone": {"type": "string", "description": "Phone number"},
            "company": {"type": "string", "description": "Company name"}
        },
        risk_level=RiskLevel.MEDIUM
    ),

    # === Notification Tools ===

    "send_notification": ToolConfig(
        id="send_notification",
        name="Send Notification",
        description="Send notification to user or external service (requires approval)",
        parameters={
            "type": {"type": "string", "required": True, "enum": ["email", "slack", "internal"], "description": "Notification type"},
            "recipient": {"type": "string", "required": True, "description": "Recipient ID or address"},
            "message": {"type": "string", "required": True, "description": "Notification content"}
        },
        risk_level=RiskLevel.HIGH,
        requires_approval=True
    ),

    # === Document Tools (Phase 3) ===

    "transcribe_document": ToolConfig(
        id="transcribe_document",
        name="Transcribe Document",
        description="Extract text content from a document",
        parameters={
            "document_id": {"type": "string", "required": True, "description": "Document ID"}
        },
        risk_level=RiskLevel.LOW
    ),

    "extract_entities": ToolConfig(
        id="extract_entities",
        name="Extract Entities",
        description="Extract named entities from document text",
        parameters={
            "document_id": {"type": "string", "required": True, "description": "Document ID"}
        },
        risk_level=RiskLevel.LOW
    ),

    "classify_document": ToolConfig(
        id="classify_document",
        name="Classify Document",
        description="Classify document by type (contract, letter, etc.)",
        parameters={
            "document_id": {"type": "string", "required": True, "description": "Document ID"}
        },
        risk_level=RiskLevel.LOW
    ),

    "tag_document": ToolConfig(
        id="tag_document",
        name="Tag Document",
        description="Apply tags to a document",
        parameters={
            "document_id": {"type": "string", "required": True, "description": "Document ID"},
            "tags": {"type": "array", "required": True, "description": "List of tags to apply"}
        },
        risk_level=RiskLevel.MEDIUM
    )
}


def get_tool(tool_id: str) -> Optional[ToolConfig]:
    """Get tool configuration by ID"""
    return TOOLS.get(tool_id)


def list_tools(agent_id: str = None) -> List[ToolConfig]:
    """
    List tools.
    If agent_id provided, return only tools available to that agent.
    """
    if agent_id:
        agent = get_agent(agent_id)
        if agent:
            return [TOOLS[t] for t in agent.tools if t in TOOLS]
        return []
    return list(TOOLS.values())


def requires_approval(tool_id: str) -> bool:
    """Check if a tool requires human approval"""
    tool = get_tool(tool_id)
    return tool.requires_approval if tool else True  # Default to requiring approval


def get_tool_risk_level(tool_id: str) -> RiskLevel:
    """Get the risk level of a tool"""
    tool = get_tool(tool_id)
    return tool.risk_level if tool else RiskLevel.HIGH  # Default to HIGH


def get_tools_by_risk(risk_level: RiskLevel) -> List[ToolConfig]:
    """Get all tools with a specific risk level"""
    return [t for t in TOOLS.values() if t.risk_level == risk_level]
