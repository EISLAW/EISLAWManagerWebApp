# TASK: RAG Backend Phase 4L.2 - Complete SQLite Migration

**Assigned To:** Alex (Backend Senior)
**Created:** 2025-12-07
**Priority:** P2 - Medium (critical bugs already fixed in 4L)
**Status:** ✅ COMPLETE
**Depends On:** Phase 4L (complete)

---

## Objective

Complete the SQLite migration for remaining RAG endpoints and implement Meilisearch indexing for AI Assistant sources.

---

## Context

Phase 4L fixed the **critical bugs** (RAG-001, RAG-002). This follow-up task addresses:
- 6 remaining endpoints still using JSON
- Meilisearch indexing for real search results
- RAG-006 (Assistant no sources)

---

## Checklist

### Phase 1: Remaining Endpoint Migration (6 endpoints)

- [x] **1.1** Update `/api/rag/ingest` - Write to `recordings` + `transcripts` tables
- [x] **1.2** Update `/api/rag/publish/{id}` - Update `transcripts.status` to 'published'
- [x] **1.3** Update `/api/rag/reviewer/{id}` GET - Read from `transcripts`
- [x] **1.4** Update `/api/rag/reviewer/{id}` PATCH - Write to `transcripts`
- [x] **1.5** Update `/api/rag/file/{id}` PATCH - Update `transcripts` metadata
- [x] **1.6** Update `/api/rag/file/{id}` DELETE - Delete from tables (soft delete preferred)

### Phase 2: Remove JSON Dependencies

- [x] **2.1** Remove `index.json` reads/writes from all endpoints
- [x] **2.2** Remove `recordings_cache.json` reads/writes
- [x] **2.3** Archive JSON files (don't delete yet - backup)
- [x] **2.4** Update any helper functions in `rag_helpers.py`

### Phase 3: Meilisearch Integration (Bug RAG-006)

- [x] **3.1** Create Meilisearch index `transcripts` with proper schema
- [x] **3.2** On `/api/rag/publish/{id}` - Index transcript in Meilisearch
- [x] **3.3** On `/api/rag/file/{id}` DELETE - Remove from Meilisearch
- [x] **3.4** Update `/api/rag/search` to use Meilisearch instead of SQLite LIKE
- [x] **3.5** Update `/api/rag/assistant` to include sources from Meilisearch

### Phase 4: Verification

- [x] **4.1** Test all 10 RAG endpoints work end-to-end
- [x] **4.2** Test publish flow: draft → reviewed → published
- [x] **4.3** Test search returns results for published transcripts
- [x] **4.4** Test AI Assistant includes document sources
- [x] **4.5** Verify no JSON file dependencies remain

---

## Implementation Details

### 1.2 Update /api/rag/publish/{id}

```python
@app.post("/api/rag/publish/{id}")
def rag_publish(id: str):
    """Publish a transcript - changes status and indexes in Meilisearch."""
    db = get_sqlite_db()

    # Update status
    db.execute("""
        UPDATE transcripts
        SET status = 'published', updated_at = datetime('now')
        WHERE id = ?
    """, (id,))

    # Index in Meilisearch
    index_transcript_in_meilisearch(id)

    return {"status": "published", "id": id}
```

### 3.1 Meilisearch Index Schema

```python
MEILISEARCH_TRANSCRIPTS_SCHEMA = {
    "primaryKey": "id",
    "searchableAttributes": ["title", "content", "client_name", "domain"],
    "filterableAttributes": ["client_id", "domain", "status"],
    "sortableAttributes": ["created_at", "word_count"]
}
```

### 3.5 Update /api/rag/assistant

```python
@app.post("/api/rag/assistant")
async def rag_assistant(request: AssistantRequest):
    """Chat with AI using RAG sources."""
    # Search Meilisearch for relevant documents
    meili = meilisearch.Client(MEILI_URL, MEILI_KEY)
    index = meili.index("transcripts")

    results = index.search(request.query, {
        "limit": 5,
        "attributesToRetrieve": ["id", "title", "content"]
    })

    # Build context from sources
    sources = []
    context = ""
    for hit in results["hits"]:
        sources.append({"id": hit["id"], "title": hit["title"]})
        context += f"\n---\n{hit['title']}:\n{hit['content'][:2000]}\n"

    # Call LLM with context
    response = await call_llm_with_context(request.query, context)

    return {
        "response": response,
        "sources": sources  # Now includes actual document sources!
    }
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/main.py` | Update 6 RAG endpoints |
| `backend/rag_sqlite.py` | Add publish, reviewer, file functions |
| `backend/rag_helpers.py` | Remove JSON functions |

---

## Testing Commands

```bash
# Test publish flow
curl -X POST http://localhost:8799/api/rag/publish/TRANSCRIPT_ID

# Test search after publish
curl "http://localhost:8799/api/rag/search?q=הסכם"

# Test assistant with sources
curl -X POST http://localhost:8799/api/rag/assistant \
  -H "Content-Type: application/json" \
  -d '{"query": "מה נאמר על הסכמי שכירות?"}'

# Verify Meilisearch index
curl http://localhost:7700/indexes/transcripts/stats
```

---

## Bug Being Fixed

| Bug ID | Description | Fixed By |
|--------|-------------|----------|
| RAG-006 | Assistant returns no sources | Phase 3 |

---

## Success Criteria

1. All 10 RAG endpoints use SQLite (no JSON)
2. Published transcripts appear in search results
3. AI Assistant includes source documents in responses
4. No regression in inbox or recordings display

---

## Completion Report

```
Completed: 2025-12-07
Completed By: Alex

Results:
- Endpoints migrated: 7/7 (6 remaining + rag_audio)
- JSON dependencies removed: YES
- Meilisearch indexing: IMPLEMENTED
- RAG-006 fixed: YES

Files Modified:
- backend/rag_sqlite.py - Added 15+ new SQLite functions
- backend/main.py - Updated all RAG endpoints to use SQLite

Key Changes:
1. Created SQLite helper functions: find_transcript_by_id, ingest_transcript_sqlite,
   publish_transcript_sqlite, get_transcript_for_reviewer, update_transcript_sqlite,
   delete_transcript_sqlite
2. Implemented Meilisearch integration using direct HTTP requests (no auth needed in dev mode)
3. Fixed schema mismatch: removed references to 'note' column (doesn't exist in transcripts)
4. Added _meili_request helper for Meilisearch API calls
5. Updated get_rag_context_for_assistant to search Meilisearch and return sources

Test Results:
- /api/rag/inbox: 32 transcripts from SQLite ✅
- /api/rag/search?q=open: 1 published result ✅
- /api/rag/reviewer/{id}: Returns transcript with rawText ✅
- /api/zoom/recordings: 32 recordings from SQLite ✅
- /api/rag/assistant: Returns sources from Meilisearch ✅
```

---

*Task created by Joe (CTO) on 2025-12-07*
*Follows: TASK_ALEX_RAG_BACKEND_SQLITE.md (Phase 4L)*
