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
                    "include_archived": {
                        "type": "boolean",
                        "description": "Whether to include archived clients (default: false)",
                        "default": False
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
            "name": "archive_client",
            "description": "Archive a client by ID. Use when user requests to hide or archive a client.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "string",
                        "description": "The UUID of the client to archive"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Optional reason for archiving (defaults to manual)"
                    }
                },
                "required": ["client_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "restore_client",
            "description": "Restore an archived client by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "string",
                        "description": "The UUID of the client to restore"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Optional reason for restoring (defaults to manual)"
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
    },
    {
        "type": "function",
        "function": {
            "name": "score_privacy_submission",
            "description": "Score a privacy questionnaire submission. Use when user asks to analyze or score a privacy assessment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "submission_id": {
                        "type": "string",
                        "description": "The ID of the privacy submission to score"
                    }
                },
                "required": ["submission_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_privacy_email",
            "description": "Send privacy results email to the contact. Use when user asks to send privacy assessment results to a client.",
            "parameters": {
                "type": "object",
                "properties": {
                    "submission_id": {
                        "type": "string",
                        "description": "The ID of the privacy submission"
                    }
                },
                "required": ["submission_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_privacy_metrics",
            "description": "Get privacy module statistics - submissions count, scoring distribution, DPO requirements, etc. Use when user asks about privacy statistics or status.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_privacy_submissions",
            "description": "Search for privacy questionnaire submissions. Use when user asks about privacy submissions or wants to find a specific submission.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query - business name or contact name (optional)"
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
    # ─── Contacts Tools (Phase 4I) ───
    {
        "type": "function",
        "function": {
            "name": "get_client_contacts",
            "description": "Get all contacts for a specific client. Use when user asks about a client's contacts or contact information.",
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
            "name": "add_contact",
            "description": "Add a new contact to a client. Use when user asks to add contact information for a client.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "string",
                        "description": "The UUID of the client"
                    },
                    "name": {
                        "type": "string",
                        "description": "Contact's full name"
                    },
                    "role": {
                        "type": "string",
                        "description": "Contact's role/title (optional)"
                    },
                    "email": {
                        "type": "string",
                        "description": "Contact's email address (optional)"
                    },
                    "phone": {
                        "type": "string",
                        "description": "Contact's phone number (optional)"
                    },
                    "is_primary": {
                        "type": "boolean",
                        "description": "Whether this is the primary contact (default: false)"
                    }
                },
                "required": ["client_id", "name"]
            }
        }
    },
    # ─── Document Generation Tools (Phase 4G) ───
    {
        "type": "function",
        "function": {
            "name": "list_templates",
            "description": "List available document templates from SharePoint. Use when user asks about available templates or wants to generate a document.",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Filter by folder name (optional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_document",
            "description": "Generate documents from templates for a client. Use when user asks to create documents, contracts, or letters for a client.",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_name": {
                        "type": "string",
                        "description": "Name of the client for document generation"
                    },
                    "template_paths": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of template paths to generate"
                    },
                    "extra_data": {
                        "type": "object",
                        "description": "Additional data to merge into templates (optional)"
                    }
                },
                "required": ["client_name", "template_paths"]
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


