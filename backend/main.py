from datetime import datetime, timedelta
import uuid
from fastapi import FastAPI, Query, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pathlib import Path
import json
import shutil
from typing import Optional, List
import os
import base64
import fixtures
import httpx
import msal

app = FastAPI(title="EISLAW Backend", version="0.1.0")

# ─────────────────────────────────────────────────────────────
# Secrets Loading (from secrets.local.json)
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

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
TRANSCRIPTS_DIR = BASE_DIR / "Transcripts"
INBOX_DIR = TRANSCRIPTS_DIR / "Inbox"
LIBRARY_DIR = TRANSCRIPTS_DIR / "Library"
INDEX_PATH = TRANSCRIPTS_DIR / "index.json"
TASKS_PATH = BASE_DIR / "data" / "tasks.json"
TASKS_ARCHIVE_PATH = BASE_DIR / "data" / "tasks_archive.json"


def ensure_dirs():
    INBOX_DIR.mkdir(parents=True, exist_ok=True)
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    TASKS_PATH.parent.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────────
# Tasks Storage (JSON file-based, same pattern as RAG index)
# ─────────────────────────────────────────────────────────────

def load_tasks():
    if not TASKS_PATH.exists():
        return []
    try:
        return json.loads(TASKS_PATH.read_text("utf-8"))
    except Exception:
        return []


def save_tasks(tasks):
    TASKS_PATH.parent.mkdir(parents=True, exist_ok=True)
    TASKS_PATH.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")


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
    for t in load_tasks():
        if t.get("id") == task_id:
            return t
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
def get_clients():
    return fixtures.clients()


@app.get("/api/clients/{cid}")
def get_client(cid: str):
    c = fixtures.client_detail(cid)
    return c or {"error": "not found"}


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
def get_privacy_submissions(top: int = 50):
    return fixtures.privacy_submissions(top)


@app.get("/api/rag/search")
def rag_search(q: str, client: Optional[str] = None):
    # demo
    return {"query": q, "client": client, "results": []}


