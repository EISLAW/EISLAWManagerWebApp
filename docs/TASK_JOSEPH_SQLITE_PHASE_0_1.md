# Task Instructions: Joseph (Database Developer)

**Project:** EISLAW SQLite Migration
**Phase:** 0-1 (Foundation)
**Date:** 2025-12-05
**Report To:** CTO

---

## Your Mission

You are building the foundation for EISLAW's unified SQLite database. This is Phase 0-1 of a 5-phase migration. Your work will enable the system to move from fragmented JSON files to a proper relational database.

**Important:** Do NOT migrate actual data yet. Phase 0-1 is foundation only.

---

## System Access

| Resource | Location |
|----------|----------|
| VM SSH | `ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4` |
| Code | `~/EISLAWManagerWebApp` |
| PRD | `docs/PRD_SQLITE_MIGRATION.md` |
| Existing SQLite | `backend/privacy_db.py` (working reference) |
| Current Data | `~/.eislaw/store/` |

---

## Phase 0: Audit Existing (1 Day)

### Goal
Learn from the existing privacy_db.py implementation before building the unified module.

### Tasks

#### 0.1 Check Privacy Database Health
```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Check database file
ls -lh ~/.eislaw/store/privacy.db

# Check table structure
sqlite3 ~/.eislaw/store/privacy.db ".tables"
sqlite3 ~/.eislaw/store/privacy.db ".schema"

# Count records
sqlite3 ~/.eislaw/store/privacy.db "SELECT COUNT(*) FROM privacy_submissions;"
sqlite3 ~/.eislaw/store/privacy.db "SELECT COUNT(*) FROM activity_log;"

# Check for errors in activity log
sqlite3 ~/.eislaw/store/privacy.db "SELECT * FROM activity_log WHERE success=0 LIMIT 10;"

# Check database integrity
sqlite3 ~/.eislaw/store/privacy.db "PRAGMA integrity_check;"
```

#### 0.2 Review privacy_db.py Code
```bash
cat ~/EISLAWManagerWebApp/backend/privacy_db.py
```

Document:
- How connections are managed
- How transactions work
- How errors are handled
- What patterns to reuse

#### 0.3 Test Backup/Restore
```bash
# Create backup
cp ~/.eislaw/store/privacy.db ~/.eislaw/store/privacy.db.backup

# Verify backup works
sqlite3 ~/.eislaw/store/privacy.db.backup "SELECT COUNT(*) FROM privacy_submissions;"

# Clean up
rm ~/.eislaw/store/privacy.db.backup
```

#### 0.4 Document Findings
Create `docs/SQLITE_PHASE0_AUDIT.md` with:
- Database file size
- Record counts
- Any errors found
- Code patterns to reuse
- Recommendations

### Phase 0 Checklist
| Task | Done |
|------|------|
| Check privacy.db file size | ☐ |
| Review table schema | ☐ |
| Count records | ☐ |
| Check for errors in activity_log | ☐ |
| Run integrity check | ☐ |
| Review privacy_db.py code | ☐ |
| Test backup/restore | ☐ |
| Document findings | ☐ |

---

## Phase 1: Foundation (3 Days)

### Goal
Create the unified database module that will support clients, tasks, and contacts.

### Files to Create

```
backend/
├── db.py              # Main unified database module
├── db_backup.py       # Backup/restore utilities
└── tests/
    └── test_db.py     # Unit tests

tools/
└── backup_db.py       # CLI backup tool
```

---

### 1.1 Create `backend/db.py`

This is the main module. Follow the structure in PRD Section 2.3.

