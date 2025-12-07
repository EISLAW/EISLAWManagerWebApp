# EISLAW Data Bible

**Last Updated:** 2025-12-06
**Owner:** Joseph (Database) + Joe (CTO)
**Status:** AUTHORITATIVE SOURCE OF TRUTH

This document is the **single source of truth** for all data storage in EISLAW.
AI agents and developers MUST reference this document before accessing any data.

---

## Data Locations Summary

| Data Type | Storage Type | Location | Status |
|-----------|--------------|----------|--------|
| **Clients** | SQLite | `data/eislaw.db` → `clients` | ✅ Active |
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
| **RAG Index** | Meilisearch | Port 7700 | ✅ Active |
| **Recordings** | Files | `recordings/` + SharePoint | ✅ Active |
| **Settings** | JSON | `config/*.json` | ✅ Active |
| **Secrets** | JSON | `secrets.local.json` | ✅ Local only |

---

## Database Schema

### Main Database: `eislaw.db`
**Location:** `data/eislaw.db` (Docker: `/app/data/eislaw.db`)
**Tables:** 11 total

#### 1. clients (13 rows)
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
    sync_source TEXT
);
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

#### 3. tasks - ⚠️ NOT IN SQLITE!
**Note:** Tasks are stored in JSON file, NOT in SQLite.

See [Tasks Storage](#tasks-storage-json) section below.

#### 4. quote_templates (3 rows)
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

#### 5. agent_approvals (2 rows)
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

#### 6. agent_settings
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

#### 7. activity_log (3 rows)
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

#### 8. sync_state
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
| **Airtable** | Client CRM (source of truth) | REST API | API key | ⚠️ Backend Missing |

### Airtable Details
- **Base:** EISLAW CRM
- **Table:** לקוחות (Clients)
- **Role:** Source of truth for client data
- **Problem:** Frontend expects these endpoints but they don't exist:
  - `/airtable/search` - Search Airtable for clients
  - `/airtable/clients_upsert` - Sync client back to Airtable
  - `/registry/clients` - Save client to local DB
- **See:** `CLIENTS_FEATURES_SPEC.md` → AddClientModal section

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

---

*This document requires CTO approval for changes.*
