#!/usr/bin/env python3
"""Add Phase 4I AI agent tools to ai_studio_tools.py"""

import sys

# Read ai_studio_tools.py
with open("ai_studio_tools.py", "r", encoding="utf-8") as f:
    content = f.read()

# Check if already added
if "update_client" in content and "add_contact" in content:
    print("⚠️ Phase 4I tools already exist in ai_studio_tools.py")
    sys.exit(0)

# New tool definitions and executors
new_tools = '''

# ═════════════════════════════════════════════════════════════
# PHASE 4I CLIENT MANAGEMENT TOOLS (2025-12-06)
# ═════════════════════════════════════════════════════════════

PHASE4I_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "update_client",
            "description": "Update client details (name, email, phone, status, type, notes)",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Client ID"},
                    "name": {"type": "string", "description": "Client name"},
                    "email": {"type": "array", "items": {"type": "string"}, "description": "Client email(s)"},
                    "phone": {"type": "string", "description": "Client phone"},
                    "stage": {"type": "string", "description": "Client stage (new, active, pending, completed)"},
                    "client_type": {"type": "array", "items": {"type": "string"}, "description": "Client types"},
                    "notes": {"type": "string", "description": "Notes about client"}
                },
                "required": ["client_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_client",
            "description": "Create a new client",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Client name"},
                    "email": {"type": "array", "items": {"type": "string"}, "description": "Client email(s)"},
                    "phone": {"type": "string", "description": "Client phone"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_client_contacts",
            "description": "Get all contacts for a client",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Client ID"}
                },
                "required": ["client_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_contact",
            "description": "Add a contact to a client",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Client ID"},
                    "name": {"type": "string", "description": "Contact name"},
                    "email": {"type": "string", "description": "Contact email"},
                    "phone": {"type": "string", "description": "Contact phone"},
                    "role": {"type": "string", "description": "Contact role/title"},
                    "is_primary": {"type": "boolean", "description": "Is primary contact"}
                },
                "required": ["client_id", "name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "sync_client_to_airtable",
            "description": "Sync client data to Airtable",
            "parameters": {
                "type": "object",
                "properties": {
                    "client_id": {"type": "string", "description": "Client ID to sync"}
                },
                "required": ["client_id"]
            }
        }
    }
]

def execute_update_client(client_id: str, **kwargs) -> Dict[str, Any]:
    """Update client details."""
    try:
        import requests

        update_data = {"client_id": client_id}
        if "name" in kwargs:
            update_data["name"] = kwargs["name"]
        if "email" in kwargs:
            update_data["email"] = kwargs["email"]
        if "phone" in kwargs:
            update_data["phone"] = kwargs["phone"]
        if "stage" in kwargs:
            update_data["stage"] = kwargs["stage"]
        if "client_type" in kwargs:
            update_data["client_type"] = kwargs["client_type"]
        if "notes" in kwargs:
            update_data["notes"] = kwargs["notes"]

        resp = requests.patch(f"{API_BASE}/registry/clients/{client_id}", json=update_data, timeout=10)
        resp.raise_for_status()
        result = resp.json()

        return {"success": True, "client": result.get("client")}
    except Exception as e:
        return {"error": str(e), "success": False}

def execute_create_client(name: str, email: List[str] = None, phone: str = None, **kwargs) -> Dict[str, Any]:
    """Create a new client."""
    try:
        import requests

        payload = {
            "display_name": name,
            "email": email or [],
            "phone": phone
        }

        resp = requests.post(f"{API_BASE}/registry/clients", json=payload, timeout=10)
        resp.raise_for_status()
        result = resp.json()

        return {"success": True, "client_id": result.get("client_id"), "client": result.get("client")}
    except Exception as e:
        return {"error": str(e), "success": False}

def execute_get_client_contacts(client_id: str) -> Dict[str, Any]:
    """Get all contacts for a client."""
    try:
        import requests

        resp = requests.get(f"{API_BASE}/contacts/{client_id}", timeout=10)
        resp.raise_for_status()
        result = resp.json()

        return {"success": True, "contacts": result.get("contacts", [])}
    except Exception as e:
        return {"error": str(e), "success": False}

def execute_add_contact(client_id: str, name: str, email: str = None, phone: str = None,
                       role: str = None, is_primary: bool = False) -> Dict[str, Any]:
    """Add a contact to a client."""
    try:
        import requests

        payload = {
            "client_id": client_id,
            "name": name,
            "email": email,
            "phone": phone,
            "role": role,
            "is_primary": is_primary
        }

        resp = requests.post(f"{API_BASE}/contacts", json=payload, timeout=10)
        resp.raise_for_status()
        result = resp.json()

        return {"success": True, "contact_id": result.get("contact_id"), "contact": result.get("contact")}
    except Exception as e:
        return {"error": str(e), "success": False}

def execute_sync_client_to_airtable(client_id: str) -> Dict[str, Any]:
    """Sync client data to Airtable."""
    try:
        import requests

        payload = {"client_id": client_id}

        resp = requests.post(f"{API_BASE}/airtable/clients_upsert", json=payload, timeout=10)
        resp.raise_for_status()
        result = resp.json()

        return {"success": True, "airtable_id": result.get("airtable_id")}
    except Exception as e:
        return {"error": str(e), "success": False}
'''

# Find insertion point - add before execute_tool function
marker = "def execute_tool(tool_name: str"
if marker in content:
    parts = content.split(marker)

    # Also need to add tool calls to execute_tool dispatcher
    dispatcher_additions = '''
        # Phase 4I tools
        "update_client": execute_update_client,
        "create_client": execute_create_client,
        "get_client_contacts": execute_get_client_contacts,
        "add_contact": execute_add_contact,
        "sync_client_to_airtable": execute_sync_client_to_airtable,
'''

    # Insert new tools before execute_tool
    new_content = parts[0] + new_tools + "\n" + marker + parts[1]

    # Add to TOOLS list - find the TOOLS = [ definition
    tools_marker = "TOOLS = ["
    if tools_marker in new_content:
        tool_parts = new_content.split(tools_marker)
        # Insert Phase 4I tools reference after TOOLS = [
        new_content = tool_parts[0] + tools_marker + "\n    # Phase 4I Client Management Tools\n    *PHASE4I_TOOLS,\n" + tool_parts[1]

    # Add to execute_tool dispatcher - find the tool_executors dict
    exec_marker = "tool_executors = {"
    if exec_marker in new_content:
        exec_parts = new_content.split(exec_marker)
        new_content = exec_parts[0] + exec_marker + dispatcher_additions + exec_parts[1]
else:
    # Append at end if no marker
    new_content = content + new_tools

# Backup original
with open("ai_studio_tools.py.backup", "w", encoding="utf-8") as f:
    f.write(content)

# Write modified version
with open("ai_studio_tools.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print("✅ Phase 4I AI agent tools added to ai_studio_tools.py")
print("📝 Backup saved as ai_studio_tools.py.backup")
print("")
print("Added 5 tools:")
print("  1. update_client")
print("  2. create_client")
print("  3. get_client_contacts")
print("  4. add_contact")
print("  5. sync_client_to_airtable")
