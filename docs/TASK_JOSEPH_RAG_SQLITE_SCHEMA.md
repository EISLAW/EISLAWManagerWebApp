# TASK: RAG SQLite Schema & Data Migration

**Assigned To:** Joseph (Database Developer)
**Created:** 2025-12-07
**Priority:** P1 - Critical
**Status:** NOT STARTED

---

## Objective

Create SQLite tables for the RAG module and migrate existing data from JSON files. This is blocking the entire RAG tab functionality.

---

## Context

The RAG module currently stores data in JSON files:
- `data/transcripts/recordings_cache.json` - 32 Zoom recordings
- `data/transcripts/index.json` - Empty `[]` (should have transcript entries)
- `RAG_Pilot/transcripts/*.txt` - 32 transcript text files

This breaks the system pattern where all data should be in SQLite. The RAG tab shows empty because `index.json` is empty.

**Reference Documents:**
- `docs/RAG_FEATURES_SPEC.md` - Full feature audit
- `docs/DATA_STORES.md` - Data Bible (needs update after this task)
- `docs/INSIGHTS_RAG_PRD.md` - Original PRD

---

## Checklist

### Phase 1: Schema Creation

- [ ] **1.1** Add `recordings` table to `eislaw.db`
- [ ] **1.2** Add `transcripts` table to `eislaw.db`
- [ ] **1.3** Add `rag_documents` table to `eislaw.db`
- [ ] **1.4** Verify tables created with correct schema
- [ ] **1.5** Update `docs/DATA_STORES.md` with new schema

### Phase 2: Data Migration

- [ ] **2.1** Migrate `recordings_cache.json` (32 entries) → `recordings` table
- [ ] **2.2** Import Zoom cloud recordings (36 entries from API) → `recordings` table
- [ ] **2.3** Import pilot transcripts (32 .txt files) → `transcripts` table
- [ ] **2.4** Verify row counts match expected

### Phase 3: Verification

- [ ] **3.1** Query `recordings` table - should return 68 rows (32 + 36)
- [ ] **3.2** Query `transcripts` table - should return 32 rows
- [ ] **3.3** Test foreign key relationships
- [ ] **3.4** Backup database after migration

---

## Schema Definitions

### Table: `recordings`

```sql
CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    zoom_id TEXT UNIQUE,
    zoom_meeting_id TEXT,
    topic TEXT NOT NULL,
    date TEXT,
    start_time TEXT,
    duration_minutes INTEGER,
    file_type TEXT,           -- M4A, MP4, WAV, etc.
    file_size_mb REAL,
    download_url TEXT,
    azure_blob TEXT,          -- Path in Azure Blob Storage
    local_path TEXT,          -- Path on VM filesystem
    status TEXT DEFAULT 'pending',  -- in_zoom, downloading, downloaded, transcribing, completed, error, skipped
    error TEXT,
    client_id TEXT,           -- FK to clients.id (nullable)
    domain TEXT,              -- Client_Work, Personal, Webinar
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    downloaded_at TEXT,
    transcribed_at TEXT,
    synced_at TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_recordings_zoom_id ON recordings(zoom_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_date ON recordings(date);
CREATE INDEX IF NOT EXISTS idx_recordings_client ON recordings(client_id);
```

### Table: `transcripts`

```sql
CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    recording_id TEXT,        -- FK to recordings.id (nullable for manual uploads)
    title TEXT,               -- Display name
    content TEXT,             -- Full transcript text
    segments TEXT,            -- JSON array: [{speaker, start, end, text}, ...]
    language TEXT DEFAULT 'he',
    model_used TEXT,          -- gemini-1.5-flash, gemini-1.5-pro, whisper, manual
    status TEXT DEFAULT 'draft',  -- draft, reviewed, published
    domain TEXT,              -- Client_Work, Personal, Webinar
    client_id TEXT,           -- FK to clients.id (nullable)
    tags TEXT,                -- JSON array of tag strings
    file_path TEXT,           -- Path to source .txt file
    audio_path TEXT,          -- Path to source audio file
    word_count INTEGER,
    duration_seconds INTEGER,
    hash TEXT,                -- MD5 hash of first 1MB (for dedup)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT,
    reviewed_by TEXT,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_recording ON transcripts(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_client ON transcripts(client_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_hash ON transcripts(hash);
```

### Table: `rag_documents`

```sql
CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY,
    transcript_id TEXT NOT NULL,  -- FK to transcripts.id
    chunk_index INTEGER,          -- Order within transcript
    chunk_text TEXT NOT NULL,     -- Text chunk for embedding
    meilisearch_id TEXT,          -- ID in Meilisearch index
    embedding_model TEXT,         -- Model used for embedding
    indexed_at TEXT,
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rag_docs_transcript ON rag_documents(transcript_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_meili ON rag_documents(meilisearch_id);
```

