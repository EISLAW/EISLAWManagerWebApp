#!/usr/bin/env python3
"""
Update RAG ingest endpoint in main.py to use SQLite.
Phase 4L.2 - Alex
"""
import re

# Read current main.py
with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "r") as f:
    content = f.read()

# Find and update the ingest endpoint
old_ingest = '''@app.post("/api/rag/ingest")
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
    return item'''

new_ingest = '''@app.post("/api/rag/ingest")
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
        content_text = "\\n".join(seg.get("text", "") for seg in segments)
        note = f"Transcribed with {model or os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')}"
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
        status=status,
        note=note
    )

    # Add extra fields for compatibility
    result["modelUsed"] = model or os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    result["filePath"] = str(target_path)
    result["transcript"] = segments

    return result'''

if old_ingest in content:
    content = content.replace(old_ingest, new_ingest)
    print("Updated /api/rag/ingest endpoint")
else:
    print("Could not find exact match for ingest endpoint")
    # Try regex approach
    pattern = r'@app\.post\("/api/rag/ingest"\)\nasync def rag_ingest\(.*?upsert_item\(item\)\n    return item'
    if re.search(pattern, content, re.DOTALL):
        content = re.sub(pattern, new_ingest, content, flags=re.DOTALL)
        print("Updated /api/rag/ingest endpoint (regex)")
    else:
        print("Failed to update ingest endpoint")

# Write updated content
with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "w") as f:
    f.write(content)