```python
"""
Unified Database Module for EISLAW
Provides consistent interface for all database operations.
"""
import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import uuid

# ═══════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════

DB_PATH = Path.home() / ".eislaw" / "store" / "eislaw.db"
BACKUP_DIR = Path.home() / ".eislaw" / "backups"

# ═══════════════════════════════════════════════════════════
# SCHEMA
# ═══════════════════════════════════════════════════════════

SCHEMA = """
-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,
    stage TEXT DEFAULT 'new' CHECK (stage IN ('new', 'active', 'pending', 'completed', 'archived')),
    types TEXT DEFAULT '[]',
    airtable_id TEXT,
    airtable_url TEXT,
    sharepoint_url TEXT,
    local_folder TEXT,
    active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_synced_at TEXT,
    sync_source TEXT
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);

-- CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    done INTEGER DEFAULT 0,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT,
    assigned_to TEXT,
    source_type TEXT,
    source_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    event_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    duration_ms INTEGER,
    success INTEGER DEFAULT 1,
    user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(event_type);

-- SYNC STATE
CREATE TABLE IF NOT EXISTS sync_state (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    last_sync_at TEXT,
    last_sync_cursor TEXT,
    status TEXT DEFAULT 'idle',
    error_message TEXT,
    records_synced INTEGER DEFAULT 0
);
"""

# ═══════════════════════════════════════════════════════════
# DATABASE CLASS
# ═══════════════════════════════════════════════════════════

class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def connection(self):
        """Context manager for database connections."""
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
        """Initialize database schema."""
        with self.connection() as conn:
            conn.executescript(SCHEMA)

    def execute(self, sql: str, params: tuple = ()) -> List[Dict]:
        """Execute SQL and return results as list of dicts."""
        with self.connection() as conn:
            cursor = conn.execute(sql, params)
            if cursor.description:
                return [dict(row) for row in cursor.fetchall()]
            return []

    def execute_one(self, sql: str, params: tuple = ()) -> Optional[Dict]:
        """Execute SQL and return single result."""
        results = self.execute(sql, params)
        return results[0] if results else None

# ═══════════════════════════════════════════════════════════
# CLIENTS NAMESPACE
# ═══════════════════════════════════════════════════════════

class ClientsDB:
    def __init__(self, db: Database):
        self.db = db

    def get(self, id: str) -> Optional[Dict]:
        """Get client by ID."""
        return self.db.execute_one(
            "SELECT * FROM clients WHERE id = ?", (id,)
        )

    def get_by_name(self, name: str) -> Optional[Dict]:
        """Get client by name (case-insensitive)."""
        return self.db.execute_one(
            "SELECT * FROM clients WHERE LOWER(name) = LOWER(?)", (name,)
        )

    def list(self, active_only: bool = True, limit: int = 100, offset: int = 0) -> List[Dict]:
        """List clients with optional filter."""
        if active_only:
            sql = "SELECT * FROM clients WHERE active = 1 ORDER BY name LIMIT ? OFFSET ?"
        else:
            sql = "SELECT * FROM clients ORDER BY name LIMIT ? OFFSET ?"
        return self.db.execute(sql, (limit, offset))

    def search(self, query: str, limit: int = 20) -> List[Dict]:
        """Search clients by name or email."""
        pattern = f"%{query}%"
        return self.db.execute(
            """SELECT * FROM clients
               WHERE name LIKE ? OR email LIKE ?
               ORDER BY name LIMIT ?""",
            (pattern, pattern, limit)
        )

    def save(self, data: Dict) -> str:
        """Insert or update client. Returns ID."""
        client_id = data.get("id") or str(uuid.uuid4())[:16]

        # Check if exists
        existing = self.get(client_id) if data.get("id") else None

        if existing:
            # Update
            fields = []
            values = []
            for key in ["name", "email", "phone", "stage", "types",
                       "airtable_id", "airtable_url", "sharepoint_url",
                       "local_folder", "active", "notes"]:
                if key in data:
                    fields.append(f"{key} = ?")
                    value = data[key]
                    if key == "types" and isinstance(value, list):
                        value = json.dumps(value)
                    values.append(value)

            if fields:
                fields.append("updated_at = datetime('now')")
                values.append(client_id)
                sql = f"UPDATE clients SET {', '.join(fields)} WHERE id = ?"
                self.db.execute(sql, tuple(values))
        else:
            # Insert
            types_value = data.get("types", [])
            if isinstance(types_value, list):
                types_value = json.dumps(types_value)

            self.db.execute(
                """INSERT INTO clients (id, name, email, phone, stage, types,
                   airtable_id, airtable_url, sharepoint_url, local_folder,
                   active, notes, sync_source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (client_id, data.get("name"), data.get("email"),
                 data.get("phone"), data.get("stage", "new"), types_value,
                 data.get("airtable_id"), data.get("airtable_url"),
                 data.get("sharepoint_url"), data.get("local_folder"),
                 data.get("active", 1), data.get("notes"), data.get("sync_source"))
            )

        return client_id

    def archive(self, id: str) -> bool:
        """Archive client (set active=0)."""
        self.db.execute(
            "UPDATE clients SET active = 0, updated_at = datetime('now') WHERE id = ?",
            (id,)
        )
        return True

    def restore(self, id: str) -> bool:
        """Restore archived client (set active=1)."""
        self.db.execute(
            "UPDATE clients SET active = 1, updated_at = datetime('now') WHERE id = ?",
            (id,)
        )
        return True

    def count(self, active_only: bool = True) -> int:
        """Count clients."""
        if active_only:
            result = self.db.execute_one("SELECT COUNT(*) as count FROM clients WHERE active = 1")
        else:
            result = self.db.execute_one("SELECT COUNT(*) as count FROM clients")
        return result["count"] if result else 0

# ═══════════════════════════════════════════════════════════
# TASKS NAMESPACE
# ═══════════════════════════════════════════════════════════

class TasksDB:
    def __init__(self, db: Database):
        self.db = db

    def get(self, id: str) -> Optional[Dict]:
        """Get task by ID."""
        return self.db.execute_one("SELECT * FROM tasks WHERE id = ?", (id,))

    def list(self, client_id: Optional[str] = None, done: Optional[bool] = None,
             limit: int = 100) -> List[Dict]:
        """List tasks with filters."""
        conditions = []
        params = []

        if client_id:
            conditions.append("client_id = ?")
            params.append(client_id)
        if done is not None:
            conditions.append("done = ?")
            params.append(1 if done else 0)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)

        return self.db.execute(
            f"SELECT * FROM tasks {where} ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT ?",
            tuple(params)
        )

    def save(self, data: Dict) -> str:
        """Insert or update task. Returns ID."""
        task_id = data.get("id") or str(uuid.uuid4())[:16]

        existing = self.get(task_id) if data.get("id") else None

        if existing:
            # Update
            fields = []
            values = []
            for key in ["title", "description", "done", "status", "priority",
                       "due_date", "assigned_to", "client_id", "client_name"]:
                if key in data:
                    fields.append(f"{key} = ?")
                    values.append(data[key])

            if fields:
                fields.append("updated_at = datetime('now')")
                if data.get("done") == True or data.get("done") == 1:
                    fields.append("completed_at = datetime('now')")
                values.append(task_id)
                sql = f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?"
                self.db.execute(sql, tuple(values))
        else:
            # Insert
            self.db.execute(
                """INSERT INTO tasks (id, client_id, client_name, title, description,
                   done, status, priority, due_date, assigned_to, source_type, source_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (task_id, data.get("client_id"), data.get("client_name"),
                 data.get("title"), data.get("description"),
                 data.get("done", 0), data.get("status", "todo"),
                 data.get("priority", "medium"), data.get("due_date"),
                 data.get("assigned_to"), data.get("source_type"), data.get("source_id"))
            )

        return task_id

    def complete(self, id: str) -> bool:
        """Mark task as done."""
        self.db.execute(
            """UPDATE tasks SET done = 1, status = 'done',
               completed_at = datetime('now'), updated_at = datetime('now')
               WHERE id = ?""",
            (id,)
        )
        return True

    def delete(self, id: str) -> bool:
        """Delete task."""
        self.db.execute("DELETE FROM tasks WHERE id = ?", (id,))
        return True

    def count(self, done: Optional[bool] = None) -> int:
        """Count tasks."""
        if done is None:
            result = self.db.execute_one("SELECT COUNT(*) as count FROM tasks")
        else:
            result = self.db.execute_one(
                "SELECT COUNT(*) as count FROM tasks WHERE done = ?",
                (1 if done else 0,)
            )
        return result["count"] if result else 0

# ═══════════════════════════════════════════════════════════
# CONTACTS NAMESPACE
# ═══════════════════════════════════════════════════════════

class ContactsDB:
    def __init__(self, db: Database):
        self.db = db

    def get(self, id: str) -> Optional[Dict]:
        """Get contact by ID."""
        return self.db.execute_one("SELECT * FROM contacts WHERE id = ?", (id,))

    def list_for_client(self, client_id: str) -> List[Dict]:
        """Get all contacts for a client."""
        return self.db.execute(
            "SELECT * FROM contacts WHERE client_id = ? ORDER BY name",
            (client_id,)
        )

    def save(self, data: Dict) -> str:
        """Insert or update contact. Returns ID."""
        contact_id = data.get("id") or str(uuid.uuid4())[:16]

        existing = self.get(contact_id) if data.get("id") else None

        if existing:
            fields = []
            values = []
            for key in ["name", "email", "phone", "role", "notes"]:
                if key in data:
                    fields.append(f"{key} = ?")
                    values.append(data[key])

            if fields:
                fields.append("updated_at = datetime('now')")
                values.append(contact_id)
                sql = f"UPDATE contacts SET {', '.join(fields)} WHERE id = ?"
                self.db.execute(sql, tuple(values))
        else:
            self.db.execute(
                """INSERT INTO contacts (id, client_id, name, email, phone, role, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (contact_id, data.get("client_id"), data.get("name"),
                 data.get("email"), data.get("phone"), data.get("role"),
                 data.get("notes"))
            )

        return contact_id

    def delete(self, id: str) -> bool:
        """Delete contact."""
        self.db.execute("DELETE FROM contacts WHERE id = ?", (id,))
        return True

# ═══════════════════════════════════════════════════════════
# ACTIVITY LOG
# ═══════════════════════════════════════════════════════════

def log_activity(db: Database, event_type: str, entity_type: str = None,
                 entity_id: str = None, details: Dict = None,
                 duration_ms: int = None, success: bool = True):
    """Log activity for audit trail."""
    db.execute(
        """INSERT INTO activity_log (event_type, entity_type, entity_id,
           details, duration_ms, success)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (event_type, entity_type, entity_id,
         json.dumps(details) if details else None,
         duration_ms, 1 if success else 0)
    )

# ═══════════════════════════════════════════════════════════
# GLOBAL INSTANCE
# ═══════════════════════════════════════════════════════════

_db = Database()
clients = ClientsDB(_db)
tasks = TasksDB(_db)
contacts = ContactsDB(_db)

def get_db() -> Database:
    """Get database instance."""
    return _db
```

