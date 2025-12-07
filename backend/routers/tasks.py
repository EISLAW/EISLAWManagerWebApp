"""
Tasks API Router
Extracted from main.py - Uses SQLite via db_api_helpers
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

# Import from Joseph's DB layer
from backend.db_api_helpers import (
    load_tasks_from_sqlite,
    find_task_by_id,
    create_task_in_sqlite,
    update_task_in_sqlite,
    delete_task_from_sqlite,
    mark_task_done_in_sqlite,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    clientName: Optional[str] = None
    dueAt: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = "new"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    dueAt: Optional[str] = None
    priority: Optional[str] = None
    clientName: Optional[str] = None


@router.get("")
def get_tasks(
    status: Optional[str] = None,
    client: Optional[str] = None,
    limit: int = 100
):
    """Get all tasks, optionally filtered by status or client."""
    tasks = load_tasks_from_sqlite()

    if status:
        tasks = [t for t in tasks if t.get("status") == status]

    if client:
        tasks = [t for t in tasks if t.get("clientName", "").lower() == client.lower()]

    return {"tasks": tasks[:limit]}


@router.get("/summary")
def get_tasks_summary():
    """Get tasks summary statistics."""
    tasks = load_tasks_from_sqlite()

    summary = {
        "total": len(tasks),
        "by_status": {},
        "by_priority": {},
        "overdue": 0,
    }

    now = datetime.utcnow()
    for t in tasks:
        status = t.get("status", "new")
        priority = t.get("priority", "medium")
        summary["by_status"][status] = summary["by_status"].get(status, 0) + 1
        summary["by_priority"][priority] = summary["by_priority"].get(priority, 0) + 1

        due_at = t.get("dueAt")
        if due_at and t.get("status") != "done":
            try:
                due_date = datetime.fromisoformat(due_at.replace("Z", "+00:00"))
                if due_date.replace(tzinfo=None) < now:
                    summary["overdue"] += 1
            except:
                pass

    return summary


@router.get("/{task_id}")
def get_task(task_id: str):
    """Get a single task by ID."""
    task = find_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("")
def create_task(task: TaskCreate):
    """Create a new task."""
    task_data = task.dict(exclude_unset=True)
    task_data["desc"] = task_data.pop("description", "")

    task_id = create_task_in_sqlite(task_data)
    return {"id": task_id, "success": True}


@router.patch("/{task_id}")
def update_task(task_id: str, updates: TaskUpdate):
    """Update an existing task."""
    existing = find_task_by_id(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = updates.dict(exclude_unset=True)
    if "description" in update_data:
        update_data["desc"] = update_data.pop("description")

    success = update_task_in_sqlite(task_id, update_data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update task")

    return {"success": True}


@router.delete("/{task_id}")
def delete_task(task_id: str):
    """Delete a task."""
    existing = find_task_by_id(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")

    success = delete_task_from_sqlite(task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete task")

    return {"success": True}


@router.post("/{task_id}/done")
def mark_task_done(task_id: str, done: bool = True):
    """Mark a task as done or undone."""
    existing = find_task_by_id(task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")

    success = mark_task_done_in_sqlite(task_id, done)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update task")

    return {"success": True, "status": "done" if done else "new"}


@router.post("/{task_id}/subtask")
def create_subtask(task_id: str, payload: dict = Body(...)):
    """Create a subtask under a parent task."""
    parent = find_task_by_id(task_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent task not found")

    subtask_data = {
        "title": payload.get("title", "Subtask"),
        "desc": payload.get("description", ""),
        "clientName": parent.get("clientName"),
        "parentId": task_id,
        "source": "subtask",
        "status": "new",
    }

    subtask_id = create_task_in_sqlite(subtask_data)
    return {"id": subtask_id, "success": True}
