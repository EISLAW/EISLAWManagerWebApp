from datetime import datetime
import uuid
from fastapi import FastAPI, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
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
