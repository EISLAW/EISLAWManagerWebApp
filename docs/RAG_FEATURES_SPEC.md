# RAG Module - Feature Specification

**Last Updated:** 2025-12-07
**Owner:** David (Product) + Joe (CTO)
**Status:** INITIAL AUDIT

This document is the **Feature Bible** for the RAG module - the single source of truth for what exists, what works, and what is broken.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Features** | ~42 |
| **Working** | ~28 |
| **Broken/Partial** | ~6 |
| **Not Implemented** | ~8 |

**Critical Issue:** No SQLite schema for recordings/transcripts. Data stored in JSON files which breaks the system pattern.

---

## 1. Data Storage (CRITICAL GAP)

### Current State (Problematic)

| Data Type | Current Storage | Status |
|-----------|-----------------|--------|
| Recordings metadata | `data/transcripts/recordings_cache.json` | JSON file |
| RAG index | `data/transcripts/index.json` | JSON file (EMPTY!) |
| Transcript files | `RAG_Pilot/transcripts/*.txt` | 32 files exist |
| Zoom recordings | API cache in JSON | Not persisted properly |

### Required State (SQLite)

**Task for Joseph:** Create these tables in `eislaw.db`:

```sql
-- Recordings from Zoom or file uploads
CREATE TABLE recordings (
    id TEXT PRIMARY KEY,
    zoom_id TEXT UNIQUE,
    zoom_meeting_id TEXT,
    topic TEXT,
    date TEXT,
    start_time TEXT,
    duration_minutes INTEGER,
    file_type TEXT,           -- M4A, MP4, etc.
    file_size_mb REAL,
    download_url TEXT,
    azure_blob TEXT,          -- Path in Azure Blob Storage
    local_path TEXT,          -- Path on VM
    status TEXT,              -- in_zoom, downloading, downloaded, transcribing, completed, error
    error TEXT,
    client_id TEXT,           -- FK to clients.id
    created_at TEXT,
    updated_at TEXT,
    downloaded_at TEXT,
    transcribed_at TEXT
);

-- Transcripts (processed recordings)
CREATE TABLE transcripts (
    id TEXT PRIMARY KEY,
    recording_id TEXT,        -- FK to recordings.id
    content TEXT,             -- Full transcript text
    segments TEXT,            -- JSON array of {speaker, start, end, text}
    language TEXT DEFAULT 'he',
    model_used TEXT,          -- gemini-1.5-flash, whisper, etc.
    status TEXT,              -- draft, reviewed, published
    domain TEXT,              -- Client_Work, Personal, Webinar
    client_id TEXT,           -- FK to clients.id
    tags TEXT,                -- JSON array
    file_path TEXT,           -- Path to .txt file
    word_count INTEGER,
    created_at TEXT,
    updated_at TEXT,
    published_at TEXT,
    reviewed_by TEXT
);

-- RAG index entries (for Meilisearch sync)
CREATE TABLE rag_documents (
    id TEXT PRIMARY KEY,
    transcript_id TEXT,       -- FK to transcripts.id
    chunk_index INTEGER,
    chunk_text TEXT,
    meilisearch_id TEXT,
    indexed_at TEXT
);
```

---

## 2. API Endpoints

### RAG Core Endpoints

| Endpoint | Method | Purpose | Status | Notes |
|----------|--------|---------|--------|-------|
| `/api/rag/inbox` | GET | List items in inbox | Works | Returns empty (index.json is []) |
| `/api/rag/ingest` | POST | Upload file for processing | Works | Hash check, file storage |
| `/api/rag/search` | GET | Semantic search | Stub | Returns hardcoded empty results |
| `/api/rag/publish/{id}` | POST | Move to Library | Works | Updates index.json |
| `/api/rag/reviewer/{id}` | GET | Get item for review | Works | Returns transcript + segments |
| `/api/rag/reviewer/{id}` | PATCH | Save reviewed changes | Works | Saves to index.json |
| `/api/rag/file/{id}` | PATCH | Update metadata | Works | Quick edit |
| `/api/rag/file/{id}` | DELETE | Delete file + index | Works | Hard delete |
| `/api/rag/audio/{id}` | GET | Stream audio file | Works | FileResponse |
| `/api/rag/models` | GET | List AI models | Works | Gemini, OpenAI, Anthropic |
| `/api/rag/assistant` | POST | Ask RAG question | Works | Uses Gemini |
| `/api/rag/transcribe_doc` | POST | Transcribe document | Untested | Gemini transcription |