def load_clients(include_archived: bool = False) -> List[Dict]:
    """Load clients from API (preferred) or JSON fallback."""
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{API_BASE}/api/clients",
                params={"archived": "all" if include_archived else "0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    return data
    except Exception:
        pass

    clients_file = get_data_dir() / "clients.json"
    if not clients_file.exists():
        return []
    try:
        clients = json.loads(clients_file.read_text("utf-8"))
    except Exception:
        return []

    if not include_archived:
        clients = [c for c in clients if not c.get("archived")]
    return clients


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

def execute_search_clients(query: str, limit: int = 5, include_archived: bool = False) -> Dict[str, Any]:
    """Search clients by name, email, or phone."""
    clients = load_clients(include_archived=include_archived)
    query_lower = query.lower()

    results = []
    for client in clients:
        if not include_archived and client.get("archived"):
            continue
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
                "active": client.get("active", True),
                "archived": client.get("archived", False),
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
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"{API_BASE}/api/clients/{client_id}")
            if resp.status_code == 200:
                c = resp.json()
                return {
                    "success": True,
                    "client": {
                        "id": c.get("id"),
                        "name": c.get("name"),
                        "email": c.get("email"),
                        "phone": c.get("phone"),
                        "type": c.get("type") or c.get("types", []),
                        "stage": c.get("stage"),
                        "notes": c.get("notes"),
                        "folderPath": c.get("folderPath") or c.get("local_folder"),
                        "contacts": c.get("contacts", []),
                        "createdAt": c.get("createdAt") or c.get("created_at"),
                        "active": c.get("active", True),
                        "archived": c.get("archived", False),
                        "archivedAt": c.get("archived_at") or c.get("archivedAt"),
                        "archivedReason": c.get("archived_reason") or c.get("archivedReason"),
                    }
                }
            if resp.status_code == 404:
                return {"success": False, "error": f"Client with ID {client_id} not found"}
    except Exception:
        pass

    clients = load_clients(include_archived=True)
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
                    "active": client.get("active", True),
                    "archived": client.get("archived", False),
                    "archivedAt": client.get("archived_at") or client.get("archivedAt"),
                    "archivedReason": client.get("archived_reason") or client.get("archivedReason"),
                }
            }

    return {"success": False, "error": f"Client with ID {client_id} not found"}


def execute_archive_client(client_id: str, reason: str = "manual") -> Dict[str, Any]:
    """Archive a client via API."""
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(f"{API_BASE}/api/clients/{client_id}/archive", json={"reason": reason})
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "archived_at": data.get("archived_at"),
                    "client": data.get("client"),
                }
            if resp.status_code == 404:
                return {"success": False, "error": "Client not found"}
            if resp.status_code == 409:
                detail = {}
                try:
                    detail = resp.json()
                except Exception:
                    pass
                return {
                    "success": False,
                    "error": detail.get("message") or "Client already archived",
                    "reason": detail.get("reason") or "already_archived",
                }
            return {"success": False, "error": f"Archive failed: {resp.text}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to archive client: {str(e)}"}


def execute_restore_client(client_id: str, reason: str = "manual") -> Dict[str, Any]:
    """Restore an archived client via API."""
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(f"{API_BASE}/api/clients/{client_id}/restore", json={"reason": reason})
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "client": data.get("client")}
            if resp.status_code == 404:
                return {"success": False, "error": "Client not found"}
            if resp.status_code == 409:
                detail = {}
                try:
                    detail = resp.json()
                except Exception:
                    pass
                return {
                    "success": False,
                    "error": detail.get("message") or "Client already active",
                    "reason": detail.get("reason") or "already_active",
                }
            return {"success": False, "error": f"Restore failed: {resp.text}"}
    except Exception as e:
        return {"success": False, "error": f"Failed to restore client: {str(e)}"}


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
    clients = load_clients(include_archived=True)
    tasks_data = load_tasks()
    tasks = tasks_data.get("tasks", [])

    # Count active clients
    active_clients = sum(1 for c in clients if c.get("active", True) and not c.get("archived"))
    archived_clients = sum(1 for c in clients if c.get("archived"))

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
            "archived_clients": archived_clients,
            "total_tasks": sum(task_counts.values()),
            "tasks_by_status": task_counts,
            "high_priority_tasks": high_priority,
            "overdue_tasks": overdue
        }
    }


# ─────────────────────────────────────────────────────────────
# Privacy Tool Execution Functions (Phase 5D)
# ─────────────────────────────────────────────────────────────

