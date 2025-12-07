"""
Clients API Router
Extracted from main.py - Uses SQLite via db_api_helpers
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import urllib.parse

# Import from Joseph's DB layer
from backend.db_api_helpers import (
    load_clients_from_sqlite,
    find_client_by_id,
    find_client_by_name,
    archive_client as db_archive_client,
    restore_client as db_restore_client,
)
from backend import fixtures

router = APIRouter(prefix="/api", tags=["clients"])


@router.get("/clients")
def get_clients(status: str = "active"):
    """
    Return clients from SQLite database.
    Query params: status: "active" | "archived" | "all"
    """
    clients = load_clients_from_sqlite()
    if not clients:
        clients = fixtures.clients()

    if status == "active":
        clients = [c for c in clients if c.get("active", True)]
    elif status == "archived":
        clients = [c for c in clients if not c.get("active", True)]

    return clients


@router.get("/clients/{cid}")
def get_client(cid: str):
    """Get client detail by ID."""
    c = find_client_by_id(cid)
    if c:
        return c
    c = fixtures.client_detail(cid)
    if c:
        return c
    raise HTTPException(status_code=404, detail="Client not found")


@router.patch("/clients/{client_name}/archive")
def archive_client(client_name: str):
    """Archive a client (set active=False)."""
    decoded_name = urllib.parse.unquote(client_name)
    success = db_archive_client(decoded_name)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True}


@router.patch("/clients/{client_name}/restore")
def restore_client(client_name: str):
    """Restore an archived client (set active=True)."""
    decoded_name = urllib.parse.unquote(client_name)
    success = db_restore_client(decoded_name)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"success": True}


@router.get("/client/summary")
def get_client_summary(name: str, limit: int = 10):
    """Get client summary by name."""
    decoded_name = urllib.parse.unquote(name)
    client = find_client_by_name(decoded_name)
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
