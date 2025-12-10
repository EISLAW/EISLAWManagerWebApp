from datetime import datetime, timedelta, timezone
from collections import defaultdict
import uuid
try:
    from backend import rag_sqlite
except ImportError:
    import rag_sqlite
from fastapi import FastAPI, Query, UploadFile, File, Form, HTTPException, Body, BackgroundTasks, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
import fcntl
import json
import shutil
import sqlite3
from typing import Optional, List, Dict, Any
import os
import base64
import hashlib
import time
try:
    from backend import fixtures
    from backend import fillout_integration
    from backend import privacy_db
    from backend import privacy_fillout_sync
    from backend import privacy_scoring
    from backend import privacy_email
except ImportError:
    import fixtures
    import fillout_integration
    import privacy_db
    import privacy_fillout_sync
    import privacy_scoring
    import privacy_email
try:
    from backend import templates_api, word_api
except ImportError:
    import templates_api
    import word_api
try:
    from backend import ai_studio
except ImportError:
    import ai_studio
import httpx
import msal

try:
    from backend import db_api_helpers
except ImportError:
    import db_api_helpers

app = FastAPI(title="EISLAW Backend", version="0.1.0")

# ─────────────────────────────────────────────────────────────
# Secrets Loading (from secrets.local.json)

# Include AI Studio router
app.include_router(ai_studio.router)
# ─────────────────────────────────────────────────────────────
SECRETS_PATH = Path(__file__).resolve().parent.parent / "secrets.local.json"

def load_secrets():
    """Load secrets from secrets.local.json."""
    if SECRETS_PATH.exists():
        try:
            return json.loads(SECRETS_PATH.read_text("utf-8"))
        except Exception:
            pass
    return {}

def get_graph_credentials():
    """Get Microsoft Graph credentials from secrets."""
    secrets = load_secrets()
    graph = secrets.get("microsoft_graph", {})
    return {
        "client_id": graph.get("client_id") or os.environ.get("GRAPH_CLIENT_ID"),
        "client_secret": graph.get("client_secret") or os.environ.get("GRAPH_CLIENT_SECRET"),
        "tenant_id": graph.get("tenant_id") or os.environ.get("GRAPH_TENANT_ID"),
    }


def get_airtable_config():
    """Get Airtable credentials from secrets."""
    secrets = load_secrets()
    at = secrets.get("airtable", {})
    return {
        "token": at.get("token") or at.get("token_alt") or os.environ.get("AIRTABLE_TOKEN"),
        "base_id": at.get("base_id") or os.environ.get("AIRTABLE_BASE_ID"),
        "clients_table": at.get("clients_table") or os.environ.get("AIRTABLE_CLIENTS_TABLE"),
        "view_clients": at.get("view_clients"),
    }


# ─────────────────────────────────────────────────────────────

PUBLIC_REPORT_ALLOWED_ORIGINS = {
    "https://eislaw.co.il",
    "https://eislaw.org",
}
PUBLIC_REPORT_MAX_REQUESTS = 20
PUBLIC_REPORT_WINDOW_SECONDS = 300
_public_report_rate_limits = defaultdict(list)


def get_public_report_origin(request: Request) -> str:
    """Return the CORS origin for public report endpoint."""
    origin = request.headers.get("origin") or request.headers.get("Origin")
    if origin and origin in PUBLIC_REPORT_ALLOWED_ORIGINS:
        return origin
    # Default to primary domain
    return "https://eislaw.co.il"


def compute_contact_hash(contact: Dict[str, Any]) -> str:
    """Stable hash to detect changes."""
    tracked = {
        "airtable_id": contact.get("airtable_id"),
        "name": contact.get("name"),
        "email": contact.get("email"),
        "phone": contact.get("phone"),
        "types": contact.get("types") or [],
        "stage": contact.get("stage"),
        "notes": contact.get("notes"),
        "whatsapp_url": contact.get("whatsapp_url"),
        "meeting_email_url": contact.get("meeting_email_url"),
        "airtable_created_at": contact.get("airtable_created_at"),
        "airtable_modified_at": contact.get("airtable_modified_at"),
    }
    serialized = json.dumps(tracked, ensure_ascii=False, sort_keys=True)
    return hashlib.sha1(serialized.encode("utf-8")).hexdigest()


def normalize_airtable_record(record: Dict[str, Any]) -> Dict[str, Any]:
    """Map Airtable record to airtable_contacts schema."""
    fields = record.get("fields", {}) or {}
    email_value = ""
    email_field = fields.get("אימייל") or fields.get("Email")
    if isinstance(email_field, list):
        email_value = email_field[0] if email_field else ""
    elif isinstance(email_field, str):
        email_value = email_field
    contact = {
        "airtable_id": record.get("id"),
        "name": fields.get("לקוחות") or fields.get("Name") or fields.get("שם") or "",
        "email": email_value,
        "phone": fields.get("מספר טלפון") or fields.get("Phone") or "",
        "types": fields.get("סוג לקוח") or fields.get("Type") or [],
        "stage": fields.get("בטיפול") or fields.get("Stage") or "",
        "notes": fields.get("הערות") or fields.get("Notes") or "",
        "whatsapp_url": (fields.get("ווצאפ") or {}).get("url") if isinstance(fields.get("ווצאפ"), dict) else fields.get("ווצאפ") or "",
        "meeting_email_url": (fields.get("מייל תיאום פגישה") or {}).get("url") if isinstance(fields.get("מייל תיאום פגישה"), dict) else fields.get("מייל תיאום פגישה") or "",
        "airtable_created_at": fields.get("Created") or record.get("createdTime"),
        "airtable_modified_at": fields.get("Last Modified"),
    }
    contact["sync_hash"] = compute_contact_hash(contact)
    return contact


def serialize_airtable_contact_for_api(contact: Dict[str, Any]) -> Dict[str, Any]:
    """Convert DB contact to API response shape."""
    types = contact.get("types") or []
    if isinstance(types, str):
        try:
            types = json.loads(types)
        except Exception:
            types = []
    return {
        "id": contact.get("id"),
        "airtable_id": contact.get("airtable_id"),
        "name": contact.get("name"),
        "email": contact.get("email"),
        "phone": contact.get("phone"),
        "types": types,
        "stage": contact.get("stage"),
        "notes": contact.get("notes"),
        "whatsapp_url": contact.get("whatsapp_url"),
        "meeting_email_url": contact.get("meeting_email_url"),
        "airtable_created_at": contact.get("airtable_created_at"),
        "airtable_modified_at": contact.get("airtable_modified_at"),
        "activated": bool(contact.get("activated", 0)),
        "activated_at": contact.get("activated_at"),
        "client_id": contact.get("client_id"),
        "first_synced_at": contact.get("first_synced_at"),
        "last_synced_at": contact.get("last_synced_at"),
    }


def fetch_airtable_contacts_api(cfg: Dict[str, str]) -> List[Dict[str, Any]]:
    """Fetch all contacts from Airtable with pagination."""
    if not all([cfg.get("token"), cfg.get("base_id"), cfg.get("clients_table")]):
        raise HTTPException(status_code=500, detail="Airtable configuration missing")

    headers = {"Authorization": f"Bearer {cfg['token']}"}
    params = {}
    if cfg.get("view_clients"):
        params["view"] = cfg["view_clients"]
    contacts: List[Dict[str, Any]] = []
    offset = None
    with httpx.Client(timeout=30.0) as client:
        while True:
            req_params = params.copy()
            if offset:
                req_params["offset"] = offset
            resp = client.get(
                f"https://api.airtable.com/v0/{cfg['base_id']}/{cfg['clients_table']}",
                headers=headers,
                params=req_params,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Airtable fetch failed: {resp.text}")
            data = resp.json()
            for rec in data.get("records", []):
                contacts.append(normalize_airtable_record(rec))
            offset = data.get("offset")
            if not offset:
                break
            time.sleep(0.2)  # stay within Airtable rate limits
    return contacts


def push_contact_to_airtable(cfg: Dict[str, str], contact: Dict[str, Any]) -> Dict[str, Any]:
    """Create or update a contact in Airtable and return API response."""
    headers = {
        "Authorization": f"Bearer {cfg['token']}",
        "Content-Type": "application/json",
    }
    fields = {
        "לקוחות": contact.get("name"),
        "אימייל": [contact.get("email")] if contact.get("email") else [],
        "מספר טלפון": contact.get("phone"),
        "סוג לקוח": contact.get("types") or [],
        "בטיפול": contact.get("stage"),
        "הערות": contact.get("notes"),
        "ווצאפ": contact.get("whatsapp_url"),
        "מייל תיאום פגישה": contact.get("meeting_email_url"),
    }
    payload = {"fields": {k: v for k, v in fields.items() if v not in (None, "", [])}}
    url = f"https://api.airtable.com/v0/{cfg['base_id']}/{cfg['clients_table']}"
    with httpx.Client(timeout=30.0) as client:
        if contact.get("airtable_id"):
            resp = client.patch(f"{url}/{contact['airtable_id']}", headers=headers, json=payload)
        else:
            resp = client.post(url, headers=headers, json=payload)
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=resp.status_code, detail=f"Airtable push failed: {resp.text}")
        return resp.json()


def get_graph_access_token():
    """Get an access token for Microsoft Graph API using MSAL."""
    creds = get_graph_credentials()
    if not all([creds.get("client_id"), creds.get("client_secret"), creds.get("tenant_id")]):
        raise HTTPException(status_code=500, detail="Microsoft Graph credentials not configured")

    authority = f"https://login.microsoftonline.com/{creds['tenant_id']}"
    app = msal.ConfidentialClientApplication(
        creds["client_id"],
        authority=authority,
        client_credential=creds["client_secret"],
    )

    # Request token for Microsoft Graph
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])

    if "access_token" not in result:
        error = result.get("error_description", result.get("error", "Unknown error"))
        raise HTTPException(status_code=500, detail=f"Failed to get Graph token: {error}")

    return result["access_token"]


# Local Client Registry (~/.eislaw/store/clients.json)
# ─────────────────────────────────────────────────────────────
def get_clients_store_path():
    """Find clients.json in various possible locations (Docker mounts to different paths)."""
    candidates = [
        Path("/root/.eislaw/store/clients.json"),  # Docker root user
        Path("/home/azureuser/.eislaw/store/clients.json"),  # VM user mount
        Path.home() / ".eislaw" / "store" / "clients.json",  # Standard home
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]  # Default fallback


def load_local_clients():
    """Load clients from local registry file."""
    # Try SQLite first
    result = db_api_helpers.load_clients_from_sqlite()
    if result:
        return result
    # Fallback to JSON
    clients_path = get_clients_store_path()
    if not clients_path.exists():
        return []
    try:
        data = json.loads(clients_path.read_text("utf-8"))
        clients = data.get("clients", [])
        # Transform to API format expected by frontend
        result = []
        for c in clients:
            # Skip test clients
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
    """Find a single client by ID from local registry."""
    result = db_api_helpers.find_client_by_id(client_id)
    if result:
        return result
    clients = load_local_clients()
    for c in clients:
        if c.get("id") == client_id:
            return c
    return None