def execute_score_privacy_submission(submission_id: str) -> Dict[str, Any]:
    """Score a privacy questionnaire submission."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(f"{API_BASE}/api/privacy/score/{submission_id}")
            if resp.status_code == 200:
                result = resp.json()
                return {
                    "success": True,
                    "submission_id": submission_id,
                    "level": result.get("level"),
                    "level_name": {
                        "lone": "מאגר בידי יחיד",
                        "basic": "רמת אבטחה בסיסית",
                        "mid": "רמת אבטחה בינונית",
                        "high": "רמת אבטחה גבוהה"
                    }.get(result.get("level"), result.get("level")),
                    "dpo_required": result.get("dpo", False),
                    "registration_required": result.get("reg", False),
                    "report_required": result.get("report", False),
                    "requirements": result.get("requirements", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"Scoring failed: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to score submission: {str(e)}"
        }


def execute_send_privacy_email(submission_id: str) -> Dict[str, Any]:
    """Send privacy results email to the contact."""
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(f"{API_BASE}/api/privacy/send_email/{submission_id}")
            if resp.status_code == 200:
                result = resp.json()
                return {
                    "success": True,
                    "message": f"Email sent to {result.get('sent_to')}",
                    "sent_to": result.get("sent_to"),
                    "sent_at": result.get("sent_at"),
                    "subject": result.get("subject")
                }
            else:
                return {
                    "success": False,
                    "error": f"Email sending failed: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to send email: {str(e)}"
        }


def execute_get_privacy_metrics() -> Dict[str, Any]:
    """Get privacy module statistics."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(f"{API_BASE}/api/privacy/metrics")
            if resp.status_code == 200:
                result = resp.json()
                return {
                    "success": True,
                    "metrics": {
                        "total_submissions": result.get("total_submissions", 0),
                        "total_scored": result.get("total_scored", 0),
                        "unscored": result.get("unscored", 0),
                        "scoring_rate": result.get("scoring_rate", 0),
                        "by_level": result.get("by_level", {}),
                        "requirements": result.get("requirements", {}),
                        "recent_submissions_7d": result.get("recent_submissions_7d", 0)
                    }
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to get metrics: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to get privacy metrics: {str(e)}"
        }


def execute_search_privacy_submissions(query: str = None, limit: int = 10) -> Dict[str, Any]:
    """Search for privacy questionnaire submissions."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(f"{API_BASE}/api/privacy/submissions?limit={limit}")
            if resp.status_code == 200:
                result = resp.json()
                submissions = result.get("items", [])

                # Filter by query if provided
                if query:
                    query_lower = query.lower()
                    submissions = [
                        s for s in submissions
                        if query_lower in (s.get("business_name") or "").lower()
                        or query_lower in (s.get("contact_name") or "").lower()
                        or query_lower in (s.get("contact_email") or "").lower()
                    ]

                return {
                    "success": True,
                    "query": query,
                    "count": len(submissions),
                    "submissions": [
                        {
                            "id": s.get("id"),
                            "business_name": s.get("business_name"),
                            "contact_name": s.get("contact_name"),
                            "contact_email": s.get("contact_email"),
                            "level": s.get("level"),
                            "status": s.get("status"),
                            "submitted_at": s.get("submitted_at")
                        }
                        for s in submissions[:limit]
                    ]
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to search submissions: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to search privacy submissions: {str(e)}"
        }


# ─────────────────────────────────────────────────────────────
# Contacts Tool Execution Functions (Phase 4I)
# ─────────────────────────────────────────────────────────────

def execute_get_client_contacts(client_id: str) -> Dict[str, Any]:
    """Get all contacts for a specific client."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(f"{API_BASE}/contacts/{client_id}")
            if resp.status_code == 200:
                contacts = resp.json()
                return {
                    "success": True,
                    "client_id": client_id,
                    "count": len(contacts),
                    "contacts": [
                        {
                            "id": c.get("id"),
                            "name": c.get("name"),
                            "role": c.get("role"),
                            "email": c.get("email"),
                            "phone": c.get("phone"),
                            "is_primary": c.get("is_primary", False)
                        }
                        for c in contacts
                    ]
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to get contacts: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to get contacts: {str(e)}"
        }