@app.get("/api/rag/inbox")
def rag_inbox():
    ensure_dirs()
    return {"items": load_index()}


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
    Minimal ingest stub: saves the uploaded file to Transcripts/Inbox/{hash}_filename
    and records a manifest entry with status=transcribing. Duplicate hashes return
    a duplicate status without re-saving.
    """
    ensure_dirs()
    existing = next((i for i in load_index() if i.get("hash") == hash), None)
    if existing:
        return {
            "id": existing.get("id"),
            "status": "duplicate",
            "note": "File already exists",
            "hash": hash,
            "client": existing.get("client"),
        }

    safe_name = filename or file.filename or "upload.bin"
    target_path = INBOX_DIR / f"{hash}_{safe_name}"
    with target_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    transcript, note, status = [], "Saved to inbox; transcription pending", "transcribing"
    try:
        transcript = gemini_transcribe_audio(str(target_path), model=model)
        note = f"Transcribed with {model or os.environ.get('GEMINI_MODEL', 'gemini-3-pro-preview')}"
        status = "ready"
    except Exception as exc:
        note = f"Transcription failed: {exc}"
        status = "error"

    item = {
        "id": f"rag-{uuid.uuid4().hex[:8]}",
        "fileName": safe_name,
        "hash": hash,
        "status": status,
        "client": client,
        "domain": domain,
        "date": date,
        "note": note,
        "size": int(size) if size and size.isdigit() else None,
        "createdAt": datetime.utcnow().isoformat(),
        "transcript": transcript,
        "modelUsed": model or os.environ.get("GEMINI_MODEL", "gemini-3-pro-preview"),
        "filePath": str(target_path),
    }
    upsert_item(item)
    return item


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
    """
    Stub: moves file from Inbox to Library and marks status ready.
    """
    ensure_dirs()
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    hash_prefix = item.get("hash")
    # locate file in inbox
    file_path = next(INBOX_DIR.glob(f"{hash_prefix}_*"), None)
    dest_dir = LIBRARY_DIR / (item.get("domain") or "UNKNOWN") / (item.get("client") or "Unassigned")
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / (file_path.name if file_path else f"{hash_prefix}_{item.get('fileName','file')}")
    if file_path and file_path.exists():
        shutil.move(str(file_path), dest_path)
    updated = {**item, "status": "ready", "note": "Published to library", "libraryPath": str(dest_path), "filePath": str(dest_path)}
    upsert_item(updated)
    return updated


@app.get("/api/rag/reviewer/{item_id}")
def rag_reviewer_get(item_id: str):
    ensure_dirs()
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    raw_text = None
    path = item.get("filePath")
    if path and Path(path).exists():
        try:
            raw_text = Path(path).read_text(encoding="utf-8", errors="ignore")
        except Exception:
            raw_text = None
    # If transcript is missing/one-stub and raw_text exists, attempt a simple parse of "Speaker: text" lines
    parsed = []
    if raw_text and (not item.get("transcript") or len(item.get("transcript")) <= 1):
        for line in raw_text.splitlines():
            line = line.strip()
            if not line:
                continue
            speaker = "Speaker 1"
            text = line
            if ":" in line:
                parts = line.split(":", 1)
                speaker = parts[0].strip() or speaker
                text = parts[1].strip()
            parsed.append({"speaker": speaker, "start": "", "end": "", "text": text})
    payload = {**item}
    if raw_text is not None:
        payload["rawText"] = raw_text
    if parsed:
        payload["parsedSegments"] = parsed
    return payload


@app.patch("/api/rag/reviewer/{item_id}")
def rag_reviewer_update(item_id: str, payload: dict = Body(...)):
    ensure_dirs()
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    updated = {**item}
    if "transcript" in payload:
        updated["transcript"] = payload["transcript"]
    for key in ["client", "domain", "date", "tags", "note", "status"]:
        if key in payload:
            updated[key] = payload[key]
    if updated.get("status") == "ready":
        hash_prefix = updated.get("hash")
        file_path = next(INBOX_DIR.glob(f"{hash_prefix}_*"), None)
        dest_dir = LIBRARY_DIR / (updated.get("domain") or "UNKNOWN") / (updated.get("client") or "Unassigned")
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / (file_path.name if file_path else f"{hash_prefix}_{updated.get('fileName','file')}")
        if file_path and file_path.exists():
            shutil.move(str(file_path), dest_path)
        updated["libraryPath"] = str(dest_path)
        updated["filePath"] = str(dest_path)
    upsert_item(updated)
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
    """
    Update metadata/status for an inbox item. If status is set to 'ready', we attempt to move to Library.
    """
    ensure_dirs()
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    updated = {**item}
    for key in ["client", "domain", "date", "status", "note", "tags"]:
        if key in payload:
            updated[key] = payload[key]

    # if moving to ready and file still in inbox, move to library folder
    if updated.get("status") == "ready":
        hash_prefix = updated.get("hash")
        file_path = next(INBOX_DIR.glob(f"{hash_prefix}_*"), None)
        dest_dir = LIBRARY_DIR / (updated.get("domain") or "UNKNOWN") / (updated.get("client") or "Unassigned")
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / (file_path.name if file_path else f"{hash_prefix}_{updated.get('fileName','file')}")
        if file_path and file_path.exists():
            shutil.move(str(file_path), dest_path)
        updated["libraryPath"] = str(dest_path)
        updated["filePath"] = str(dest_path)

    upsert_item(updated)
    return updated


@app.delete("/api/rag/file/{item_id}")
def rag_delete(item_id: str):
    """
    Stub hard delete: removes index entry and associated files (Inbox + Library).
    """
    ensure_dirs()
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    hash_prefix = item.get("hash")
    for p in INBOX_DIR.glob(f"{hash_prefix}_*"):
        p.unlink(missing_ok=True)
    for p in LIBRARY_DIR.glob(f"**/{hash_prefix}_*"):
        p.unlink(missing_ok=True)
    removed = remove_item(item_id)
    return {"deleted": removed, "id": item_id}


@app.get("/api/rag/audio/{item_id}")
def rag_audio(item_id: str):
    """
    Stream the audio file for a given item (Inbox or Library).
    """
    ensure_dirs()
    item = find_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    path = item.get("filePath")
    if not path or not Path(path).exists():
        # try to resolve by hash
        hash_prefix = item.get("hash")
        file_path = next(INBOX_DIR.glob(f"{hash_prefix}_*"), None) or next(
            LIBRARY_DIR.glob(f"**/{hash_prefix}_*"), None
        )
        if not file_path:
            raise HTTPException(status_code=404, detail="File not found")
        path = file_path
    return FileResponse(path, filename=Path(path).name)


@app.post("/api/rag/assistant")
def rag_assistant(payload: dict = Body(default=None)):
    """
    Lightweight assistant stub: searches local manifest and stitches snippets.
    Replace with real RAG+LLM when ready.
    """
    ensure_dirs()
    if payload is None:
        payload = {}
    q = (payload.get("question") or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="question is required")
    client = (payload.get("client") or "").strip() or None
    domain = (payload.get("domain") or "").strip() or None
    include_personal = bool(payload.get("include_personal"))
    include_drafts = bool(payload.get("include_drafts"))

    items = load_index()
    results = []
    for it in items:
        if client and (it.get("client") or "").lower() != client.lower():
            continue
        if domain and domain.lower() != "all" and (it.get("domain") or "").lower() != domain.lower():
            continue
        if not include_personal and (it.get("domain") or "").lower() == "personal":
            continue
        if not include_drafts and (it.get("status") or "") != "ready":
            continue
        txt = ""
        transcript = it.get("transcript") or []
        if transcript and isinstance(transcript, list):
            txt = " ".join(seg.get("text") or "" for seg in transcript)
        snippet = txt[:400] + ("…" if len(txt) > 400 else "")
        if q.lower() in txt.lower() or not txt:
            results.append({**it, "snippet": snippet})

    snippets = [r.get("snippet") or "" for r in results if r.get("snippet")]
    answer = "\n\n".join(snippets[:3]) if snippets else "לא נמצאו מקורות רלוונטיים. נסה ניסוח אחר או הרחב את החיפוש."
    sources = [
        {
          "id": r.get("id"),
          "file": r.get("fileName") or r.get("file"),
          "client": r.get("client"),
          "domain": r.get("domain"),
          "path": r.get("libraryPath") or r.get("filePath"),
          "hash": r.get("hash"),
        }
        for r in results[:5]
    ]
    return {"answer": answer, "sources": sources}


# ─────────────────────────────────────────────────────────────
# Microsoft Graph Email Sync
# ─────────────────────────────────────────────────────────────

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


def search_emails_by_client(client_name: str, since_days: int = 45, top: int = 50):
    """
    Search for emails mentioning the client name in subject, body, or from/to.
    Uses Microsoft Graph API search capabilities.
    """
    token = get_graph_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    # Calculate date filter
    from_date = (datetime.utcnow() - timedelta(days=since_days)).strftime("%Y-%m-%dT00:00:00Z")

    # Build search query - search in subject and body for client name
    # Using $filter for date range and $search for text
    search_query = client_name.replace('"', '\\"')

    # Try to get emails from all accessible mailboxes (requires Mail.Read or Mail.ReadBasic permissions)
    # For app-only access, we need to specify a user or use /users endpoint

    # First, get the list of users we can access
    emails_found = []

    with httpx.Client(timeout=60.0) as client:
        # Get primary user's mailbox (the app registration owner's org)
        # For app-only access with Mail.Read permission on all mailboxes
        users_url = "https://graph.microsoft.com/v1.0/users?$select=id,mail,displayName&$top=10"
        users_resp = client.get(users_url, headers=headers)

        if users_resp.status_code != 200:
            # If we can't list users, try with /me (delegated) or a specific user
            raise HTTPException(
                status_code=502,
                detail=f"Cannot access mailboxes: {users_resp.text}"
            )

        users_data = users_resp.json()
        users = users_data.get("value", [])

        for user in users:
            user_id = user.get("id")
            user_email = user.get("mail")
            if not user_id:
                continue

            # Search messages for this user
            # Using OData filter for receivedDateTime and search for client name
            messages_url = (
                f"https://graph.microsoft.com/v1.0/users/{user_id}/messages"
                f"?$filter=receivedDateTime ge {from_date}"
                f"&$search=\"{search_query}\""
                f"&$select=id,subject,from,toRecipients,receivedDateTime,bodyPreview,hasAttachments,webLink"
                f"&$top={top}"
                f"&$orderby=receivedDateTime desc"
            )

            try:
                msg_resp = client.get(messages_url, headers=headers)
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
                            "hasAttachments": msg.get("hasAttachments", False),
                            "webLink": msg.get("webLink"),
                            "mailbox": user_email,
                        })
            except Exception as e:
                # Skip this user if we can't access their mailbox
                continue

    # Sort by date (newest first) and deduplicate by id
    seen_ids = set()
    unique_emails = []
    for email in sorted(emails_found, key=lambda x: x.get("date", ""), reverse=True):
        if email["id"] not in seen_ids:
            seen_ids.add(email["id"])
            unique_emails.append(email)

    return unique_emails[:top]


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