def find_local_client_by_name(name: str):
    """Find a single client by name from local registry (returns with frontend-compatible field names)."""
    # Try SQLite first (primary data source for clients created from Airtable)
    try:
        import sqlite3
        possible_paths = [
            Path("/app/data/eislaw.db"),  # Docker container path
            Path(__file__).parent / "data" / "eislaw.db",  # Local path
        ]
        for db_path in possible_paths:
            if db_path.exists():
                conn = sqlite3.connect(str(db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM clients WHERE name = ?", (name,))
                row = cursor.fetchone()
                conn.close()
                if row:
                    email = row["email"] or ""
                    emails = [email] if email and "@" in email else []
                    types = json.loads(row["types"]) if row["types"] else []
                    return {
                        "id": row["id"],
                        "name": row["name"],
                        "emails": emails,
                        "phone": row["phone"] or "",
                        "client_type": types,
                        "stage": row["stage"] or "",
                        "notes": row["notes"] or "",
                        "folder": row["local_folder"] or "",
                        "airtable_id": row["airtable_id"] or "",
                        "airtable_url": row["airtable_url"] or "",
                        "sharepoint_url": row["sharepoint_url"] or "",
                        "sharepoint_id": row["sharepoint_id"] or "",
                        "contacts": [],  # Contacts are in separate table
                        "created_at": row["created_at"],
                        "active": bool(row["active"]) if row["active"] is not None else True,
                        "archived": bool(row["archived"]) if row["archived"] is not None else False,
                        "archived_at": row["archived_at"],
                        "archived_reason": row["archived_reason"],
                    }
                break
    except Exception as e:
        print(f"SQLite client lookup failed: {e}")

    # Fallback to JSON registry
    clients_path = get_clients_store_path()
    if not clients_path.exists():
        return None
    try:
        data = json.loads(clients_path.read_text("utf-8"))
        clients = data.get("clients", [])
        for c in clients:
            if c.get("display_name", "").lower() == name.lower():
                # Return with field names expected by frontend
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
                    "folder": c.get("folder", ""),  # Frontend expects 'folder'
                    "airtable_id": c.get("airtable_id", ""),  # Frontend expects 'airtable_id'
                    "airtable_url": c.get("airtable_url", ""),
                    "sharepoint_url": c.get("sharepoint_url", ""),  # SharePoint folder URL
                    "sharepoint_id": c.get("sharepoint_id", ""),
                    "contacts": c.get("contacts", []),
                    "created_at": c.get("created_at"),
                    "active": c.get("active", True),
                    "archived": c.get("archived", not c.get("active", True)),
                    "archived_at": c.get("archived_at"),
                }
    except Exception as e:
        print(f"Error finding client by name: {e}")
    return None


def fetch_airtable_clients():
    """Fetch clients from Airtable."""
    cfg = get_airtable_config()
    if not all([cfg.get("token"), cfg.get("base_id"), cfg.get("clients_table")]):
        # Fall back to fixtures if Airtable not configured
        return fixtures.clients()


# ─────────────────────────────────────────────────────────────
# Airtable Contacts Sync Endpoints
# ─────────────────────────────────────────────────────────────


@app.get("/api/airtable-contacts")
def list_airtable_contacts_api(activated: Optional[bool] = None, search: Optional[str] = None):
    contacts = db_api_helpers.list_airtable_contacts(activated=activated, search=search)
    state = db_api_helpers.get_sync_state("airtable", "contacts") or {}
    return {
        "contacts": [serialize_airtable_contact_for_api(c) for c in contacts],
        "total": len(contacts),
        "last_sync": state.get("last_sync_at"),
    }


@app.post("/api/sync/pull-airtable")
def pull_airtable_contacts():
    cfg = get_airtable_config()
    contacts = fetch_airtable_contacts_api(cfg)
    stats = {
        "total_fetched": len(contacts),
        "new_contacts": 0,
        "updated_contacts": 0,
        "unchanged": 0,
        "errors": 0,
    }
    for contact in contacts:
        try:
            existing = db_api_helpers.get_airtable_contact_by_airtable_id(contact["airtable_id"])
            changed = not existing or existing.get("sync_hash") != contact.get("sync_hash")
            db_api_helpers.upsert_airtable_contact(contact)
            if not existing:
                stats["new_contacts"] += 1
            elif changed:
                stats["updated_contacts"] += 1
            else:
                stats["unchanged"] += 1
        except Exception:
            stats["errors"] += 1
            continue
    synced_at = datetime.utcnow().isoformat() + "Z"
    db_api_helpers.set_sync_state("airtable", "contacts", synced_at, None, "idle", len(contacts))
    return {"success": True, "stats": stats, "synced_at": synced_at}


@app.post("/api/sync/push-airtable")
def push_airtable_contacts():
    cfg = get_airtable_config()
    if not all([cfg.get("token"), cfg.get("base_id"), cfg.get("clients_table")]):
        raise HTTPException(status_code=500, detail="Airtable configuration missing")
    contacts = db_api_helpers.list_airtable_contacts()
    stats = {"pushed": 0, "created_in_airtable": 0, "updated_in_airtable": 0, "errors": 0, "skipped_unchanged": 0}
    now = datetime.utcnow().isoformat() + "Z"
    for contact in contacts:
        try:
            # Skip unchanged records that already exist in Airtable
            types = contact.get("types")
            if isinstance(types, str):
                try:
                    types = json.loads(types)
                except Exception:
                    types = []
            contact["types"] = types or []
            contact_hash = compute_contact_hash(contact)
            if contact.get("airtable_id") and contact.get("sync_hash") == contact_hash:
                stats["skipped_unchanged"] += 1
                continue

            resp = push_contact_to_airtable(cfg, contact)
            airtable_id = resp.get("id") or contact.get("airtable_id")
            updated = contact.copy()
            updated["airtable_id"] = airtable_id
            updated["last_synced_at"] = now
            updated["sync_hash"] = compute_contact_hash(updated)
            db_api_helpers.upsert_airtable_contact(updated)
            stats["pushed"] += 1
            if contact.get("airtable_id"):
                stats["updated_in_airtable"] += 1
            else:
                stats["created_in_airtable"] += 1
        except Exception:
            stats["errors"] += 1
            continue
    db_api_helpers.set_sync_state("airtable", "contacts", now, None, "idle", stats["pushed"])
    return {"success": True, "stats": stats}


@app.post("/api/contacts/activate")
def activate_contact(payload: Dict = Body(...)):
    contact_id = payload.get("airtable_contact_id")
    sharepoint_folder = payload.get("sharepoint_folder")
    local_folder = payload.get("local_folder")
    if not contact_id:
        raise HTTPException(status_code=400, detail="airtable_contact_id is required")
    contact = db_api_helpers.get_airtable_contact_by_id(contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    cfg = get_airtable_config()
    airtable_url = None
    if cfg.get("base_id") and cfg.get("clients_table") and contact.get("airtable_id"):
        airtable_url = f"https://airtable.com/{cfg['base_id']}/{cfg['clients_table']}/{contact['airtable_id']}"

    new_client = {
        "id": str(uuid.uuid4()),
        "name": contact.get("name"),
        "email": contact.get("email"),
        "phone": contact.get("phone"),
        "types": contact.get("types") or [],
        "stage": "active",  # clients table uses English stage values
        "notes": contact.get("notes"),
        "airtable_id": contact.get("airtable_id"),
        "airtable_url": airtable_url,
        "sharepoint_url": sharepoint_folder,
        "local_folder": local_folder,
        "active": 1,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    client = db_api_helpers.create_client(new_client)
    db_api_helpers.mark_contact_activated(contact_id, client["id"])

    return {
        "success": True,
        "client": {
            "id": client["id"],
            "name": client.get("name"),
            "sharepoint_url": client.get("sharepoint_url"),
            "local_folder": client.get("local_folder"),
        },
    }

    import urllib.parse
    import urllib.request

    base_url = f"https://api.airtable.com/v0/{cfg['base_id']}/{cfg['clients_table']}"
    params = {}
    if cfg.get("view_clients"):
        params["view"] = cfg["view_clients"]

    url = base_url
    if params:
        url += "?" + urllib.parse.urlencode(params)

    headers = {
        "Authorization": f"Bearer {cfg['token']}",
        "Content-Type": "application/json",
    }

    all_records = []
    offset = None

    try:
        while True:
            req_url = url
            if offset:
                sep = "&" if "?" in req_url else "?"
                req_url += f"{sep}offset={offset}"

            req = urllib.request.Request(req_url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            records = data.get("records", [])
            all_records.extend(records)

            offset = data.get("offset")
            if not offset:
                break

        # Transform Airtable records to our client format
        clients = []
        for rec in all_records:
            fields = rec.get("fields", {})
            # Map Airtable fields to our format - try various Hebrew and English field names
            client = {
                "id": rec.get("id"),
                "name": fields.get("לקוחות") or fields.get("Name") or fields.get("שם") or fields.get("שם לקוח") or "",
                "email": fields.get("אימייל") or fields.get("Email") or fields.get("דוא\"ל") or "",
                "phone": fields.get("מספר טלפון") or fields.get("Phone") or fields.get("טלפון") or "",
                "type": fields.get("סוג לקוח") or fields.get("Type") or fields.get("סוג") or [],
                "stage": fields.get("שלב") or fields.get("Stage") or fields.get("סטטוס") or "",
                "notes": fields.get("הערות") or fields.get("Notes") or fields.get("מהטופס: פרטו בכמה מלים") or "",
                "folderPath": fields.get("תיקייה") or fields.get("FolderPath") or "",
                "createdAt": rec.get("createdTime"),
            }
            # Only include if has a name
            if client["name"]:
                clients.append(client)

        return clients

    except Exception as e:
        print(f"Airtable fetch error: {e}")
        # Fall back to fixtures on error
        return fixtures.clients()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://20.217.86.4:8080",
    "http://20.217.86.4:5173",
    "http://localhost:5180",
    "http://127.0.0.1:5180",
    "http://localhost:5181",
    "http://127.0.0.1:5181",
    "http://localhost:5182",
    "http://127.0.0.1:5182",
    "http://localhost:5183",
    "http://127.0.0.1:5183",
    "http://localhost:5184",
    "http://127.0.0.1:5184",
    "http://localhost:5185",
    "http://127.0.0.1:5185",
    *list(PUBLIC_REPORT_ALLOWED_ORIGINS),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include templates API router
app.include_router(templates_api.router)
app.include_router(word_api.router)

BASE_DIR = Path(__file__).resolve().parent
TRANSCRIPTS_DIR = BASE_DIR / "Transcripts"
INBOX_DIR = TRANSCRIPTS_DIR / "Inbox"
LIBRARY_DIR = TRANSCRIPTS_DIR / "Library"
INDEX_PATH = TRANSCRIPTS_DIR / "index.json"


def get_tasks_store_path():
    """Get tasks storage path - same location as clients registry for Docker compatibility."""
    # Docker mount paths (same as clients store)
    paths_to_try = [
        Path("/root/.eislaw/store/tasks.json"),
        Path("/home/azureuser/.eislaw/store/tasks.json"),
        Path.home() / ".eislaw" / "store" / "tasks.json",
    ]
    # Return first writable path
    for p in paths_to_try:
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            # Test write permission
            test_file = p.parent / ".write_test"
            test_file.touch()
            test_file.unlink()
            return p
        except Exception:
            continue
    # Fallback to local data dir (may fail in Docker)
    return BASE_DIR / "data" / "tasks.json"


def get_tasks_archive_path():
    """Get tasks archive path."""
    tasks_path = get_tasks_store_path()
    return tasks_path.parent / "tasks_archive.json"


TASKS_PATH = get_tasks_store_path()
TASKS_ARCHIVE_PATH = get_tasks_archive_path()


def ensure_dirs():
    INBOX_DIR.mkdir(parents=True, exist_ok=True)
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    TASKS_PATH.parent.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# Tasks Storage (JSON file-based, same pattern as RAG index)
# ─────────────────────────────────────────────────────────────

def load_tasks():
    """Load tasks from SQLite only - single source of truth."""
    try:
        return db_api_helpers.load_tasks_from_sqlite()
    except Exception as e:
        print(f"Error loading tasks from SQLite: {e}")
        return []


def save_tasks(tasks):
    """Save tasks to SQLite only - single source of truth."""
    try:
        for t in tasks:
            db_api_helpers.update_or_create_task_in_sqlite(t)
    except Exception as e:
        print(f"Error saving tasks to SQLite: {e}")


def load_tasks_archive():
    if not TASKS_ARCHIVE_PATH.exists():
        return []
    try:
        return json.loads(TASKS_ARCHIVE_PATH.read_text("utf-8"))
    except Exception:
        return []


def save_tasks_archive(tasks):
    TASKS_ARCHIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    TASKS_ARCHIVE_PATH.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")


def find_task(task_id: str):
    """Find task by ID from SQLite only."""
    try:
        return db_api_helpers.find_task_by_id(task_id)
    except Exception as e:
        print(f"Error finding task {task_id}: {e}")
        return None


def load_index():
    if not INDEX_PATH.exists():
        return []
    try:
        return json.loads(INDEX_PATH.read_text("utf-8"))
    except Exception:
        return []


def save_index(items):
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def upsert_item(new_item):
    items = load_index()
    # replace if same id or hash
    replaced = False
    for idx, itm in enumerate(items):
        if itm.get("id") == new_item["id"] or (new_item.get("hash") and itm.get("hash") == new_item["hash"]):
            items[idx] = new_item
            replaced = True
            break
    if not replaced:
        items.append(new_item)
    save_index(items)
    return new_item


def remove_item(item_id: str):
    items = load_index()
    remaining = [i for i in items if i.get("id") != item_id]
    save_index(remaining)
    return len(items) != len(remaining)


def find_item(item_id: str):
    for itm in load_index():
        if itm.get("id") == item_id:
            return itm
    return None


def require_env(key_name: str):
    val = os.environ.get(key_name)
    if not val:
        raise HTTPException(status_code=500, detail=f"{key_name} not configured")
    return val


def list_gemini_models():
    key = require_env("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Gemini list failed: {resp.text}")
        data = resp.json()
    names = [m.get("name") for m in data.get("models", []) if m.get("name", "").startswith("models/gemini")]
    return names


def list_openai_models():
    key = require_env("OPENAI_API_KEY")
    url = "https://api.openai.com/v1/models"
    headers = {"Authorization": f"Bearer {key}"}
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"OpenAI list failed: {resp.text}")
        data = resp.json()
    names = [m.get("id") for m in data.get("data", [])]
    return names


def list_anthropic_models():
    key = require_env("ANTHROPIC_API_KEY")
    url = "https://api.anthropic.com/v1/models"
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
    }
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Anthropic list failed: {resp.text}")
        data = resp.json()
    names = [m.get("id") for m in data.get("models", [])]
    return names


def gemini_transcribe_audio(file_path: str, model: Optional[str] = None) -> List[dict]:
    """
    Synchronous Gemini call for audio transcription using inlineData.
    Returns a list of transcript segments (single segment stub).
    """
    key = require_env("GEMINI_API_KEY")
    model_name = model or os.environ.get("GEMINI_MODEL", "gemini-3-pro-preview")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
    data = Path(file_path).read_bytes()
    b64 = base64.b64encode(data).decode("utf-8")
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": "Transcribe this audio to text. Return plain text only."},
                    {"inlineData": {"mimeType": "audio/mpeg", "data": b64}},
                ]
            }
        ]
    }
    with httpx.Client(timeout=240.0) as client:
        resp = client.post(url, json=payload)
        if resp.status_code != 200:
            raise Exception(f"Gemini transcription failed: {resp.text}")
        data = resp.json()
    text = ""
    try:
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text = parts[0].get("text", "")
    except Exception:
        pass
    if not text:
        raise Exception("No transcript returned")
    return [{"speaker": "Speaker 1", "start": "00:00", "end": "", "text": text.strip()}]


@app.get("/api/auth/me")
def auth_me():
    return {"user": {"email": "eitan@eislaw.co.il", "roles": ["admin"]}}


@app.get("/api/clients")
def get_clients(
    status: Optional[str] = Query(
        None, description="Deprecated: use archived=0|1|all"
    ),
    archived: Optional[str] = Query(
        None, description="Filter: 0 (active, default), 1 (archived), all"
    ),
):
    """
    Return client registry from SQLite with archive filter.

    Query params:
        archived: "0" (default), "1", or "all"
        status: legacy param ("active" | "archived" | "all") - maps to archived filter
    """

    def normalize_archived_param(archived_value: Optional[str], status_value: Optional[str]) -> str:
        if archived_value is None or archived_value == "":
            mapped = (status_value or "").lower() if status_value else None
            if mapped in {"active", "0", "false"}:
                archived_value = "0"
            elif mapped in {"archived", "1", "true"}:
                archived_value = "1"
            elif mapped == "all":
                archived_value = "all"
        value = str(archived_value).lower() if archived_value is not None else "0"
        if value in {"true", "1"}:
            value = "1"
        elif value in {"false", "0", ""}:
            value = "0"
        if value not in {"0", "1", "all"}:
            raise HTTPException(status_code=400, detail="archived must be 0, 1, or all")
        return value

    archived_filter = normalize_archived_param(archived, status)
    clients = db_api_helpers.list_clients(archived_filter=archived_filter)
    if not clients:
        # Fall back to fixtures if no registry
        clients = fixtures.clients()
        if archived_filter == "0":
            clients = [c for c in clients if c.get("active", True)]
        elif archived_filter == "1":
            clients = [c for c in clients if not c.get("active", True)]
        for c in clients:
            if "archived" not in c:
                c["archived"] = not c.get("active", True)
    return clients


@app.get("/api/clients/{cid}")
def get_client(cid: str):
    """Get client detail from local registry."""
    c = find_local_client(cid)
    if c:
        return c
    # Fall back to fixtures
    c = fixtures.client_detail(cid)
    if c:
        return c
    raise HTTPException(status_code=404, detail="Client not found")


@app.post("/api/clients/{client_id}/archive")
def archive_client_by_id(client_id: str, payload: dict = Body(default={})):
    """
    Archive a client (set archived=1, archived_at timestamp, archived_reason).
    Returns 404 if not found, 409 if already archived.
    """
    reason = (payload or {}).get("reason") or "manual"
    client, changed, conflict = db_api_helpers.update_client_archive_state(
        client_id, archive=True, reason=reason
    )
    if client is None:
        raise HTTPException(status_code=404, detail={"reason": "not_found", "message": "Client not found"})
    if not changed:
        raise HTTPException(
            status_code=409,
            detail={"reason": conflict or "already_archived", "message": "Client already archived"},
        )
    return {"success": True, "archived_at": client.get("archived_at") or client.get("archivedAt"), "client": client}


@app.post("/api/clients/{client_id}/restore")
def restore_client_by_id(client_id: str, payload: dict = Body(default={})):
    """
    Restore an archived client (set archived=0).
    Returns 404 if not found, 409 if already active.
    """
    reason = (payload or {}).get("reason")
    client, changed, conflict = db_api_helpers.update_client_archive_state(
        client_id, archive=False, reason=reason or "manual"
    )
    if client is None:
        raise HTTPException(status_code=404, detail={"reason": "not_found", "message": "Client not found"})
    if not changed:
        raise HTTPException(
            status_code=409,
            detail={"reason": conflict or "already_active", "message": "Client already active"},
        )
    return {"success": True, "client": client}


@app.patch("/api/clients/{client_name}/archive")
def archive_client(client_name: str):
    """
    Archive a client by name (legacy endpoint).
    """
    import urllib.parse
    decoded_name = urllib.parse.unquote(client_name)

    archived_at = datetime.utcnow().isoformat() + "Z"
    result = update_client_active_status(decoded_name, active=False, archived_at=archived_at)

    if result is None:
        raise HTTPException(status_code=404, detail="Client not found")
    if result.get("archived"):
        return {"success": True, "archived_at": archived_at}

    return {"success": True, "archived_at": archived_at}


@app.patch("/api/clients/{client_name}/restore")
def restore_client(client_name: str):
    """
    Restore an archived client by name (legacy endpoint).
    """
    import urllib.parse
    decoded_name = urllib.parse.unquote(client_name)

    result = update_client_active_status(decoded_name, active=True, archived_at=None)

    if result is None:
        raise HTTPException(status_code=404, detail="Client not found")

    return {"success": True}


@app.get("/api/client/summary")
def get_client_summary(name: str, limit: int = 10):
    """
    Get client summary by name. Returns client data with field names expected by frontend.
    This endpoint is used by ClientOverview.jsx.
    """
    import urllib.parse
    decoded_name = urllib.parse.unquote(name)

    client = find_local_client_by_name(decoded_name)
    if not client:
        return {"client": {"name": decoded_name}, "files": [], "emails": []}

    # Get files and emails (stubs for now)
    files = fixtures.files(client.get("id", ""), "sharepoint") if client.get("id") else []
    emails = fixtures.emails(client.get("id", ""), limit) if client.get("id") else []

    return {
        "client": client,
        "files": files,
        "emails": emails
    }


@app.get("/api/clients/{cid}/files")
def get_files(cid: str, location: str = Query("sharepoint", pattern="^(local|sharepoint)$")):
    return fixtures.files(cid, location)


@app.get("/api/clients/{cid}/emails")
def get_emails(cid: str, top: int = 20):
    return fixtures.emails(cid, top)


