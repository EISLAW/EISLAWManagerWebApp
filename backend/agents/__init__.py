"""
Agent System Package

This package provides the foundation for AI agents in EISLAW:
- Agent Registry: Manages agent configurations
- Tool Registry: Defines available tools with risk levels
- Approvals: Handles human-in-the-loop approval workflow
"""

from .registry import (
    AgentConfig,
    RiskLevel,
    get_agent,
    list_agents,
    get_agent_tools,
    AGENTS
)

from .tools import (
    ToolConfig,
    get_tool,
    list_tools,
    requires_approval,
    TOOLS
)

from .approvals import (
    create_approval,
    get_pending_approvals,
    approve_action,
    reject_action,
    get_approval
)

__all__ = [
    # Registry
    "AgentConfig",
    "RiskLevel",
    "get_agent",
    "list_agents",
    "get_agent_tools",
    "AGENTS",
    # Tools
    "ToolConfig",
    "get_tool",
    "list_tools",
    "requires_approval",
    "TOOLS",
    # Approvals
    "create_approval",
    "get_pending_approvals",
    "approve_action",
    "reject_action",
    "get_approval"
]