### Zoom Integration Endpoints

| Endpoint | Method | Purpose | Status | Notes |
|----------|--------|---------|--------|-------|
| `/api/zoom/recordings` | GET | List Zoom cloud recordings | Works | Returns 36 recordings |
| `/api/zoom/sync` | POST | Sync from Zoom API | Works | Fetches new recordings |
| `/api/zoom/download/{id}` | POST | Download to Azure | Partial | Some errors in cache |
| `/api/zoom/transcribe/{id}` | POST | Transcribe recording | **MISSING** | Frontend calls it, does not exist! |
| `/api/zoom/skip/{id}` | POST | Skip recording | Works | Marks as skipped |
| `/api/zoom/queue` | GET | Get processing queue | Works | Shows pending items |
| `/api/zoom/transcripts` | GET | List Azure transcripts | Works | Returns empty (none in blob) |
| `/api/zoom/transcripts/{id}` | GET | Get transcript content | Works | Reads from Azure Blob |
| `/api/zoom/transcripts/{id}` | DELETE | Delete transcript | Works | Removes from Azure |
| `/api/zoom/transcripts/{id}/import` | POST | Import to RAG | Works | Moves to index.json |

---

## 3. Frontend Features

### Tab: Ingest (File Upload)

| Feature | ID | Status | Notes |
|---------|-----|--------|-------|
| Drag & drop upload | R-001 | Working | Multiple files supported |
| MD5 hash duplicate check | R-002 | Working | First 1MB hashed |
| Upload progress indicator | R-003 | Working | Shows percentage |
| Bulk metadata apply | R-004 | Working | Date, Domain, Client |
| Bulk delete | R-005 | Working | Selected items |
| Bulk publish | R-006 | Working | Move to Library |
| Inbox list display | R-007 | Empty | index.json is empty |
| Status badges | R-008 | Working | Uploading, Transcribing, Ready |
| Quick edit modal | R-009 | Working | Edit metadata inline |
| Delete single item | R-010 | Working | With confirmation |
| Publish single item | R-011 | Working | Move to Library |

### Tab: Ingest (Zoom Cloud)

| Feature | ID | Status | Notes |
|---------|-----|--------|-------|
| Sync from Zoom button | R-012 | Working | Fetches new recordings |
| Recordings list | R-013 | Working | Shows 36 recordings |
| Filter recordings | R-014 | Working | By topic/date |
| Download recording | R-015 | Partial | Some errors occur |
| Transcribe recording | R-016 | **BROKEN** | Endpoint missing! |
| Skip recording | R-017 | Working | Marks as skipped |
| Processing log | R-018 | Working | Shows step-by-step |
| Client assignment dropdown | R-019 | Working | Uses /api/clients |

### Tab: Ingest (Azure Transcripts)

| Feature | ID | Status | Notes |
|---------|-----|--------|-------|
| Azure transcripts list | R-020 | Empty | No transcripts in blob |
| Preview transcript | R-021 | Working | Modal with content |
| Import to RAG | R-022 | Working | Moves to index.json |
| Download as .txt | R-023 | Working | Browser download |
| Delete from Azure | R-024 | Working | Removes blob |

### Transcript Reviewer (WhatsApp View)

