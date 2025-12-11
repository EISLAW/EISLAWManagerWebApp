"""
Clients API Router
Extracted from main.py for better code organization.
"""
from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
from datetime import datetime
import json
import fixtures

router = APIRouter(prefix="/api", tags=["clients"])

def get_clients_store_path():
    candidates = [
        Path("/root/.eislaw/store/clients.json"),
        Path("/home/azureuser/.eislaw/store/clients.json"),
        Path.home() / ".eislaw" / "store" / "clients.json",
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]

def load_local_clients():
    clients_path = get_clients_store_path()
    if not clients_path.exists():
        return []
    try:
        data = json.loads(clients_path.read_text("utf-8"))
        clients = data.get("clients", [])
        result = []
        for c in clients:
            if c.get("display_name", "").startswith("ZZZ Test"):
                continue
            result.append({
                "id": c.get("id"),
                "name": c.get("display_name", ""),
                "email": c.get("email") if isinstance(c.get("email"), str) else (c.get("email", [""])[0] if c.get("email") else ""),
                "phone": c.get("phone", ""),
                "type": c.get("client_type", []),
                "stage": c.get("stage", ""),
                "notes": c.get("notes", ""),
                "folderPath": c.get("folder", ""),
                "airtableId": c.get("airtable_id", ""),
                "contacts": c.get("contacts", []),
                "createdAt": c.get("created_at"),
                "active": c.get("active", True),
                "archivedAt": c.get("archived_at"),
            })
        return result
    except Exception as e:
        print(f"Error loading clients.json: {e}")
        return []

def find_local_client(client_id: str):
    clients = load_local_clients()
    for c in clients:
        if c.get("id") == client_id:
            return c
    return None

def find_local_client_by_name(name: str):
    clients_path = get_clients_store_path()
    if not clients_path.exists():
        return None
    try:
        data = json.loads(clients_path.read_text("utf-8"))
        clients = data.get("clients", [])
        for c in clients:
            if c.get("display_name", "").lower() == name.lower():
                emails = c.get("email", [])
                if isinstance(emails, str):
                    emails = [emails] if emails else []
                return {
                    "id": c.get("id"),
                    "name": c.get("display_name", ""),
                    "emails": emails,
                    "phone": c.get("phone", ""),
                    "client_type": c.get("client_type", []),
                    "stage": c.get("stage", ""),
                    "notes": c.get("notes", ""),
                    "folder": c.get("folder", ""),
                    "airtable_id": c.get("airtable_id", ""),
                    "airtable_url": c.get("airtable_url", ""),
                    "sharepoint_url": c.get("sharepoint_url", ""),
                    "sharepoint_id": c.get("sharepoint_id", ""),
                    "contacts": c.get("contacts", []),
                    "created_at": c.get("created_at"),
                    "active": c.get("active", True),
                    "archived_at": c.get("archived_at"),
                }
    except Exception as e:
        print(f"Error finding client by name: {e}")
    return None

def update_client_active_status(client_name: str, active: bool, archived_at: str = None):
    clients_path = get_clients_store_path()
    if not clients_path.exists():
        return None
    try:
        data = json.loads(clients_path.read_text("utf-8"))
        clients = data.get("clients", [])
        updated_client = None
        for c in clients:
            if c.get("display_name", "").lower() == client_name.lower():
                c["active"] = active
                c["archived_at"] = archived_at
                updated_client = c
                break
        if updated_client:
            data["clients"] = clients
            clients_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return updated_client
    except Exception as e:
        print(f"Error updating client active status: {e}")
        return None

@router.get("/clients")
def get_clients(status: str = "active"):
    clients = load_local_clients()
    if not clients:
        clients = fixtures.clients()
    if status == "active":
        clients = [c for c in clients if c.get("active", True)]
    elif status == "archived":
        clients = [c for c in clients if not c.get("active", True)]
    return clients

@router.get("/clients/{cid}")
def get_client(cid: str):
    c = find_local_client(cid)
    if c:
        return c
    c = fixtures.client_detail(cid)
    if c:
        return c
    raise HTTPException(status_code=404, detail="Client not found")

@router.patch("/clients/{client_name}/archive")
def archive_client(client_name: str):
    import urllib.parse
    decoded_name = urllib.parse.unquote(client_name)
    archived_at = datetime.utcnow().isoformat() + "Z"
    result = update_client_active_status(decoded_name, active=False, archived_at=archived_at)
    if result is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True, "archived_at": archived_at}

@router.patch("/clients/{client_name}/restore")
def restore_client(client_name: str):
    import urllib.parse
    decoded_name = urllib.parse.unquote(client_name)
    result = update_client_active_status(decoded_name, active=True, archived_at=None)
    if result is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True}

@router.get("/client/summary")
def get_client_summary(name: str, limit: int = 10):
    import urllib.parse
    decoded_name = urllib.parse.unquote(name)
    client = find_local_client_by_name(decoded_name)
    if not client:
        return {"client": {"name": decoded_name}, "files": [], "emails": []}
    files = fixtures.files(client.get("id", ""), "sharepoint") if client.get("id") else []
    emails = fixtures.emails(client.get("id", ""), limit) if client.get("id") else []
    return {"client": client, "files": files, "emails": emails}

@router.get("/clients/{cid}/files")
def get_files(cid: str, location: str = Query("sharepoint", pattern="^(local|sharepoint)$")):
    return fixtures.files(cid, location)

@router.get("/clients/{cid}/emails")
def get_emails(cid: str, top: int = 20):
    return fixtures.emails(cid, top)

@router.get("/clients/{cid}/privacy/scores")
def get_privacy_scores(cid: str):
    return fixtures.privacy_scores(cid)

@router.post("/clients/{cid}/privacy/deliver")
def gen_privacy_deliverable(cid: str):
    return {"link": "https://share.example/eislaw/demo-deliverable.docx"}
