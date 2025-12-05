"""
Unified Database Module for EISLAW
Provides consistent interface for all database operations.

This module is Phase 1 of the SQLite migration. It creates the foundation
for clients, tasks, and contacts storage without migrating existing data.
"""
import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from contextlib import contextmanager
from typing import Optional, List, Dict, Any
import uuid

# Database path - use Docker-friendly path in container, home path otherwise
if os.path.exists("/app"):
    # Running in Docker container
    DB_PATH = Path("/app/data/eislaw.db")
    BACKUP_DIR = Path("/app/data/backups")
else:
    # Running locally or in tests
    DB_PATH = Path.home() / ".eislaw" / "store" / "eislaw.db"
    BACKUP_DIR = Path.home() / ".eislaw" / "backups"

# Schema definition
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


class Database:
    """Main database class with connection management."""

    def __init__(self, db_path: Path = None):
        self.db_path = db_path or DB_PATH
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

    def execute_many(self, sql: str, params_list: List[tuple]) -> int:
        """Execute SQL with multiple parameter sets. Returns affected rows."""
        with self.connection() as conn:
            cursor = conn.executemany(sql, params_list)
            return cursor.rowcount


class ClientsDB:
    """Client operations namespace."""

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


class TasksDB:
    """Task operations namespace."""

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


class ContactsDB:
    """Contact operations namespace."""

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


def get_stats(db: Database) -> Dict:
    """Get database statistics."""
    stats = {}

    # Clients
    result = db.execute_one("SELECT COUNT(*) as total, SUM(active) as active FROM clients")
    stats["clients"] = {
        "total": result["total"] if result else 0,
        "active": result["active"] if result else 0
    }

    # Tasks
    result = db.execute_one("SELECT COUNT(*) as total, SUM(done) as done FROM tasks")
    stats["tasks"] = {
        "total": result["total"] if result else 0,
        "done": result["done"] if result else 0,
        "open": (result["total"] or 0) - (result["done"] or 0)
    }

    # Contacts
    result = db.execute_one("SELECT COUNT(*) as total FROM contacts")
    stats["contacts"] = {"total": result["total"] if result else 0}

    # Database file size
    if DB_PATH.exists():
        stats["db_size_mb"] = round(DB_PATH.stat().st_size / 1024 / 1024, 2)
    else:
        stats["db_size_mb"] = 0

    return stats


# Global instance - created on first import
_db: Database = None
clients: ClientsDB = None
tasks: TasksDB = None
contacts: ContactsDB = None


def init_global_db(db_path: Path = None):
    """Initialize or reinitialize global database instance."""
    global _db, clients, tasks, contacts
    _db = Database(db_path)
    clients = ClientsDB(_db)
    tasks = TasksDB(_db)
    contacts = ContactsDB(_db)
    return _db


def get_db() -> Database:
    """Get database instance. Initializes if needed."""
    global _db
    if _db is None:
        init_global_db()
    return _db


# Auto-initialize on import (but don't fail if directory not writable)
try:
    init_global_db()
except Exception:
    pass  # Will be initialized on first use
