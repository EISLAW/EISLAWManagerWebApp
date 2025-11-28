from datetime import datetime
import uuid
from fastapi import FastAPI, Query, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
import shutil
from typing import Optional
import fixtures

app = FastAPI(title="EISLAW Backend", version="0.1.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
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
INDEX_PATH = TRANSCRIPTS_DIR / "index.json"


def ensure_dirs():
    INBOX_DIR.mkdir(parents=True, exist_ok=True)
    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)


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

    item = {
        "id": f"rag-{uuid.uuid4().hex[:8]}",
        "fileName": safe_name,
        "hash": hash,
        "status": "transcribing",
        "client": client,
        "domain": domain,
        "date": date,
        "note": "Saved to inbox; transcription pending",
        "size": int(size) if size and size.isdigit() else None,
        "createdAt": datetime.utcnow().isoformat(),
    }
    upsert_item(item)
    return item


@app.post("/api/rag/transcribe_doc")
async def rag_transcribe_doc(
    file: UploadFile = File(...),
    client: Optional[str] = Form(None),
):
    """
    Lightweight mock that accepts a document upload and returns a transcript preview.
    Replace with the real desktop pipeline when wiring Gemini/ffmpeg.
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
    }


@app.get("/api/integrations/health")
def integrations_health():
    # simple summary reusing local knowledge
    return {"airtable": True, "graph": True, "azure": True}