@app.get("/api/clients/{cid}/privacy/scores")
def get_privacy_scores(cid: str):
    return fixtures.privacy_scores(cid)


@app.post("/api/clients/{cid}/privacy/deliver")
def gen_privacy_deliverable(cid: str):
    # stub
    return {"link": "https://share.example/eislaw/demo-deliverable.docx"}


@app.get("/api/projects")
def get_projects():
    return fixtures.projects()


# ─────────────────────────────────────────────────────────────
# Tasks API (CRUD)
# ─────────────────────────────────────────────────────────────

@app.get("/api/tasks")
def list_tasks(
    client: Optional[str] = None,
    owner: Optional[str] = None,
    status: Optional[str] = None,
    include_done: bool = False,
    include_archived: bool = False,
):
    """
    List all tasks with optional filters.
    - client: filter by clientName (case-insensitive)
    - owner: filter by ownerId, or 'unassigned' for tasks without owner
    - status: filter by status (new, in_progress, done)
    - include_done: include completed tasks (default: false)
    - include_archived: include archived tasks (default: false)
    """
    ensure_dirs()
    tasks = load_tasks()

    # Filter by client
    if client:
        tasks = [t for t in tasks if (t.get("clientName") or "").lower() == client.lower()]

    # Filter by owner
    if owner:
        if owner == "unassigned":
            tasks = [t for t in tasks if not t.get("ownerId")]
        else:
            tasks = [t for t in tasks if t.get("ownerId") == owner]

    # Filter by status
    if status:
        tasks = [t for t in tasks if t.get("status") == status]
    elif not include_done:
        tasks = [t for t in tasks if t.get("status") != "done"]

    # Exclude deleted/archived unless requested
    tasks = [t for t in tasks if not t.get("deletedAt")]

    if include_archived:
        archived = load_tasks_archive()
        tasks = tasks + archived

    # Sort by due date (soonest first), then by updatedAt
    def sort_key(t):
        due = t.get("dueAt")
        due_ts = datetime.fromisoformat(due.replace("Z", "+00:00")).timestamp() if due else float("inf")
        updated = t.get("updatedAt") or t.get("createdAt") or ""
        updated_ts = datetime.fromisoformat(updated.replace("Z", "+00:00")).timestamp() if updated else 0
        return (due_ts, -updated_ts)

    tasks.sort(key=sort_key)
    return {"tasks": tasks}


@app.get("/api/tasks/summary")
def tasks_summary():
    """
    Get task counts for dashboard: overdue, today, upcoming, total open.
    """
    ensure_dirs()
    tasks = [t for t in load_tasks() if t.get("status") != "done" and not t.get("deletedAt")]

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)

    overdue = []
    today_tasks = []
    upcoming = []
    no_due_date = []

    for t in tasks:
        due = t.get("dueAt")
        if not due:
            no_due_date.append(t)
            continue
        try:
            due_dt = datetime.fromisoformat(due.replace("Z", "+00:00").replace("+00:00", ""))
        except Exception:
            no_due_date.append(t)
            continue

        if due_dt < today_start:
            overdue.append(t)
        elif due_dt < today_end:
            today_tasks.append(t)
        elif due_dt < week_end:
            upcoming.append(t)

    return {
        "overdue": len(overdue),
        "overdueItems": overdue[:10],
        "today": len(today_tasks),
        "todayItems": today_tasks[:10],
        "upcoming": len(upcoming),
        "upcomingItems": upcoming[:10],
        "noDueDate": len(no_due_date),
        "totalOpen": len(tasks),
    }


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    """Get a single task by ID."""
    ensure_dirs()
    task = find_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/api/tasks")
def create_task(payload: dict = Body(...)):
    """
    Create a new task.
    Required: title
    Optional: desc, dueAt, priority, clientName, ownerId, parentId, source, attachments, comments
    """
    ensure_dirs()
    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    now = datetime.utcnow().isoformat() + "Z"
    task = {
        "id": str(uuid.uuid4()),
        "title": title,
        "desc": payload.get("desc") or "",
        "status": "new",
        "dueAt": payload.get("dueAt"),
        "priority": payload.get("priority"),  # high, medium, low
        "clientName": payload.get("clientName"),
        "clientFolderPath": payload.get("clientFolderPath"),
        "ownerId": payload.get("ownerId"),
        "parentId": payload.get("parentId"),
        "comments": payload.get("comments") or [],
        "attachments": payload.get("attachments") or [],
        "templateRef": payload.get("templateRef"),
        "source": payload.get("source") or "manual",
        "createdAt": now,
        "updatedAt": now,
        "doneAt": None,
        "deletedAt": None,
    }

    tasks = load_tasks()
    tasks.append(task)
    save_tasks(tasks)
    # Also save to SQLite
    try:
        db_api_helpers.create_task_in_sqlite(task)
    except Exception as e:
        print(f"Error saving task to SQLite: {e}")
    return task


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: str, payload: dict = Body(...)):
    """
    Update a task. Supports partial updates.
    """
    ensure_dirs()
    tasks = load_tasks()
    idx = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[idx]
    now = datetime.utcnow().isoformat() + "Z"

    # Update allowed fields
    for key in ["title", "desc", "dueAt", "priority", "clientName", "clientFolderPath",
                "ownerId", "parentId", "comments", "attachments", "templateRef", "source"]:
        if key in payload:
            task[key] = payload[key]

    # Handle status changes
    if "status" in payload:
        task["status"] = payload["status"]
        if payload["status"] == "done" and not task.get("doneAt"):
            task["doneAt"] = now
        elif payload["status"] != "done":
            task["doneAt"] = None

    task["updatedAt"] = now
    tasks[idx] = task
    save_tasks(tasks)
    # Also update in SQLite
    try:
        db_api_helpers.update_task_in_sqlite(task_id, payload)
    except Exception as e:
        print(f"Error updating task in SQLite: {e}")
    return task


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str, hard: bool = False):
    """
    Delete a task. By default, soft-deletes (marks deletedAt).
    Use hard=true to permanently remove.
    """
    ensure_dirs()
    tasks = load_tasks()
    idx = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if hard:
        tasks.pop(idx)
    else:
        tasks[idx]["deletedAt"] = datetime.utcnow().isoformat() + "Z"

    save_tasks(tasks)
    # Also delete from SQLite
    try:
        db_api_helpers.delete_task_from_sqlite(task_id)
    except Exception as e:
        print(f"Error deleting task from SQLite: {e}")
    return {"deleted": True, "id": task_id}


