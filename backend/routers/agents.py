"""
Agents API Router

Provides REST endpoints for:
- Listing and viewing agents
- Listing and viewing tools
- Managing approvals (list, approve, reject)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dataclasses import asdict

from backend.agents.registry import list_agents, get_agent
from backend.agents.tools import list_tools, get_tool, TOOLS
from backend.agents.approvals import (
    get_pending_approvals,
    get_recent_approvals,
    get_approval,
    approve_action,
    reject_action,
    create_approval,
    get_approval_stats
)

router = APIRouter(prefix="/api/agents", tags=["agents"])


# === Agent Endpoints ===

@router.get("/")
def get_agents(include_disabled: bool = False):
    """
    List all agents.

    By default only returns enabled agents.
    Use ?include_disabled=true to include all.
    """
    agents = list_agents(enabled_only=not include_disabled)
    return [
        {
            "id": a.id,
            "name": a.name,
            "name_he": a.name_he,
            "description": a.description,
            "tools_count": len(a.tools),
            "triggers": a.triggers,
            "approval_required": a.approval_required,
            "enabled": a.enabled
        }
        for a in agents
    ]


@router.get("/{agent_id}")
def get_agent_detail(agent_id: str):
    """
    Get agent details including its tools.
    """
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Get full tool configs for agent's tools
    agent_tools = []
    for tool_id in agent.tools:
        tool = get_tool(tool_id)
        if tool:
            agent_tools.append({
                "id": tool.id,
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters,
                "risk_level": tool.risk_level.value,
                "requires_approval": tool.requires_approval
            })

    return {
        "id": agent.id,
        "name": agent.name,
        "name_he": agent.name_he,
        "description": agent.description,
        "tools": agent_tools,
        "triggers": agent.triggers,
        "approval_required": agent.approval_required,
        "enabled": agent.enabled
    }


# === Tool Endpoints ===

@router.get("/tools/")
def get_all_tools():
    """List all available tools"""
    tools = list_tools()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "parameters": t.parameters,
            "risk_level": t.risk_level.value,
            "requires_approval": t.requires_approval
        }
        for t in tools
    ]


@router.get("/tools/{tool_id}")
def get_tool_detail(tool_id: str):
    """Get tool details"""
    tool = get_tool(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    return {
        "id": tool.id,
        "name": tool.name,
        "description": tool.description,
        "parameters": tool.parameters,
        "risk_level": tool.risk_level.value,
        "requires_approval": tool.requires_approval
    }


# === Approval Endpoints ===

@router.get("/approvals/")
def get_approvals(status: str = "pending", agent_id: str = None, limit: int = 50):
    """
    List approvals.

    Filter by:
    - status: pending, approved, rejected, expired (default: pending)
    - agent_id: Filter by agent
    - limit: Max results (default: 50)
    """
    if status == "pending":
        approvals = get_pending_approvals(agent_id)
    else:
        approvals = get_recent_approvals(limit)
        if status != "all":
            approvals = [a for a in approvals if a.get('status') == status]
        if agent_id:
            approvals = [a for a in approvals if a.get('agent_id') == agent_id]

    return approvals[:limit]


@router.get("/approvals/stats")
def approvals_stats():
    """Get approval counts by status"""
    return get_approval_stats()


@router.get("/approvals/{approval_id}")
def get_approval_detail(approval_id: str):
    """Get single approval details"""
    approval = get_approval(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    return approval


class ApproveRequest(BaseModel):
    """Request body for approving an action"""
    user: str = "admin"


@router.post("/approvals/{approval_id}/approve")
def approve(approval_id: str, request: ApproveRequest = ApproveRequest()):
    """
    Approve a pending action.

    Returns 404 if approval not found or already resolved.
    """
    success = approve_action(approval_id, request.user)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Approval not found or already resolved"
        )
    return {"status": "approved", "id": approval_id}


class RejectRequest(BaseModel):
    """Request body for rejecting an action"""
    reason: str = ""
    user: str = "admin"


@router.post("/approvals/{approval_id}/reject")
def reject(approval_id: str, request: RejectRequest):
    """
    Reject a pending action with reason.

    Returns 404 if approval not found or already resolved.
    """
    success = reject_action(approval_id, request.reason, request.user)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Approval not found or already resolved"
        )
    return {"status": "rejected", "id": approval_id, "reason": request.reason}


# === Test/Debug Endpoints ===

class CreateApprovalRequest(BaseModel):
    """Request body for creating a test approval"""
    agent_id: str
    tool_id: str
    action_name: str
    description: str
    parameters: Dict[str, Any] = {}
    risk_level: str = "high"
    context: str = None


@router.post("/approvals/create")
def create_test_approval(request: CreateApprovalRequest):
    """
    Create a test approval (for development/testing).

    In production, approvals are created by the agent execution engine.
    """
    approval_id = create_approval(
        agent_id=request.agent_id,
        tool_id=request.tool_id,
        action_name=request.action_name,
        description=request.description,
        parameters=request.parameters,
        risk_level=request.risk_level,
        context=request.context
    )
    return {"id": approval_id, "status": "pending"}
