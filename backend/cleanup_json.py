#!/usr/bin/env python3
"""
Remove JSON dependencies and duplicate functions.
Phase 4L.2 - Alex
"""

# Read current main.py
with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "r") as f:
    content = f.read()

# 1. Remove duplicate rag_inbox function
old_duplicate = '''def rag_inbox():
    ensure_dirs()
    return {"items": load_index()}'''

if old_duplicate in content:
    content = content.replace(old_duplicate, "# REMOVED: Old JSON-based rag_inbox (now using SQLite)")
    print("Removed duplicate rag_inbox function")

# 2. Update rag_audio endpoint to use SQLite
old_audio = '''@app.get("/api/rag/audio/{item_id}")
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
    return FileResponse(path, filename=Path(path).name)'''

new_audio = '''@app.get("/api/rag/audio/{item_id}")
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

    return FileResponse(path, filename=Path(path).name)'''

if old_audio in content:
    content = content.replace(old_audio, new_audio)
    print("Updated rag_audio endpoint to use SQLite")
else:
    print("Could not find exact rag_audio to update")

# Write updated content
with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "w") as f:
    f.write(content)

print("Cleanup complete")