| Feature | ID | Status | Notes |
|---------|-----|--------|-------|
| Chat bubble layout | R-025 | Working | Alternating speakers |
| Audio player | R-026 | Working | HTML5 audio |
| Click-to-play timestamp | R-027 | Working | Seeks to segment time |
| Edit segment text | R-028 | Working | Inline textarea |
| Edit speaker name | R-029 | Working | Inline input |
| Delete segment | R-030 | Working | Remove bubble |
| Global speaker rename | R-031 | Working | Rename all instances |
| Save changes | R-032 | Working | PATCH to reviewer endpoint |
| Publish from reviewer | R-033 | Working | Move to Library |
| Metadata form | R-034 | Working | Date, Domain, Client, Tags |

### Tab: Assistant

| Feature | ID | Status | Notes |
|---------|-----|--------|-------|
| Question input | R-035 | Working | Hebrew RTL |
| Client filter | R-036 | Working | Dropdown |
| Domain filter | R-037 | Working | Dropdown |
| Include personal toggle | R-038 | Working | Checkbox |
| Include drafts toggle | R-039 | Working | Checkbox |
| Ask button | R-040 | Working | Calls /api/rag/assistant |
| Answer display | R-041 | Works but empty | No sources indexed |
| Sources display | R-042 | Empty | No sources indexed |

---

## 4. Known Bugs

| ID | Severity | Description | Root Cause |
|----|----------|-------------|------------|
| RAG-001 | Critical | Transcribe button does nothing | `/api/zoom/transcribe/{id}` endpoint missing |
| RAG-002 | Critical | Inbox shows empty | `index.json` is `[]`, no data migrated |
| RAG-003 | High | Search returns empty | Stub implementation, no actual search |
| RAG-004 | High | 32 pilot transcripts not visible | Files exist but not in index |
| RAG-005 | Medium | Some downloads fail | Azure Blob client errors |
| RAG-006 | Medium | Assistant has no sources | No documents indexed in Meilisearch |

---

## 5. PRD Compliance Check

| PRD Requirement | Implemented | Notes |
|-----------------|-------------|-------|
| Drop & Go upload | Yes | Works well |
| MD5 duplicate check | Yes | First 1MB |
| Background transcription | No | Endpoint missing |
| Gemini 1.5 Flash/Pro | Partial | Models listed, transcription broken |
| Whisper fallback | No | Not implemented |
| Inbox with badges | Yes | But empty |
| WhatsApp chat view | Yes | Well implemented |
| Global speaker rename | Yes | Works |
| Audio timestamp sync | Yes | Works |
| Hard delete | Yes | Works |
| SQLite storage | No | Uses JSON files |
| Meilisearch indexing | No | Not implemented |

---

## 6. Data Inventory

### Existing Recordings (36)

From `/api/zoom/recordings`:
- Date range: 2025-11-04 to 2025-12-05
- Topics: Various client meetings
- Status: All `in_zoom` (not yet downloaded/transcribed)
- Types: M4A (audio) and MP4 (video)

### Existing Transcripts (32)

From `RAG_Pilot/transcripts/`:
- Date range: 2024-12 to 2025-09
- Types: Zoom meetings, webinars, podcasts
- Format: Hebrew text files
- Status: Not indexed, not in UI

---

## 7. Migration Requirements

### Phase 1: Database Schema (Joseph)

1. Create `recordings` table schema
2. Create `transcripts` table schema
3. Create `rag_documents` table schema
4. Update DATA_STORES.md with new schema

### Phase 2: Data Migration (Joseph)

1. Migrate `recordings_cache.json` (32 entries) → `recordings` table
2. Import pilot transcripts (32 files) → `transcripts` table
3. Migrate Zoom cloud recordings (36 entries) → `recordings` table

### Phase 3: Backend Updates (Alex)

1. Create `/api/zoom/transcribe/{id}` endpoint
2. Switch all RAG endpoints from JSON to SQLite
3. Implement actual Meilisearch indexing
4. Fix `/api/rag/search` to use Meilisearch

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2025-12-07 | Initial Feature Spec created from audit | David (Product) |

---

*This document requires CTO approval for changes.*
