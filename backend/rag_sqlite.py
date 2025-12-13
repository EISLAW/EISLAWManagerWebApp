"""
RAG SQLite Functions - Phase 4L + 4L.2
Complete SQLite-based implementations for ALL RAG endpoints.
"""
import json
import os
import uuid
import tempfile
from datetime import datetime
from typing import Optional, List, Dict, Any


def get_sqlite_db():
    """Get database instance."""
    try:
        from backend import db as sqlite_db
    except ImportError:
        import db as sqlite_db
    return sqlite_db.get_db()


# =============================================================================
# INBOX / SEARCH - Already implemented in Phase 4L
# =============================================================================

def rag_inbox_sqlite() -> Dict:
    """List transcripts from SQLite (status = draft or reviewed)."""
    db = get_sqlite_db()

    items = db.execute("""
        SELECT
            t.id,
            t.recording_id,
            t.title,
            t.content,
            t.segments,
            t.status,
            t.domain,
            t.client_id,
            t.tags,
            t.word_count,
            t.created_at,
            t.updated_at,
            t.recording_date,
            r.topic as recording_topic,
            r.duration_minutes,
            r.azure_blob,
            r.file_type
        FROM transcripts t
        LEFT JOIN recordings r ON t.recording_id = r.id
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.status IN ('draft', 'reviewed', 'ready')
        ORDER BY t.created_at DESC
    """)

    for item in items:
        if item.get("segments"):
            try:
                item["segments"] = json.loads(item["segments"])
            except (json.JSONDecodeError, TypeError):
                item["segments"] = []
        if item.get("tags"):
            try:
                item["tags"] = json.loads(item["tags"])
            except (json.JSONDecodeError, TypeError):
                item["tags"] = []
        item["fileName"] = item.get("title", "Untitled")
        item["hash"] = item.get("id", "")[:8]

    return {"items": items, "total": len(items)}


def rag_search_sqlite(q: str, client: Optional[str] = None, domain: Optional[str] = None, limit: int = 20) -> Dict:
    """Search transcripts using SQLite LIKE (published only)."""
    db = get_sqlite_db()

    query = """
        SELECT
            t.id,
            t.title,
            t.content,
            t.status,
            t.domain,
            t.client_id,
            t.word_count,
            t.created_at,
            c.name as client_name
        FROM transcripts t
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.status = 'published'
        AND (t.title LIKE ? OR t.content LIKE ?)
    """
    params = [f"%{q}%", f"%{q}%"]

    if client:
        query += " AND t.client_id = ?"
        params.append(client)

    if domain:
        query += " AND t.domain = ?"
        params.append(domain)

    query += " ORDER BY t.created_at DESC LIMIT ?"
    params.append(limit)

    results = db.execute(query, tuple(params))

    for item in results:
        content = item.get("content", "") or ""
        idx = content.lower().find(q.lower())
        if idx >= 0:
            start = max(0, idx - 100)
            end = min(len(content), idx + len(q) + 100)
            snippet = ("..." if start > 0 else "") + content[start:end] + ("..." if end < len(content) else "")
            item["snippet"] = snippet
        else:
            item["snippet"] = content[:200] + ("..." if len(content) > 200 else "")
        del item["content"]

    return {"query": q, "results": results, "total": len(results)}


# =============================================================================
# ZOOM RECORDINGS - Already implemented in Phase 4L
# =============================================================================

def zoom_recordings_sqlite(status: str = None, participant: str = None) -> Dict:
    """List all recordings from SQLite database with optional filters."""
    db = get_sqlite_db()

    query = "SELECT * FROM recordings"
    params = []
    conditions = []

    if status:
        conditions.append("status = ?")
        params.append(status)

    if participant:
        conditions.append("topic LIKE ?")
        params.append(f"%{participant}%")

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY date DESC, created_at DESC"

    recordings = db.execute(query, tuple(params))
    last_sync_row = db.execute_one("SELECT MAX(synced_at) as last_sync FROM recordings")
    last_sync = last_sync_row.get("last_sync") if last_sync_row else None

    return {"recordings": recordings, "total": len(recordings), "last_sync": last_sync}


