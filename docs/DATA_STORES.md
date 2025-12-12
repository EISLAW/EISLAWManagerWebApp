# EISLAW Data Bible

**Last Updated:** 2025-12-08
**Owner:** Joseph (Database) + Joe (CTO)
**Status:** AUTHORITATIVE SOURCE OF TRUTH

This document is the **single source of truth** for all data storage in EISLAW.
AI agents and developers MUST reference this document before accessing any data.

---

## Data Locations Summary

| Data Type | Storage Type | Location | Status |
|-----------|--------------|----------|--------|
| **Clients** | SQLite | `data/eislaw.db` → `clients` | ✅ Active |
| **Airtable Contacts** | SQLite | `data/eislaw.db` → `airtable_contacts` | ✅ Active (table created) |
| **Contacts** | SQLite | `data/eislaw.db` → `contacts` | ✅ Active |
| **Tasks** | JSON | `~/.eislaw/store/tasks.json` | ✅ Active |
| **Task Attachments** | JSON (in task) | `tasks.attachments[]` array | ✅ Active |
| **Quote Templates** | SQLite | `data/eislaw.db` → `quote_templates` | ✅ Active |
| **Agent Approvals** | SQLite | `data/eislaw.db` → `agent_approvals` | ✅ Active |
| **Agent Settings** | SQLite | `data/eislaw.db` → `agent_settings` | ✅ Active |
| **Activity Log** | SQLite | `data/eislaw.db` → `activity_log` | ✅ Active |
| **Sync State** | SQLite | `data/eislaw.db` → `sync_state` | ✅ Active |
| **Emails (index)** | SQLite | `clients/email_index.sqlite` | ✅ Separate DB |
| **Emails (content)** | JSON files | `clients/*/emails/{thread}/{msg}.json` | ✅ Active |
| **Emails (source)** | Microsoft Graph | Outlook mailbox | ✅ External |
| **Documents** | SharePoint | Client folders via Graph API | ✅ External |
| **Recordings (metadata)** | SQLite | `data/eislaw.db` → `recordings` | ✅ Active |
| **Transcripts** | SQLite | `data/eislaw.db` → `transcripts` | ✅ Active |
| **RAG Documents** | SQLite | `data/eislaw.db` → `rag_documents` | ✅ Active |
| **RAG Index** | Meilisearch | Port 7700 | ✅ Active |
| **Recordings (files)** | Files | `recordings/` + SharePoint | ✅ Active |
| **Privacy Submissions** | SQLite | `data/privacy.db` → `privacy_submissions` | ✅ Active |
| **Privacy Reviews** | SQLite | `data/privacy.db` → `privacy_reviews` | ✅ Active |
| **Privacy Activity Log** | SQLite | `data/privacy.db` → `activity_log` | ✅ Active |
| **Privacy Reports** | TBD | See "Report Hosting Options" below | ⏳ CEO Decision Pending |
| **Marketing Leads** | SQLite | `data/marketing.db` → `marketing_leads` | ✅ Active |
| **Marketing Campaigns** | SQLite | `data/marketing.db` → `marketing_campaigns` | ✅ Active |
| **Marketing Form Mapping** | SQLite | `data/marketing.db` → `marketing_form_mapping` | ✅ Active |
| **Lead Scoring Rules** | SQLite | `data/marketing.db` → `lead_scoring_rules` | ✅ Active |
| **Settings** | JSON | `config/*.json` | ✅ Active |
| **Secrets** | JSON | `secrets.local.json` | ✅ Local only |

---

## Database Schema

### Main Database: `eislaw.db`
**Location:** `data/eislaw.db` (Docker: `/app/data/eislaw.db`)
**Tables:** 15 total (privacy moved to separate privacy.db)

#### 1. clients (22 columns)
```sql
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    stage TEXT,
    types TEXT,
    airtable_id TEXT,
    airtable_url TEXT,
    sharepoint_url TEXT,
    local_folder TEXT,
    active INTEGER,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT,
    last_synced_at TEXT,
    sync_source TEXT,
    slug TEXT,
    sharepoint_id TEXT,
    last_activity_at TEXT,
    archived INTEGER DEFAULT 0,
    archived_at TEXT,
    archived_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(archived);
```

#### 2. contacts (12 rows)
```sql
CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    client_id TEXT,          -- FK to clients.id
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
);
```

