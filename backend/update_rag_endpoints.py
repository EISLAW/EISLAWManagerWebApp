#!/usr/bin/env python3
"""
Update RAG endpoints in main.py to use SQLite functions.
Phase 4L.2 - Alex
"""
import re

# Read current main.py
with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "r") as f:
    content = f.read()

changes_made = []

# 1. Update /api/rag/publish endpoint
# Find and replace the publish function
publish_pattern = r'@app\.post\("/api/rag/publish/\{item_id\}"\)\ndef rag_publish\(item_id: str\):.*?return updated'
new_publish = '''@app.post("/api/rag/publish/{item_id}")
def rag_publish(item_id: str):
    """Publish a transcript to library (SQLite)."""
    result = rag_sqlite.publish_transcript_sqlite(
        item_id,
        meilisearch_index_func=rag_sqlite.index_transcript_in_meilisearch
    )
    if not result:
        raise HTTPException(status_code=404, detail="Not found")
    return result'''

if re.search(publish_pattern, content, re.DOTALL):
    content = re.sub(publish_pattern, new_publish, content, flags=re.DOTALL)
    changes_made.append("/api/rag/publish")

# 2. Update /api/rag/reviewer/{item_id} GET endpoint
reviewer_get_pattern = r'@app\.get\("/api/rag/reviewer/\{item_id\}"\)\ndef rag_reviewer_get\(item_id: str\):.*?return payload'
new_reviewer_get = '''@app.get("/api/rag/reviewer/{item_id}")
def rag_reviewer_get(item_id: str):
    """Get transcript for reviewer (SQLite)."""
    payload = rag_sqlite.get_transcript_for_reviewer(item_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Not found")
    return payload'''

if re.search(reviewer_get_pattern, content, re.DOTALL):
    content = re.sub(reviewer_get_pattern, new_reviewer_get, content, flags=re.DOTALL)
    changes_made.append("/api/rag/reviewer GET")

# 3. Update /api/rag/reviewer/{item_id} PATCH endpoint
reviewer_patch_pattern = r'@app\.patch\("/api/rag/reviewer/\{item_id\}"\)\ndef rag_reviewer_update\(item_id: str, payload: dict = Body\(\.\.\.\)\):.*?return updated'
new_reviewer_patch = '''@app.patch("/api/rag/reviewer/{item_id}")
def rag_reviewer_update(item_id: str, payload: dict = Body(...)):
    """Update transcript via reviewer (SQLite)."""
    updated = rag_sqlite.update_transcript_sqlite(
        item_id,
        payload,
        meilisearch_index_func=rag_sqlite.index_transcript_in_meilisearch
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    return updated'''

if re.search(reviewer_patch_pattern, content, re.DOTALL):
    content = re.sub(reviewer_patch_pattern, new_reviewer_patch, content, flags=re.DOTALL)
    changes_made.append("/api/rag/reviewer PATCH")

# 4. Update /api/rag/file/{item_id} PATCH endpoint
file_patch_pattern = r'@app\.patch\("/api/rag/file/\{item_id\}"\)\ndef rag_update\(item_id: str, payload: dict = Body\(\.\.\.\)\):.*?return updated'
new_file_patch = '''@app.patch("/api/rag/file/{item_id}")
def rag_update(item_id: str, payload: dict = Body(...)):
    """Update transcript metadata (SQLite)."""
    updated = rag_sqlite.update_transcript_sqlite(
        item_id,
        payload,
        meilisearch_index_func=rag_sqlite.index_transcript_in_meilisearch
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not found")
    return updated'''

if re.search(file_patch_pattern, content, re.DOTALL):
    content = re.sub(file_patch_pattern, new_file_patch, content, flags=re.DOTALL)
    changes_made.append("/api/rag/file PATCH")

# 5. Update /api/rag/file/{item_id} DELETE endpoint
file_delete_pattern = r'@app\.delete\("/api/rag/file/\{item_id\}"\)\ndef rag_delete\(item_id: str\):.*?return \{"deleted": removed, "id": item_id\}'
new_file_delete = '''@app.delete("/api/rag/file/{item_id}")
def rag_delete(item_id: str):
    """Delete transcript (SQLite soft delete)."""
    deleted = rag_sqlite.delete_transcript_sqlite(
        item_id,
        meilisearch_delete_func=rag_sqlite.remove_from_meilisearch
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True, "id": item_id}'''

if re.search(file_delete_pattern, content, re.DOTALL):
    content = re.sub(file_delete_pattern, new_file_delete, content, flags=re.DOTALL)
    changes_made.append("/api/rag/file DELETE")

# 6. Update /api/rag/assistant endpoint to use Meilisearch
# Find the assistant endpoint
assistant_pattern = r'@app\.post\("/api/rag/assistant"\)\ndef rag_assistant\(payload: dict = Body\(default=None\)\):.*?(?=\n@app\.|\nif __name__|$)'

def new_assistant_func():
    return '''@app.post("/api/rag/assistant")
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

'''

match = re.search(assistant_pattern, content, re.DOTALL)
if match:
    # Find where the function ends (next @app. or end of file)
    old_func = match.group(0)
    # Replace up to where we matched
    content = content[:match.start()] + new_assistant_func() + content[match.end():]
    changes_made.append("/api/rag/assistant")

# Write updated content
with open("/home/azureuser/EISLAWManagerWebApp/backend/main.py", "w") as f:
    f.write(content)

print(f"Updated endpoints: {changes_made}")
print(f"Total changes: {len(changes_made)}")