def execute_add_contact(
    client_id: str,
    name: str,
    role: str = None,
    email: str = None,
    phone: str = None,
    is_primary: bool = False
) -> Dict[str, Any]:
    """Add a new contact to a client."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{API_BASE}/contacts",
                json={
                    "client_id": client_id,
                    "name": name,
                    "role": role,
                    "email": email,
                    "phone": phone,
                    "is_primary": is_primary
                }
            )
            if resp.status_code in (200, 201):
                contact = resp.json()
                return {
                    "success": True,
                    "message": f"Contact '{name}' added successfully",
                    "contact": {
                        "id": contact.get("id"),
                        "name": contact.get("name"),
                        "role": contact.get("role"),
                        "email": contact.get("email"),
                        "phone": contact.get("phone"),
                        "is_primary": contact.get("is_primary", False)
                    }
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to add contact: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to add contact: {str(e)}"
        }


# ─────────────────────────────────────────────────────────────
# Document Generation Tool Execution Functions (Phase 4G)
# ─────────────────────────────────────────────────────────────

def execute_list_templates(folder: str = None) -> Dict[str, Any]:
    """List available document templates from SharePoint."""
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.get(f"{API_BASE}/word/templates")
            if resp.status_code == 200:
                data = resp.json()
                templates = data.get("templates", [])

                # Filter by folder if specified
                if folder:
                    folder_lower = folder.lower()
                    templates = [
                        t for t in templates
                        if folder_lower in (t.get("folder") or "").lower()
                    ]

                return {
                    "success": True,
                    "count": len(templates),
                    "templates": [
                        {
                            "name": t.get("name"),
                            "display_name": t.get("display_name"),
                            "path": t.get("path"),
                            "folder": t.get("folder")
                        }
                        for t in templates
                    ]
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to list templates: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to list templates: {str(e)}"
        }


def execute_generate_document(
    client_name: str,
    template_paths: List[str],
    extra_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Generate documents from templates for a client."""
    try:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(
                f"{API_BASE}/word/generate_multiple",
                json={
                    "client_name": client_name,
                    "template_paths": template_paths,
                    "extra_data": extra_data or {}
                }
            )
            if resp.status_code == 200:
                result = resp.json()
                return {
                    "success": True,
                    "message": f"Generated {len(result.get('files_created', []))} document(s)",
                    "files_created": [
                        {
                            "name": f.get("name"),
                            "url": f.get("url")
                        }
                        for f in result.get("files_created", [])
                    ]
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to generate documents: {resp.text}"
                }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to generate documents: {str(e)}"
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
                limit=arguments.get("limit", 5),
                include_archived=arguments.get("include_archived", False),
            )

        elif tool_name == "get_client_details":
            return execute_get_client_details(
                client_id=arguments.get("client_id", "")
            )

        elif tool_name == "archive_client":
            return execute_archive_client(
                client_id=arguments.get("client_id", ""),
                reason=arguments.get("reason") or "manual",
            )

        elif tool_name == "restore_client":
            return execute_restore_client(
                client_id=arguments.get("client_id", ""),
                reason=arguments.get("reason") or "manual",
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

        # Privacy tools (Phase 5D)
        elif tool_name == "score_privacy_submission":
            return execute_score_privacy_submission(
                submission_id=arguments.get("submission_id", "")
            )

        elif tool_name == "send_privacy_email":
            return execute_send_privacy_email(
                submission_id=arguments.get("submission_id", "")
            )

        elif tool_name == "get_privacy_metrics":
            return execute_get_privacy_metrics()

        elif tool_name == "search_privacy_submissions":
            return execute_search_privacy_submissions(
                query=arguments.get("query"),
                limit=arguments.get("limit", 10)
            )

        # Contacts tools (Phase 4I)
        elif tool_name == "get_client_contacts":
            return execute_get_client_contacts(
                client_id=arguments.get("client_id", "")
            )

        elif tool_name == "add_contact":
            return execute_add_contact(
                client_id=arguments.get("client_id", ""),
                name=arguments.get("name", ""),
                role=arguments.get("role"),
                email=arguments.get("email"),
                phone=arguments.get("phone"),
                is_primary=arguments.get("is_primary", False)
            )

        # Document generation tools (Phase 4G)
        elif tool_name == "list_templates":
            return execute_list_templates(
                folder=arguments.get("folder")
            )

        elif tool_name == "generate_document":
            return execute_generate_document(
                client_name=arguments.get("client_name", ""),
                template_paths=arguments.get("template_paths", []),
                extra_data=arguments.get("extra_data")
            )

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