---

### 1.2 Create `backend/db_backup.py`

```python
"""
Database Backup/Restore Utilities
"""
import shutil
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List
import sqlite3

DB_PATH = Path.home() / ".eislaw" / "store" / "eislaw.db"
BACKUP_DIR = Path.home() / ".eislaw" / "backups"

def backup(destination: Optional[Path] = None, tag: str = "manual") -> Path:
    """
    Create database backup.
    Returns path to backup file.
    """
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_name = f"eislaw_{timestamp}_{tag}.db"
    backup_path = destination or (BACKUP_DIR / backup_name)

    # Use SQLite backup API for consistency
    source = sqlite3.connect(str(DB_PATH))
    dest = sqlite3.connect(str(backup_path))
    source.backup(dest)
    source.close()
    dest.close()

    print(f"Backup created: {backup_path}")
    return backup_path

def restore(backup_path: Path) -> bool:
    """
    Restore database from backup.
    Creates backup of current DB first.
    """
    if not backup_path.exists():
        raise FileNotFoundError(f"Backup not found: {backup_path}")

    # Backup current DB first
    if DB_PATH.exists():
        backup(tag="pre-restore")

    # Restore
    shutil.copy2(backup_path, DB_PATH)
    print(f"Restored from: {backup_path}")
    return True

def list_backups() -> List[dict]:
    """List available backups."""
    if not BACKUP_DIR.exists():
        return []

    backups = []
    for f in sorted(BACKUP_DIR.glob("eislaw_*.db"), reverse=True):
        stat = f.stat()
        backups.append({
            "path": str(f),
            "name": f.name,
            "size_mb": round(stat.st_size / 1024 / 1024, 2),
            "created": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })

    return backups

def verify(db_path: Path = DB_PATH) -> dict:
    """Verify database integrity."""
    conn = sqlite3.connect(str(db_path))
    cursor = conn.execute("PRAGMA integrity_check")
    result = cursor.fetchone()[0]

    cursor = conn.execute("SELECT COUNT(*) FROM clients")
    clients_count = cursor.fetchone()[0]

    cursor = conn.execute("SELECT COUNT(*) FROM tasks")
    tasks_count = cursor.fetchone()[0]

    conn.close()

    return {
        "integrity": result,
        "ok": result == "ok",
        "clients": clients_count,
        "tasks": tasks_count
    }

def cleanup(keep_days: int = 7) -> int:
    """Remove backups older than keep_days. Returns count removed."""
    if not BACKUP_DIR.exists():
        return 0

    cutoff = datetime.now().timestamp() - (keep_days * 24 * 60 * 60)
    removed = 0

    for f in BACKUP_DIR.glob("eislaw_*.db"):
        if f.stat().st_mtime < cutoff:
            f.unlink()
            removed += 1

    return removed
```