def zoom_transcribe_start(zoom_id: str, load_secrets_func, HTTPException_class) -> Dict:
    """Start transcription for a Zoom recording."""
    db = get_sqlite_db()

    recording = db.execute_one("SELECT * FROM recordings WHERE zoom_id = ?", (zoom_id,))
    if not recording:
        raise HTTPException_class(status_code=404, detail="Recording not found in database")

    if not recording.get("azure_blob"):
        raise HTTPException_class(status_code=400, detail="Recording not downloaded yet - no Azure Blob path")

    if recording.get("status") == "transcribing":
        return {"status": "already_running", "message": "Transcription already in progress", "recording": None}

    if recording.get("status") == "completed":
        existing = db.execute_one("SELECT id FROM transcripts WHERE recording_id = ?", (recording["id"],))
        if existing:
            return {"status": "already_done", "transcript_id": existing["id"], "message": "Already transcribed", "recording": None}

    with db.connection() as conn:
        conn.execute(
            "UPDATE recordings SET status = ?, updated_at = datetime('now') WHERE zoom_id = ?",
            ("transcribing", zoom_id)
        )

    return {
        "status": "started",
        "zoom_id": zoom_id,
        "message": f"Transcription started for: {recording.get('topic', 'Recording')}",
        "azure_blob": recording.get("azure_blob"),
        "recording": recording
    }


def run_transcription_task(zoom_id: str, recording: Dict, load_secrets_func, gemini_transcribe_func):
    """Background task: Download from Azure, transcribe with Gemini, save to SQLite."""
    db = get_sqlite_db()

    try:
        secrets = load_secrets_func()
        conn_str = secrets.get("azure_blob", {}).get("connection_string") or os.environ.get("AZURE_BLOB_CONNECTION_STRING")

        if not conn_str:
            raise Exception("Azure Blob connection string not configured")

        from azure.storage.blob import BlobServiceClient
        blob_service = BlobServiceClient.from_connection_string(conn_str)
        container = blob_service.get_container_client("zoom-recordings")
        blob_client = container.get_blob_client(recording["azure_blob"])

        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp:
            download_stream = blob_client.download_blob()
            tmp.write(download_stream.readall())
            temp_path = tmp.name

        print(f"Downloaded {recording['azure_blob']} to {temp_path}")

        segments = gemini_transcribe_func(temp_path)
        transcript_text = "\n".join(seg.get("text", "") for seg in segments)

        try:
            os.unlink(temp_path)
        except OSError:
            pass

        word_count = len(transcript_text.split()) if transcript_text else 0

        transcript_id = str(uuid.uuid4())[:16]
        with db.connection() as conn:
            conn.execute("""
                INSERT INTO transcripts
                (id, recording_id, title, content, segments, status, domain, word_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'draft', 'Business', ?, datetime('now'), datetime('now'))
            """, (
                transcript_id,
                recording["id"],
                recording.get("topic", "Recording"),
                transcript_text,
                json.dumps(segments, ensure_ascii=False),
                word_count
            ))

            conn.execute("""
                UPDATE recordings
                SET status = 'completed', transcribed_at = datetime('now'), updated_at = datetime('now')
                WHERE zoom_id = ?
            """, (zoom_id,))

        print(f"Transcription complete for {zoom_id}: transcript_id={transcript_id}, words={word_count}")

    except Exception as e:
        print(f"Transcription failed for {zoom_id}: {e}")
        with db.connection() as conn:
            conn.execute(
                "UPDATE recordings SET status = 'error', error = ?, updated_at = datetime('now') WHERE zoom_id = ?",
                (str(e)[:500], zoom_id)
            )


# =============================================================================
# PHASE 4L.2 - NEW FUNCTIONS FOR REMAINING ENDPOINTS
# =============================================================================

def find_transcript_by_id(item_id: str) -> Optional[Dict]:
    """Find a transcript by ID in SQLite."""
    db = get_sqlite_db()

    transcript = db.execute_one("""
        SELECT
            t.id,
            t.recording_id,
            t.title,
            t.content,
            t.segments,
            t.status,
            t.domain,
            t.client_id,
            t.tags,
            t.word_count,
            t.file_path,
            t.hash,
            t.model_used,
            t.created_at,
            t.updated_at,
            t.recording_date,
            r.topic as recording_topic,
            r.azure_blob,
            r.file_type,
            c.name as client_name
        FROM transcripts t
        LEFT JOIN recordings r ON t.recording_id = r.id
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.id = ?
    """, (item_id,))

    if not transcript:
        return None

    # Parse JSON fields
    if transcript.get("segments"):
        try:
            transcript["segments"] = json.loads(transcript["segments"])
        except (json.JSONDecodeError, TypeError):
            transcript["segments"] = []
    if transcript.get("tags"):
        try:
            transcript["tags"] = json.loads(transcript["tags"])
        except (json.JSONDecodeError, TypeError):
            transcript["tags"] = []

    # Frontend compatibility
    transcript["fileName"] = transcript.get("title", "Untitled")
    transcript["filePath"] = transcript.get("file_path", "")

    return transcript