---

## Migration Scripts

### 2.1 Migrate recordings_cache.json

Location: `~/EISLAWManagerWebApp/data/transcripts/recordings_cache.json`

```python
import json
import sqlite3
import uuid
from pathlib import Path

# Load JSON
cache_path = Path("/app/data/transcripts/recordings_cache.json")
data = json.loads(cache_path.read_text())

# Connect to DB
conn = sqlite3.connect("/app/data/eislaw.db")
cursor = conn.cursor()

# Insert each recording
for zoom_id, rec in data.items():
    cursor.execute("""
        INSERT OR IGNORE INTO recordings
        (id, zoom_id, topic, date, duration_minutes, file_type, status, download_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (
        str(uuid.uuid4()),
        rec.get("zoom_id"),
        rec.get("topic"),
        rec.get("date"),
        rec.get("duration"),
        rec.get("file_type"),
        rec.get("status", "pending"),
        rec.get("download_url")
    ))

conn.commit()
print(f"Migrated {len(data)} recordings from cache")
```

### 2.2 Import Zoom Cloud Recordings

Fetch from `/api/zoom/recordings` and insert those not already in DB.

### 2.3 Import Pilot Transcripts

Location: `~/EISLAWManagerWebApp/RAG_Pilot/transcripts/*.txt`

```python
import sqlite3
import uuid
from pathlib import Path
import re

transcripts_dir = Path("/home/azureuser/EISLAWManagerWebApp/RAG_Pilot/transcripts")
conn = sqlite3.connect("/app/data/eislaw.db")
cursor = conn.cursor()

for txt_file in transcripts_dir.glob("*.txt"):
    content = txt_file.read_text(encoding="utf-8")

    # Parse filename: "תמלול - אישי - זום_שם - DD.MM.YY HH-MM.txt"
    filename = txt_file.stem

    # Extract date from filename (pattern: DD.MM.YY)
    date_match = re.search(r"(\d{2})\.(\d{2})\.(\d{2})", filename)
    if date_match:
        day, month, year = date_match.groups()
        date = f"20{year}-{month}-{day}"
    else:
        date = None

    # Extract name/topic
    topic = filename.replace("תמלול - אישי - ", "").strip()

    cursor.execute("""
        INSERT INTO transcripts
        (id, title, content, language, status, domain, file_path, word_count, created_at)
        VALUES (?, ?, ?, 'he', 'draft', 'Personal', ?, ?, datetime('now'))
    """, (
        str(uuid.uuid4()),
        topic,
        content,
        str(txt_file),
        len(content.split())
    ))

conn.commit()
print(f"Imported {len(list(transcripts_dir.glob('*.txt')))} transcripts")
```

---

## Verification Queries

After migration, run these to verify:

```sql
-- Check recordings count
SELECT COUNT(*) as total, status, file_type
FROM recordings
GROUP BY status, file_type;

-- Check transcripts count
SELECT COUNT(*) as total, status, domain
FROM transcripts
GROUP BY status, domain;

-- Check for orphaned transcripts (no recording)
SELECT COUNT(*) FROM transcripts WHERE recording_id IS NOT NULL
AND recording_id NOT IN (SELECT id FROM recordings);

-- Sample recordings
SELECT id, zoom_id, topic, date, status FROM recordings LIMIT 5;

-- Sample transcripts
SELECT id, title, status, word_count FROM transcripts LIMIT 5;
```

---

## Post-Migration: Update DATA_STORES.md

Add this section to DATA_STORES.md after completing migration:

```markdown
#### recordings (X rows)
Stores Zoom cloud recordings and uploaded audio files.
- Primary source: Zoom API sync + manual uploads
- Status flow: in_zoom → downloading → downloaded → transcribing → completed

#### transcripts (X rows)
Stores transcript text and metadata.
- Primary source: Gemini/Whisper transcription + manual imports
- Status flow: draft → reviewed → published

#### rag_documents (X rows)
Stores chunked text for Meilisearch indexing.
- Created when transcript is published
- Links to Meilisearch document IDs
```

---

## Completion Report

When done, update this section:

```
Completed: [DATE]
Completed By: Joseph

Results:
- recordings table: X rows
- transcripts table: X rows
- rag_documents table: X rows

Backup created: [BACKUP_FILENAME]

Notes:
[Any issues or observations]
```

---

## Questions for CTO

Before starting, confirm:

1. Should `rag_documents` be populated now, or wait for Meilisearch integration?
2. Should we keep the JSON files as backup after migration?
3. Any additional fields needed for future features?

---

*Task created by Joe (CTO) on 2025-12-07*