#### 3. airtable_contacts (Airtable sink)
```sql
CREATE TABLE IF NOT EXISTS airtable_contacts (
    id TEXT PRIMARY KEY,
    airtable_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    types TEXT,
    stage TEXT,
    notes TEXT,
    whatsapp_url TEXT,
    meeting_email_url TEXT,
    airtable_created_at TEXT,
    airtable_modified_at TEXT,
    activated INTEGER DEFAULT 0,
    activated_at TEXT,
    client_id TEXT,
    first_synced_at TEXT DEFAULT (datetime('now')),
    last_synced_at TEXT DEFAULT (datetime('now')),
    sync_hash TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_airtable_contacts_airtable_id ON airtable_contacts(airtable_id);
CREATE INDEX IF NOT EXISTS idx_airtable_contacts_name ON airtable_contacts(name);
CREATE INDEX IF NOT EXISTS idx_airtable_contacts_activated ON airtable_contacts(activated);
CREATE INDEX IF NOT EXISTS idx_airtable_contacts_client ON airtable_contacts(client_id);
```

#### 4. tasks - ⚠️ NOT IN SQLITE!
**Note:** Tasks are stored in JSON file, NOT in SQLite.

See [Tasks Storage](#tasks-storage-json) section below.

#### 5. quote_templates (3 rows)
```sql
CREATE TABLE quote_templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    content TEXT,            -- Template content
    variables TEXT,          -- JSON array of variable names
    created_at TEXT,
    updated_at TEXT,
    created_by TEXT,
    version INTEGER
);
```

#### 6. agent_approvals (2 rows)
```sql
CREATE TABLE agent_approvals (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    tool_id TEXT,
    action_name TEXT,
    action_name_he TEXT,     -- Hebrew display name
    description TEXT,
    context TEXT,
    parameters TEXT,         -- JSON
    risk_level TEXT,         -- 'low', 'medium', 'high'
    status TEXT,             -- 'pending', 'approved', 'rejected'
    created_at TEXT,
    expires_at TEXT,
    resolved_at TEXT,
    resolved_by TEXT,
    reject_reason TEXT,
    execution_result TEXT
);
```

#### 7. agent_settings
```sql
CREATE TABLE agent_settings (
    agent_id TEXT PRIMARY KEY,
    enabled INTEGER,
    auto_trigger INTEGER,
    approval_required INTEGER,
    max_actions_per_hour INTEGER,
    allowed_tools TEXT,      -- JSON array
    blocked_tools TEXT,      -- JSON array
    custom_prompt TEXT,
    settings_json TEXT,
    updated_at TEXT,
    updated_by TEXT
);
```

#### 8. activity_log (3 rows)
```sql
CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    event_type TEXT,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,            -- JSON
    duration_ms INTEGER,
    success INTEGER,
    user_id TEXT
);
```

#### 9. sync_state
```sql
CREATE TABLE sync_state (
    id TEXT PRIMARY KEY,
    source TEXT,             -- 'airtable', 'graph', etc.
    entity_type TEXT,
    last_sync_at TEXT,
    last_sync_cursor TEXT,
    status TEXT,
    error_message TEXT,
    records_synced INTEGER
);
```

#### 10. recordings (32 rows)
Stores Zoom cloud recordings and uploaded audio files.
- Primary source: Zoom API sync + manual uploads
- Status flow: in_zoom → downloading → downloaded → transcribing → completed
- **Migration:** JSON-based storage (recordings_cache.json) deprecated in RAG-FIX-001. All endpoints now use SQLite.

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

#### 11. transcripts (32 rows)
Stores transcript text and metadata.
- Primary source: Gemini/Whisper transcription + manual imports
- Status flow: draft → reviewed → published

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

#### 12. rag_documents (0 rows)
Stores chunked text for Meilisearch indexing.
- Created when transcript is published
- Links to Meilisearch document IDs

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

### Privacy Database: `privacy.db`
**Location:** `data/privacy.db` (Docker: `/app/data/privacy.db`)
**Tables:** 3 total (privacy_submissions, privacy_reviews, activity_log)

> **Note:** Privacy data is stored in a SEPARATE database from eislaw.db.
> This allows independent backup/restore of privacy questionnaire data.

#### privacy_submissions (21 rows as of 2025-12-07)
Stores privacy assessment questionnaire submissions from Fillout webhook.
- Primary source: Fillout webhook (`/api/privacy/webhook`)
- Contains contact info + all answers + calculated scores (embedded)

```sql
CREATE TABLE IF NOT EXISTS privacy_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE,        -- Fillout submission ID (UUID)
    form_id TEXT,                     -- Fillout form ID (t9nJNoMdBgus)
    submitted_at TEXT,                -- ISO timestamp from Fillout
    received_at TEXT,                 -- When webhook received it

    -- Contact Info
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    business_name TEXT,

    -- All Answers (stored as JSON)
    answers_json TEXT,                -- Full form answers as JSON object

    -- Calculated Scores (embedded, not separate table)
    score_level TEXT,                 -- lone, basic, mid, high
    score_color TEXT,                 -- yellow, orange, red
    score_dpo INTEGER,                -- 0/1 - DPO required
    score_reg INTEGER,                -- 0/1 - Registration required
    score_report INTEGER,             -- 0/1 - Annual report required
    score_requirements TEXT,          -- JSON array of requirement strings
    score_confidence REAL,            -- Optional confidence score

    -- Review Workflow
    review_status TEXT DEFAULT 'pending',  -- pending, approved, rejected
    reviewed_at TEXT,
    override_level TEXT,              -- Manual override of calculated level
    override_reason TEXT
);
```

#### activity_log
Tracks webhook events and system activities for monitoring.

```sql
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL,         -- webhook_received, webhook_duplicate, webhook_error
    submission_id TEXT,
    details TEXT,                     -- JSON with event details
    duration_ms INTEGER,
    success BOOLEAN
);
```

---

## Report Hosting Options (CEO Decision Pending)

**Context:** After privacy scoring, we need to deliver reports to clients. Three options under consideration:

### Option 1: WordPress Dynamic Page

| Aspect | Value |
|--------|-------|
| **Storage** | None - rendered on demand |
| **URL** | `https://eislaw.co.il/privacy-report/?token=abc123` |
| **Data source** | `privacy_submissions` table via API |
| **Implementation** | WordPress plugin + API endpoint |

### Option 2: Email-Only (No External Link)

| Aspect | Value |
|--------|-------|
| **Storage** | None - full report sent in email body |
| **URL** | N/A |
| **Data source** | Generated from `privacy_submissions` at send time |
| **Implementation** | Expand email template with full report HTML |

### Option 3: Azure Blob Storage

| Aspect | Value |
|--------|-------|
| **Storage** | Azure Blob container `reports` |
| **URL** | `https://eislawstorage.blob.core.windows.net/reports/{token}.html` |
| **Optional** | Custom domain: `reports.eislaw.co.il/{token}` |
| **Lifecycle** | Auto-delete after 30/60/90 days (configurable) |
| **Data source** | HTML/PDF file generated from `privacy_submissions` |

### Storage Cost Estimate (Azure Blob)

| Volume | Storage | Access | Monthly Cost |
|--------|---------|--------|--------------|
| 100 reports/month | ~50 MB | 500 reads | ~$0.01 |
| 1,000 reports/month | ~500 MB | 5,000 reads | ~$0.10 |
| 10,000 reports/month | ~5 GB | 50,000 reads | ~$1.00 |

**Decision pending from CEO.** See `PRIVACY_FEATURES_SPEC.md` → "Report Delivery Options" for full comparison.

---

## Tasks Storage (JSON)

**Location:** `~/.eislaw/store/tasks.json` (Docker: `/home/azureuser/.eislaw/store/tasks.json`)
**Type:** JSON array of task objects

### Task Object Schema
```json
{
  "id": "uuid",
  "title": "משימה לדוגמה",
  "desc": "תיאור המשימה",
  "status": "new|in_progress|done",
  "priority": "low|medium|high",
  "dueAt": "2025-12-10T00:00:00Z",
  "clientName": "שם הלקוח",
  "clientFolderPath": "/path/to/folder",
  "ownerId": "user-id",
  "parentId": "parent-task-id",
  "source": "manual|email|subtask|agent",
  "comments": [],
  "attachments": [],
  "templateRef": "template-id",
  "createdAt": "2025-12-05T16:15:49Z",
  "updatedAt": "2025-12-05T16:15:49Z",
  "doneAt": null,
  "deletedAt": null
}
```

### Task Attachments (נכסים משויכים)

The `attachments` array holds all assets linked to a task. Each asset has a `kind` field:

#### Email Attachment
```json
{
  "kind": "email",
  "id": "AAMkAGI...",              // Microsoft Graph message ID
  "subject": "הסכם שירותים",
  "from": "client@example.com",
  "received": "2025-12-05T10:30:00Z",
  "has_attachments": true,
  "attachments_count": 2,
  "client_name": "לקוח דוגמה",
  "task_title": "משימה מאימייל",
  "attached_at": "2025-12-06T14:20:00Z"
}
```
**Note:** Only metadata is stored. Actual email content stays in Outlook/Graph API.

#### Link Attachment
```json
{
  "kind": "link",
  "web_url": "https://example.com/document",
  "user_title": "מסמך חשוב"
}
```

#### Folder Attachment
```json
{
  "kind": "folder",
  "local_path": "C:\\Users\\...\\ClientFolder"
}
```

#### File Attachment (⚠️ NOT YET IMPLEMENTED)
```json
{
  "kind": "file",
  "drive_id": "sharepoint-item-id",
  "source_name": "contract.pdf",
  "user_title": "הסכם שירות"
}
```
**Status:** Frontend button exists, backend endpoint missing. Files should be uploaded to SharePoint.

### API Endpoints for Tasks

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tasks` | GET | List all tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/{id}` | PATCH | Update task |
| `/api/tasks/{id}` | DELETE | Delete task |
| `/api/tasks/{id}/done` | POST | Mark task done |
| `/tasks/{id}/files` | GET | Get task attachments |
| `/tasks/{id}/emails/attach` | POST | Attach email to task |

---

### 2. Email Database: `email_index.sqlite`
**Location:** `clients/email_index.sqlite`
**Purpose:** Fast email search (FTS5) without hitting Graph API
**Created by:** `tools/email_catalog.py`
**Justification:** Separate DB warranted - different data lifecycle, 24MB, FTS5 specialized

```sql
-- Messages index
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT,
    client TEXT,
    client_path TEXT,
    received TEXT,
    subject TEXT,
    from_addr TEXT,
    to_addrs TEXT,
    cc_addrs TEXT,
    json_path TEXT,   -- Path to full JSON content
    eml_path TEXT
);

-- Full-text search
CREATE VIRTUAL TABLE messages_fts USING fts5(
    id, subject, body
);
```

---

## External Services

| Service | Purpose | Access Method | Auth | Status |
|---------|---------|---------------|------|--------|
| **Microsoft Graph** | Emails, Calendar, SharePoint | REST API | OAuth app token | ✅ Active |
| **Meilisearch** | RAG semantic search | HTTP :7700 | API key | ✅ Active |
| **Airtable** | Contact list source (batch sync) | REST API | API key | 🔄 In Progress (SQLite sink ready) |

### Airtable Integration - NEW ARCHITECTURE (2025-12-07)

> **IMPORTANT:** Architecture changed per CEO decision. See `ARCHITECTURE_DECISIONS.md` → AD-001.

**Previous Design:** Airtable = Source of Truth (bidirectional real-time sync)
**New Design:** SQLite = Source of Truth (bidirectional batch sync)

#### Architecture Overview

```
┌─────────────────┐                      ┌─────────────────┐
│    AIRTABLE     │ ←───── Batch ──────→ │     SQLITE      │
│ (Contact List)  │        Sync          │ (Source of Truth)│
└─────────────────┘                      └─────────────────┘
```

#### Two Data Sets in UI

| Tab | Table | Description |
|-----|-------|-------------|
| **רשימת קשר** | `airtable_contacts` | All contacts from Airtable (potential clients) |
| **לקוחות** | `clients` | Active clients with folders, tasks, emails |

#### Sync Endpoints (TO BUILD)

| Endpoint | Direction | Purpose |
|----------|-----------|---------|
| `POST /api/sync/pull-airtable` | Airtable → SQLite | Pull all contacts from Airtable |
| `POST /api/sync/push-airtable` | SQLite → Airtable | Push local changes (contacts, links) |
| `POST /api/contacts/activate` | Internal | Move contact to active clients |
| `GET /api/airtable-contacts` | Read | List all synced contacts |

#### Activation Flow

1. User sees contact in "רשימת קשר" tab
2. Clicks "פתח תיקייה" (Open Folder)
3. Contact copied to `clients` table with folder setup
4. Now appears in "לקוחות" tab with full functionality

#### Conflict Resolution

**SQLite wins.** If same field edited in both places, SQLite value overwrites Airtable on next push.

**Base:** EISLAW CRM
**Tables:** לקוחות (Clients), אנשי קשר (Contacts)

---

## Airtable Schema (Complete Field Reference)

**Purpose:** This section provides the authoritative Airtable field mapping for:
- **Joseph:** JSON → SQLite migration (field name mapping)
- **Alex:** Building `/airtable/*` endpoints (API integration)
- **AI Agents:** Understanding authoritative field names and types

**Reference:** Full schema in `docs/Airtable_Schema.md`

### Base Configuration

| Parameter | Value |
|-----------|-------|
| **Base ID** | `appv3nlRQTtsk97Y5` |
| **Base Name** | EISLAW CRM |

**Secrets Location:** `secrets.local.json` → `airtable` object

```json
{
  "airtable": {
    "token": "...",
    "base_id": "appv3nlRQTtsk97Y5",
    "clients_table": "לקוחות",
    "contacts_table": "אנשי קשר",
    "view_clients": "viw34b0ytkGoQd1n3",
    "view_contacts": "viwDZcPYwOkY2bm1g"
  }
}
```

---

### Table 1: Clients (`tbloKUYGtEEdM76Nm` / `לקוחות`)

**View ID:** `viw34b0ytkGoQd1n3` (Clients – Default)

#### Complete Field Mapping

| Airtable Field (Hebrew) | Field ID | Type | SQLite Column | Sync Direction | Notes |
|-------------------------|----------|------|---------------|----------------|-------|
| `לקוחות` | `fldA0Y2J3RDVj7tXK` | singleLineText | `name` | ↔️ Bidirectional | Primary display name |
| `מספר טלפון` | `fldMIJHcN2l5ejhR7` | phoneNumber | `phone` | ↔️ Bidirectional | Primary phone |
| `אימייל` | `fldP7dNeIQjMPuAHc` | email | `email` | ↔️ Bidirectional | Array in API, use `[0]` |
| `סוג לקוח` | `fldFJ6OyN2iAJmORr` | multipleSelects | `types` | ↔️ Bidirectional | JSON array of tags |
| `בטיפול` | `fldEKRIZpCerjVGn0` | singleSelect | `stage` | ↔️ Bidirectional | Current status |
| `הערות` | `fldTylMnpZOJWALOA` | multilineText | `notes` | ↔️ Bidirectional | Internal notes |
| `ווצאפ` | `fldtjYZSWJhPIRlio` | button | - | → Read Only | Object: `{label, url}` |
| `מייל תיאום פגישה` | `fld96QoxyYGzIwZQJ` | button | - | → Read Only | Mailto link |
| `Calculation` | `fldUnoPV82lWZkAX2` | formula | - | → Read Only | Fillout intake link |
| `fillout formula` | `fldgfiFtvXqEptjp0` | formula | - | → Read Only | Prefilled URL |
| `תיקים ופרוייקטים 2` | `fldzoqZgLzznBMeKd` | multipleRecordLinks | - | → Read Only | Project links |
| `אנשי קשר נוספים` | `fldk5RInnAcMQhZYi` | multipleRecordLinks | - | ↔️ Via contacts table | Array of contact record IDs |
| `אנשי קשר נוספים 2` | `fldVGJIrjpnnxsGNM` | multipleRecordLinks | - | ↔️ Via contacts table | Array of contact record IDs |
| `כספים` | `fldZDaB3ZrCj5uWIJ` | multipleRecordLinks | - | → Read Only | Finance references |
| `תשלומים` | `fldgiKG8RppPZZCHJ` | singleLineText | - | → Read Only | Payment notes |
| `Created` | `fldBBrJ4mIDyf3xCZ` | createdTime | `created_at` | → Read Only | System metadata |
| `Last Modified` | `fldbZVWx5QOm4Rtej` | lastModifiedTime | `updated_at` | → Read Only | System metadata |

#### Field Normalization Rules

When reading from Airtable API, normalize field names as follows:

| Normalized Key | Airtable Field(s) | Transform Rule |
|----------------|-------------------|----------------|
| `name` | `לקוחות`, `Name`, `Client` | Use first non-empty value |
| `email` | `אימייל` | Extract `[0]` from array |
| `phone` | `מספר טלפון` | Use as-is |
| `types` | `סוג לקוח` | JSON array of strings |
| `stage` | `בטיפול` | Single select value |
| `notes` | `הערות`, `נתונים משפטי` | Concatenate if multiple |
| `whatsapp_url` | `ווצאפ.url` | Extract `url` from button object |
| `meeting_email_url` | `מייל תיאום פגישה.url` | Extract `url` from button object |
| `airtable_id` | - | Use Airtable record ID (e.g., `rec0CKdM2lTytvxHY`) |

#### SQLite → Airtable Field Mapping

| SQLite Column | Airtable Field | API Type | Validation |
|---------------|----------------|----------|------------|
| `id` | - | - | Generated locally (UUID) |
| `name` | `לקוחות` | string | Required |
| `email` | `אימייל` | array\[string\] | Email format |
| `phone` | `מספר טלפון` | string | Phone format |
| `stage` | `בטיפול` | string | Single select |
| `types` | `סוג לקוח` | array\[string\] | Multiple select |
| `notes` | `הערות` | string | Long text |
| `airtable_id` | record ID | string | Read-only (e.g., `recXXXX`) |
| `airtable_url` | - | string | Construct from base + record ID |
| `sharepoint_url` | - | string | Local only, not in Airtable |
| `local_folder` | - | string | Local only, not in Airtable |
| `active` | - | integer | Local only (filter flag) |
| `created_at` | `Created` | datetime | ISO 8601 |
| `updated_at` | `Last Modified` | datetime | ISO 8601 |
| `last_synced_at` | - | datetime | Local only (sync tracking) |
| `sync_source` | - | string | Local only (`'airtable'` or `'manual'`) |

---

### Table 2: Contacts (`tblWVZn9VjoGjdWrX` / `אנשי קשר`)

**View ID:** `viwDZcPYwOkY2bm1g` (Contacts – Default)

#### Complete Field Mapping

| Airtable Field (Hebrew) | Field ID | Type | SQLite Column | Sync Direction | Notes |
|-------------------------|----------|------|---------------|----------------|-------|
| `שם איש קשר` | `fldZu8x9X6LRcsw2y` | singleLineText | `name` | ↔️ Bidirectional | Contact name |
| `מייל` | `fldp7jqCjLtgxzehD` | email | `email` | ↔️ Bidirectional | Contact email |
| `טלפון` | `fldl7uEqAbz36c3FL` | phoneNumber | `phone` | ↔️ Bidirectional | Contact phone |
| `לקוח` | `fldqjVZWpQjavy0Lm` | multipleRecordLinks | `client_id` | ↔️ Bidirectional | Linked client (use `[0]`) |
| `מספר זיהוי` | `fld0kF1wQ9tn2RnOq` | singleLineText | - | ↔️ Bidirectional | ID number (optional) |
| `כתובת` | `fld0Gf8H8qT0xmwzN` | multilineText | - | ↔️ Bidirectional | Address (optional) |

#### SQLite → Airtable Field Mapping (Contacts)

| SQLite Column | Airtable Field | API Type | Validation |
|---------------|----------------|----------|------------|
| `id` | - | - | Generated locally (UUID) |
| `client_id` | `לקוח` | array\[string\] | FK to clients.id, maps to Airtable record ID |
| `name` | `שם איש קשר` | string | Required |
| `email` | `מייל` | string | Email format |
| `phone` | `טלפון` | string | Phone format |
| `role` | - | string | Local only (not in Airtable yet) |
| `notes` | `כתובת` | string | Mapped to address field |
| `created_at` | - | datetime | Local only |
| `updated_at` | - | datetime | Local only |

**Note:** The `is_primary` flag exists in SQLite but NOT in Airtable. This is a local-only field for UI purposes.

---

### Sync Direction Rules

| Symbol | Meaning | Implementation |
|--------|---------|----------------|
| ↔️ | **Bidirectional** | Changes in either system sync to the other |
| → | **Read Only** | Only sync FROM Airtable TO SQLite |
| ← | **Write Only** | Only sync FROM SQLite TO Airtable |

#### Sync Behavior

1. **Airtable → SQLite (Import/Pull)**
   - Triggered by: User clicks "Sync from Airtable" OR `/airtable/search` endpoint
   - Fields synced: All bidirectional + read-only fields
   - Conflict resolution: Airtable wins (overwrites local)

2. **SQLite → Airtable (Export/Push)**
   - Triggered by: User saves client in AddClientModal OR `/airtable/clients_upsert` endpoint
   - Fields synced: Only bidirectional fields (excludes read-only formulas/buttons)
   - Conflict resolution: Last-write wins (use `Last Modified` timestamp)

3. **Local-Only Fields (Never Sync)**
   - `sharepoint_url`, `local_folder`, `active`, `last_synced_at`, `sync_source`
   - These exist only in SQLite for local app functionality

#### Contact Linking

Airtable uses **linked records** for contacts. The flow is:

1. **Reading Contacts:**
   ```
   Client record → fields['אנשי קשר נוספים'] = ['recAAA', 'recBBB']
   For each ID → GET /v0/{base_id}/אנשי קשר/{record_id}
   Extract: {name, email, phone} → Store in SQLite contacts table
   ```

2. **Creating Contacts:**
   ```
   Local: Create contact in SQLite with client_id
   Airtable: POST /v0/{base_id}/אנשי קשר with fields={'לקוח': [client_airtable_id]}
   Update: Add returned record ID to client's 'אנשי קשר נוספים' field
   ```

---

### Data Integrity Rules

1. **Airtable is Source of Truth**
   - For client master data (name, email, phone, stage)
   - In case of conflict, Airtable data wins

2. **SQLite is Source of Truth**
   - For local-only fields (folders, sync state)
   - For AI agent access (agents can't call Airtable directly)

3. **Mandatory Fields (Both Systems)**
   - Client: `name` (required in both)
   - Contact: `name`, `client_id` (required in both)

4. **Email Field Special Case**
   - Airtable stores as array: `["email@example.com"]`
   - SQLite stores as string: `"email@example.com"`
   - Transform: Use `email[0]` when reading, `[email]` when writing

5. **Sync State Tracking**
   - `last_synced_at`: Timestamp of last successful sync
   - `sync_source`: `'airtable'` (imported) or `'manual'` (created locally)
   - Use to determine if client needs push/pull

---

### API Endpoints (Airtable Integration)

**Implemented:**
- None (all missing)

**Required (P1 - Blocking):**

| Endpoint | Method | Purpose | Uses Airtable API |
|----------|--------|---------|-------------------|
| `/airtable/search` | GET | Smart search Airtable for clients | Yes - List records with filter |
| `/registry/clients` | POST | Save client to local SQLite | No - Local only |
| `/airtable/clients_upsert` | POST | Push client changes to Airtable | Yes - PATCH record |

**See:** `API_ENDPOINTS_INVENTORY.md` for full endpoint specs

---

### Migration Status - ✅ COMPLETE (2025-12-06)

**Completed by:** Joseph (Database Developer)
**Date:** 2025-12-06
**Verified by:** Joe (CTO) - Skeptical Review passed

#### What Was Done

| Task | Status |
|------|--------|
| Switch `load_local_clients()` to use SQLite | ✅ Done |
| Switch `find_local_client()` to use SQLite | ✅ Done |
| Add `slug` & `sharepoint_id` columns | ✅ Done |
| Verify all JSON clients exist in SQLite | ✅ Done (13 clients) |
| Contacts properly joined from SQLite | ✅ Done (12 contacts) |

#### Current State

| Component | Status |
|-----------|--------|
| **Backend reads from** | ✅ SQLite (`data/eislaw.db → clients`) |
| **JSON file** | ⚠️ DEPRECATED (`~/.eislaw/store/clients.json`) |
| **Contacts** | ✅ Joined from `contacts` table |
| **Airtable** | Remote sync source (endpoints TBD) |

#### Verification Results

```
API Test: GET /api/clients
- Clients returned: 12 (1 "ZZZ Test" filtered)
- Contacts embedded: 10
- Source: SQLite ✅
```

#### Field Mapping Reference

| SQLite Column | Airtable Field | Notes |
|---------------|----------------|-------|
| `id` | - | Local UUID |
| `name` | `לקוחות` | Primary field |
| `email` | `אימייל[0]` | Extract from array |
| `phone` | `מספר טלפון` | Direct mapping |
| `stage` | `בטיפול` | Single select |
| `types` | `סוג לקוח` | JSON array |
| `notes` | `הערות` | Long text |
| `airtable_id` | record ID | e.g., `rec0CKdM...` |

**See:** `TASK_JOSEPH_CLIENT_REGISTRY_MIGRATION.md` for full migration details

---

## Data Flow Diagrams

### Email Flow
```
Outlook Mailbox
      │
      ▼ (Graph API sync)
JSON Files (clients/*/emails/*.json)
      │
      ▼ (email_catalog.py)
email_index.sqlite (search index)
      │
      ▼ (API endpoints)
Frontend / AI Agents
```

### Client Data Flow

#### Full Client Sync Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                         AIRTABLE                                │
│                    (Source of Truth)                            │
│      Base: EISLAW CRM → Table: לקוחות (Clients)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (1) /airtable/search - Smart search
                              │    (❌ Backend Missing)
┌─────────────────────────────────────────────────────────────────┐
│                   AddClientModal (Frontend)                     │
│    - User searches for client name                              │
│    - Shows matches from Airtable                                │
│    - User can import or create new                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (2) /registry/clients POST - Save
                              │    (❌ Backend Missing)
┌─────────────────────────────────────────────────────────────────┐
│                      eislaw.db → clients                        │
│                     (Local SQLite Copy)                         │
│    - id, name, email, phone, stage, types                       │
│    - airtable_id, airtable_url (link back to source)            │
│    - sharepoint_url, local_folder (document locations)          │
│    - sync_source = 'airtable' | 'manual'                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (3) /airtable/clients_upsert - Sync back
                              │    (❌ Backend Missing)
┌─────────────────────────────────────────────────────────────────┐
│                         AIRTABLE                                │
│              (Changes synced back to Airtable)                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Data Sources for AddClientModal
| Source | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| Airtable search | `/airtable/search` | Find existing clients | ❌ Missing |
| Local DB | `/api/clients` | List local clients | ✅ |
| Client summary | `/api/client/summary` | Get folder/SP links | ✅ |
| Save client | `/registry/clients` | Save to local DB | ❌ Missing |
| Sync to Airtable | `/airtable/clients_upsert` | Push to Airtable | ❌ Missing |

#### Airtable Integration Status: ⚠️ PARTIALLY IMPLEMENTED
- **Frontend:** Fully coded (AddClientModal has all fetch calls)
- **Backend:** Missing endpoints (see API_ENDPOINTS_INVENTORY.md)
- **Result:** Smart search and sync features silently fail

#### Legacy Note
Airtable was the original CRM. Local SQLite copy was added for:
- Offline access
- Faster queries
- AI Agent access (agents can't call Airtable directly)

The sync flow should be bidirectional but backend endpoints are missing.

---

## Data Storage Policy

### When to use Main DB (`eislaw.db`)
- Core business entities (clients, tasks, agents)
- Data that needs joins with other tables
- Transactional data
- User-created records

### When to use Separate DB
- Specialized search (FTS5, vector search)
- Large datasets with different lifecycle
- External sync targets (email index)
- Clear isolation benefit

### When to use Files
- Raw content from external sources (email JSON)
- Configuration
- Secrets (never in DB)

### When to use External Services
- Source of truth lives elsewhere (Outlook, SharePoint)
- Specialized capabilities (Meilisearch semantic search)

---

## API Endpoints (Actual)

### Clients & Tasks
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/clients` | GET | List all clients |
| `/api/clients/{id}` | GET | Get client details |
| `/api/client/summary` | GET | Client overview |
| `/api/tasks` | GET | List all tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/{id}` | PATCH | Update task |
| `/api/tasks/{id}` | DELETE | Delete task |
| `/api/tasks/{id}/done` | POST | Mark task done |

### Emails
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/email/by_client?name=X` | GET | Get emails for client (Graph API) |
| `/email/content?id=X` | GET | Get full email HTML |
| `/email/open` | POST | Generate Outlook deeplink |
| `/email/sync_client` | POST | Sync emails for client |

### Quote Templates
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/quote-templates` | GET | List templates |
| `/api/quote-templates` | POST | Create template |
| `/api/quote-templates/{id}` | GET | Get template |
| `/api/quote-templates/{id}` | PUT | Update template |

### Agents
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agents` | GET | List agents |
| `/api/agents/approvals` | GET | Pending approvals |
| `/api/agents/approvals/{id}` | POST | Approve/reject |

**Rule:** Agents use APIs, never direct DB access.

---

## Maintenance

| Task | Frequency | Owner |
|------|-----------|-------|
| Backup `eislaw.db` | Daily | Automated |
| Rebuild email index | On demand | `python tools/email_catalog.py` |
| Verify data integrity | Weekly | Joseph |
| Update this document | On any data change | CTO approval required |

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2025-12-06 | Created Data Bible | Joe (CTO) |
| 2025-12-06 | **Major Update:** Added 8 missing tables (contacts, quote_templates, agent_*, activity_log, sync_state). Fixed API endpoints. Added actual schema from production DB. | Joe (CTO) |
| 2025-12-06 | **CORRECTION:** Tasks are stored in JSON file (`~/.eislaw/store/tasks.json`), NOT SQLite. Added full Task Attachments documentation (email, link, folder, file types). Documented attachment APIs. | Joe (CTO) |
| 2025-12-06 | **AIRTABLE SCHEMA ADDED:** Complete field reference for Clients and Contacts tables. Includes: Base/Table IDs, field mappings (Airtable ↔ SQLite), sync direction rules, normalization rules, data integrity rules, contact linking flow, and migration notes for Joseph. | David (Product) |
| 2025-12-06 | **MIGRATION COMPLETE:** JSON → SQLite migration done by Joseph. Backend now reads from SQLite. Updated Migration Notes section to reflect completed status. Verified by CTO skeptical review. | Joseph (Database) + Joe (CTO) |
| 2025-12-07 | **RAG SCHEMA ADDED:** Added 3 new tables for RAG module (recordings, transcripts, rag_documents). Migrated 32 recordings from `recordings_cache.json` and 32 transcripts from `RAG_Pilot/transcripts/*.txt` to SQLite. Total database tables: 11 → 14. | Joseph (Database) |
| 2025-12-07 | **PRIVACY DATABASE CONSOLIDATED:** Privacy data now stored in separate `privacy.db` (not eislaw.db). Single `privacy_submissions` table with embedded scores (no separate privacy_reviews). Webhook writes to privacy.db, API reads from privacy.db. Fixed database mismatch bug during stress testing. eislaw.db tables: 16 → 14. | Joe (CTO) |

---

*This document requires CTO approval for changes.*
