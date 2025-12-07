# Task: SQLite Migration Phase 1 - Foundation

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P2

---

## Objective

Implement Phase 1 of the SQLite Migration PRD: Create unified database module and establish migration foundation.

---

## Background

From `docs/PRD_SQLITE_MIGRATION.md`:
- Phase 1: Foundation (unified db.py, backup automation)
- Current: Mixed storage (JSON files + SQLite for privacy)
- Goal: Single SQLite database for all data

---

## Task Checklist

### 1. Create Unified Database Module

**File:** `backend/db.py`

```python
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path.home() / '.eislaw' / 'store' / 'eislaw.db'

def get_connection():
    """Get database connection with WAL mode"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    return conn

def init_db():
    """Initialize all tables"""
    conn = get_connection()
    cursor = conn.cursor()

    # Clients table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            business_name TEXT,
            email TEXT,
            phone TEXT,
            airtable_id TEXT,
            sharepoint_url TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Tasks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            client_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            due_date TEXT,
            assignee TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')

    # Contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            client_id TEXT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            role TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
    ''')

    conn.commit()
    conn.close()

# Initialize on import
init_db()
```

### 2. Create Migration Script

**File:** `backend/migrations/001_json_to_sqlite.py`

```python
"""
Migration: JSON files to SQLite
Run: python -m backend.migrations.001_json_to_sqlite
"""
import json
from pathlib import Path
from backend.db import get_connection

def migrate_clients():
    """Migrate clients.json to SQLite"""
    json_path = Path.home() / '.eislaw' / 'store' / 'clients.json'
    if not json_path.exists():
        print("No clients.json found")
        return

    with open(json_path) as f:
        clients = json.load(f)

    conn = get_connection()
    cursor = conn.cursor()

    for client in clients:
        cursor.execute('''
            INSERT OR REPLACE INTO clients (id, name, business_name, email, phone, airtable_id, sharepoint_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            client.get('id'),
            client.get('name'),
            client.get('business_name'),
            client.get('email'),
            client.get('phone'),
            client.get('airtable_id'),
            client.get('sharepoint_url'),
            client.get('status', 'active')
        ))

    conn.commit()
    print(f"Migrated {len(clients)} clients")
    conn.close()

if __name__ == '__main__':
    migrate_clients()
```

### 3. Add Backup to Unified DB

Extend your existing backup script to include the unified database.

### 4. Test Migration

```bash
# Run migration
python -m backend.migrations.001_json_to_sqlite

# Verify data
sqlite3 ~/.eislaw/store/eislaw.db "SELECT COUNT(*) FROM clients"
sqlite3 ~/.eislaw/store/eislaw.db "SELECT name FROM clients LIMIT 5"
```

---

## Success Criteria

- [x] `backend/db.py` created with get_connection()
- [x] Tables created: clients, tasks, contacts
- [x] WAL mode enabled
- [x] Migration script created
- [x] Test migration successful
- [x] Backup includes new unified DB

---

## Completion Report

**Date:** 2025-12-05

**Files Created:**
| File | Purpose |
|------|---------|
| `backend/db.py` | Unified database module with get_connection(), init_db(), all CRUD helpers |
| `backend/db_api_helpers.py` | API-friendly wrappers returning frontend-compatible format |
| `backend/backup.py` | CLI backup utility (create/list/verify/restore) |
| `backend/validate_db.py` | Database validation script |
| `backend/routers/db_health.py` | Health monitoring endpoints |

**Tables Created:**
| Table | Columns | Rows Migrated |
|-------|---------|---------------|
| clients | id, name, email, phone, stage, types, airtable_id, sharepoint_url, active, notes, created_at, updated_at | 13 |
| tasks | id, client_id, title, description, status, priority, due_date, assignee, is_private, source, airtable_id, created_at, updated_at | 10 |
| contacts | id, client_id, name, email, phone, role, notes, created_at | 12 |
| activity_log | id, action, entity_type, entity_id, details, timestamp | 1 |

**Migration Test:**
- [x] JSON → SQLite successful
- [x] Data integrity verified (PRAGMA integrity_check = ok)
- [x] Backup working (5 backups, cron scheduled daily at 3 AM)

**Additional Features Implemented:**
- WAL mode enabled for better concurrency
- Foreign keys enforced
- Health endpoint: `GET /api/db/health`
- Stats endpoint: `GET /api/db/stats`
- Automated daily backups with 7-day retention

**Issues Encountered:** None - all success criteria met

---

**Status:** ✅ COMPLETE
**Assigned:** 2025-12-05
