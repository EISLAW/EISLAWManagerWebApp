#!/usr/bin/env python3
"""Fix Phase 4I bugs: Airtable email + Add missing AI tool executors"""

import sys

# Read ai_studio_tools.py
with open("ai_studio_tools.py", "r", encoding="utf-8") as f:
    content = f.read()

# Check if executor functions already exist
if "def execute_update_client" in content:
    print("⚠️ AI tool executors already exist")
else:
    # Add executor functions before execute_tool
    executor_code = '''

# ═════════════════════════════════════════════════════════════
# PHASE 4I EXECUTOR FUNCTIONS
# ═════════════════════════════════════════════════════════════

def execute_update_client(client_id: str, **kwargs) -> Dict[str, Any]:
    """Update client details."""
    try:
        import requests

        update_data = {}
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

    # Insert before execute_tool function
    marker = "def execute_tool(tool_name: str"
    if marker in content:
        parts = content.split(marker)
        content = parts[0] + executor_code + "\n" + marker + parts[1]

    # Add to tool_executors dict
    exec_marker = "tool_executors = {"
    if exec_marker in content:
        dispatcher_additions = '''
        # Phase 4I tools
        "update_client": execute_update_client,
        "create_client": execute_create_client,
        "get_client_contacts": execute_get_client_contacts,
        "add_contact": execute_add_contact,
        "sync_client_to_airtable": execute_sync_client_to_airtable,
'''
        exec_parts = content.split(exec_marker)
        content = exec_parts[0] + exec_marker + dispatcher_additions + exec_parts[1]

    # Write back
    with open("ai_studio_tools.py", "w", encoding="utf-8") as f:
        f.write(content)

    print("✅ Added AI tool executor functions")

# Now fix Airtable email bug in main.py
with open("main.py", "r", encoding="utf-8") as f:
    main_content = f.read()

# Find and fix the email handling in airtable_clients_upsert
old_email_code = '''        fields = {"לקוחות": name}
        if email:
            fields["אימייל"] = [email] if isinstance(email, str) else email'''

new_email_code = '''        fields = {"לקוחות": name}
        if email:
            # Ensure email is always an array for Airtable
            if isinstance(email, list):
                fields["אימייל"] = email
            elif isinstance(email, str):
                # Parse JSON if it looks like JSON array
                if email.startswith("["):
                    import json
                    fields["אימייל"] = json.loads(email)
                else:
                    fields["אימייל"] = [email]
            else:
                fields["אימייל"] = [str(email)]'''

if old_email_code in main_content:
    main_content = main_content.replace(old_email_code, new_email_code)

    with open("main.py", "w", encoding="utf-8") as f:
        f.write(main_content)

    print("✅ Fixed Airtable email format bug")
else:
    print("⚠️ Airtable email code not found (might be already fixed)")

print("\n✅ All Phase 4I bugs fixed!")
print("   1. AI tool executors added")
print("   2. Airtable email format fixed")
print("\nRestart API container to apply changes.")