@app.post("/api/tasks/{task_id}/done")
def mark_task_done(task_id: str, done: bool = True):
    """Toggle task done status."""
    ensure_dirs()
    tasks = load_tasks()
    idx = next((i for i, t in enumerate(tasks) if t.get("id") == task_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Task not found")

    now = datetime.utcnow().isoformat() + "Z"
    if done:
        tasks[idx]["status"] = "done"
        tasks[idx]["doneAt"] = now
    else:
        tasks[idx]["status"] = "new"
        tasks[idx]["doneAt"] = None
    tasks[idx]["updatedAt"] = now

    save_tasks(tasks)
    # Also update in SQLite
    try:
        db_api_helpers.mark_task_done_in_sqlite(task_id, done)
    except Exception as e:
        print(f"Error marking task done in SQLite: {e}")
    return tasks[idx]


@app.post("/api/tasks/{task_id}/subtask")
def add_subtask(task_id: str, payload: dict = Body(...)):
    """Add a subtask to a parent task."""
    ensure_dirs()
    parent = find_task(task_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent task not found")

    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    now = datetime.utcnow().isoformat() + "Z"
    subtask = {
        "id": str(uuid.uuid4()),
        "title": title,
        "desc": payload.get("desc") or "",
        "status": "new",
        "dueAt": payload.get("dueAt"),
        "priority": payload.get("priority"),
        "clientName": parent.get("clientName"),  # inherit from parent
        "ownerId": payload.get("ownerId"),
        "parentId": task_id,
        "comments": [],
        "attachments": [],
        "source": "subtask",
        "createdAt": now,
        "updatedAt": now,
        "doneAt": None,
        "deletedAt": None,
    }

    tasks = load_tasks()
    tasks.append(subtask)
    save_tasks(tasks)
    return subtask


@app.post("/api/tasks/import")
def import_tasks(payload: dict = Body(...)):
    """
    Import tasks from localStorage migration.
    Expects: { "tasks": [...], "merge": true/false }
    """
    ensure_dirs()
    incoming = payload.get("tasks") or []
    merge = payload.get("merge", True)

    if not isinstance(incoming, list):
        raise HTTPException(status_code=400, detail="tasks must be an array")

    existing = load_tasks() if merge else []
    existing_ids = {t.get("id") for t in existing}

    imported = 0
    for t in incoming:
        if not t.get("id"):
            continue
        if t.get("id") in existing_ids:
            # Update existing
            idx = next((i for i, e in enumerate(existing) if e.get("id") == t.get("id")), None)
            if idx is not None:
                existing[idx] = {**existing[idx], **t, "updatedAt": datetime.utcnow().isoformat() + "Z"}
        else:
            existing.append(t)
            existing_ids.add(t.get("id"))
        imported += 1

    save_tasks(existing)
    return {"imported": imported, "total": len(existing)}


@app.get("/api/privacy/submissions")
def get_privacy_submissions(limit: int = 50, offset: int = 0):
    """Get privacy submissions from SQLite (Phase 5B)"""
    try:
        submissions = privacy_fillout_sync.get_submissions_from_sqlite(limit=limit, offset=offset)
        total = privacy_fillout_sync.get_submissions_count()
        return {"submissions": submissions, "total": total}
    except Exception as e:
        # Fallback to fixtures if SQLite fails
        return {"submissions": fixtures.privacy_submissions(limit), "total": 0, "error": str(e)}


@app.get("/api/privacy/submissions/{submission_id}")
def get_privacy_submission_detail(submission_id: str):
    """Get single privacy submission detail (Phase 5B)"""
    submission = privacy_fillout_sync.get_submission_by_id(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


@app.get("/api/privacy/sync_fillout")
def sync_privacy_from_fillout(form_id: Optional[str] = None, limit: int = 100):
    """Sync privacy submissions from Fillout API to SQLite (Phase 5B)"""
    result = privacy_fillout_sync.sync_from_fillout(form_id=form_id, limit=limit)
    return result


# ─────────────────────────────────────────────────────────────
# Privacy Scoring API - Phase 5C
# ─────────────────────────────────────────────────────────────

@app.post("/api/privacy/score/{submission_id}")
def score_privacy_submission(submission_id: str):
    """Run scoring algorithm on a privacy submission (Phase 5C)"""
    result = privacy_scoring.score_submission(submission_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.post("/api/privacy/score_all")
def score_all_privacy_submissions():
    """Score all unscored privacy submissions (Phase 5C)"""
    result = privacy_scoring.score_all_submissions()
    return result


class ReviewOverrideBody:
    def __init__(self, override_level: Optional[str] = None, notes: Optional[str] = None, reviewed_by: Optional[str] = None, status: str = "reviewed"):
        self.override_level = override_level
        self.notes = notes
        self.reviewed_by = reviewed_by
        self.status = status


@app.post("/api/privacy/save_review")
def save_privacy_review(
    submission_id: str,
    override_level: Optional[str] = None,
    notes: Optional[str] = None,
    reviewed_by: Optional[str] = None,
    status: str = "reviewed"
):
    """Save human override/review for a privacy submission (Phase 5C)"""
    result = privacy_scoring.save_review_override(
        submission_id=submission_id,
        override_level=override_level,
        notes=notes,
        reviewed_by=reviewed_by,
        status=status
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/api/privacy/metrics")
def get_privacy_metrics():
    """Get privacy scoring metrics and statistics (Phase 5C)"""
    return privacy_scoring.get_metrics()


@app.get("/api/privacy/review/{submission_id}")
def get_privacy_review(submission_id: str):
    """Get review details for a submission (Phase 5C)"""
    result = privacy_scoring.get_review_by_submission(submission_id)
    if not result:
        raise HTTPException(status_code=404, detail="Review not found")
    return result


# ─────────────────────────────────────────────────────────────
# Privacy Email & Reports (Phase 5D)
# ─────────────────────────────────────────────────────────────

@app.post("/api/privacy/preview_email/{submission_id}")
def privacy_preview_email(submission_id: str):
    """
    Preview email for a privacy submission (Phase 5D).
    Returns HTML preview and metadata.
    """
    result = privacy_email.preview_email(submission_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.post("/api/privacy/send_email/{submission_id}")
def privacy_send_email(submission_id: str, payload: dict = Body(default={})):
    """
    Send privacy results email via Graph API (Phase 5D).
    Optional body: {"custom_html": "..."} to override template.
    """
    custom_html = payload.get("custom_html") if payload else None
    result = privacy_email.send_email(
        submission_id,
        get_token_func=get_graph_access_token,
        custom_html=custom_html
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/privacy/approve_and_publish/{submission_id}")
def privacy_approve_and_publish(submission_id: str):
    """
    Approve submission and generate public report token (Phase 5D).
    Returns the report URL for sharing.
    """
    result = privacy_email.approve_and_publish(submission_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/privacy/report/{token}")
def privacy_report(token: str):
    """
    Get public privacy report by token (Phase 5D).
    Returns report data for frontend rendering.
    """
    result = privacy_email.get_report_by_token(token)
    if not result:
        raise HTTPException(status_code=404, detail="Report not found or not approved")
    return result


@app.get("/api/privacy/report/{token}/html")
def privacy_report_html(token: str):
    """
    Get full HTML report page by token (Phase 5D).
    Returns standalone HTML page for printing/sharing.
    """
    from fastapi.responses import HTMLResponse
    html = privacy_email.get_report_html(token)
    if not html:
        raise HTTPException(status_code=404, detail="Report not found or not approved")
    return HTMLResponse(content=html, media_type="text/html")


@app.get("/api/rag/search")
def rag_search(q: str, client: Optional[str] = None, domain: Optional[str] = None, limit: int = 20):
    """Search transcripts using SQLite."""
    return rag_sqlite.rag_search_sqlite(q, client, domain, limit)

@app.get("/api/rag/inbox")
def rag_inbox():
    """List transcripts from SQLite (status = draft or reviewed)."""
    return rag_sqlite.rag_inbox_sqlite()

# REMOVED: Old JSON-based rag_inbox (now using SQLite)


@app.post("/api/rag/ingest")
async def rag_ingest(
    file: UploadFile = File(...),
    hash: str = Form(...),
    filename: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    client: Optional[str] = Form(None),
    domain: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
):
    """
    Ingest audio file: saves to disk, transcribes with Gemini, stores in SQLite.
    Duplicate hashes return existing entry without re-processing.
    """
    ensure_dirs()
    safe_name = filename or file.filename or "upload.bin"
    target_path = INBOX_DIR / f"{hash}_{safe_name}"

    # Save file to disk
    with target_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Transcribe
    segments, note, status = [], "Saved to inbox; transcription pending", "draft"
    content_text = ""
    try:
        segments = gemini_transcribe_audio(str(target_path), model=model)
        content_text = "\n".join(seg.get("text", "") for seg in segments)
        # note variable removed - using model_used directly
        status = "ready"
    except Exception as exc:
        note = f"Transcription failed: {exc}"
        status = "error"

    # Store in SQLite
    result = rag_sqlite.ingest_transcript_sqlite(
        file_hash=hash,
        filename=safe_name,
        file_path=str(target_path),
        content=content_text,
        segments=segments,
        client=client,
        domain=domain,
        model_used=model or os.environ.get("GEMINI_MODEL", "gemini-1.5-flash"),
        status=status
    )

    # Add extra fields for compatibility
    result["modelUsed"] = model or os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    result["filePath"] = str(target_path)
    result["transcript"] = segments

    return result


@app.post("/api/rag/transcribe_doc")
async def rag_transcribe_doc(
    file: UploadFile = File(...),
    client: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
):
    """
    Lightweight mock that accepts a document upload and returns a transcript preview.
    Replace with the real desktop pipeline when wiring Gemini/ffmpeg.
    If model is provided, we just echo it for now; integration will call Gemini.
    """
    content = await file.read()
    preview = ""
    if content:
        try:
            preview = content.decode("utf-8", errors="ignore").strip()
        except Exception:
            preview = ""
    if len(preview) > 800:
        preview = preview[:800].rstrip() + "…"

    return {
        "id": f"tr-{uuid.uuid4().hex[:8]}",
        "client": client,
        "fileName": file.filename,
        "receivedBytes": len(content),
        "status": "completed",
        "transcriptPreview": preview or "Preview unavailable (binary or empty file).",
        "note": "Stub transcription endpoint; replace with desktop pipeline integration.",
        "createdAt": datetime.utcnow().isoformat(),
        "modelUsed": model or "not-set",
    }


@app.post("/api/rag/publish/{item_id}")
def rag_publish(item_id: str):
    """Publish a transcript to library (SQLite)."""
    result = rag_sqlite.publish_transcript_sqlite(
        item_id,
        meilisearch_index_func=rag_sqlite.index_transcript_in_meilisearch
    )
    if not result:
        raise HTTPException(status_code=404, detail="Not found")
    return result


@app.get("/api/rag/reviewer/{item_id}")
def rag_reviewer_get(item_id: str):
    """Get transcript for reviewer (SQLite)."""
    payload = rag_sqlite.get_transcript_for_reviewer(item_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Not found")
    return payload


@app.patch("/api/rag/reviewer/{item_id}")
def rag_reviewer_update(item_id: str, payload: dict = Body(...)):
    """Update transcript via reviewer (SQLite)."""
    updated = rag_sqlite.update_transcript_sqlite(
        item_id,
        payload,
        meilisearch_index_func=rag_sqlite.index_transcript_in_meilisearch
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    return updated


@app.get("/api/rag/models")
def rag_models():
    """
    List available models across providers (requires env vars):
    - Gemini: GEMINI_API_KEY
    - OpenAI: OPENAI_API_KEY
    - Anthropic: ANTHROPIC_API_KEY
    """
    providers = {}
    errors = {}
    try:
        providers["gemini"] = list_gemini_models()
    except HTTPException as e:
        errors["gemini"] = e.detail
    try:
        providers["openai"] = list_openai_models()
    except HTTPException as e:
        errors["openai"] = e.detail
    try:
        providers["anthropic"] = list_anthropic_models()
    except HTTPException as e:
        errors["anthropic"] = e.detail
    return {"providers": providers, "errors": errors}


@app.patch("/api/rag/file/{item_id}")
def rag_update(item_id: str, payload: dict = Body(...)):
    """Update transcript metadata (SQLite)."""
    updated = rag_sqlite.update_transcript_sqlite(
        item_id,
        payload,
        meilisearch_index_func=rag_sqlite.index_transcript_in_meilisearch
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    return updated


@app.delete("/api/rag/file/{item_id}")
def rag_delete(item_id: str):
    """Delete transcript (SQLite soft delete)."""
    deleted = rag_sqlite.delete_transcript_sqlite(
        item_id,
        meilisearch_delete_func=rag_sqlite.remove_from_meilisearch
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True, "id": item_id}


@app.get("/api/rag/audio/{item_id}")
def rag_audio(item_id: str):
    """Stream the audio file for a transcript (SQLite lookup)."""
    ensure_dirs()
    item = rag_sqlite.find_transcript_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")

    path = item.get("filePath") or item.get("file_path")
    if not path or not Path(path).exists():
        # Try to find by recording's azure_blob info
        if item.get("recording_id"):
            db = rag_sqlite.get_sqlite_db()
            rec = db.execute_one("SELECT azure_blob FROM recordings WHERE id = ?", (item["recording_id"],))
            if rec and rec.get("azure_blob"):
                # File might be in INBOX_DIR with hash prefix
                hash_prefix = (item.get("hash") or item.get("id", ""))[:8]
                file_path = next(INBOX_DIR.glob(f"{hash_prefix}_*"), None) or next(
                    LIBRARY_DIR.glob(f"**/{hash_prefix}_*"), None
                )
                if file_path:
                    path = file_path

    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(path, filename=Path(path).name)


@app.post("/api/rag/assistant")
def rag_assistant(payload: dict = Body(default=None)):
    """Chat with AI using RAG sources (Meilisearch + LLM)."""
    if payload is None:
        payload = {}
    q = (payload.get("question") or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="question is required")

    # Get context from Meilisearch (or SQLite fallback)
    context, sources = rag_sqlite.get_rag_context_for_assistant(q, limit=5)

    # If no sources found, return a message
    if not sources:
        return {
            "answer": "No relevant documents found in the knowledge base.",
            "sources": [],
            "model": "none"
        }

    # Build prompt with context
    system_prompt = """You are a helpful legal assistant for EISLAW. Answer questions based on the provided document context.
    If the context doesn't contain relevant information, say so clearly.
    Always cite your sources when possible."""

    user_prompt = f"""Based on the following documents:
{context}

Question: {q}

Please provide a helpful answer based on the document context above."""

    # Try to get LLM response (Gemini, OpenAI, or Claude)
    try:
        import google.generativeai as genai
        secrets = load_secrets()
        api_key = secrets.get("gemini", {}).get("api_key") or os.environ.get("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(user_prompt)
            return {
                "answer": response.text,
                "sources": sources,
                "model": "gemini-1.5-flash"
            }
    except Exception as e:
        print(f"Gemini error: {e}")

    # Fallback: return context without LLM processing
    return {
        "answer": f"Found {len(sources)} relevant documents. LLM processing unavailable.",
        "sources": sources,
        "context_preview": context[:500] + "..." if len(context) > 500 else context,
        "model": "fallback"
    }



# ========== EMAIL HELPER FUNCTIONS (restored 2025-12-07) ==========

def search_emails_by_client(client_name: str, since_days: int = 45, top: int = 50):
    """
    Search for emails from/to the client.
    First tries to find client's email addresses, then searches by those addresses.
    Falls back to name search if no email addresses found.
    Uses Microsoft Graph API search capabilities.
    """
    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Calculate date filter
    from_date = (datetime.utcnow() - timedelta(days=since_days)).strftime("%Y-%m-%dT00:00:00Z")

    # Try to get client's email addresses from local registry (JSON) or SQLite
    client_emails = []
    client_data = find_local_client_by_name(client_name)

    # Fallback to SQLite if JSON lookup failed
    if not client_data:
        try:
            import sqlite3
            # Try multiple possible paths for Docker and local environments
            possible_paths = [
                Path("/app/data/eislaw.db"),  # Docker container path
                Path(__file__).parent / "data" / "eislaw.db",  # Local path
            ]
            for db_path in possible_paths:
                if db_path.exists():
                    conn = sqlite3.connect(str(db_path))
                    cursor = conn.cursor()
                    cursor.execute("SELECT email FROM clients WHERE name = ?", (client_name,))
                    row = cursor.fetchone()
                    if row and row[0]:
                        email = row[0]
                        if "@" in email and not email.startswith("no-email+"):
                            client_emails.append(email)
                            print(f"[EMAIL SYNC] Found email {email} for client {client_name} via SQLite")
                    conn.close()
                    break
        except Exception as e:
            print(f"SQLite email lookup failed: {e}")

    if client_data:
        # Get primary emails
        emails_list = client_data.get("emails", [])
        if isinstance(emails_list, list):
            client_emails.extend([e for e in emails_list if e and "@" in e])
        elif isinstance(emails_list, str) and "@" in emails_list:
            client_emails.append(emails_list)

        # Get contact emails
        for contact in client_data.get("contacts", []):
            if contact.get("email") and "@" in contact.get("email", ""):
                client_emails.append(contact["email"])

    # Remove duplicates and filter out placeholder emails
    client_emails = list(set([
        e for e in client_emails
        if e and "@" in e and not e.startswith("no-email+")
    ]))

    # If no valid emails, fall back to name search
    if not client_emails:
        search_queries = [client_name.replace('"', '\\"')]
    else:
        search_queries = [email.replace('"', '\\"') for email in client_emails]

    emails_found = []

    with httpx.Client(timeout=60.0) as http_client:
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail,displayName&$top=10"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Cannot access mailboxes: {users_resp.text}")

        users_data = users_resp.json()
        users = users_data.get("value", [])

        for user in users:
            user_id = user.get("id")
            user_email = user.get("mail")
            if not user_id:
                continue

            for search_query in search_queries:
                if "@" in search_query:
                    search_term_with_date = f"(from:{search_query} OR to:{search_query}) AND received>={from_date[:10]}"
                else:
                    search_term_with_date = f"{search_query} AND received>={from_date[:10]}"

                messages_url = (
                    f"https://graph.microsoft.com/v1.0/users/{user_id}/messages"
                    f"?$search=\"{search_term_with_date}\""
                    f"&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,webLink,isRead"
                    f"&$top={top}"
                )

                try:
                    msg_resp = http_client.get(messages_url, headers=headers)
                    if msg_resp.status_code == 200:
                        msg_data = msg_resp.json()
                        for msg in msg_data.get("value", []):
                            from_addr = msg.get("from", {}).get("emailAddress", {})
                            to_addrs = msg.get("toRecipients", [])

                            emails_found.append({
                                "id": msg.get("id"),
                                "subject": msg.get("subject", "(ללא נושא)"),
                                "from": from_addr.get("address", ""),
                                "fromName": from_addr.get("name", ""),
                                "to": [t.get("emailAddress", {}).get("address", "") for t in to_addrs],
                                "date": msg.get("receivedDateTime"),
                                "preview": msg.get("bodyPreview", "")[:200],
                                "has_attachments": msg.get("hasAttachments", False),
                                "attachments_count": len(msg.get("attachments", [])) if msg.get("hasAttachments") else 0,
                                "is_read": msg.get("isRead", True),
                                "webLink": msg.get("webLink"),
                                "mailbox": user_email,
                            })
                except Exception:
                    continue

    seen_ids = set()
    unique_emails = []
    for email in sorted(emails_found, key=lambda x: x.get("date", ""), reverse=True):
        if email["id"] not in seen_ids:
            seen_ids.add(email["id"])
            unique_emails.append(email)

    return unique_emails[:top]


# ========== ADDITIONAL EMAIL ENDPOINTS (added 2025-12-07) ==========

@app.get("/email/search")
def email_search(q: str, limit: int = 25):
    """
    Search all mailboxes for emails matching a query.
    Used by TaskFiles attach email modal search box.
    """
    if not q or len(q.strip()) < 2:
        return {"items": [], "total": 0}

    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    emails_found = []
    search_term = q.strip().replace('"', '\\"')

    with httpx.Client(timeout=60.0) as http_client:
        # Get users
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail&$top=5"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            return {"items": [], "total": 0, "error": "Cannot access mailboxes"}

        users = users_resp.json().get("value", [])

        for user in users:
            user_id = user.get("id")
            if not user_id:
                continue

            messages_url = (
                f"https://graph.microsoft.com/v1.0/users/{user_id}/messages"
                f"?$search=\"{search_term}\""
                f"&$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments"
                f"&$top={limit}"
            )

            try:
                msg_resp = http_client.get(messages_url, headers=headers)
                if msg_resp.status_code == 200:
                    for msg in msg_resp.json().get("value", []):
                        from_addr = msg.get("from", {}).get("emailAddress", {})
                        emails_found.append({
                            "id": msg.get("id"),
                            "subject": msg.get("subject", "(ללא נושא)"),
                            "from": from_addr.get("address", ""),
                            "received": msg.get("receivedDateTime"),
                            "preview": msg.get("bodyPreview", "")[:200],
                            "has_attachments": msg.get("hasAttachments", False),
                        })
            except Exception:
                continue

    # Dedupe and limit
    seen = set()
    items = []
    for e in emails_found:
        if e["id"] not in seen:
            seen.add(e["id"])
            items.append(e)
            if len(items) >= limit:
                break

    return {"items": items, "total": len(items)}


@app.get("/email/content")
def email_content(id: str, client: str = ""):
    """
    Get full email content (HTML body) for viewing in modal.
    """
    if not id:
        raise HTTPException(status_code=400, detail="Email ID required")

    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as http_client:
        # Get users to search through
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail&$top=5"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Cannot access mailboxes")

        users = users_resp.json().get("value", [])

        for user in users:
            user_id = user.get("id")
            if not user_id:
                continue

            msg_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{id}?$select=id,subject,from,toRecipients,receivedDateTime,body"

            try:
                msg_resp = http_client.get(msg_url, headers=headers)
                if msg_resp.status_code == 200:
                    msg = msg_resp.json()
                    from_addr = msg.get("from", {}).get("emailAddress", {})
                    return {
                        "id": msg.get("id"),
                        "subject": msg.get("subject", ""),
                        "from": from_addr.get("address", ""),
                        "received": msg.get("receivedDateTime"),
                        "html": msg.get("body", {}).get("content", ""),
                    }
            except Exception:
                continue

    raise HTTPException(status_code=404, detail="Email not found")


@app.post("/email/open")
def email_open(payload: dict = Body(...)):
    """
    Get Outlook Web App link for an email.
    Returns the OWA deeplink URL.
    """
    email_id = payload.get("id", "")
    if not email_id:
        raise HTTPException(status_code=400, detail="Email ID required")

    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as http_client:
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail&$top=5"
        users_resp = http_client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Cannot access mailboxes")

        users = users_resp.json().get("value", [])

        for user in users:
            user_id = user.get("id")
            user_mail = user.get("mail", "")
            if not user_id:
                continue

            msg_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{email_id}?$select=id,webLink"

            try:
                msg_resp = http_client.get(msg_url, headers=headers)
                if msg_resp.status_code == 200:
                    msg = msg_resp.json()
                    web_link = msg.get("webLink", "")
                    if web_link:
                        return {"link": web_link, "desktop_launched": False}
            except Exception:
                continue

    raise HTTPException(status_code=404, detail="Email not found")



@app.post("/email/sync_client")
def email_sync_client(payload: dict = Body(...)):
    """
    Sync emails for a specific client from Microsoft Graph.

    Request body:
    - name: Client name to search for
    - since_days: Number of days to look back (default: 45)

    Returns:
    - emails: List of matching emails
    - count: Number of emails found
    - synced_at: Timestamp of sync
    """
    client_name = (payload.get("name") or "").strip()
    since_days = payload.get("since_days", 45)

    if not client_name:
        raise HTTPException(status_code=400, detail="name is required")

    try:
        emails = search_emails_by_client(client_name, since_days=since_days)
        return {
            "emails": emails,
            "count": len(emails),
            "client": client_name,
            "since_days": since_days,
            "synced_at": datetime.utcnow().isoformat() + "Z",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email sync failed: {str(e)}")


@app.get("/email/by_client")
def email_by_client(name: str, limit: int = 25, offset: int = 0):
    """
    Get emails for a client by name. Used by EmailsWidget on the client overview page.

    Query params:
    - name: Client name (URL encoded)
    - limit: Max emails to return (default 25)
    - offset: Pagination offset (default 0)

    Returns:
    - items: List of email objects
    - total: Total count of matching emails
    """
    import urllib.parse
    decoded_name = urllib.parse.unquote(name)

    if not decoded_name:
        return {"items": [], "total": 0}

    try:
        # Search for emails from the last 90 days
        all_emails = search_emails_by_client(decoded_name, since_days=90)

        # Transform to frontend expected format
        items = []
        for email in all_emails[offset : offset + limit]:
            items.append({
                "id": email.get("id", ""),
                "subject": email.get("subject", ""),
                "from": email.get("from", ""),
                "received": email.get("date", ""),  # Frontend expects 'received'
                "preview": email.get("preview", ""),
                "isRead": email.get("is_read", True),
                "has_attachments": email.get("has_attachments", False),
                "attachments_count": email.get("attachments_count", 0),
            })

        return {
            "items": items,
            "total": len(all_emails)
        }
    except Exception as e:
        print(f"Error fetching emails for client {decoded_name}: {e}")
        return {"items": [], "total": 0}


@app.post("/api/email/attachments/save-to-sharepoint")
def save_email_attachments_to_sharepoint(payload: dict = Body(...)):
    """
    Save all attachments from an email to the client's SharePoint folder root.
    """
    import urllib.parse

    email_id = payload.get("email_id") or payload.get("id")
    client_name = (payload.get("client_name") or "").strip()

    if not email_id:
        raise HTTPException(status_code=400, detail="email_id is required")
    if not client_name:
        raise HTTPException(status_code=400, detail="client_name is required")

    client = find_local_client_by_name(client_name)
    sharepoint_url = client.get("sharepoint_url") if client else ""
    sharepoint_id = client.get("sharepoint_id") if client else ""

    if not sharepoint_url and not sharepoint_id:
        return {
            "success": False,
            "error": "no_sharepoint_folder",
            "message": "Client has no SharePoint folder configured",
        }

    token = get_graph_access_token()
    headers = {"Authorization": f"Bearer {token}"}

    site_id = get_sharepoint_site_id()
    if not site_id:
        raise HTTPException(status_code=500, detail="Could not locate SharePoint site")

    saved_files = []
    attachments = []
    email_user_id = None

    with httpx.Client(timeout=60.0) as client_http:
        # Resolve SharePoint folder path from ID (preferred) or URL (fallback)
        folder_path = ""
        try:
            if sharepoint_id:
                item_resp = client_http.get(
                    f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/items/{sharepoint_id}",
                    headers=headers,
                )
                if item_resp.status_code == 200:
                    item = item_resp.json()
                    parent_path = item.get("parentReference", {}).get("path", "")
                    folder_name = item.get("name") or client_name
                    if parent_path.startswith("/drive/root:"):
                        parent_clean = parent_path.replace("/drive/root:", "").strip("/")
                        folder_path = f"{parent_clean}/{folder_name}".strip("/")
                    sharepoint_url = item.get("webUrl") or sharepoint_url
        except Exception:
            folder_path = ""

        if not folder_path and sharepoint_url:
            parsed = urllib.parse.urlparse(sharepoint_url)
            parts = [p for p in parsed.path.split("/") if p]
            folder_path = ""
            if "sites" in parts and len(parts) >= 3:
                idx = parts.index("sites")
                folder_path = "/".join(parts[idx + 2 :])
            else:
                folder_path = "/".join(parts)
            folder_path = urllib.parse.unquote(folder_path).strip("/")

        if not folder_path:
            return {
                "success": False,
                "error": "invalid_sharepoint_folder",
                "message": "Could not resolve SharePoint folder path",
            }

        # Locate the email's mailbox and fetch attachments
        # Search up to 20 users to ensure we find the right mailbox
        users_resp = client_http.get(
            "https://graph.microsoft.com/v1.0/users?$select=id,mail&$top=20",
            headers=headers,
        )
        users = users_resp.json().get("value", []) if users_resp.status_code == 200 else []

        for user in users:
            user_id = user.get("id")
            if not user_id:
                continue

            # Fetch attachments - don't use $select with contentBytes (causes 400 errors)
            attachments_url = (
                f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{email_id}/attachments"
            )
            try:
                att_resp = client_http.get(attachments_url, headers=headers)
                if att_resp.status_code == 200:
                    attachments = att_resp.json().get("value", [])
                    email_user_id = user_id
                    break
                elif att_resp.status_code == 404:
                    continue
            except Exception:
                continue

        if email_user_id is None:
            raise HTTPException(status_code=404, detail="Email not found in mailboxes")

        if not attachments:
            return {
                "success": True,
                "saved_files": [],
                "count": 0,
                "message": "Email has no attachments",
            }

        for att in attachments:
            # Only process file attachments
            if att.get("@odata.type") and "fileAttachment" not in att.get("@odata.type", ""):
                continue

            filename = att.get("name") or f"attachment_{len(saved_files) + 1}"
            content_bytes = att.get("contentBytes")
            file_bytes = None

            if content_bytes:
                try:
                    file_bytes = base64.b64decode(content_bytes)
                except Exception:
                    file_bytes = None

            if file_bytes is None:
                value_url = (
                    f"https://graph.microsoft.com/v1.0/users/{email_user_id}"
                    f"/messages/{email_id}/attachments/{att.get('id')}/$value"
                )
                value_resp = client_http.get(value_url, headers=headers)
                if value_resp.status_code == 200:
                    file_bytes = value_resp.content

            if not file_bytes:
                continue

            encoded_path = urllib.parse.quote(f"{folder_path}/{filename}".strip("/"), safe="/")
            upload_url = (
                f"https://graph.microsoft.com/v1.0/sites/{site_id}"
                f"/drive/root:/{encoded_path}:/content?@microsoft.graph.conflictBehavior=rename"
            )
            upload_headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": att.get("contentType") or "application/octet-stream",
            }
            upload_resp = client_http.put(upload_url, headers=upload_headers, content=file_bytes)

            if upload_resp.status_code in (200, 201):
                uploaded = upload_resp.json()
                saved_files.append({
                    "name": filename,
                    "size": len(file_bytes) if file_bytes else att.get("size", 0),
                    "sharepoint_url": uploaded.get("webUrl") or sharepoint_url,
                })

    if len(saved_files) == 0:
        return {
            "success": False,
            "saved_files": [],
            "count": 0,
            "error": "upload_failed",
            "message": "No attachments were saved",
        }

    return {
        "success": True,
        "saved_files": saved_files,
        "count": len(saved_files),
    }


@app.get("/api/integrations/health")
def integrations_health():
    # simple summary reusing local knowledge
    graph_ok = False
    try:
        creds = get_graph_credentials()
        graph_ok = all([creds.get("client_id"), creds.get("client_secret"), creds.get("tenant_id")])
    except Exception:
        pass
    return {"airtable": True, "graph": graph_ok, "azure": True}


@app.get("/health")
def health():
    return {"status": "ok", "version": app.version if hasattr(app, "version") else "dev"}


# ─────────────────────────────────────────────────────────────
# SharePoint Integration via Microsoft Graph
# ─────────────────────────────────────────────────────────────

def get_sharepoint_site_id():
    """Get the EISLAW SharePoint site ID (EISLAW OFFICE / EISLAWTEAM site)."""
    token = get_graph_access_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Search for the EISLAW OFFICE site (where client folders are stored)
    sites_url = "https://graph.microsoft.com/v1.0/sites?search=*"
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(sites_url, headers=headers)

        if resp.status_code == 200:
            sites = resp.json().get("value", [])
            # Priority order for finding the right site
            for site in sites:
                name = site.get("displayName", "").lower()
                web_url = site.get("webUrl", "").lower()
                # EISLAW OFFICE is the main site with client folders
                if "eislaw office" in name or "eislawteam" in web_url:
                    return site.get("id")
            # Fallback: look for any site with "eislaw" in the name
            for site in sites:
                name = site.get("displayName", "").lower()
                if "eislaw" in name and "office" not in name:
                    return site.get("id")
    return None


def search_sharepoint_folder(client_name: str):
    """
    Search for a client folder in SharePoint.
    Returns folder info including webUrl if found.
    """
    token = get_graph_access_token()
    headers = {"Authorization": f"Bearer {token}"}

    site_id = get_sharepoint_site_id()
    if not site_id:
        return None

    with httpx.Client(timeout=30.0) as client:
        # Get the default drive (Documents library)
        drive_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive"
        drive_resp = client.get(drive_url, headers=headers)

        if drive_resp.status_code != 200:
            return None

        drive_id = drive_resp.json().get("id")
        if not drive_id:
            return None

        # Search for folder by client name
        # Try multiple search patterns
        search_terms = [
            client_name,
            client_name.replace(" ", ""),  # Without spaces
        ]

        for search_term in search_terms:
            search_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/search(q='{search_term}')"
            search_resp = client.get(search_url, headers=headers)

            if search_resp.status_code == 200:
                items = search_resp.json().get("value", [])
                for item in items:
                    # Look for folders that match the client name
                    if item.get("folder") is not None:
                        item_name = item.get("name", "").lower()
                        if client_name.lower() in item_name or item_name in client_name.lower():
                            return {
                                "id": item.get("id"),
                                "name": item.get("name"),
                                "webUrl": item.get("webUrl"),
                                "path": item.get("parentReference", {}).get("path", ""),
                                "createdDateTime": item.get("createdDateTime"),
                                "lastModifiedDateTime": item.get("lastModifiedDateTime"),
                            }

        # If no direct match, try listing the clients folder
        clients_folders = ["לקוחות משרד", "Clients", "לקוחות"]
        for folder_name in clients_folders:
            folder_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{folder_name}:/children"
            folder_resp = client.get(folder_url, headers=headers)

            if folder_resp.status_code == 200:
                children = folder_resp.json().get("value", [])
                for child in children:
                    if child.get("folder") is not None:
                        child_name = child.get("name", "")
                        if client_name.lower() in child_name.lower() or child_name.lower() in client_name.lower():
                            return {
                                "id": child.get("id"),
                                "name": child.get("name"),
                                "webUrl": child.get("webUrl"),
                                "path": f"/{folder_name}/{child.get('name')}",
                                "createdDateTime": child.get("createdDateTime"),
                                "lastModifiedDateTime": child.get("lastModifiedDateTime"),
                            }

    return None


def create_sharepoint_folder(client_name: str):
    """
    Create a new folder for a client in SharePoint under 'לקוחות משרד'.
    Returns folder info including webUrl if created successfully.
    """
    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    site_id = get_sharepoint_site_id()
    if not site_id:
        return {"error": "Could not find SharePoint site"}

    with httpx.Client(timeout=30.0) as client:
        # Get the default drive (Documents library)
        drive_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive"
        drive_resp = client.get(drive_url, headers=headers)

        if drive_resp.status_code != 200:
            return {"error": f"Could not access drive: {drive_resp.text}"}

        drive_id = drive_resp.json().get("id")
        if not drive_id:
            return {"error": "No drive ID found"}

        # Try to create folder in "לקוחות משרד" parent folder
        parent_folder = "לקוחות משרד"
        create_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{parent_folder}:/children"

        folder_data = {
            "name": client_name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "rename"
        }

        create_resp = client.post(create_url, headers=headers, json=folder_data)

        if create_resp.status_code in (200, 201):
            created = create_resp.json()
            return {
                "id": created.get("id"),
                "name": created.get("name"),
                "webUrl": created.get("webUrl"),
                "path": f"/{parent_folder}/{created.get('name')}",
                "createdDateTime": created.get("createdDateTime"),
            }
        elif create_resp.status_code == 404:
            # Parent folder might not exist, try creating at root
            root_create_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
            root_resp = client.post(root_create_url, headers=headers, json=folder_data)

            if root_resp.status_code in (200, 201):
                created = root_resp.json()
                return {
                    "id": created.get("id"),
                    "name": created.get("name"),
                    "webUrl": created.get("webUrl"),
                    "path": f"/{created.get('name')}",
                    "createdDateTime": created.get("createdDateTime"),
                }
            return {"error": f"Could not create folder: {root_resp.text}"}
        else:
            return {"error": f"Could not create folder: {create_resp.text}"}


def update_client_sharepoint_url(client_name: str, sharepoint_url: str, sharepoint_id: str = None):
    """Update client registry with SharePoint folder URL."""
    updated = False

    # Try SQLite first (primary data source)
    try:
        import sqlite3
        possible_paths = [
            Path("/app/data/eislaw.db"),  # Docker container path
            Path(__file__).parent / "data" / "eislaw.db",  # Local path
        ]
        for db_path in possible_paths:
            if db_path.exists():
                conn = sqlite3.connect(str(db_path))
                cursor = conn.cursor()
                if sharepoint_id:
                    cursor.execute(
                        "UPDATE clients SET sharepoint_url = ?, sharepoint_id = ? WHERE name = ?",
                        (sharepoint_url, sharepoint_id, client_name)
                    )
                else:
                    cursor.execute(
                        "UPDATE clients SET sharepoint_url = ? WHERE name = ?",
                        (sharepoint_url, client_name)
                    )
                if cursor.rowcount > 0:
                    updated = True
                    print(f"[UPDATE] Updated SharePoint URL for {client_name} in SQLite")
                conn.commit()
                conn.close()
                break
    except Exception as e:
        print(f"SQLite SharePoint update failed: {e}")

    # Also try JSON registry for backward compatibility
    clients_path = get_clients_store_path()
    if clients_path.exists():
        try:
            data = json.loads(clients_path.read_text("utf-8"))
            clients = data.get("clients", [])

            for c in clients:
                if c.get("display_name", "").lower() == client_name.lower():
                    c["sharepoint_url"] = sharepoint_url
                    if sharepoint_id:
                        c["sharepoint_id"] = sharepoint_id
                    updated = True
                    break

            if updated:
                data["clients"] = clients
                clients_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"Error updating client SharePoint URL in JSON: {e}")

    return updated


def update_client_active_status(client_name: str, active: bool, archived_at: str = None):
    """Update client active status for archive/restore functionality (legacy name-based)."""
    updated_client = None
    archived_value = 0 if active else 1
    archived_reason = None if active else "manual"
    now = datetime.utcnow().isoformat() + "Z"

    # Try SQLite first (primary data source)
    try:
        import sqlite3
        possible_paths = [
            Path("/app/data/eislaw.db"),  # Docker container path
            Path(__file__).parent / "data" / "eislaw.db",  # Local path
        ]
        for db_path in possible_paths:
            if db_path.exists():
                conn = sqlite3.connect(str(db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    """
                    UPDATE clients
                    SET active = ?, archived = ?, archived_at = ?, archived_reason = ?, updated_at = ?
                    WHERE name = ?
                    """,
                    (1 if active else 0, archived_value, archived_at if not active else None, archived_reason, now, client_name)
                )
                if cursor.rowcount > 0:
                    # Fetch the updated client
                    cursor.execute("SELECT * FROM clients WHERE name = ?", (client_name,))
                    row = cursor.fetchone()
                    if row:
                        updated_client = {
                            "id": row["id"],
                            "name": row["name"],
                            "active": bool(row["active"]),
                            "archived": bool(row["archived"]) if row["archived"] is not None else False,
                            "archived_at": row["archived_at"],
                            "archived_reason": row["archived_reason"],
                        }
                        print(f"[UPDATE] Updated active status for {client_name} in SQLite")
                conn.commit()
                conn.close()
                break
    except Exception as e:
        print(f"SQLite active status update failed: {e}")

    # Also try JSON registry for backward compatibility
    clients_path = get_clients_store_path()
    if clients_path.exists():
        try:
            data = json.loads(clients_path.read_text("utf-8"))
            clients = data.get("clients", [])

            for c in clients:
                if c.get("display_name", "").lower() == client_name.lower():
                    c["active"] = active
                    c["archived"] = not active
                    c["archived_at"] = archived_at
                    if not updated_client:
                        updated_client = c
                    break

            data["clients"] = clients
            clients_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"Error updating client active status in JSON: {e}")

    return updated_client


@app.get("/api/sharepoint/search")
def sharepoint_search_folder(name: str):
    """
    Search for a client folder in SharePoint.

    Query params:
    - name: Client name to search for

    Returns folder info if found, or error message.
    """
    import urllib.parse
    decoded_name = urllib.parse.unquote(name)

    if not decoded_name:
        raise HTTPException(status_code=400, detail="name is required")

    try:
        folder = search_sharepoint_folder(decoded_name)
        if folder:
            return {
                "found": True,
                "folder": folder,
                "client": decoded_name,
            }
        else:
            return {
                "found": False,
                "message": f"No folder found for client '{decoded_name}'",
                "client": decoded_name,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SharePoint search failed: {str(e)}")


@app.post("/api/sharepoint/link_client")
def sharepoint_link_client(payload: dict = Body(...)):
    """
    Search SharePoint for client folder and update the client registry with the URL.

    Request body:
    - name: Client name to search for

    Returns:
    - linked: Whether the folder was found and linked
    - sharepoint_url: The SharePoint URL if found
    """
    client_name = (payload.get("name") or "").strip()

    if not client_name:
        raise HTTPException(status_code=400, detail="name is required")

    try:
        folder = search_sharepoint_folder(client_name)
        if folder and folder.get("webUrl"):
            # Update client registry with SharePoint URL
            updated = update_client_sharepoint_url(
                client_name,
                folder["webUrl"],
                folder.get("id")
            )
            return {
                "linked": True,
                "sharepoint_url": folder["webUrl"],
                "folder_name": folder.get("name"),
                "registry_updated": updated,
                "client": client_name,
            }
        else:
            return {
                "linked": False,
                "message": f"No SharePoint folder found for '{client_name}'",
                "client": client_name,
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SharePoint link failed: {str(e)}")


@app.get("/api/sharepoint/sites")
def list_sharepoint_sites():
    """List available SharePoint sites (for debugging/setup)."""
    try:
        token = get_graph_access_token()
        headers = {"Authorization": f"Bearer {token}"}

        sites_url = "https://graph.microsoft.com/v1.0/sites?search=*"
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(sites_url, headers=headers)

            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Graph API error: {resp.text}")

            sites = resp.json().get("value", [])
            return {
                "sites": [
                    {
                        "id": s.get("id"),
                        "name": s.get("displayName"),
                        "webUrl": s.get("webUrl"),
                    }
                    for s in sites
                ]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sites: {str(e)}")


@app.post("/sp/folder_create")
def sp_folder_create(payload: dict = Body(...)):
    """
    Create a new SharePoint folder for a client.

    Request body:
    - name: Client name (folder will be created under 'לקוחות משרד')

    Returns:
    - webUrl: The SharePoint URL of the created folder
    - id: The folder ID
    - name: The folder name
    """
    client_name = (payload.get("name") or "").strip()

    if not client_name:
        raise HTTPException(status_code=400, detail="name is required")

    try:
        # First check if folder already exists
        existing = search_sharepoint_folder(client_name)
        if existing and existing.get("webUrl"):
            # Update client registry with existing folder
            update_client_sharepoint_url(
                client_name,
                existing["webUrl"],
                existing.get("id")
            )
            return {
                "created": False,
                "existed": True,
                "webUrl": existing["webUrl"],
                "id": existing.get("id"),
                "name": existing.get("name"),
                "client": client_name,
            }

        # Create new folder
        result = create_sharepoint_folder(client_name)

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        # Update client registry with new folder URL
        if result.get("webUrl"):
            update_client_sharepoint_url(
                client_name,
                result["webUrl"],
                result.get("id")
            )

        return {
            "created": True,
            "existed": False,
            "webUrl": result.get("webUrl"),
            "id": result.get("id"),
            "name": result.get("name"),
            "path": result.get("path"),
            "client": client_name,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SharePoint folder creation failed: {str(e)}")


# ─────────────────────────────────────────────────────────────
# Privacy MVP Endpoints (SQLite-based)
# ─────────────────────────────────────────────────────────────
import time
from fastapi import Request


def get_privacy_db_path() -> Path:
    """Resolve privacy database path with fallback to legacy eislaw.db."""
    env_path = os.environ.get("PRIVACY_DB_PATH")
    if env_path:
        return Path(env_path)
    base_dir = Path(__file__).resolve().parent.parent
    privacy_path = base_dir / "data" / "privacy.db"
    if privacy_path.exists():
        return privacy_path
    return base_dir / "data" / "eislaw.db"


def check_public_report_rate_limit(ip: str) -> bool:
    """Simple in-memory rate limiter per IP."""
    now = time.time()
    bucket = _public_report_rate_limits[ip]
    _public_report_rate_limits[ip] = [t for t in bucket if now - t < PUBLIC_REPORT_WINDOW_SECONDS]
    if len(_public_report_rate_limits[ip]) >= PUBLIC_REPORT_MAX_REQUESTS:
        return False
    _public_report_rate_limits[ip].append(now)
    return True


def log_public_report_event(ip: str, token: str, status: str):
    """Log minimal info (token prefix + IP + status) for monitoring."""
    prefix = token[:8] if token else ""
    print(f"[public_report] ip={ip} token_prefix={prefix} status={status}")


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse ISO datetime, handling trailing Z."""
    if not value:
        return None
    try:
        text = value
        if isinstance(text, str) and text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text)
    except Exception:
        return None


def isoformat_utc(dt: Optional[datetime]) -> Optional[str]:
    """Format datetime as UTC ISO string with Z suffix."""
    if not dt:
        return None
    try:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")
    except Exception:
        return None


def normalize_answers(raw: Any) -> Dict[str, Any]:
    """Load answers dict from JSON/text/raw Fillout response."""
    if not raw:
        return {}
    data = raw
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except Exception:
            return {}
    if isinstance(data, dict):
        if isinstance(data.get("answers"), dict):
            return data.get("answers", {})
        if isinstance(data.get("questions"), list):
            answers: Dict[str, Any] = {}
            for q in data["questions"]:
                key = q.get("name") or q.get("id")
                if not key:
                    continue
                answers[key] = q.get("value")
            return answers
        return data
    return {}


def lookup_answer(answers: Dict[str, Any], keys: List[str]) -> Any:
    """Find a value in answers by trying multiple key variants."""
    for key in keys:
        if key in answers:
            return answers[key]
    lower_map = {str(k).lower(): v for k, v in answers.items()}
    for key in keys:
        lowered = str(key).lower()
        if lowered in lower_map:
            return lower_map[lowered]
    return None


def _coerce_list(value: Any) -> List[str]:
    """Convert common value types into a list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v not in (None, "")]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(v) for v in parsed if v not in (None, "")]
        except Exception:
            pass
        return [value]
    return [str(value)]


def extract_storage_locations(answers: Dict[str, Any]) -> List[str]:
    """Extract storage locations from answers (best-effort)."""
    locations: List[str] = []
    for key, val in answers.items():
        key_lower = str(key).lower()
        if "storage" in key_lower or "אחס" in key_lower:
            locations.extend(_coerce_list(val))
    seen = set()
    deduped = []
    for loc in locations:
        if loc in seen:
            continue
        seen.add(loc)
        deduped.append(loc)
    return deduped


def get_public_report_record(token: str) -> Optional[Dict[str, Any]]:
    """Fetch submission + scoring data for public report."""
    db_path = get_privacy_db_path()
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
    except Exception:
        return None

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='privacy_submissions'")
        if not cursor.fetchone():
            return None

        cursor.execute("PRAGMA table_info(privacy_submissions)")
        columns = {row[1] for row in cursor.fetchall()}
        submission_col = "submission_id" if "submission_id" in columns else "id"

        cursor.execute(f"SELECT * FROM privacy_submissions WHERE {submission_col} = ?", (token,))
        row = cursor.fetchone()
        if not row:
            return None

        row_dict = {k: row[k] for k in row.keys()}

        embedded_score = {"score_level", "score_dpo", "score_reg", "score_report"}.issubset(columns)
        level = row_dict.get("score_level") if embedded_score else None
        dpo = bool(row_dict.get("score_dpo")) if embedded_score else None
        reg = bool(row_dict.get("score_reg")) if embedded_score else None
        report = bool(row_dict.get("score_report")) if embedded_score else None
        requirements_raw = row_dict.get("score_requirements") if embedded_score else None

        if not embedded_score:
            try:
                cursor.execute(
                    """
                    SELECT level, dpo, reg, report, requirements
                    FROM privacy_reviews
                    WHERE submission_id = ?
                    ORDER BY updated_at DESC
                    LIMIT 1
                    """,
                    (row_dict.get(submission_col),),
                )
                review_row = cursor.fetchone()
                if review_row:
                    level = review_row["level"]
                    dpo = bool(review_row["dpo"]) if review_row["dpo"] is not None else False
                    reg = bool(review_row["reg"]) if review_row["reg"] is not None else False
                    report = bool(review_row["report"]) if review_row["report"] is not None else False
                    requirements_raw = review_row["requirements"]
            except Exception:
                pass

        requirements: List[str] = []
        if requirements_raw:
            try:
                requirements = json.loads(requirements_raw)
            except Exception:
                requirements = []

        answers = normalize_answers(row_dict.get("answers_json") or row_dict.get("raw_response"))
        sensitive_people_val = lookup_answer(answers, ["sensitive_people", "1ZwV"]) or row_dict.get("sensitive_people") or 0
        try:
            sensitive_people_val = int(sensitive_people_val)
        except Exception:
            sensitive_people_val = 0

        # BUG-PRI-003 FIX: data_map is ALWAYS True for everyone (universal requirement)
        # Per PRIVACY_SCORING_RULES.md - this is required for ALL assessments
        data_map_flag = True

        submitted_at_raw = row_dict.get("submitted_at") or row_dict.get("received_at")
        submitted_at_dt = parse_iso_datetime(submitted_at_raw)
        if not submitted_at_dt:
            return None
        if submitted_at_dt.tzinfo is None:
            submitted_at_dt = submitted_at_dt.replace(tzinfo=timezone.utc)
        else:
            submitted_at_dt = submitted_at_dt.astimezone(timezone.utc)

        expires_at_dt = submitted_at_dt + timedelta(days=90)

        level_hebrew_map = {
            "lone": "יחיד",
            "basic": "בסיסית",
            "mid": "בינונית",
            "high": "גבוהה",
        }

        level_value = level or row_dict.get("level") or "unknown"
        # BUG-PRI-002 FIX: Add the 3 unblocked additional requirement fields
        # Per PRIVACY_SCORING_RULES.md:
        # - worker_security_agreement = employees_exposed
        # - cameras_policy = cameras
        # - direct_marketing_rules = directmail_biz OR directmail_self
        # The "requirements" list from scoring engine contains these as strings
        requirements_payload = {
            "dpo": bool(dpo),
            "registration": bool(reg),
            "report": bool(report),
            "data_map": bool(data_map_flag),
            "sensitive_people": sensitive_people_val,
            "storage_locations": extract_storage_locations(answers),
            # Additional requirement fields (from scoring engine requirements list)
            "worker_security_agreement": "worker_security_agreement" in requirements,
            "cameras_policy": "cameras_policy" in requirements,
            "direct_marketing_rules": "direct_marketing_rules" in requirements,
            # Blocked fields - leave as null (CEO decision pending)
            "consultation_call": None,
            "outsourcing_text": None,
        }

        return {
            "valid": True,
            "token": row_dict.get(submission_col),
            "level": level_value,
            "level_hebrew": level_hebrew_map.get(level_value, level_value),
            "business_name": row_dict.get("business_name"),
            "requirements": requirements_payload,
            "submitted_at": isoformat_utc(submitted_at_dt),
            "expires_at": isoformat_utc(expires_at_dt),
            "expires_at_dt": expires_at_dt,
        }
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.get("/api/public/report/{token}")
def get_public_report(token: str, request: Request, response: Response):
    """Public endpoint for WordPress dynamic report page."""
    client_ip = request.client.host if request.client else "unknown"
    cors_origin = get_public_report_origin(request)

    if not check_public_report_rate_limit(client_ip):
        response.status_code = 429
        response.headers["Access-Control-Allow-Origin"] = cors_origin
        log_public_report_event(client_ip, token, "rate_limited")
        return {"error": "rate_limited"}

    record = get_public_report_record(token)
    response.headers["Access-Control-Allow-Origin"] = cors_origin

    if not record:
        response.status_code = 404
        log_public_report_event(client_ip, token, "invalid_token")
        return {"valid": False, "reason": "invalid_token"}

    expires_at_dt = record.pop("expires_at_dt", None)
    if expires_at_dt and datetime.utcnow().replace(tzinfo=timezone.utc) > expires_at_dt.astimezone(timezone.utc):
        response.status_code = 410
        log_public_report_event(client_ip, token, "expired")
        return {"valid": False, "reason": "expired"}

    log_public_report_event(client_ip, token, "ok")
    return record


@app.post("/api/privacy/webhook")
async def privacy_webhook(request: Request):
    """
    Receive webhook from Fillout when form is submitted.
    Scores the submission and saves to SQLite.
    """
    start_time = time.time()

    try:
        payload = await request.json()
    except Exception as e:
        privacy_db.log_activity(
            event_type="webhook_error",
            details={"error": "Invalid JSON", "message": str(e)},
            success=False
        )
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Extract submission info from Fillout payload
    submission_id = payload.get("submissionId")
    form_id = payload.get("formId", "unknown")
    submitted_at = payload.get("submissionTime", "")

    if not submission_id:
        privacy_db.log_activity(
            event_type="webhook_error",
            details={"error": "Missing submissionId"},
            success=False
        )
        raise HTTPException(status_code=400, detail="Missing submissionId")

    # Map Fillout questions to our format
    questions = payload.get("questions", [])
    answers = {}
    contact_name = None
    contact_email = None
    contact_phone = None
    business_name = None

    for q in questions:
        q_name = q.get("name", "").lower()
        q_value = q.get("value")

        if q_value is None:
            continue

        # Extract contact info (Hebrew field names)
        if "שם ממלא" in q.get("name", "") or q_name == "שם":
            contact_name = q_value
        elif "דוא" in q.get("name", "") or "email" in q_name:
            contact_email = q_value
        elif "טלפון" in q.get("name", "") or "phone" in q_name:
            contact_phone = str(q_value)
        elif "שם העסק" in q.get("name", "") or "business" in q_name:
            business_name = q_value

        # Store answer with normalized key
        answers[q.get("name", q.get("id", ""))] = q_value

    # Map Fillout question IDs to scoring keys
    id_to_key = {
        "1v44": "ppl",
        "1ZwV": "sensitive_people",
        "pWDs": "sensitive_types",
        "i983": "biometric_100k",
        "kgeV": "transfer",
        "1CHH": "directmail_biz",
        "fxeW": "directmail_self",
        "v7hP": "monitor_1000",
        "gfpv": "processor",
        "3T6X": "processor_large_org",
        "gDyJ": "employees_exposed",
        "sXuG": "cameras",
        "uZie": "owners",
        "e6gk": "access",
        "68Yz": "ethics",
    }
    
    # Build scoring answers from question IDs
    scoring_answers = {}
    for q in questions:
        q_id = q.get("id", "")
        q_value = q.get("value")
        if q_id in id_to_key and q_value is not None:
            scoring_answers[id_to_key[q_id]] = q_value
    
    # Run scoring algorithm
    try:
        score = fillout_integration.run_scoring(scoring_answers)
    except Exception as e:
        score = {"level": "basic", "dpo": False, "reg": False, "requirements": []}

    # Save to SQLite
    is_new = privacy_db.save_submission(
        submission_id=submission_id,
        form_id=form_id,
        submitted_at=submitted_at,
        contact_name=contact_name,
        contact_email=contact_email,
        contact_phone=contact_phone,
        business_name=business_name,
        answers=answers,
        score=score
    )

    duration_ms = int((time.time() - start_time) * 1000)

    # Log activity
    privacy_db.log_activity(
        event_type="webhook_received" if is_new else "webhook_duplicate",
        submission_id=submission_id,
        details={
            "level": score.get("level"),
            "is_new": is_new,
            "business_name": business_name
        },
        duration_ms=duration_ms,
        success=True
    )

    return {
        "status": "ok",
        "submission_id": submission_id,
        "is_new": is_new,
        "level": score.get("level"),
        "color": privacy_db.LEVEL_TO_COLOR.get(score.get("level"), "yellow"),
        "duration_ms": duration_ms
    }


@app.get("/api/privacy/public-results/{submission_id}")
def get_public_privacy_results(submission_id: str):
    """
    Get public-safe results for a submission.
    Called by WordPress results page.
    """
    results = privacy_db.get_public_results(submission_id)

    if not results:
        raise HTTPException(status_code=404, detail="Submission not found")

    return results


@app.get("/api/privacy/activity")
def get_privacy_activity(limit: int = 50):
    """Get recent activity log for monitoring"""
    activities = privacy_db.get_activity(limit=limit)
    return {"activities": activities}


@app.get("/api/privacy/stats")
def get_privacy_stats():
    """Get statistics for monitoring dashboard"""
    stats = privacy_db.get_stats()
    return stats



@app.get("/api/privacy/labels")
def get_privacy_labels():
    """Get labels for privacy form fields - Hebrew"""
    return {"labels": {
        "ppl": "מספר אנשים במאגר",
        "sensitive_people": "מס' אנשים שיש עליהם מידע רגיש",
        "sensitive_types": "סוגי מידע רגיש",
        "owners": "מספר בעלים",
        "access": "מורשי גישה",
        "ethics": "חובת סודיות ע''פ אתיקה או דין",
        "transfer": "האם מעביר מידע לאחר כנגד תמורה?",
        "directmail_biz": "דיוור ישיר למען אחר",
        "directmail_self": "דיוור ישיר למען עצמך",
        "processor": "האם מעבד מידע?",
        "processor_large_org": "האם מעבד למען גוף גדול?",
        "cameras": "מצלמות אבטחה",
        "biometric_100k": "ביומטרי מעל 100K",
        "monitor_1000": "ניטור שוטף מעל 1000",
        "employees_exposed": "עובדים בעלי גישה למידע",
        "sensitive": "האם יש מידע רגיש?",
        "processor_sensitive_org": "האם מעבד למען גוף רגיש/ציבורי?",
        "biometric_people": "מספר אנשים במאגר ביומטרי",
    }}


@app.get("/api/privacy/db-submissions")
def get_db_submissions(limit: int = 50, status: Optional[str] = None):
    """Get submissions from SQLite database"""
    submissions = privacy_db.get_submissions(limit=limit, status=status)
    return {"submissions": submissions}


# ─────────────────────────────────────────────────────────────
# Zoom Transcripts API (Azure Blob Storage)
# ─────────────────────────────────────────────────────────────

def get_azure_blob_client():
    """Get Azure Blob container client for zoom transcripts."""
    from azure.storage.blob import BlobServiceClient
    conn_str = os.environ.get("AZURE_BLOB_CONNECTION_STRING")
    if not conn_str:
        # Try from secrets file
        secrets = load_secrets()
        conn_str = secrets.get("azure_blob", {}).get("connection_string")
    if not conn_str:
        raise HTTPException(status_code=500, detail="Azure Blob connection not configured")
    from azure.storage.blob import BlobServiceClient; blob_service = BlobServiceClient.from_connection_string(conn_str)
    return blob_service.get_container_client("zoom-recordings")


@app.get("/api/zoom/transcripts")
def list_zoom_transcripts():
    """List completed transcripts from Azure Blob Storage."""
    try:
        container = get_azure_blob_client()
        transcripts = []
        for blob in container.list_blobs(name_starts_with="completed/"):
            if blob.name.endswith(".txt"):
                transcripts.append({
                    "id": blob.name,
                    "filename": blob.name.replace("completed/", ""),
                    "size": blob.size,
                    "modified": blob.last_modified.isoformat() if blob.last_modified else None
                })
        # Sort by modified date descending
        transcripts.sort(key=lambda x: x.get("modified") or "", reverse=True)
        return {"transcripts": transcripts}
    except Exception as e:
        print(f"Error listing zoom transcripts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/zoom/transcripts/{blob_name:path}")
def get_zoom_transcript(blob_name: str):
    """Get content of a specific transcript."""
    try:
        container = get_azure_blob_client()
        blob_client = container.get_blob_client(blob_name)
        download_stream = blob_client.download_blob()
        content = download_stream.readall().decode("utf-8")
        return {"content": content, "id": blob_name}
    except Exception as e:
        print(f"Error getting zoom transcript: {e}")
        raise HTTPException(status_code=404, detail="Transcript not found")


@app.delete("/api/zoom/transcripts/{blob_name:path}")
def delete_zoom_transcript(blob_name: str):
    """Delete a transcript from Azure Blob Storage."""
    try:
        container = get_azure_blob_client()
        blob_client = container.get_blob_client(blob_name)
        blob_client.delete_blob()
        return {"success": True, "deleted": blob_name}
    except Exception as e:
        print(f"Error deleting zoom transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/zoom/transcripts/{blob_name:path}/import")
def import_zoom_transcript(blob_name: str, body: dict = None):
    """Import a transcript to the RAG inbox."""
    body = body or {}
    try:
        container = get_azure_blob_client()
        blob_client = container.get_blob_client(blob_name)
        download_stream = blob_client.download_blob()
        content = download_stream.readall().decode("utf-8")

        # Get metadata from request or parse from filename
        filename = blob_name.replace("completed/", "")
        parts = filename.replace(".txt", "").split("_")
        date_str = body.get("date") or (parts[0] if parts else "")
        client_name = body.get("client") or (" ".join(parts[1:-1]) if len(parts) > 2 else "")
        domain = body.get("domain") or "Client_Work"

        # Generate unique ID
        import hashlib
        item_id = hashlib.md5(content[:1024].encode()).hexdigest()[:12]

        # Create manifest entry
        manifest_path = Path.home() / ".eislaw" / "store" / "rag-manifest.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)

        manifest = []
        if manifest_path.exists():
            try:
                manifest = json.loads(manifest_path.read_text("utf-8"))
            except:
                manifest = []

        # Save transcript file
        rag_dir = Path.home() / ".eislaw" / "store" / "rag"
        rag_dir.mkdir(parents=True, exist_ok=True)
        transcript_file = rag_dir / f"{item_id}.txt"
        transcript_file.write_text(content, encoding="utf-8")

        # Add to manifest
        new_item = {
            "id": item_id,
            "fileName": filename,
            "client": client_name,
            "domain": domain,
            "date": date_str,
            "status": "ready",
            "hash": item_id,
            "source": "zoom",
            "transcript": [{"speaker": "", "text": line.strip()} for line in content.split("\n") if line.strip()][:50]
        }
        manifest.insert(0, new_item)
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

        return {"success": True, "id": item_id, "status": "ready"}
    except Exception as e:
        print(f"Error importing zoom transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
# Zoom Recordings Management API
# ─────────────────────────────────────────────────────────────

# Import zoom_manager at the top of main.py:
# from backend import zoom_manager
# Or inline the functions if preferred

import json
import threading
from pathlib import Path
import fcntl
from datetime import datetime


# Manifest helpers (inline version)
ZOOM_MANIFEST_PATH = Path.home() / ".eislaw" / "store" / "zoom-manifest.json"
ZOOM_MANIFEST_LOCK = Path.home() / ".eislaw" / "store" / "zoom-manifest.lock"
NOTIFICATIONS_PATH = Path.home() / ".eislaw" / "store" / "notifications.json"


def _load_zoom_manifest():
    """Load manifest with shared (read) lock."""
    ZOOM_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not ZOOM_MANIFEST_PATH.exists():
        return {"recordings": [], "last_sync": None}
    try:
        with open(ZOOM_MANIFEST_PATH, 'r', encoding='utf-8') as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)  # Shared lock for reading
            try:
                return json.load(f)
            finally:
                fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except:
        return {"recordings": [], "last_sync": None}


def _save_zoom_manifest(manifest):
    """Save manifest with exclusive (write) lock."""
    ZOOM_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    ZOOM_MANIFEST_LOCK.parent.mkdir(parents=True, exist_ok=True)
    # Use a separate lock file for exclusive locking
    with open(ZOOM_MANIFEST_LOCK, 'w') as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)  # Exclusive lock
        try:
            with open(ZOOM_MANIFEST_PATH, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def _update_zoom_manifest(updater_func):
    """Atomically read-modify-write the manifest with exclusive lock.

    Args:
        updater_func: A function that takes the manifest dict and modifies it in place.
    Returns:
        The updated manifest.
    """
    ZOOM_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    ZOOM_MANIFEST_LOCK.parent.mkdir(parents=True, exist_ok=True)

    with open(ZOOM_MANIFEST_LOCK, 'w') as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)  # Exclusive lock
        try:
            # Read
            if ZOOM_MANIFEST_PATH.exists():
                try:
                    with open(ZOOM_MANIFEST_PATH, 'r', encoding='utf-8') as f:
                        manifest = json.load(f)
                except:
                    manifest = {"recordings": [], "last_sync": None}
            else:
                manifest = {"recordings": [], "last_sync": None}

            # Modify
            updater_func(manifest)

            # Write
            with open(ZOOM_MANIFEST_PATH, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

            return manifest
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


@app.get("/api/zoom/recordings")
def list_zoom_recordings(status: str = None, participant: str = None):
    """List all recordings from SQLite database with optional filters."""
    return rag_sqlite.zoom_recordings_sqlite(status, participant)

def list_zoom_recordings(status: str = None, participant: str = None):
    """
    List all recordings from manifest with optional filters.

    Query params:
        status: filter by status (in_zoom, pending, transcribing, completed, imported, skipped)
        participant: filter by participant name (partial match)
    """
    manifest = _load_zoom_manifest()
    recordings = manifest.get("recordings", [])

    # Filter by status
    if status:
        recordings = [r for r in recordings if r.get("status") == status]

    # Filter by participant
    if participant:
        participant_lower = participant.lower()
        recordings = [r for r in recordings
                     if any(participant_lower in p.lower() for p in r.get("participants", []))
                     or participant_lower in r.get("topic", "").lower()]

    return {
        "recordings": recordings,
        "total": len(recordings),
        "last_sync": manifest.get("last_sync")
    }


@app.post("/api/zoom/sync")
def sync_zoom_recordings():
    """
    Sync recordings from Zoom Cloud.
    Fetches new recordings and updates manifest.
    """
    import base64
    import requests
    from datetime import timedelta

    # Get credentials from secrets or env
    secrets = load_secrets()
    zoom_creds = secrets.get("zoom", {})

    account_id = zoom_creds.get("account_id") or os.environ.get("ZOOM_ACCOUNT_ID")
    client_id = zoom_creds.get("client_id") or os.environ.get("ZOOM_CLIENT_ID")
    client_secret = zoom_creds.get("client_secret") or os.environ.get("ZOOM_CLIENT_SECRET")

    if not all([account_id, client_id, client_secret]):
        raise HTTPException(status_code=500, detail="Zoom credentials not configured")

    try:
        # Get access token
        token_url = "https://zoom.us/oauth/token"
        credentials = f"{client_id}:{client_secret}"
        encoded_creds = base64.b64encode(credentials.encode()).decode()

        token_resp = requests.post(
            token_url,
            headers={
                "Authorization": f"Basic {encoded_creds}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={"grant_type": "account_credentials", "account_id": account_id},
            timeout=30
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        # Fetch recordings (last 30 days - API limit)
        from_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        to_date = datetime.now().strftime('%Y-%m-%d')

        rec_resp = requests.get(
            "https://api.zoom.us/v2/users/me/recordings",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"from": from_date, "to": to_date, "page_size": 300},
            timeout=60
        )
        rec_resp.raise_for_status()
        data = rec_resp.json()

        # Parse recordings
        manifest = _load_zoom_manifest()
        existing_ids = {r.get("zoom_id") for r in manifest.get("recordings", [])}
        new_count = 0

        for meeting in data.get("meetings", []):
            topic = meeting.get("topic", "Untitled")
            start_time = meeting.get("start_time", "")
            duration = meeting.get("duration", 0)

            # Extract participants from topic
            participants = []
            if " עם " in topic:
                participants = [p.strip() for p in topic.split(" עם ")]
            elif " and " in topic.lower():
                participants = [p.strip().title() for p in topic.lower().split(" and ")]
            else:
                participants = [topic.strip()]

            for file in meeting.get("recording_files", []):
                file_type = file.get("file_type", "")
                if file_type not in ["M4A", "MP4"]:
                    continue

                zoom_id = file.get("id")
                if zoom_id in existing_ids:
                    continue

                manifest["recordings"].insert(0, {
                    "zoom_id": zoom_id,
                    "zoom_meeting_id": meeting.get("uuid"),
                    "topic": topic,
                    "date": start_time[:10] if start_time else "",
                    "start_time": start_time,
                    "duration_minutes": duration,
                    "file_type": file_type,
                    "file_size_mb": round(file.get("file_size", 0) / 1024 / 1024, 1),
                    "download_url": file.get("download_url"),
                    "participants": participants,
                    "status": "in_zoom",
                    "created_at": datetime.utcnow().isoformat() + "Z"
                })
                new_count += 1

        # Sort by date
        manifest["recordings"].sort(key=lambda x: x.get("start_time", ""), reverse=True)
        manifest["last_sync"] = datetime.utcnow().isoformat() + "Z"
        _save_zoom_manifest(manifest)

        return {
            "success": True,
            "new_recordings": new_count,
            "total_recordings": len(manifest["recordings"]),
            "last_sync": manifest["last_sync"]
        }

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Zoom API error: {str(e)}")


@app.post("/api/zoom/download/{zoom_id}")
def download_zoom_recording(zoom_id: str, background_tasks: BackgroundTasks):
    """
    Download a recording from Zoom to Azure and auto-start transcription.
    """
    manifest = _load_zoom_manifest()
    rec = None
    for r in manifest.get("recordings", []):
        if r.get("zoom_id") == zoom_id:
            rec = r
            break

    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")

    if rec.get("status") != "in_zoom":
        return {"success": False, "message": f"Recording already processed (status: {rec.get('status')})"}

    # Start download in background
    background_tasks.add_task(_download_and_transcribe, zoom_id, rec)

    # Update status immediately
    rec["status"] = "downloading"
    _save_zoom_manifest(manifest)

    return {"success": True, "status": "downloading", "zoom_id": zoom_id}


def _download_and_transcribe(zoom_id: str, rec: dict):
    """Background task: download from Zoom, upload to Azure, start transcription."""
    import base64
    import requests
    import subprocess

    manifest = _load_zoom_manifest()

    try:
        # Get fresh access token
        secrets = load_secrets()
        zoom_creds = secrets.get("zoom", {})
        account_id = zoom_creds.get("account_id") or os.environ.get("ZOOM_ACCOUNT_ID")
        client_id = zoom_creds.get("client_id") or os.environ.get("ZOOM_CLIENT_ID")
        client_secret = zoom_creds.get("client_secret") or os.environ.get("ZOOM_CLIENT_SECRET")

        credentials = f"{client_id}:{client_secret}"
        encoded_creds = base64.b64encode(credentials.encode()).decode()

        token_resp = requests.post(
            "https://zoom.us/oauth/token",
            headers={
                "Authorization": f"Basic {encoded_creds}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={"grant_type": "account_credentials", "account_id": account_id},
            timeout=30
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        # Download recording
        download_url = rec.get("download_url")
        if "?" in download_url:
            download_url += f"&access_token={access_token}"
        else:
            download_url += f"?access_token={access_token}"

        print(f"Downloading {zoom_id} from Zoom...")
        response = requests.get(download_url, stream=True, timeout=600)
        response.raise_for_status()

        # Upload to Azure
        date_str = rec.get("date", datetime.now().strftime('%Y-%m-%d'))
        topic = rec.get("topic", "meeting").replace("/", "_").replace("\\", "_")[:50]
        ext = rec.get("file_type", "m4a").lower()
        blob_name = f"pending/{date_str}_{topic}_{zoom_id}.{ext}"

        conn_str = secrets.get("azure_blob", {}).get("connection_string") or os.environ.get("AZURE_BLOB_CONNECTION_STRING")
        from azure.storage.blob import BlobServiceClient; blob_service = BlobServiceClient.from_connection_string(conn_str)
        container = blob_service.get_container_client("zoom-recordings")
        blob_client = container.get_blob_client(blob_name)

        print(f"Uploading to Azure: {blob_name}")
        blob_client.upload_blob(response.content, overwrite=True)

        # Update manifest
        for r in manifest["recordings"]:
            if r.get("zoom_id") == zoom_id:
                r["status"] = "pending"
                r["azure_blob"] = blob_name
                r["downloaded_at"] = datetime.utcnow().isoformat() + "Z"
                break
        _save_zoom_manifest(manifest)

        # Auto-start transcription
        print(f"Starting transcription for {blob_name}")
        _run_transcription(zoom_id, blob_name, rec.get("topic", "Recording"))

    except Exception as e:
        print(f"Download/transcribe failed for {zoom_id}: {e}")
        for r in manifest["recordings"]:
            if r.get("zoom_id") == zoom_id:
                r["status"] = "in_zoom"
                r["error"] = str(e)
                break
        _save_zoom_manifest(manifest)


def _run_transcription(zoom_id: str, blob_name: str, topic: str):
    """Run the transcription pipeline."""
    import subprocess

    manifest = _load_zoom_manifest()

    # Update status to transcribing
    for r in manifest["recordings"]:
        if r.get("zoom_id") == zoom_id:
            r["status"] = "transcribing"
            r["transcription_started_at"] = datetime.utcnow().isoformat() + "Z"
            break
    _save_zoom_manifest(manifest)

    try:
        secrets = load_secrets()
        env = os.environ.copy()
        env["AZURE_BLOB_CONNECTION_STRING"] = secrets.get("azure_blob", {}).get("connection_string") or os.environ.get("AZURE_BLOB_CONNECTION_STRING", "")
        env["GEMINI_API_KEY"] = secrets.get("llm", {}).get("api_keys", {}).get("gemini") or os.environ.get("GEMINI_API_KEY", "")

        result = subprocess.run(
            ["python3", "/app/zoom-import/pipeline.py", blob_name],
            capture_output=True,
            text=True,
            env=env,
            timeout=1800  # 30 min max
        )

        if result.returncode == 0:
            transcript_blob = blob_name.replace("pending/", "completed/").replace(".m4a", ".txt").replace(".mp4", ".txt")

            for r in manifest["recordings"]:
                if r.get("zoom_id") == zoom_id:
                    r["status"] = "completed"
                    r["transcript_blob"] = transcript_blob
                    r["transcription_completed_at"] = datetime.utcnow().isoformat() + "Z"
                    break
            _save_zoom_manifest(manifest)

            # Create notification
            _create_zoom_notification(zoom_id, topic)
            print(f"Transcription completed for {zoom_id}")
        else:
            raise Exception(f"Pipeline error: {result.stderr}")

    except Exception as e:
        print(f"Transcription failed for {zoom_id}: {e}")
        for r in manifest["recordings"]:
            if r.get("zoom_id") == zoom_id:
                r["status"] = "pending"
                r["error"] = str(e)
                break
        _save_zoom_manifest(manifest)


def _create_zoom_notification(zoom_id: str, topic: str):
    """Create notification for completed transcription."""
    import hashlib

    NOTIFICATIONS_PATH.parent.mkdir(parents=True, exist_ok=True)

    notifications = []
    if NOTIFICATIONS_PATH.exists():
        try:
            notifications = json.loads(NOTIFICATIONS_PATH.read_text("utf-8"))
        except:
            pass

    notifications.insert(0, {
        "id": hashlib.md5(f"{zoom_id}-{datetime.utcnow().isoformat()}".encode()).hexdigest()[:12],
        "type": "transcription_complete",
        "title": "תמלול הושלם",
        "message": f"התמלול של '{topic}' הסתיים ומוכן לייבוא",
        "zoom_id": zoom_id,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "read": False
    })

    notifications = notifications[:50]
    NOTIFICATIONS_PATH.write_text(json.dumps(notifications, ensure_ascii=False, indent=2), encoding="utf-8")


@app.post("/api/zoom/skip/{zoom_id}")


@app.post("/api/zoom/transcribe/{zoom_id}")
async def zoom_transcribe(zoom_id: str, background_tasks: BackgroundTasks):
    """Transcribe a downloaded Zoom recording using Gemini."""
    result = rag_sqlite.zoom_transcribe_start(zoom_id, load_secrets, HTTPException)
    if result.get("recording"):
        # Start background transcription
        recording = result.pop("recording")
        background_tasks.add_task(
            rag_sqlite.run_transcription_task,
            zoom_id,
            recording,
            load_secrets,
            gemini_transcribe_audio
        )
    return result

def skip_zoom_recording(zoom_id: str, reason: str = None):
    """Mark a recording as skipped."""
    manifest = _load_zoom_manifest()
    found = False

    for r in manifest.get("recordings", []):
        if r.get("zoom_id") == zoom_id:
            r["status"] = "skipped"
            r["skipped_reason"] = reason
            r["skipped_at"] = datetime.utcnow().isoformat() + "Z"
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Recording not found")

    _save_zoom_manifest(manifest)
    return {"success": True, "status": "skipped"}


@app.get("/api/notifications")
def get_notifications(unread_only: bool = False):
    """Get notifications list."""
    if not NOTIFICATIONS_PATH.exists():
        return {"notifications": [], "unread_count": 0}

    try:
        notifications = json.loads(NOTIFICATIONS_PATH.read_text("utf-8"))
        unread_count = sum(1 for n in notifications if not n.get("read"))

        if unread_only:
            notifications = [n for n in notifications if not n.get("read")]

        return {"notifications": notifications, "unread_count": unread_count}
    except:
        return {"notifications": [], "unread_count": 0}


@app.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    if not NOTIFICATIONS_PATH.exists():
        raise HTTPException(status_code=404, detail="Notification not found")

    try:
        notifications = json.loads(NOTIFICATIONS_PATH.read_text("utf-8"))
        found = False

        for n in notifications:
            if n.get("id") == notification_id:
                n["read"] = True
                found = True
                break

        if not found:
            raise HTTPException(status_code=404, detail="Notification not found")

        NOTIFICATIONS_PATH.write_text(json.dumps(notifications, ensure_ascii=False, indent=2), encoding="utf-8")
        return {"success": True}
    except:
        raise HTTPException(status_code=500, detail="Failed to update notification")


@app.get("/api/zoom/queue")
def get_transcription_queue():
    """Get current transcription queue status."""
    manifest = _load_zoom_manifest()

    # Find recordings that are currently processing
    downloading = [r for r in manifest.get("recordings", []) if r.get("status") == "downloading"]
    transcribing = [r for r in manifest.get("recordings", []) if r.get("status") == "transcribing"]
    pending = [r for r in manifest.get("recordings", []) if r.get("status") == "pending"]

    return {
        "downloading": [{"zoom_id": r["zoom_id"], "topic": r.get("topic")} for r in downloading],
        "transcribing": [{"zoom_id": r["zoom_id"], "topic": r.get("topic")} for r in transcribing],
        "pending_transcription": [{"zoom_id": r["zoom_id"], "topic": r.get("topic")} for r in pending],
        "is_busy": len(downloading) > 0 or len(transcribing) > 0
    }

# ============ Marketing Leads & Attribution Endpoints ============
from pathlib import Path as _Path

_marketing_leads_path = _Path(__file__).parent / "marketing_leads_endpoints.py"
if _marketing_leads_path.exists():
    try:
        exec(_marketing_leads_path.read_text("utf-8"), globals())
    except Exception as e:
        import logging
        logging.error(f"Failed to load marketing_leads_endpoints.py: {e}")

# ============ Marketing Prompts Endpoints ============
_marketing_prompts_path = _Path(__file__).parent / "marketing_prompts_endpoints.py"
if _marketing_prompts_path.exists():
    try:
        exec(_marketing_prompts_path.read_text("utf-8"), globals())
    except Exception as e:
        import logging
        logging.error(f"Failed to load marketing_prompts_endpoints.py: {e}")

# Voice sample path for speaker identification
VOICE_SAMPLE_PATH = Path("/app/backend/eitan_voice_sample.m4a")

def gemini_transcribe_with_speaker_id(file_path: str, topic: str = "", model: Optional[str] = None) -> List[dict]:
    """
    Transcribe audio with speaker identification using voice sample.
    Uses Eitan voice sample to identify speakers.
    Returns a list of transcript segments with speaker attribution.
    """
    key = require_env("GEMINI_API_KEY")
    model_name = model or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
    
    # Load the recording to transcribe
    recording_data = Path(file_path).read_bytes()
    recording_b64 = base64.b64encode(recording_data).decode("utf-8")
    
    # Build the parts list
    parts = []
    
    # Check if voice sample exists
    if VOICE_SAMPLE_PATH.exists():
        voice_data = VOICE_SAMPLE_PATH.read_bytes()
        voice_b64 = base64.b64encode(voice_data).decode("utf-8")
        
        # Extract client name from topic (format: "איתן עם [Client Name]")
        client_name = ""
        if topic:
            import re
            match = re.search(r"איתן עם (.+)", topic) or re.search(r"עם (.+)", topic)
            if match:
                client_name = match.group(1).strip()
        
        # Build prompt with voice context
        prompt_text = """אתה מתמלל שיחה משפטית בעברית.

הקובץ הראשון הוא דוגמת קול של עו"ד איתן שמיר - עורך דין ישראלי, גבר בן 48.
הקובץ השני הוא ההקלטה לתמלול.

הוראות:
1. תמלל את כל השיחה מילה במילה
2. זהה את הדוברים לפי הקול:
   - עו"ד איתן שמיר (משתמש בדוגמת הקול לזיהוי)"""
        
        if client_name:
            prompt_text += f"""
   - {client_name} (הצד השני בשיחה)"""
        else:
            prompt_text += """
   - לקוח (הצד השני בשיחה)"""
            
        prompt_text += """

3. החזר את התמלול בפורמט JSON:
[
  {"speaker": "שם הדובר", "text": "הטקסט שנאמר"},
  ...
]

החזר רק את ה-JSON, ללא הסברים נוספים."""
        
        parts = [
            {"text": prompt_text},
            {"inlineData": {"mimeType": "audio/mp4", "data": voice_b64}},
            {"inlineData": {"mimeType": "audio/mp4", "data": recording_b64}},
        ]
    else:
        # Fallback without voice sample
        parts = [
            {"text": "תמלל את ההקלטה הזו לעברית. זהה דוברים שונים אם יש. החזר JSON: [{\"speaker\": \"דובר\", \"text\": \"טקסט\"}]"},
            {"inlineData": {"mimeType": "audio/mp4", "data": recording_b64}},
        ]
    
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.1}
    }
    
    with httpx.Client(timeout=300.0) as client:
        resp = client.post(url, json=payload)
        if resp.status_code != 200:
            raise Exception(f"Gemini transcription failed: {resp.text}")
        data = resp.json()
    
    text = ""
    try:
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                text = parts[0].get("text", "")
    except Exception:
        pass
    
    if not text:
        raise Exception("No transcript returned")
    
    # Try to parse as JSON
    try:
        import json
        # Clean up the response (remove markdown code blocks if present)
        clean_text = text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()
        
        segments = json.loads(clean_text)
        if isinstance(segments, list):
            return segments
    except json.JSONDecodeError:
        pass
    
    # Fallback: return as single segment
    return [{"speaker": "דובר", "text": text.strip()}]


# ═════════════════════════════════════════════════════════════
# CLIENT MANAGEMENT ENDPOINTS (Phase 4I - 2025-12-06)
# ═════════════════════════════════════════════════════════════

from pydantic import BaseModel, Field
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

# Task Attachments Models (Phase 4H)
class EmailAttachment(BaseModel):
    id: str
    subject: str = ""
    from_addr: str = Field("", alias="from")
    received: str = ""
    has_attachments: bool = False
    attachments_count: int = 0
    client_name: str = ""
    task_title: str = ""

class LinkAdd(BaseModel):
    url: str
    user_title: str = ""

class LinkUpdate(BaseModel):
    url: str = None
    user_title: str = None

class FolderLinkAdd(BaseModel):
    local_path: str

class AssetRemove(BaseModel):
    index: int

class FileRename(BaseModel):
    new_title: str


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


# ═════════════════════════════════════════════════════════════
# TASK ATTACHMENTS ENDPOINTS (Phase 4H - 2025-12-07)
# ═════════════════════════════════════════════════════════════

@app.get("/tasks/{task_id}/files")
async def get_task_files(task_id: str):
    try:
        # Using load_tasks() from main.py
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        attachments = task.get("attachments", [])
        files = []
        for att in attachments:
            file_entry = {"kind": att.get("kind", "file"), "drive_id": att.get("drive_id"), "web_url": att.get("web_url"), "local_path": att.get("local_path"), "source_name": att.get("source_name"), "user_title": att.get("user_title")}
            if att.get("kind") == "email":
                file_entry["email_meta"] = {"id": att.get("id"), "subject": att.get("subject"), "from": att.get("from"), "received": att.get("received"), "has_attachments": att.get("has_attachments", False), "attachments_count": att.get("attachments_count", 0)}
            files.append(file_entry)
        return {"files": files, "folder": {"id": None, "web_url": None}, "primary_output_drive_id": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get task files: {str(e)}")

@app.post("/tasks/{task_id}/emails/attach")
async def attach_email_to_task(task_id: str, email: EmailAttachment):
    import json
    try:
        # Using load_tasks() from main.py, update_task_in_sqlite
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        if "attachments" not in task or task["attachments"] is None:
            task["attachments"] = []
        attachments = task["attachments"]
        if isinstance(attachments, str):
            attachments = json.loads(attachments) if attachments else []
        for att in attachments:
            if att.get("kind") == "email" and att.get("id") == email.id:
                return {"status": "already_attached", "attachment_count": len(attachments)}
        task["attachments"] = attachments
        attachments.append({"kind": "email", "id": email.id, "subject": email.subject, "from": email.from_addr, "received": email.received, "has_attachments": email.has_attachments, "attachments_count": email.attachments_count, "client_name": email.client_name, "task_title": email.task_title, "attached_at": datetime.utcnow().isoformat() + "Z"})
        save_task_json(task_id, task)
        return {"status": "attached", "attachment_count": len(attachments)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to attach email: {str(e)}")

@app.post("/tasks/{task_id}/links/add")
async def add_link_to_task(task_id: str, link: LinkAdd):
    import json
    try:
        # Using load_tasks() from main.py, update_task_in_sqlite
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        attachments = task.get("attachments", [])
        if isinstance(attachments, str):
            attachments = json.loads(attachments) if attachments else []
        attachments.append({"kind": "link", "web_url": link.url, "user_title": link.user_title})
        save_task_json(task_id, task)
        return {"status": "added", "attachment_count": len(attachments)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to add link: {str(e)}")

@app.post("/tasks/{task_id}/folder_link_add")
async def add_folder_link_to_task(task_id: str, folder: FolderLinkAdd):
    import json
    try:
        # Using load_tasks() from main.py, update_task_in_sqlite
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        attachments = task.get("attachments", [])
        if isinstance(attachments, str):
            attachments = json.loads(attachments) if attachments else []
        attachments.append({"kind": "folder", "local_path": folder.local_path})
        save_task_json(task_id, task)
        return {"status": "added", "attachment_count": len(attachments)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to add folder link: {str(e)}")

@app.post("/tasks/{task_id}/assets/remove")
async def remove_asset_from_task(task_id: str, asset: AssetRemove):
    import json
    try:
        # Using load_tasks() from main.py, update_task_in_sqlite
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        attachments = task.get("attachments", [])
        if isinstance(attachments, str):
            attachments = json.loads(attachments) if attachments else []
        if 0 <= asset.index < len(attachments):
            attachments.pop(asset.index)
            save_task_json(task_id, task)
            return {"status": "removed", "attachment_count": len(attachments)}
        else:
            raise HTTPException(400, "Invalid attachment index")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to remove asset: {str(e)}")

@app.patch("/tasks/{task_id}/links/update")
async def update_link_in_task(task_id: str, link_update: LinkUpdate):
    import json
    try:
        # Using load_tasks() from main.py, update_task_in_sqlite
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        attachments = task.get("attachments", [])
        if isinstance(attachments, str):
            attachments = json.loads(attachments) if attachments else []
        for att in attachments:
            if att.get("kind") == "link":
                if link_update.url:
                    att["web_url"] = link_update.url
                if link_update.user_title is not None:
                    att["user_title"] = link_update.user_title
                break
        save_task_json(task_id, task)
        return {"status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to update link: {str(e)}")

@app.patch("/tasks/{task_id}/files/{drive_id}/title")
async def rename_file_in_task(task_id: str, drive_id: str, rename: FileRename):
    import json
    try:
        # Using load_tasks() from main.py, update_task_in_sqlite
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        attachments = task.get("attachments", [])
        if isinstance(attachments, str):
            attachments = json.loads(attachments) if attachments else []
        for att in attachments:
            if att.get("kind") == "file" and att.get("drive_id") == drive_id:
                att["user_title"] = rename.new_title
                break
        save_task_json(task_id, task)
        return {"status": "renamed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to rename file: {str(e)}")

@app.post("/tasks/{task_id}/files/upload")
async def upload_file_to_task(task_id: str, file: UploadFile = File(...)):
    try:
        # Using load_tasks() from main.py
        task = find_task_json(task_id)
        if not task:
            raise HTTPException(404, "Task not found")
        return {"status": "not_implemented", "message": "File upload requires SharePoint integration", "filename": file.filename}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to upload file: {str(e)}")

# Helper function for task attachments (uses JSON file, not SQLite)
def find_task_json(task_id: str):
    tasks = load_tasks()
    for t in tasks:
        if t.get('id') == task_id:
            return t
    return None

def save_task_json(task_id: str, task_data: dict):
    tasks = load_tasks()
    for i, t in enumerate(tasks):
        if t.get('id') == task_id:
            tasks[i] = task_data
            save_tasks(tasks)
            return True
    return False
