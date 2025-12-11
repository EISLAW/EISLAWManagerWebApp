# PRD: SQLite Database Migration

**Document Version:** 1.0
**Created:** 2025-12-05
**Author:** EISLAW Dev Agent
**Status:** APPROVED FOR PLANNING

---

## 1. Executive Summary

### Problem Statement
The EISLAW system currently stores critical data in fragmented JSON files (`clients.json`, `tasks.json`) which causes:
- No indexing (slow searches as data grows)
- No transactions (corruption risk)
- No relationships (can't link tasks to clients efficiently)
- No queries (must load entire file into memory)
- External dependency on Airtable (rate limits, cost, availability)

### Solution
Migrate all local data storage to SQLite with:
- Unified database architecture
- Automated backups
- Proper schema validation
- Path to eliminate Airtable dependency

### Success Metrics

| Metric | Current (JSON) | Target (SQLite) |
|--------|----------------|-----------------|
| Client list load time | ~500ms | <100ms |
| Search across clients | N/A (full scan) | <50ms |
| Data corruption incidents | Risk exists | 0 |
| Backup frequency | Manual/None | Every 6 hours |
| Recovery time objective | Hours/Unknown | <10 minutes |
| Airtable dependency | Required | Optional |

---

## 2. Architecture

### 2.1 Target State

```
┌─────────────────────────────────────────────────────────────┐
│                    EISLAW DATA ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🗄️ SQLite Database (~/.eislaw/store/eislaw.db)             │
│     ├── clients           ← Primary client storage          │
│     ├── contacts          ← Client contacts                 │
│     ├── tasks             ← Task management                 │
│     ├── privacy_submissions ← Already implemented           │
│     ├── activity_log      ← Audit trail                     │
│     └── sync_state        ← Track external sync status      │
│                                                              │
│  🔍 Meilisearch (Search Layer)                              │
│     ├── clients_index     ← Synced from SQLite              │
│     ├── tasks_index       ← Synced from SQLite              │
│     ├── emails_index      ← Synced from Graph cache         │
│     └── documents_index   ← Synced from Blob metadata       │
│                                                              │
│  ☁️ Azure Blob Storage (Files)                               │
│     ├── transcripts/      ← Audio transcriptions            │
│     ├── documents/        ← Uploaded documents              │
│     └── backups/          ← Database backups                │
│                                                              │
│  🔄 External APIs (Sync Targets, Not Dependencies)          │
│     ├── Airtable          ← Optional CRM sync               │
│     ├── Microsoft Graph   ← Email/Calendar (read-only)      │
│     └── Zoom              ← Recordings (read-only)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Database Schema

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ═══════════════════════════════════════════════════════════
-- CLIENTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE clients (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,

    -- Classification
    stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'active', 'pending', 'completed', 'archived')),
    types TEXT DEFAULT '[]',  -- JSON array: ["retainer", "litigation", "privacy"]

    -- External links
    airtable_id TEXT,
    airtable_url TEXT,
    sharepoint_url TEXT,
    local_folder TEXT,

    -- Status
    active INTEGER DEFAULT 1,  -- Boolean: 1=active, 0=archived

    -- Metadata
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Sync tracking
    last_synced_at TEXT,
    sync_source TEXT  -- 'local', 'airtable', 'import'
);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_active ON clients(active);
CREATE INDEX idx_clients_stage ON clients(stage);

-- ═══════════════════════════════════════════════════════════
-- CONTACTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE contacts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,  -- 'primary', 'billing', 'technical', etc.

    -- Metadata
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_contacts_email ON contacts(email);

-- ═══════════════════════════════════════════════════════════
-- TASKS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE TABLE tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,

    title TEXT NOT NULL,
    description TEXT,

    -- Status
    done INTEGER DEFAULT 0,  -- Boolean
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'cancelled')),

    -- Priority & Scheduling
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT,  -- ISO date

    -- Assignment
    assigned_to TEXT,

    -- Source tracking
    source_type TEXT,  -- 'email', 'manual', 'recurring'
    source_id TEXT,    -- email_id if created from email

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_done ON tasks(done);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- ═══════════════════════════════════════════════════════════
-- SYNC STATE TABLE (for external API sync tracking)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE sync_state (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,  -- 'airtable', 'graph', 'zoom'
    entity_type TEXT NOT NULL,  -- 'clients', 'emails', 'recordings'
    last_sync_at TEXT,
    last_sync_cursor TEXT,  -- For pagination/delta sync
    status TEXT DEFAULT 'idle',  -- 'idle', 'syncing', 'error'
    error_message TEXT,
    records_synced INTEGER DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════
-- ACTIVITY LOG (already exists in privacy_db, unify here)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    event_type TEXT NOT NULL,
    entity_type TEXT,  -- 'client', 'task', 'privacy', 'sync'
    entity_id TEXT,
    details TEXT,  -- JSON
    duration_ms INTEGER,
    success INTEGER DEFAULT 1,
    user_id TEXT
);

CREATE INDEX idx_activity_timestamp ON activity_log(timestamp);
CREATE INDEX idx_activity_type ON activity_log(event_type);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
```

### 2.3 Unified Database Module

**File:** `backend/db.py`

```python
"""
Unified Database Module for EISLAW
Provides consistent interface for all database operations.
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

# Database path
DB_PATH = Path.home() / ".eislaw" / "store" / "eislaw.db"
BACKUP_DIR = Path.home() / ".eislaw" / "backups"

class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def connection(self):
        conn = sqlite3.connect(str(self.db_path), timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_db(self):
        """Initialize database schema"""
        # Execute schema SQL here
        pass

# Namespace classes for organized access
class ClientsDB:
    def __init__(self, db: Database):
        self.db = db

    def get(self, id: str) -> Optional[Dict]:
        pass

    def get_by_name(self, name: str) -> Optional[Dict]:
        pass

    def list(self, active_only: bool = True, limit: int = 100) -> List[Dict]:
        pass

    def save(self, data: Dict) -> str:
        pass

    def archive(self, id: str) -> bool:
        pass

    def restore(self, id: str) -> bool:
        pass

class TasksDB:
    def __init__(self, db: Database):
        self.db = db

    def get(self, id: str) -> Optional[Dict]:
        pass

    def list(self, client_id: Optional[str] = None, done: Optional[bool] = None) -> List[Dict]:
        pass

    def save(self, data: Dict) -> str:
        pass

    def complete(self, id: str) -> bool:
        pass

    def delete(self, id: str) -> bool:
        pass

class ContactsDB:
    def __init__(self, db: Database):
        self.db = db

    def get(self, id: str) -> Optional[Dict]:
        pass

    def list_for_client(self, client_id: str) -> List[Dict]:
        pass

    def save(self, data: Dict) -> str:
        pass

    def delete(self, id: str) -> bool:
        pass

# Global instance
_db = Database()
clients = ClientsDB(_db)
tasks = TasksDB(_db)
contacts = ContactsDB(_db)

# Convenience functions
def backup(destination: Optional[Path] = None) -> Path:
    """Create database backup"""
    pass

def restore(backup_path: Path) -> bool:
    """Restore from backup"""
    pass

def log_activity(event_type: str, entity_type: str = None,
                 entity_id: str = None, details: Dict = None) -> None:
    """Log activity for audit trail"""
    pass
```

---

## 3. Implementation Phases

### Phase 0: Validate Existing (1 day)
**Goal:** Learn from privacy_db before expanding

| Task | Description | Done |
|------|-------------|------|
| Audit privacy_db.py | Check file size, growth rate, any issues | ☐ |
| Review activity_log | Look for errors or patterns | ☐ |
| Test backup/restore | Verify privacy.db can be backed up and restored | ☐ |
| Document learnings | Write findings for reference | ☐ |

**Exit Criteria:** No critical issues found in existing SQLite implementation

---

### Phase 1: Foundation (3 days)
**Goal:** Create unified database infrastructure

| Task | Description | Done |
|------|-------------|------|
| Create db.py module | Unified database interface | ☐ |
| Implement schema | All tables with constraints | ☐ |
| Add WAL mode | Better concurrency | ☐ |
| Add backup automation | Azure Blob upload every 6h | ☐ |
| Add backup restore | Script to restore from backup | ☐ |
| Integration tests | Test all CRUD operations | ☐ |

**Files to Create:**
- `backend/db.py` - Main database module
- `backend/db_backup.py` - Backup/restore utilities
- `backend/tests/test_db.py` - Unit tests
- `tools/backup_db.py` - CLI backup tool

**Exit Criteria:**
- All tests pass
- Backup runs successfully to Azure Blob
- Restore verified working

---

### Phase 2: Clients Migration (1 week)
**Goal:** Migrate clients from JSON to SQLite

| Task | Description | Done |
|------|-------------|------|
| Create migration script | Read JSON, write SQLite | ☐ |
| Add feature flag | `USE_SQLITE_CLIENTS=true` | ☐ |
| Update GET /api/clients | Read from SQLite | ☐ |
| Update POST /registry/clients | Write to SQLite | ☐ |
| Update PATCH archive/restore | Use SQLite | ☐ |
| Migrate contacts | Part of client data | ☐ |
| Keep JSON backup | Don't delete for 2 weeks | ☐ |
| Integration tests | Full API tests | ☐ |
| Validate data integrity | Compare JSON vs SQLite | ☐ |

**Migration Script:** `tools/migrate_clients_to_sqlite.py`

```python
def migrate_clients():
    # 1. Load existing JSON
    json_path = Path.home() / ".eislaw" / "store" / "clients.json"
    clients = json.loads(json_path.read_text())

    # 2. Insert into SQLite
    for client in clients:
        db.clients.save(client)

        # Migrate contacts if present
        for contact in client.get("contacts", []):
            contact["client_id"] = client["id"]
            db.contacts.save(contact)

    # 3. Validate
    json_count = len(clients)
    sqlite_count = len(db.clients.list(active_only=False))
    assert json_count == sqlite_count

    # 4. Rename JSON as backup
    json_path.rename(json_path.with_suffix(".json.backup"))

    return {"migrated": json_count}
```

**Rollback Procedure:**
1. Set `USE_SQLITE_CLIENTS=false`
2. Rename `.json.backup` back to `.json`
3. Restart API

**Exit Criteria:**
- All clients accessible via API
- No data loss (compare counts)
- JSON backup preserved

---

### Phase 3: Tasks Migration (3 days)
**Goal:** Migrate tasks from JSON to SQLite

| Task | Description | Done |
|------|-------------|------|
| Create migration script | Read tasks.json, write SQLite | ☐ |
| Add feature flag | `USE_SQLITE_TASKS=true` | ☐ |
| Update GET /api/tasks | Read from SQLite | ☐ |
| Update POST /api/tasks | Write to SQLite | ☐ |
| Update PATCH /api/tasks/{id} | Use SQLite | ☐ |
| **Add POST /api/tasks/batch** | Batch create tasks (AI efficiency) | ☐ |
| Link tasks to clients | Use client_id foreign key | ☐ |
| Keep JSON backup | Don't delete for 2 weeks | ☐ |
| Integration tests | Full API tests | ☐ |

**Exit Criteria:**
- All tasks accessible via API
- Tasks properly linked to clients
- Due date filtering works
- Batch task creation works (for AI agent efficiency)

---

### Phase 4: Airtable Import (1 week)
**Goal:** Import Airtable data, make Airtable optional

| Task | Description | Done |
|------|-------------|------|
| Create Airtable export script | Download all clients/contacts | ☐ |
| Merge with existing SQLite | Handle duplicates by name | ☐ |
| Import Airtable-only fields | Any extra fields we need | ☐ |
| Create sync_state tracking | Know what's synced | ☐ |
| Optional: bidirectional sync | Push changes back to Airtable | ☐ |
| Remove Airtable as dependency | API works without Airtable | ☐ |
| Update health check | Don't fail if Airtable down | ☐ |

**Exit Criteria:**
- All Airtable data in SQLite
- API works when Airtable is unavailable
- Optional sync to Airtable for CRM users

---

### Phase 5: Meilisearch Integration (3 days)
**Goal:** Unified search across all data

| Task | Description | Done |
|------|-------------|------|
| Create sync job | SQLite → Meilisearch | ☐ |
| Index clients | With all searchable fields | ☐ |
| Index tasks | With client name denormalized | ☐ |
| Create unified search endpoint | GET /api/search?q= | ☐ |
| Add sync trigger | On save, queue index update | ☐ |

**Exit Criteria:**
- Single search finds clients, tasks, and documents
- Search updates within 5 seconds of data change

---

## 4. API Changes

### 4.1 New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/db/stats | Database statistics |
| POST | /api/db/backup | Trigger manual backup |
| GET | /api/db/backups | List available backups |
| POST | /api/db/restore | Restore from backup |
| GET | /api/search | Unified search |

### 4.2 Modified Endpoints

| Endpoint | Change |
|----------|--------|
| GET /api/clients | Now reads from SQLite |
| POST /registry/clients | Now writes to SQLite |
| GET /api/tasks | Now reads from SQLite |
| POST /api/tasks | Now writes to SQLite |
| GET /health | No longer requires Airtable |

### 4.3 Deprecated Endpoints

| Endpoint | Replacement | Removal Date |
|----------|-------------|--------------|
| GET /airtable/clients | GET /api/clients | 2025-02-01 |
| POST /airtable/sync | Automatic sync | 2025-02-01 |

### 4.4 API Response Contracts

> **Purpose:** Exact field names for AI tools to parse responses and construct requests.

#### GET /api/clients

```json
{
  "clients": [
    {
      "id": "abc123",
      "name": "Client Name",
      "email": "email@example.com",
      "phone": "054-xxx-xxxx",
      "stage": "active",
      "types": ["retainer", "litigation"],
      "active": true,
      "airtable_id": "recXXX",
      "sharepoint_url": "https://...",
      "contacts": [
        {"id": "cnt1", "name": "Contact Name", "email": "contact@example.com", "phone": "052-xxx", "role": "primary"}
      ],
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150
}
```

#### GET /api/clients/{id}

```json
{
  "id": "abc123",
  "name": "Client Name",
  "email": "email@example.com",
  "phone": "054-xxx-xxxx",
  "stage": "active",
  "types": ["retainer", "litigation"],
  "active": true,
  "airtable_id": "recXXX",
  "sharepoint_url": "https://...",
  "local_folder": "C:/Clients/client-name",
  "notes": "Important client notes",
  "contacts": [
    {"id": "cnt1", "name": "Contact Name", "email": "contact@example.com", "phone": "052-xxx", "role": "primary"}
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

#### GET /api/tasks

```json
{
  "tasks": [
    {
      "id": "task123",
      "client_id": "abc123",
      "client_name": "Client Name",
      "title": "Task title",
      "description": "Task description",
      "done": false,
      "status": "todo",
      "priority": "high",
      "due_date": "2025-12-10",
      "assigned_to": "user@example.com",
      "source_type": "email",
      "source_id": "email456",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-02T09:00:00Z",
      "completed_at": null
    }
  ],
  "total": 423
}
```

#### GET /api/tasks?client_id={id}

Same response format as GET /api/tasks, filtered by client.

#### POST /api/tasks (Create Task)

**Request:**
```json
{
  "title": "Task title",
  "client_id": "abc123",
  "client_name": "Client Name",
  "description": "Optional description",
  "due_date": "2025-12-10",
  "priority": "high",
  "assigned_to": "user@example.com"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| title | Yes | Task title |
| client_id | No | Link to client by ID |
| client_name | No | Fallback - lookup client by name if no ID |
| description | No | Task details |
| due_date | No | ISO date format |
| priority | No | low/medium/high/urgent (default: medium) |
| assigned_to | No | User email or name |

**Response:**
```json
{
  "id": "task456",
  "success": true
}
```

#### POST /api/tasks/batch (Batch Create)

**Request:**
```json
{
  "tasks": [
    {"title": "Task 1", "client_id": "abc123", "priority": "high"},
    {"title": "Task 2", "client_id": "abc123", "due_date": "2025-12-15"},
    {"title": "Task 3", "client_id": "abc123"}
  ]
}
```

**Response:**
```json
{
  "created": 3,
  "ids": ["task1", "task2", "task3"],
  "success": true
}
```

> **Use Case:** AI agent says "Create 3 tasks for this client" - batch is more efficient than 3 separate calls.

#### PATCH /api/tasks/{id}

**Request:**
```json
{
  "done": true,
  "status": "done",
  "completed_at": "2025-12-05T14:30:00Z"
}
```

Any field can be updated. Only include fields to change.

**Response:**
```json
{
  "id": "task123",
  "success": true
}
```

#### GET /api/search (Phase 5 - Unified Search)

**Parameters:**
| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| q | Yes | - | Search query |
| types | No | all | Comma-separated: clients,tasks,emails,documents |
| limit | No | 10 | Max results per type |
| client_id | No | - | Filter to specific client |

**Request:**
```
GET /api/search?q=Sivan&types=clients,tasks&limit=5
```

**Response:**
```json
{
  "query": "Sivan",
  "results": {
    "clients": [
      {
        "id": "abc123",
        "name": "Sivan Binyamini",
        "email": "sivan@example.com",
        "type": "client",
        "score": 0.95,
        "highlight": "<em>Sivan</em> Binyamini"
      }
    ],
    "tasks": [
      {
        "id": "task789",
        "title": "Call Sivan about contract",
        "client_name": "Sivan Binyamini",
        "type": "task",
        "score": 0.82,
        "highlight": "Call <em>Sivan</em> about contract"
      }
    ],
    "emails": [],
    "documents": []
  },
  "total": 2,
  "took_ms": 45
}
```

> **Note:** This endpoint available in Phase 5 when `UNIFIED_SEARCH=true`

---

## 5. Backup Strategy

### 5.1 Automated Backups

| Frequency | Destination | Retention |
|-----------|-------------|-----------|
| Every 6 hours | Azure Blob | 7 days |
| Daily | Azure Blob | 30 days |
| Weekly | Azure Blob | 90 days |

### 5.2 Backup Format

```
backups/
├── hourly/
│   ├── eislaw_2025-12-05_06-00.db
│   ├── eislaw_2025-12-05_12-00.db
│   └── ...
├── daily/
│   ├── eislaw_2025-12-05.db
│   └── ...
└── weekly/
    ├── eislaw_2025-W49.db
    └── ...
```

### 5.3 Restore Procedure

```bash
# List available backups
python tools/backup_db.py list

# Restore from specific backup
python tools/backup_db.py restore --from hourly/eislaw_2025-12-05_12-00.db

# Verify restore
python tools/backup_db.py verify
```

---

## 6. Monitoring & Alerts

### 6.1 Metrics to Track

| Metric | Alert Threshold |
|--------|-----------------|
| Database file size | > 500MB |
| Query time (p95) | > 500ms |
| Backup age | > 12 hours |
| Error rate | > 1% |
| Connection failures | > 0 |

### 6.2 Health Check

```python
@app.get("/health")
def health():
    return {
        "status": "ok",
        "database": {
            "connected": True,
            "size_mb": 12.5,
            "last_backup": "2025-12-05T12:00:00Z",
            "tables": {
                "clients": 150,
                "tasks": 423,
                "contacts": 312
            }
        },
        "external": {
            "airtable": "optional",  # No longer required
            "graph": "connected",
            "meilisearch": "connected"
        }
    }
```

---

## 7. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Feature flags, JSON backup, validation |
| SQLite corruption | Very Low | High | WAL mode, hourly backups, integrity checks |
| Performance regression | Low | Medium | Indexes, query optimization, benchmarks |
| API downtime | Low | Medium | Hot-reload, feature flags, rollback plan |
| Airtable data mismatch | Medium | Low | One-time sync validation, manual review |

---

## 8. Testing Strategy

### 8.1 Unit Tests

```python
# backend/tests/test_db.py
def test_client_crud():
    # Create
    client_id = db.clients.save({"name": "Test Client"})
    assert client_id is not None

    # Read
    client = db.clients.get(client_id)
    assert client["name"] == "Test Client"

    # Update
    db.clients.save({"id": client_id, "name": "Updated Name"})
    assert db.clients.get(client_id)["name"] == "Updated Name"

    # Delete (archive)
    db.clients.archive(client_id)
    assert db.clients.get(client_id)["active"] == 0
```

### 8.2 Integration Tests

```python
# tests/test_clients_api.spec.cjs
test('GET /api/clients returns SQLite data', async () => {
    const response = await fetch('/api/clients');
    const data = await response.json();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('name');
});
```

### 8.3 Migration Validation

```python
# tools/validate_migration.py
def validate():
    json_clients = load_json("clients.json.backup")
    sqlite_clients = db.clients.list(active_only=False)

    # Count match
    assert len(json_clients) == len(sqlite_clients)

    # Data match
    for jc in json_clients:
        sc = db.clients.get_by_name(jc["name"])
        assert sc is not None
        assert sc["email"] == jc.get("email")
```

---

## 9. Timeline

```
Week 1 (Dec 9-13)
├── Phase 0: Validate existing (1 day)
└── Phase 1: Foundation (3 days)

Week 2 (Dec 16-20)
└── Phase 2: Clients migration (5 days)

Week 3 (Dec 23-27)
├── Phase 3: Tasks migration (3 days)
└── Buffer for issues (2 days)

Week 4 (Dec 30 - Jan 3)
└── Phase 4: Airtable import (5 days)

Week 5 (Jan 6-10)
├── Phase 5: Meilisearch integration (3 days)
└── Final testing & documentation (2 days)

Week 6+ (Future - Optional)
└── Phase 6: Marketing module merge (when ready)
```

---

## 10. Success Criteria

### Must Have (P0)
- [ ] All clients accessible via SQLite
- [ ] All tasks accessible via SQLite
- [ ] Automated backups running
- [ ] Zero data loss during migration
- [ ] API response time < 100ms for list operations

### Should Have (P1)
- [ ] Airtable becomes optional (not required for API)
- [ ] Unified search across clients/tasks
- [ ] Activity logging for all operations

### Nice to Have (P2)
- [ ] Bidirectional Airtable sync
- [ ] Point-in-time recovery
- [ ] Database size monitoring dashboard

---

## 11. Appendix

### A. Current Data Inventory

| Source | Records (est.) | Size |
|--------|----------------|------|
| clients.json | ~150 clients | ~50KB |
| tasks.json | ~400 tasks | ~80KB |
| Airtable Clients | ~200 | N/A |
| Airtable Contacts | ~500 | N/A |
| privacy_submissions | 18 | ~10KB |

### B. SQLite Capacity

| Metric | SQLite Limit | Our Expected Usage |
|--------|--------------|-------------------|
| Database size | 281 TB | < 1 GB |
| Rows per table | Unlimited | < 100K |
| Concurrent readers | Unlimited | < 10 |
| Concurrent writers | 1 (WAL: many readers) | 1 |

### C. Feature Flags

```python
# Environment variables for gradual rollout
USE_SQLITE_CLIENTS=true   # Phase 2
USE_SQLITE_TASKS=true     # Phase 3
AIRTABLE_OPTIONAL=true    # Phase 4
UNIFIED_SEARCH=true       # Phase 5
```

### C.1 Feature Flag Timeline

| Flag | Phase | Expected Date | AI Tools Dependency |
|------|-------|---------------|---------------------|
| `USE_SQLITE_CLIENTS` | Phase 2 | Week 2 (Dec 16-20) | None - API response format unchanged |
| `USE_SQLITE_TASKS` | Phase 3 | Week 3 (Dec 23-27) | None - API response format unchanged |
| `AIRTABLE_OPTIONAL` | Phase 4 | Week 4 (Dec 30 - Jan 3) | None - Airtable becomes optional sync |
| `UNIFIED_SEARCH` | Phase 5 | Week 5 (Jan 6-10) | **search_all tool** will use `/api/search` |

> **Note for AI Tools Team:** You can build tools using current APIs today. The API response contracts (section 4.4) will remain stable through the migration. The only new capability is `UNIFIED_SEARCH` which adds `/api/search` endpoint in Week 5.

### C.2 API Stability Guarantee

| Endpoint | Change During Migration |
|----------|------------------------|
| GET /api/clients | Response format unchanged |
| GET /api/tasks | Response format unchanged, adds `client_id` field |
| POST /api/tasks | Request format unchanged |
| POST /api/tasks/batch | **NEW** in Phase 3 |
| GET /api/search | **NEW** in Phase 5 |

---

**Document History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-05 | Agent | Initial PRD |
| 1.1 | 2025-12-05 | Agent | Added API Response Contracts (4.4), batch tasks, feature flag timeline per AI Studio feedback |
