"""
Airtable sync utilities for client management.
Bidirectional sync between local registry and Airtable.
"""
import json
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, List
import uuid

def _load_secrets():
    paths = [
        Path(__file__).resolve().parents[1] / "secrets.local.json",
        Path("/app/secrets.local.json"),
    ]
    for p in paths:
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    return {}

def _airtable_request(method: str, url: str, data: dict = None) -> dict:
    sec = _load_secrets()
    token = sec.get("airtable", {}).get("token")
    if not token:
        raise Exception("Airtable token not configured")
    
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    
    body = json.dumps(data).encode("utf-8") if data else None
    
    try:
        with urllib.request.urlopen(req, body, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise Exception(f"Airtable API error {e.code}: {error_body}")

def create_client_in_airtable(client: dict) -> str:
    """Create a new client in Airtable. Returns the Airtable record ID."""
    sec = _load_secrets()
    at = sec.get("airtable", {})
    base_id = at.get("base_id")
    table_id = at.get("clients_table")
    
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"
    
    # Map app fields to Airtable fields
    fields = {
        "לקוחות": client.get("display_name") or client.get("name", ""),
    }
    
    # Phone
    phone = client.get("phone", "")
    if phone:
        fields["מספר טלפון"] = phone
    
    # Email - Airtable email field expects a string
    email = client.get("email")
    if isinstance(email, list) and email:
        fields["אימייל"] = email[0]
    elif isinstance(email, str) and email:
        fields["אימייל"] = email
    
    # Client type
    client_type = client.get("client_type", [])
    if client_type:
        fields["סוג לקוח"] = client_type if isinstance(client_type, list) else [client_type]
    
    # Stage
    stage = client.get("stage", "")
    if stage:
        fields["בטיפול"] = stage
    
    # Notes
    notes = client.get("notes", "")
    if notes:
        fields["הערות"] = notes
    
    data = {"fields": fields}
    result = _airtable_request("POST", url, data)
    return result.get("id", "")

def update_client_in_airtable(airtable_id: str, client: dict) -> bool:
    """Update an existing client in Airtable."""
    sec = _load_secrets()
    at = sec.get("airtable", {})
    base_id = at.get("base_id")
    table_id = at.get("clients_table")
    
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}/{airtable_id}"
    
    fields = {}
    
    name = client.get("display_name") or client.get("name")
    if name:
        fields["לקוחות"] = name
    
    phone = client.get("phone")
    if phone is not None:
        fields["מספר טלפון"] = phone
    
    email = client.get("email")
    if email is not None:
        if isinstance(email, list) and email:
            fields["אימייל"] = email[0]
        elif isinstance(email, str):
            fields["אימייל"] = email
    
    client_type = client.get("client_type")
    if client_type is not None:
        fields["סוג לקוח"] = client_type if isinstance(client_type, list) else [client_type]
    
    stage = client.get("stage")
    if stage is not None:
        fields["בטיפול"] = stage
    
    notes = client.get("notes")
    if notes is not None:
        fields["הערות"] = notes
    
    if not fields:
        return True  # Nothing to update
    
    data = {"fields": fields}
    _airtable_request("PATCH", url, data)
    return True

def create_contact_in_airtable(contact: dict, client_airtable_id: str) -> str:
    """Create a contact in Airtable linked to a client."""
    sec = _load_secrets()
    at = sec.get("airtable", {})
    base_id = at.get("base_id")
    contacts_table = at.get("contacts_table")
    
    url = f"https://api.airtable.com/v0/{base_id}/{contacts_table}"
    
    fields = {
        "לקוח": [client_airtable_id],  # Link to client
    }
    
    if contact.get("name"):
        fields["שם איש קשר"] = contact["name"]
    if contact.get("email"):
        fields["מייל"] = contact["email"]
    if contact.get("phone"):
        fields["טלפון"] = contact["phone"]
    if contact.get("id_number"):
        fields["מספר זיהוי"] = contact["id_number"]
    if contact.get("address"):
        fields["כתובת"] = contact["address"]
    if contact.get("role_desc"):
        fields["תפקיד איש קשר"] = contact["role_desc"]
    
    data = {"fields": fields}
    result = _airtable_request("POST", url, data)
    return result.get("id", "")

def fetch_client_from_airtable(airtable_id: str) -> Optional[dict]:
    """Fetch a single client from Airtable by ID."""
    sec = _load_secrets()
    at = sec.get("airtable", {})
    base_id = at.get("base_id")
    table_id = at.get("clients_table")
    
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}/{airtable_id}"
    
    try:
        result = _airtable_request("GET", url)
    except Exception:
        return None
    
    fields = result.get("fields", {})
    
    return {
        "id": str(uuid.uuid4()),
        "airtable_id": result.get("id", ""),
        "display_name": fields.get("לקוחות", ""),
        "email": [fields.get("אימייל")] if fields.get("אימייל") else [],
        "phone": fields.get("מספר טלפון", ""),
        "client_type": fields.get("סוג לקוח", []),
        "stage": fields.get("בטיפול", ""),
        "notes": fields.get("הערות", ""),
        "contacts": [],
        "folder": "",
        "airtable_url": f"https://airtable.com/{base_id}/{table_id}/{result.get(id, )}",
    }
