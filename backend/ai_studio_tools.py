"""
AI Studio Tools Module - Tool definitions and execution for AI Agent
Enables the AI to perform actions in the EISLAW system.
"""
import json
import uuid
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# Tool Definitions (OpenAI Function Format)
# ─────────────────────────────────────────────────────────────

AVAILABLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_clients",
            "description": "Search for clients in the system by name, email, or phone. Use this when user asks about a client or needs to find client information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query - can be client name, email, or phone number"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_client_details",
            "description": "Get detailed information about a specific client by their ID. Use after search_clients to get full details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "string",
                        "description": "The UUID of the client"
                    }
                },
                "required": ["client_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_tasks",
            "description": "Search for tasks in the system. Can filter by client name, status, or priority.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query - task title or description"
                    },
                    "client_name": {
                        "type": "string",
                        "description": "Filter by client name (optional)"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["new", "in_progress", "done", "blocked"],
                        "description": "Filter by task status (optional)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results (default: 10)",
                        "default": 10
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": "Create a new task in the system. Use when user asks to add a task, reminder, or todo item.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Task title (required)"
                    },
                    "description": {
                        "type": "string",
                        "description": "Task description (optional)"
                    },
                    "client_name": {
                        "type": "string",
                        "description": "Name of the client this task is for (optional)"
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Due date in ISO format YYYY-MM-DD (optional)"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "Task priority (optional, default: medium)"
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task_status",
            "description": "Update the status of an existing task. Use when user wants to mark a task as done or change its status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The UUID of the task to update"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["new", "in_progress", "done", "blocked"],
                        "description": "New status for the task"
                    }
                },
                "required": ["task_id", "status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_system_summary",
            "description": "Get a summary of the system status - number of clients, tasks by status, etc. Use when user asks about system overview or statistics.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]

# ─────────────────────────────────────────────────────────────
# Internal API Base URL
# ─────────────────────────────────────────────────────────────

# When running inside Docker, the API is localhost
# When running outside, use the configured base
API_BASE = "http://localhost:8799"


# ─────────────────────────────────────────────────────────────
# Data Access Functions (direct JSON file access for efficiency)
# ─────────────────────────────────────────────────────────────

def get_data_dir() -> Path:
    """Get the data directory path."""
    if Path("/app/data").exists():
        return Path("/app/data")
    return Path(__file__).resolve().parent.parent / "data"


def load_clients() -> List[Dict]:
    """Load clients from JSON file."""
    clients_file = get_data_dir() / "clients.json"
    if not clients_file.exists():
        return []
    try:
        return json.loads(clients_file.read_text("utf-8"))
    except Exception:
        return []


def load_tasks() -> Dict:
    """Load tasks from JSON file."""
    tasks_file = get_data_dir() / "tasks.json"
    if not tasks_file.exists():
        return {"tasks": []}
    try:
        return json.loads(tasks_file.read_text("utf-8"))
    except Exception:
        return {"tasks": []}


def save_tasks(tasks_data: Dict):
    """Save tasks to JSON file."""
    tasks_file = get_data_dir() / "tasks.json"
    tasks_file.parent.mkdir(parents=True, exist_ok=True)
    tasks_file.write_text(json.dumps(tasks_data, ensure_ascii=False, indent=2), "utf-8")


# ─────────────────────────────────────────────────────────────
# Tool Execution Functions
# ─────────────────────────────────────────────────────────────

def execute_search_clients(query: str, limit: int = 5) -> Dict[str, Any]:
    """Search clients by name, email, or phone."""
    clients = load_clients()
    query_lower = query.lower()

    results = []
    for client in clients:
        # Search in name, email, and phone
        name = (client.get("name") or "").lower()
        email = (client.get("email") or "").lower()
        phone = (client.get("phone") or "").lower()

        if query_lower in name or query_lower in email or query_lower in phone:
            results.append({
                "id": client.get("id"),
                "name": client.get("name"),
                "email": client.get("email"),
                "phone": client.get("phone"),
                "active": client.get("active", True)
            })
            if len(results) >= limit:
                break

    return {
        "success": True,
        "query": query,
        "count": len(results),
        "clients": results
    }


def execute_get_client_details(client_id: str) -> Dict[str, Any]:
    """Get detailed information about a specific client."""
    clients = load_clients()

    for client in clients:
        if client.get("id") == client_id:
            return {
                "success": True,
                "client": {
                    "id": client.get("id"),
                    "name": client.get("name"),
                    "email": client.get("email"),
                    "phone": client.get("phone"),
                    "type": client.get("type", []),
                    "stage": client.get("stage"),
                    "notes": client.get("notes"),
                    "folderPath": client.get("folderPath"),
                    "contacts": client.get("contacts", []),
                    "createdAt": client.get("createdAt"),
                    "active": client.get("active", True)
                }
            }

    return {
        "success": False,
        "error": f"Client with ID {client_id} not found"
    }


def execute_search_tasks(
    query: str = None,
    client_name: str = None,
    status: str = None,
    limit: int = 10
) -> Dict[str, Any]:
    """Search tasks with optional filters."""
    tasks_data = load_tasks()
    tasks = tasks_data.get("tasks", [])

    results = []
    for task in tasks:
        # Skip deleted tasks
        if task.get("deletedAt"):
            continue

        # Filter by query
        if query:
            query_lower = query.lower()
            title = (task.get("title") or "").lower()
            desc = (task.get("desc") or "").lower()
            if query_lower not in title and query_lower not in desc:
                continue

        # Filter by client name
        if client_name:
            task_client = (task.get("clientName") or "").lower()
            if client_name.lower() not in task_client:
                continue

        # Filter by status
        if status and task.get("status") != status:
            continue

        results.append({
            "id": task.get("id"),
            "title": task.get("title"),
            "status": task.get("status"),
            "priority": task.get("priority"),
            "clientName": task.get("clientName"),
            "dueAt": task.get("dueAt"),
            "createdAt": task.get("createdAt")
        })

        if len(results) >= limit:
            break

    return {
        "success": True,
        "count": len(results),
        "tasks": results
    }


def execute_create_task(
    title: str,
    description: str = "",
    client_name: str = None,
    due_date: str = None,
    priority: str = "medium"
) -> Dict[str, Any]:
    """Create a new task in the system."""
    tasks_data = load_tasks()

    # Create new task
    now = datetime.utcnow().isoformat() + "Z"
    new_task = {
        "id": str(uuid.uuid4()),
        "title": title,
        "desc": description,
        "status": "new",
        "priority": priority,
        "clientName": client_name,
        "clientFolderPath": None,
        "ownerId": None,
        "parentId": None,
        "comments": [],
        "attachments": [],
        "templateRef": None,
        "source": "ai_studio",
        "createdAt": now,
        "updatedAt": now,
        "doneAt": None,
        "deletedAt": None
    }

    # Parse due date if provided
    if due_date:
        try:
            # Convert YYYY-MM-DD to ISO format with time
            new_task["dueAt"] = f"{due_date}T09:00:00Z"
        except Exception:
            pass

    # Add to tasks list
    tasks_data["tasks"].append(new_task)
    save_tasks(tasks_data)

    return {
        "success": True,
        "message": f"Task '{title}' created successfully",
        "task": {
            "id": new_task["id"],
            "title": new_task["title"],
            "status": new_task["status"],
            "priority": new_task["priority"],
            "clientName": new_task["clientName"],
            "dueAt": new_task.get("dueAt")
        }
    }


def execute_update_task_status(task_id: str, status: str) -> Dict[str, Any]:
    """Update the status of an existing task."""
    tasks_data = load_tasks()
    tasks = tasks_data.get("tasks", [])

    for task in tasks:
        if task.get("id") == task_id:
            old_status = task.get("status")
            task["status"] = status
            task["updatedAt"] = datetime.utcnow().isoformat() + "Z"

            # Set doneAt if marking as done
            if status == "done" and old_status != "done":
                task["doneAt"] = datetime.utcnow().isoformat() + "Z"
            elif status != "done":
                task["doneAt"] = None

            save_tasks(tasks_data)

            return {
                "success": True,
                "message": f"Task status updated from '{old_status}' to '{status}'",
                "task": {
                    "id": task["id"],
                    "title": task["title"],
                    "status": task["status"]
                }
            }

    return {
        "success": False,
        "error": f"Task with ID {task_id} not found"
    }


def execute_get_system_summary() -> Dict[str, Any]:
    """Get a summary of the system status."""
    clients = load_clients()
    tasks_data = load_tasks()
    tasks = tasks_data.get("tasks", [])

    # Count active clients
    active_clients = sum(1 for c in clients if c.get("active", True))

    # Count tasks by status
    task_counts = {"new": 0, "in_progress": 0, "done": 0, "blocked": 0}
    for task in tasks:
        if not task.get("deletedAt"):
            status = task.get("status", "new")
            if status in task_counts:
                task_counts[status] += 1

    # Count high priority tasks
    high_priority = sum(1 for t in tasks if t.get("priority") == "high" and not t.get("deletedAt"))

    # Count overdue tasks
    now = datetime.utcnow().isoformat() + "Z"
    overdue = 0
    for task in tasks:
        if task.get("dueAt") and not task.get("deletedAt") and task.get("status") != "done":
            if task["dueAt"] < now:
                overdue += 1

    return {
        "success": True,
        "summary": {
            "total_clients": len(clients),
            "active_clients": active_clients,
            "total_tasks": sum(task_counts.values()),
            "tasks_by_status": task_counts,
            "high_priority_tasks": high_priority,
            "overdue_tasks": overdue
        }
    }


# ─────────────────────────────────────────────────────────────
# Main Tool Executor
# ─────────────────────────────────────────────────────────────

def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a tool by name with given arguments.
    Returns a structured result dictionary.
    """
    try:
        if tool_name == "search_clients":
            return execute_search_clients(
                query=arguments.get("query", ""),
                limit=arguments.get("limit", 5)
            )

        elif tool_name == "get_client_details":
            return execute_get_client_details(
                client_id=arguments.get("client_id", "")
            )

        elif tool_name == "search_tasks":
            return execute_search_tasks(
                query=arguments.get("query"),
                client_name=arguments.get("client_name"),
                status=arguments.get("status"),
                limit=arguments.get("limit", 10)
            )

        elif tool_name == "create_task":
            return execute_create_task(
                title=arguments.get("title", ""),
                description=arguments.get("description", ""),
                client_name=arguments.get("client_name"),
                due_date=arguments.get("due_date"),
                priority=arguments.get("priority", "medium")
            )

        elif tool_name == "update_task_status":
            return execute_update_task_status(
                task_id=arguments.get("task_id", ""),
                status=arguments.get("status", "")
            )

        elif tool_name == "get_system_summary":
            return execute_get_system_summary()

        else:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}"
            }

    except Exception as e:
        return {
            "success": False,
            "error": f"Tool execution failed: {str(e)}"
        }


def get_tool_names() -> List[str]:
    """Get list of available tool names."""
    return [tool["function"]["name"] for tool in AVAILABLE_TOOLS]


def get_tools_for_llm() -> List[Dict]:
    """Get tool definitions formatted for LLM API."""
    return AVAILABLE_TOOLS