def ingest_transcript_sqlite(
    file_hash: str,
    filename: str,
    file_path: str,
    content: str,
    segments: List[Dict],
    client: Optional[str] = None,
    domain: Optional[str] = None,
    model_used: Optional[str] = None,
    status: str = "draft"
) -> Dict:
    """
    Ingest a new transcript into SQLite.
    Returns the created transcript dict.
    """
    db = get_sqlite_db()

    # Check for duplicate by hash
    existing = db.execute_one("SELECT id, client_id FROM transcripts WHERE hash = ?", (file_hash,))
    if existing:
        return {
            "id": existing["id"],
            "status": "duplicate",
            "note": "File already exists",
            "hash": file_hash,
            "client": existing.get("client_id")
        }

    transcript_id = f"rag-{uuid.uuid4().hex[:8]}"
    word_count = len(content.split()) if content else 0
    segments_json = json.dumps(segments, ensure_ascii=False) if segments else "[]"

    with db.connection() as conn:
        conn.execute("""
            INSERT INTO transcripts
            (id, title, content, segments, status, domain, client_id, word_count, hash, file_path, model_used, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            transcript_id,
            filename,
            content,
            segments_json,
            status,
            domain or "Business",
            client,
            word_count,
            file_hash,
            file_path,
            model_used
        ))

    return {
        "id": transcript_id,
        "fileName": filename,
        "hash": file_hash,
        "status": status,
        "client": client,
        "domain": domain,
        "model_used": model_used,
        "word_count": word_count,
        "createdAt": datetime.utcnow().isoformat()
    }


def publish_transcript_sqlite(item_id: str, meilisearch_index_func=None) -> Dict:
    """
    Publish a transcript - updates status to 'published' and optionally indexes in Meilisearch.
    """
    db = get_sqlite_db()

    transcript = db.execute_one("SELECT * FROM transcripts WHERE id = ?", (item_id,))
    if not transcript:
        return None

    with db.connection() as conn:
        conn.execute("""
            UPDATE transcripts
            SET status = 'published', updated_at = datetime('now')
            WHERE id = ?
        """, (item_id,))

    # Index in Meilisearch if function provided
    if meilisearch_index_func:
        try:
            meilisearch_index_func(item_id)
        except Exception as e:
            print(f"Meilisearch indexing failed for {item_id}: {e}")

    return {
        "id": item_id,
        "status": "published",
        "note": "Published to library",
        "title": transcript.get("title")
    }


def get_transcript_for_reviewer(item_id: str) -> Optional[Dict]:
    """
    Get full transcript data for reviewer view, including raw text.
    """
    transcript = find_transcript_by_id(item_id)
    if not transcript:
        return None

    # Add rawText from content
    raw_text = transcript.get("content", "")
    transcript["rawText"] = raw_text

    # Parse segments into parsedSegments format if needed
    segments = transcript.get("segments", [])
    if not segments and raw_text:
        parsed = []
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
        transcript["parsedSegments"] = parsed
    else:
        transcript["parsedSegments"] = segments

    return transcript


def update_transcript_sqlite(item_id: str, updates: Dict, meilisearch_index_func=None) -> Optional[Dict]:
    """
    Update transcript metadata/content in SQLite.
    If status changes to 'published', indexes in Meilisearch.
    """
    db = get_sqlite_db()

    transcript = db.execute_one("SELECT * FROM transcripts WHERE id = ?", (item_id,))
    if not transcript:
        return None

    # Build update query - note: 'note' column doesn't exist in transcripts table
    COLUMN_MAP = {
        'title': 'title',
        'content': 'content',
        'domain': 'domain',
        'client_id': 'client_id',
        'status': 'status',
        'tags': 'tags',
        'model_used': 'model_used',
        'segments': 'segments',
        'word_count': 'word_count',
    }
    assignments = []
    params = []

    def _add_assignment(column_key: str, value):
        column = COLUMN_MAP[column_key]
        assignments.append(f"{column} = ?")
        params.append(value)

    for field in ('title', 'content', 'domain', 'client_id', 'status', 'tags', 'model_used'):
        if field in updates:
            value = updates[field]
            if field == 'tags' and isinstance(value, list):
                value = json.dumps(value, ensure_ascii=False)
            _add_assignment(field, value)

    # Handle 'client' as alias for client_id
    if 'client' in updates and 'client_id' not in updates:
        _add_assignment('client_id', updates['client'])

    # Handle segments separately (may come as transcript key from frontend)
    if 'transcript' in updates:
        segments = updates['transcript']
        if isinstance(segments, list):
            segments = json.dumps(segments, ensure_ascii=False)
        _add_assignment('segments', segments)

    if 'content' in updates:
        content_value = updates.get('content') or ''
        _add_assignment('word_count', len(content_value.split()) if content_value else 0)

    literal_assignments = ["updated_at = datetime('now')"]
    if updates.get('status') == 'published':
        literal_assignments.append("published_at = datetime('now')")

    if not assignments and not (len(literal_assignments) > 1):
        return find_transcript_by_id(item_id)

    set_clause = ', '.join(assignments + literal_assignments)
    params.append(item_id)

    with db.connection() as conn:
        conn.execute(f"UPDATE transcripts SET {set_clause} WHERE id = ?", tuple(params))


    # If publishing, index in Meilisearch
    if updates.get("status") == "published" and meilisearch_index_func:
        try:
            meilisearch_index_func(item_id)
        except Exception as e:
            print(f"Meilisearch indexing failed for {item_id}: {e}")

    return find_transcript_by_id(item_id)


def delete_transcript_sqlite(item_id: str, meilisearch_delete_func=None) -> bool:
    """
    Soft delete a transcript (sets status to 'deleted').
    Also removes from Meilisearch if indexed.
    """
    db = get_sqlite_db()

    transcript = db.execute_one("SELECT id FROM transcripts WHERE id = ?", (item_id,))
    if not transcript:
        return False

    with db.connection() as conn:
        conn.execute("""
            UPDATE transcripts
            SET status = 'deleted', updated_at = datetime('now')
            WHERE id = ?
        """, (item_id,))

    # Remove from Meilisearch if function provided
    if meilisearch_delete_func:
        try:
            meilisearch_delete_func(item_id)
        except Exception as e:
            print(f"Meilisearch delete failed for {item_id}: {e}")

    return True


# =============================================================================
# MEILISEARCH INTEGRATION - Phase 4L.2
# Uses direct HTTP requests (no auth required in development mode)
# =============================================================================

import requests

MEILI_URL = os.environ.get("MEILISEARCH_URL", "http://meili:7700")


def _meili_request(method: str, path: str, data=None):
    """Make a direct HTTP request to Meilisearch."""
    url = f"{MEILI_URL}{path}"
    headers = {"Content-Type": "application/json"}
    try:
        if method == "GET":
            return requests.get(url, headers=headers)
        elif method == "POST":
            return requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            return requests.put(url, headers=headers, json=data)
        elif method == "PATCH":
            return requests.patch(url, headers=headers, json=data)
        elif method == "DELETE":
            return requests.delete(url, headers=headers)
    except Exception as e:
        print(f"Meilisearch request error: {e}")
        return None


def ensure_meilisearch_index():
    """Create transcripts index if it does not exist."""
    try:
        r = _meili_request("GET", "/indexes/transcripts")
        if r and r.status_code == 200:
            return True

        # Create index
        r = _meili_request("POST", "/indexes", {"uid": "transcripts", "primaryKey": "id"})
        if r and r.status_code in [200, 202]:
            # Configure settings
            settings = {
                "searchableAttributes": ["title", "content", "client_name", "domain"],
                "filterableAttributes": ["client_id", "domain", "status"],
                "sortableAttributes": ["created_at", "word_count"]
            }
            _meili_request("PATCH", "/indexes/transcripts/settings", settings)
            print("Created Meilisearch 'transcripts' index")
            return True

        return False
    except Exception as e:
        print(f"Meilisearch setup error: {e}")
        return False


def index_transcript_in_meilisearch(item_id: str):
    """Index a single transcript in Meilisearch."""
    db = get_sqlite_db()

    transcript = db.execute_one("""
        SELECT
            t.id,
            t.title,
            t.content,
            t.domain,
            t.client_id,
            t.status,
            t.word_count,
            t.created_at,
            c.name as client_name
        FROM transcripts t
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.id = ? AND t.status = 'published'
    """, (item_id,))

    if not transcript:
        return False

    try:
        r = _meili_request("POST", "/indexes/transcripts/documents", [transcript])
        if r and r.status_code in [200, 202]:
            print(f"Indexed transcript {item_id} in Meilisearch")
            return True
        print(f"Failed to index {item_id}: {r.status_code if r else 'no response'}")
        return False
    except Exception as e:
        print(f"Failed to index {item_id}: {e}")
        return False


def remove_from_meilisearch(item_id: str):
    """Remove a transcript from Meilisearch index."""
    try:
        r = _meili_request("DELETE", f"/indexes/transcripts/documents/{item_id}")
        if r and r.status_code in [200, 202]:
            print(f"Removed transcript {item_id} from Meilisearch")
            return True
        return False
    except Exception as e:
        print(f"Failed to remove {item_id} from Meilisearch: {e}")
        return False




def _escape_meili_filter_value(value: str) -> str:
    """Escape user-provided values used inside single-quoted Meilisearch filter strings."""
    if value is None:
        raise ValueError('filter value is None')
    if not isinstance(value, str):
        value = str(value)
    # Disallow control characters/newlines in filter values
    if any(ord(ch) < 32 for ch in value):
        raise ValueError('filter value contains control characters')
    # Escape backslash and single-quote for Meilisearch filter strings
    return value.replace("\\", "\\\\").replace("'", "\\'")

def search_meilisearch(q: str, client_id: Optional[str] = None, domain: Optional[str] = None, limit: int = 20) -> Dict:
    """Search transcripts using Meilisearch (for published content)."""
    try:
        search_params = {
            "q": q,
            "limit": limit,
            "attributesToRetrieve": ["id", "title", "content", "domain", "client_name", "word_count", "created_at"]
        }

        filters = []
        if client_id:
            filters.append(f"client_id = '{_escape_meili_filter_value(client_id)}'")
        if domain:
            filters.append(f"domain = '{_escape_meili_filter_value(domain)}'")

        if filters:
            search_params["filter"] = " AND ".join(filters)

        r = _meili_request("POST", "/indexes/transcripts/search", search_params)
        if not r or r.status_code != 200:
            raise Exception(f"Search failed: {r.status_code if r else 'no response'}")

        results = r.json()

        formatted = []
        for hit in results.get("hits", []):
            content = hit.get("content", "") or ""
            idx = content.lower().find(q.lower()) if q else -1
            if idx >= 0:
                start = max(0, idx - 100)
                end = min(len(content), idx + len(q) + 100)
                snippet = ("..." if start > 0 else "") + content[start:end] + ("..." if end < len(content) else "")
            else:
                snippet = content[:200] + ("..." if len(content) > 200 else "")

            formatted.append({
                "id": hit["id"],
                "title": hit.get("title"),
                "snippet": snippet,
                "domain": hit.get("domain"),
                "client_name": hit.get("client_name"),
                "word_count": hit.get("word_count"),
                "created_at": hit.get("created_at")
            })

        return {
            "query": q,
            "results": formatted,
            "total": results.get("estimatedTotalHits", len(formatted))
        }

    except Exception as e:
        print(f"Meilisearch search error: {e}")
        return rag_search_sqlite(q, client_id, domain, limit)


def get_rag_context_for_assistant(query: str, limit: int = 5) -> tuple:
    """
    Get relevant transcript context for AI assistant.
    Returns (context_text, sources_list)
    """
    try:
        search_params = {
            "q": query,
            "limit": limit,
            "attributesToRetrieve": ["id", "title", "content"]
        }

        r = _meili_request("POST", "/indexes/transcripts/search", search_params)
        if not r or r.status_code != 200:
            raise Exception(f"Search failed: {r.status_code if r else 'no response'}")

        results = r.json()

        sources = []
        context = ""

        for hit in results.get("hits", []):
            sources.append({"id": hit["id"], "title": hit.get("title", "Untitled")})
            content = hit.get("content", "")[:2000]
            context += f"\n---\n{hit.get('title', 'Document')}:\n{content}\n"

        return context, sources

    except Exception as e:
        print(f"Meilisearch context error: {e}")
        db = get_sqlite_db()
        results = db.execute("""
            SELECT id, title, content
            FROM transcripts
            WHERE status = 'published'
            AND (title LIKE ? OR content LIKE ?)
            LIMIT ?
        """, (f"%{query}%", f"%{query}%", limit))

        sources = []
        context = ""
        for r in results:
            sources.append({"id": r["id"], "title": r.get("title", "Untitled")})
            context += f"\n---\n{r.get('title', 'Document')}:\n{r.get('content', '')[:2000]}\n"

        return context, sources
