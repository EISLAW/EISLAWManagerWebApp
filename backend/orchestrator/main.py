"""
EISLAW Agent Orchestrator - FastAPI Service
Created by Jane (DevOps) - AOS-019/020/021
Enhanced by Alex (AOS-023) - config integration
Enhanced by Alex (AOS-025) - POC workflow endpoints

POC service for Microsoft Agent Framework + Langfuse integration.
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from datetime import datetime
from typing import Optional

from .config import config
from .agents import list_agents, get_agent
from .workflow import run_poc_workflow, WorkflowResult

app = FastAPI(
    title="EISLAW Agent Orchestrator",
    description="Microsoft Agent Framework + Langfuse integration for EISLAW agents",
    version=config.version,
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://20.217.86.4:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """
    Health check endpoint for Docker health check.

    Returns service status and configuration state.
    Used by docker-compose healthcheck: curl -f http://localhost:8801/health
    """
    return {
        "status": "ok",
        "service": config.service_name,
        "version": config.version,
        "timestamp": datetime.utcnow().isoformat(),
        "config": config.get_status(),
    }


@app.get("/")
def root():
    """Root endpoint with service info."""
    return {
        "service": "EISLAW Agent Orchestrator",
        "version": config.version,
        "docs": "/docs",
        "health": "/health",
        "status": "/status",
    }


@app.get("/status")
def status():
    """
    Detailed status endpoint for debugging.

    Shows full configuration status including which API keys are configured.
    """
    return {
        "service": config.service_name,
        "version": config.version,
        "timestamp": datetime.utcnow().isoformat(),
        "langfuse": {
            "configured": config.langfuse.is_configured,
            "host": config.langfuse.host,
        },
        "llm_providers": {
            "anthropic": config.llm.has_anthropic,
            "openai": config.llm.has_openai,
            "gemini": config.llm.has_gemini,
        },
        "team_inbox": {
            "path": config.team_inbox_path,
        },
    }


@app.get("/agents")
def agents():
    """
    List all available agents with their metadata.

    Returns agent definitions including name, role, model, and available tools.
    Created by Alex (AOS-024).
    """
    return {
        "agents": list_agents(),
        "count": len(list_agents()),
    }


@app.get("/agents/{name}")
def agent_detail(name: str):
    """
    Get details of a specific agent by name.

    Args:
        name: Agent name (case-insensitive, e.g., "alex" or "jacob")

    Returns:
        Agent definition including instructions, tools, and model settings.
    """
    try:
        agent = get_agent(name)
        return {
            "name": agent.name,
            "role": agent.role,
            "goal": agent.goal,
            "model": agent.model,
            "temperature": agent.temperature,
            "max_tokens": agent.max_tokens,
            "tools": [t.name for t in agent.tools],
            "instructions": agent.instructions,
        }
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# POC Workflow Endpoints (AOS-025)
# =============================================================================

class WorkflowRequest(BaseModel):
    """Request body for triggering a workflow."""
    task_id: str = Field(..., description="Task identifier (e.g., 'AOS-025-POC')")
    task_description: str = Field(..., description="Description of what Alex should implement")
    max_iterations: int = Field(default=3, ge=1, le=10, description="Maximum review loops")


class WorkflowResponse(BaseModel):
    """Response from a workflow execution."""
    workflow_name: str
    task_id: str
    status: str
    verdict: Optional[str] = None
    iterations: int
    total_duration_ms: int
    error: Optional[str] = None
    steps: list[dict]


# In-memory storage for workflow results (POC only - production would use DB)
_workflow_results: dict[str, WorkflowResult] = {}


@app.post("/workflow/poc", response_model=WorkflowResponse)
def run_workflow_poc(request: WorkflowRequest):
    """
    Execute the POC workflow: Alex implements -> Jacob reviews.

    This is a synchronous endpoint that runs the full workflow and returns
    the result. For production, use the async /workflow/poc/async endpoint.

    Per PRD §8.3:
    - Alex implements the task
    - Jacob reviews Alex's work
    - If APPROVED -> workflow completes
    - If NEEDS_FIXES -> Alex fixes, Jacob re-reviews (up to max_iterations)
    - If BLOCKED -> workflow stops, escalation required

    Args:
        request: WorkflowRequest with task_id, task_description, max_iterations

    Returns:
        WorkflowResponse with status, verdict, and execution details.
    """
    result = run_poc_workflow(
        task_id=request.task_id,
        task_description=request.task_description,
        max_iterations=request.max_iterations,
    )

    # Store result
    _workflow_results[request.task_id] = result

    return WorkflowResponse(**result.to_dict())


@app.post("/workflow/poc/async")
async def run_workflow_poc_async(request: WorkflowRequest, background_tasks: BackgroundTasks):
    """
    Start the POC workflow asynchronously.

    Returns immediately with a task_id. Use GET /workflow/{task_id} to check status.

    Args:
        request: WorkflowRequest with task_id, task_description, max_iterations

    Returns:
        Task ID and status URL.
    """
    # Check if task_id already exists
    if request.task_id in _workflow_results:
        raise HTTPException(
            status_code=409,
            detail=f"Task {request.task_id} already exists. Use a unique task_id."
        )

    # Mark as running
    _workflow_results[request.task_id] = WorkflowResult(
        workflow_name="POC-AlexJacob",
        task_id=request.task_id,
        status="running",
    )

    # Run in background
    def run_background():
        result = run_poc_workflow(
            task_id=request.task_id,
            task_description=request.task_description,
            max_iterations=request.max_iterations,
        )
        _workflow_results[request.task_id] = result

    background_tasks.add_task(run_background)

    return {
        "task_id": request.task_id,
        "status": "running",
        "status_url": f"/workflow/{request.task_id}",
    }


@app.get("/workflow/{task_id}")
def get_workflow_status(task_id: str):
    """
    Get the status/result of a workflow execution.

    Args:
        task_id: The task identifier used when starting the workflow.

    Returns:
        WorkflowResult or 404 if not found.
    """
    if task_id not in _workflow_results:
        raise HTTPException(status_code=404, detail=f"Workflow {task_id} not found")

    result = _workflow_results[task_id]
    return result.to_dict()


@app.get("/workflows")
def list_workflows():
    """
    List all workflow executions (POC - in-memory storage).

    Returns:
        List of workflow task_ids with their status.
    """
    return {
        "workflows": [
            {
                "task_id": task_id,
                "status": result.status,
                "verdict": result.verdict,
                "iterations": result.iterations,
            }
            for task_id, result in _workflow_results.items()
        ],
        "count": len(_workflow_results),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8801)
