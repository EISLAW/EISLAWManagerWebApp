#!/usr/bin/env python3
"""Insert Phase 4I endpoints into main.py"""

import sys

# Read main.py
with open("main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Check if already inserted
if "/registry/clients" in content:
    print("⚠️ Endpoints already exist in main.py")
    sys.exit(0)

# New endpoints code
new_endpoints = '''

# ═════════════════════════════════════════════════════════════
# CLIENT MANAGEMENT ENDPOINTS (Phase 4I - 2025-12-06)
# ═════════════════════════════════════════════════════════════

from pydantic import BaseModel
from typing import List, Optional, Dict

class ClientCreate(BaseModel):
    display_name: str
    email: Optional[List[str]] = []
    phone: Optional[str] = None
    client_type: Optional[List[str]] = []
    stage: Optional[str] = "new"
    notes: Optional[str] = None
    folder: Optional[str] = None
    airtable_id: Optional[str] = None
    airtable_url: Optional[str] = None
    sharepoint_url: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[List[str]] = None
    phone: Optional[str] = None
    client_type: Optional[List[str]] = None
    stage: Optional[str] = None
    notes: Optional[str] = None

class ContactCreate(BaseModel):
    client_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: Optional[bool] = False

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: Optional[bool] = None

@app.post("/registry/clients")
def create_client(client: ClientCreate):
    """Create or update a client in local SQLite registry."""
    try:
        from backend.db import clients as clients_db

        client_data = {
            "name": client.display_name,
            "email": json.dumps(client.email) if client.email else None,
            "phone": client.phone,
            "stage": client.stage or "new",
            "types": json.dumps(client.client_type) if client.client_type else "[]",
            "notes": client.notes,
            "local_folder": client.folder,
            "airtable_id": client.airtable_id,
            "airtable_url": client.airtable_url,
            "sharepoint_url": client.sharepoint_url,
            "active": 1,
        }

        client_id = clients_db.save(client_data)
        saved = clients_db.get(client_id)

        return {"success": True, "client_id": client_id, "client": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create client: {str(e)}")

@app.patch("/registry/clients/{client_id}")
def update_client(client_id: str, update: ClientUpdate):
    """Update an existing client."""
    try:
        from backend.db import clients as clients_db

        existing = clients_db.get(client_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Client not found")

        update_data = {"id": client_id}
        if update.name is not None:
            update_data["name"] = update.name
        if update.email is not None:
            update_data["email"] = json.dumps(update.email)
        if update.phone is not None:
            update_data["phone"] = update.phone
        if update.client_type is not None:
            update_data["types"] = json.dumps(update.client_type)
        if update.stage is not None:
            update_data["stage"] = update.stage
        if update.notes is not None:
            update_data["notes"] = update.notes

        clients_db.save(update_data)
        updated = clients_db.get(client_id)
        return {"success": True, "client": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update client: {str(e)}")

@app.get("/registry/clients/{client_id}")
def get_client_with_contacts(client_id: str):
    """Get client by ID with all contacts."""
    try:
        from backend.db import clients as clients_db, contacts as contacts_db

        client = clients_db.get(client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        contacts_list = contacts_db.list_for_client(client_id)
        return {"client": client, "contacts": contacts_list}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get client: {str(e)}")

# ──────────────────────────────────────────────────────────────
# CONTACTS ENDPOINTS
# ──────────────────────────────────────────────────────────────

@app.get("/contacts/{client_id}")
def list_contacts(client_id: str):
    """List all contacts for a client."""
    try:
        from backend.db import contacts as contacts_db
        contacts_list = contacts_db.list_for_client(client_id)
        return {"contacts": contacts_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list contacts: {str(e)}")

@app.post("/contacts")
def create_contact(contact: ContactCreate):
    """Create a new contact for a client."""
    try:
        from backend.db import contacts as contacts_db

        contact_data = {
            "client_id": contact.client_id,
            "name": contact.name,
            "email": contact.email,
            "phone": contact.phone,
            "role": contact.role,
            "is_primary": 1 if contact.is_primary else 0,
        }

        contact_id = contacts_db.save(contact_data)
        saved = contacts_db.get(contact_id)
        return {"success": True, "contact_id": contact_id, "contact": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create contact: {str(e)}")

@app.patch("/contacts/{contact_id}")
def update_contact(contact_id: str, update: ContactUpdate):
    """Update an existing contact."""
    try:
        from backend.db import contacts as contacts_db

        existing = contacts_db.get(contact_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")

        update_data = {"id": contact_id}
        if update.name is not None:
            update_data["name"] = update.name
        if update.email is not None:
            update_data["email"] = update.email
        if update.phone is not None:
            update_data["phone"] = update.phone
        if update.role is not None:
            update_data["role"] = update.role
        if update.is_primary is not None:
            update_data["is_primary"] = 1 if update.is_primary else 0

        contacts_db.save(update_data)
        updated = contacts_db.get(contact_id)
        return {"success": True, "contact": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update contact: {str(e)}")

@app.delete("/contacts/{contact_id}")
def delete_contact(contact_id: str):
    """Delete a contact."""
    try:
        from backend.db import contacts as contacts_db

        existing = contacts_db.get(contact_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")

        contacts_db.delete(contact_id)
        return {"success": True, "message": "Contact deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete contact: {str(e)}")

# ──────────────────────────────────────────────────────────────
# AIRTABLE ENDPOINTS
# ──────────────────────────────────────────────────────────────

@app.get("/airtable/search")
def search_airtable(q: str = Query(..., min_length=1)):
    """Search Airtable clients by name, email, or phone."""
    try:
        config = get_airtable_config()
        token = config["token"]
        base_id = config["base_id"]
        clients_table = config.get("clients_table", "לקוחות")
        view_id = config.get("view_clients")

        headers = {"Authorization": f"Bearer {token}"}

        search_filter = f"OR(FIND(LOWER('{q}'), LOWER({{לקוחות}})), FIND(LOWER('{q}'), LOWER({{אימייל}})), FIND(LOWER('{q}'), LOWER({{מספר טלפון}})))"

        params = {"filterByFormula": search_filter, "maxRecords": 20}
        if view_id:
            params["view"] = view_id

        url = f"https://api.airtable.com/v0/{base_id}/{clients_table}"

        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=headers, params=params)

            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Airtable API error: {resp.text}")

            data = resp.json()
            records = data.get("records", [])

            results = []
            for record in records:
                fields = record.get("fields", {})
                results.append({
                    "id": record.get("id"),
                    "display_name": fields.get("לקוחות", ""),
                    "name": fields.get("לקוחות", ""),
                    "emails": fields.get("אימייל", []) if isinstance(fields.get("אימייל"), list) else [fields.get("אימייל")] if fields.get("אימייל") else [],
                    "phone": fields.get("מספר טלפון", ""),
                    "client_type": fields.get("סוג לקוח", []),
                    "stage": fields.get("בטיפול", ""),
                    "notes": fields.get("הערות", ""),
                    "airtable_id": record.get("id"),
                    "airtable_url": f"https://airtable.com/{base_id}/{clients_table}/{record.get('id')}",
                })

            return {"items": results, "total": len(results)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Airtable search failed: {str(e)}")

@app.post("/airtable/clients_upsert")
def sync_client_to_airtable(data: Dict = Body(...)):
    """Sync a client from SQLite to Airtable."""
    try:
        from backend.db import clients as clients_db

        config = get_airtable_config()
        token = config["token"]
        base_id = config["base_id"]
        clients_table = config.get("clients_table", "לקוחות")

        client_id = data.get("client_id")
        if not client_id:
            name = data.get("name") or data.get("display_name")
            email = data.get("email")
            phone = data.get("phone")
            airtable_id = data.get("airtable_id")
        else:
            client = clients_db.get(client_id)
            if not client:
                raise HTTPException(status_code=404, detail="Client not found")

            name = client.get("name")
            email_str = client.get("email", "")
            email = json.loads(email_str) if email_str and email_str.startswith("[") else email_str
            phone = client.get("phone")
            airtable_id = client.get("airtable_id")

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        fields = {"לקוחות": name}
        if email:
            # FIXED: Airtable email field expects a STRING
            if isinstance(email, list) and email:
                fields["אימייל"] = email[0]
            elif isinstance(email, str):
                if email.startswith("["):
                    parsed = json.loads(email)
                    fields["אימייל"] = parsed[0] if parsed else ""
                else:
                    fields["אימייל"] = email
            else:
                fields["אימייל"] = str(email)
        if phone:
            fields["מספר טלפון"] = phone

        url = f"https://api.airtable.com/v0/{base_id}/{clients_table}"

        with httpx.Client(timeout=30.0) as client:
            if airtable_id:
                patch_url = f"{url}/{airtable_id}"
                payload = {"fields": fields}
                resp = client.patch(patch_url, headers=headers, json=payload)
            else:
                payload = {"fields": fields}
                resp = client.post(url, headers=headers, json=payload)

            if resp.status_code not in [200, 201]:
                raise HTTPException(status_code=resp.status_code, detail=f"Airtable API error: {resp.text}")

            result = resp.json()
            new_airtable_id = result.get("id")

            if client_id and new_airtable_id and not airtable_id:
                clients_db.save({
                    "id": client_id,
                    "airtable_id": new_airtable_id,
                    "airtable_url": f"https://airtable.com/{base_id}/{clients_table}/{new_airtable_id}"
                })

            return {"success": True, "airtable_id": new_airtable_id, "record": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Airtable sync failed: {str(e)}")
'''

# Find insertion point
marker = "# Marketing Prompts Endpoints"
if marker in content:
    parts = content.split(marker)
    new_content = parts[0] + new_endpoints + "\n" + marker + parts[1]
else:
    # Append at end if no marker
    new_content = content + new_endpoints

# Backup original
with open("main.py.backup", "w", encoding="utf-8") as f:
    f.write(content)

# Write modified version
with open("main.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print("✅ Phase 4I endpoints added to main.py")
print("📝 Backup saved as main.py.backup")