---

### 1.3 Create `backend/tests/test_db.py`

```python
"""
Unit tests for unified database module.
"""
import pytest
import tempfile
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from db import Database, ClientsDB, TasksDB, ContactsDB, log_activity

@pytest.fixture
def test_db():
    """Create temporary test database."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = Path(f.name)

    db = Database(db_path)
    yield db

    # Cleanup
    db_path.unlink(missing_ok=True)

@pytest.fixture
def clients_db(test_db):
    return ClientsDB(test_db)

@pytest.fixture
def tasks_db(test_db):
    return TasksDB(test_db)

@pytest.fixture
def contacts_db(test_db):
    return ContactsDB(test_db)

# ═══════════════════════════════════════════════════════════
# CLIENT TESTS
# ═══════════════════════════════════════════════════════════

class TestClients:
    def test_create_client(self, clients_db):
        client_id = clients_db.save({
            "name": "Test Client",
            "email": "test@example.com"
        })
        assert client_id is not None

        client = clients_db.get(client_id)
        assert client["name"] == "Test Client"
        assert client["email"] == "test@example.com"
        assert client["active"] == 1

    def test_update_client(self, clients_db):
        client_id = clients_db.save({"name": "Original Name"})

        clients_db.save({
            "id": client_id,
            "name": "Updated Name",
            "email": "new@example.com"
        })

        client = clients_db.get(client_id)
        assert client["name"] == "Updated Name"
        assert client["email"] == "new@example.com"

    def test_archive_restore(self, clients_db):
        client_id = clients_db.save({"name": "Archive Test"})

        clients_db.archive(client_id)
        client = clients_db.get(client_id)
        assert client["active"] == 0

        clients_db.restore(client_id)
        client = clients_db.get(client_id)
        assert client["active"] == 1

    def test_list_active_only(self, clients_db):
        clients_db.save({"name": "Active Client"})
        archived_id = clients_db.save({"name": "Archived Client"})
        clients_db.archive(archived_id)

        active = clients_db.list(active_only=True)
        all_clients = clients_db.list(active_only=False)

        assert len(active) == 1
        assert len(all_clients) == 2

    def test_search(self, clients_db):
        clients_db.save({"name": "Sivan Cohen", "email": "sivan@test.com"})
        clients_db.save({"name": "David Levi"})

        results = clients_db.search("sivan")
        assert len(results) == 1
        assert results[0]["name"] == "Sivan Cohen"

    def test_get_by_name(self, clients_db):
        clients_db.save({"name": "Test Name"})

        client = clients_db.get_by_name("test name")  # Case insensitive
        assert client is not None
        assert client["name"] == "Test Name"

# ═══════════════════════════════════════════════════════════
# TASK TESTS
# ═══════════════════════════════════════════════════════════

class TestTasks:
    def test_create_task(self, tasks_db):
        task_id = tasks_db.save({
            "title": "Test Task",
            "priority": "high"
        })

        task = tasks_db.get(task_id)
        assert task["title"] == "Test Task"
        assert task["priority"] == "high"
        assert task["done"] == 0

    def test_complete_task(self, tasks_db):
        task_id = tasks_db.save({"title": "Complete Me"})

        tasks_db.complete(task_id)

        task = tasks_db.get(task_id)
        assert task["done"] == 1
        assert task["status"] == "done"
        assert task["completed_at"] is not None

    def test_list_by_client(self, tasks_db, clients_db):
        client_id = clients_db.save({"name": "Task Client"})

        tasks_db.save({"title": "Task 1", "client_id": client_id})
        tasks_db.save({"title": "Task 2", "client_id": client_id})
        tasks_db.save({"title": "Other Task"})

        client_tasks = tasks_db.list(client_id=client_id)
        assert len(client_tasks) == 2

    def test_list_done_filter(self, tasks_db):
        tasks_db.save({"title": "Open Task"})
        done_id = tasks_db.save({"title": "Done Task"})
        tasks_db.complete(done_id)

        open_tasks = tasks_db.list(done=False)
        done_tasks = tasks_db.list(done=True)

        assert len(open_tasks) == 1
        assert len(done_tasks) == 1

    def test_delete_task(self, tasks_db):
        task_id = tasks_db.save({"title": "Delete Me"})

        tasks_db.delete(task_id)

        task = tasks_db.get(task_id)
        assert task is None

# ═══════════════════════════════════════════════════════════
# CONTACT TESTS
# ═══════════════════════════════════════════════════════════

class TestContacts:
    def test_create_contact(self, contacts_db, clients_db):
        client_id = clients_db.save({"name": "Contact Client"})

        contact_id = contacts_db.save({
            "client_id": client_id,
            "name": "John Doe",
            "email": "john@example.com",
            "role": "primary"
        })

        contact = contacts_db.get(contact_id)
        assert contact["name"] == "John Doe"
        assert contact["client_id"] == client_id

    def test_list_for_client(self, contacts_db, clients_db):
        client_id = clients_db.save({"name": "Multi Contact Client"})

        contacts_db.save({"client_id": client_id, "name": "Contact 1"})
        contacts_db.save({"client_id": client_id, "name": "Contact 2"})

        contacts = contacts_db.list_for_client(client_id)
        assert len(contacts) == 2

# ═══════════════════════════════════════════════════════════
# ACTIVITY LOG TESTS
# ═══════════════════════════════════════════════════════════

class TestActivityLog:
    def test_log_activity(self, test_db):
        log_activity(
            test_db,
            event_type="test_event",
            entity_type="client",
            entity_id="123",
            details={"foo": "bar"},
            success=True
        )

        results = test_db.execute(
            "SELECT * FROM activity_log WHERE event_type = ?",
            ("test_event",)
        )
        assert len(results) == 1
        assert results[0]["entity_id"] == "123"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

---

### 1.4 Create `tools/backup_db.py`

```python
#!/usr/bin/env python3
"""
CLI tool for database backup/restore.

Usage:
    python backup_db.py backup [--tag TAG]
    python backup_db.py restore BACKUP_FILE
    python backup_db.py list
    python backup_db.py verify
    python backup_db.py cleanup [--days DAYS]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from db_backup import backup, restore, list_backups, verify, cleanup

def main():
    parser = argparse.ArgumentParser(description="EISLAW Database Backup Tool")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # backup
    backup_parser = subparsers.add_parser("backup", help="Create backup")
    backup_parser.add_argument("--tag", default="manual", help="Backup tag")

    # restore
    restore_parser = subparsers.add_parser("restore", help="Restore from backup")
    restore_parser.add_argument("file", help="Backup file path")

    # list
    subparsers.add_parser("list", help="List backups")

    # verify
    subparsers.add_parser("verify", help="Verify database integrity")

    # cleanup
    cleanup_parser = subparsers.add_parser("cleanup", help="Remove old backups")
    cleanup_parser.add_argument("--days", type=int, default=7, help="Keep backups newer than N days")

    args = parser.parse_args()

    if args.command == "backup":
        path = backup(tag=args.tag)
        print(f"✓ Backup created: {path}")

    elif args.command == "restore":
        restore(Path(args.file))
        print("✓ Restore complete")

    elif args.command == "list":
        backups = list_backups()
        if not backups:
            print("No backups found")
        else:
            print(f"{'Name':<45} {'Size':<10} {'Created'}")
            print("-" * 80)
            for b in backups:
                print(f"{b['name']:<45} {b['size_mb']:<10} {b['created']}")

    elif args.command == "verify":
        result = verify()
        if result["ok"]:
            print(f"✓ Database OK")
            print(f"  Clients: {result['clients']}")
            print(f"  Tasks: {result['tasks']}")
        else:
            print(f"✗ Database integrity check failed: {result['integrity']}")
            sys.exit(1)

    elif args.command == "cleanup":
        removed = cleanup(keep_days=args.days)
        print(f"✓ Removed {removed} old backups")

if __name__ == "__main__":
    main()
```

---

## Phase 1 Checklist

| Task | Done |
|------|------|
| Create backend/db.py | ☐ |
| Create backend/db_backup.py | ☐ |
| Create backend/tests/test_db.py | ☐ |
| Create tools/backup_db.py | ☐ |
| Run all tests passing | ☐ |
| Test backup/restore manually | ☐ |
| Verify WAL mode enabled | ☐ |
| Document any issues | ☐ |

---

## How to Run Tests

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp

# Install pytest if needed
pip install pytest

# Run tests
python -m pytest backend/tests/test_db.py -v
```

---

## Success Criteria

Phase 0-1 is complete when:
1. ✅ Privacy.db audit documented
2. ✅ db.py module created with all namespaces
3. ✅ All unit tests passing
4. ✅ Backup/restore tested manually
5. ✅ No data migration performed yet

---

## Where to Update Results

**Update findings in:**
```
docs/SQLITE_PHASE0_AUDIT.md      # Phase 0 findings
docs/SQLITE_PHASE1_COMPLETE.md   # Phase 1 completion report
```

**When complete, notify CTO.**

---

## Questions?

If blocked:
1. Document the issue
2. Continue with other tasks
3. Note questions in completion report

---

**Take your time. Build it right. This is the foundation for everything.**
