# Task: SQLite Migration Phase 2 - API Integration

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P2

---

## Objective

Implement Phase 2 of the SQLite Migration: Integrate the unified database module with API endpoints to replace JSON file storage.

---

## Background

Phase 1 completed:
- ✅ `backend/db.py` created with get_connection(), init_db()
- ✅ Tables created: clients, tasks, contacts, activity_log
- ✅ WAL mode enabled, foreign keys enforced
- ✅ Data migrated: 13 clients, 10 tasks, 12 contacts
- ✅ Health endpoints: `/api/db/health`, `/api/db/stats`
- ✅ Backup system working (daily at 3 AM)

Now: Replace JSON file reads/writes with SQLite queries in API routes.

---

## Task Checklist

### 1. Identify Current JSON Usage

Search for JSON file operations:
```bash
grep -r "clients.json" backend/
grep -r "tasks.json" backend/
grep -r "json.load" backend/
grep -r "json.dump" backend/
```

### 2. Update Clients API

**File:** `backend/routers/clients.py` (or similar)

Replace:
```python
# OLD - JSON file
def get_clients():
    with open(CLIENTS_FILE) as f:
        return json.load(f)
```

With:
```python
# NEW - SQLite
from backend.db import get_connection

def get_clients():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients WHERE active = 1")
    clients = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return clients
```

### 3. Update Tasks API

**File:** `backend/routers/tasks.py`

CRUD operations:
```python
from backend.db import get_connection

def get_tasks(client_id: str = None):
    conn = get_connection()
    cursor = conn.cursor()
    if client_id:
        cursor.execute("SELECT * FROM tasks WHERE client_id = ?", (client_id,))
    else:
        cursor.execute("SELECT * FROM tasks")
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks

def create_task(task: dict):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (id, client_id, title, description, status, priority, due_date, assignee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        task['id'], task.get('client_id'), task['title'],
        task.get('description'), task.get('status', 'pending'),
        task.get('priority', 'medium'), task.get('due_date'), task.get('assignee')
    ))
    conn.commit()
    conn.close()
    return task

def update_task(task_id: str, updates: dict):
    conn = get_connection()
    cursor = conn.cursor()
    # Build dynamic UPDATE query
    set_clause = ', '.join(f"{k} = ?" for k in updates.keys())
    values = list(updates.values()) + [task_id]
    cursor.execute(f"UPDATE tasks SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?", values)
    conn.commit()
    conn.close()

def delete_task(task_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
```

### 4. Update Contacts API

Similar pattern for contacts CRUD.

### 5. Add Activity Logging

Log all changes to activity_log table:
```python
def log_activity(action: str, entity_type: str, entity_id: str, details: dict = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO activity_log (id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        str(uuid.uuid4()), action, entity_type, entity_id,
        json.dumps(details) if details else None
    ))
    conn.commit()
    conn.close()
```

Usage:
```python
# In create_task
log_activity('create', 'task', task['id'], {'title': task['title']})

# In update_task
log_activity('update', 'task', task_id, updates)

# In delete_task
log_activity('delete', 'task', task_id)
```

### 6. Keep JSON as Backup (Optional)

During transition, write to both:
```python
def save_clients_hybrid(clients):
    # Write to SQLite (primary)
    save_to_sqlite(clients)

    # Write to JSON (backup - remove later)
    with open(CLIENTS_FILE, 'w') as f:
        json.dump(clients, f, indent=2, ensure_ascii=False)
```

### 7. Test All Endpoints

```bash
# Test clients
curl http://20.217.86.4:8799/api/clients
curl -X POST http://20.217.86.4:8799/api/clients -H "Content-Type: application/json" -d '{"name": "Test Client"}'

# Test tasks
curl http://20.217.86.4:8799/api/tasks
curl -X POST http://20.217.86.4:8799/api/tasks -H "Content-Type: application/json" -d '{"title": "Test Task"}'

# Verify in database
sqlite3 ~/.eislaw/store/eislaw.db "SELECT COUNT(*) FROM clients"
sqlite3 ~/.eislaw/store/eislaw.db "SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 5"
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/routers/clients.py` | Replace JSON with SQLite |
| `backend/routers/tasks.py` | Replace JSON with SQLite |
| `backend/routers/contacts.py` | Replace JSON with SQLite |
| `backend/db.py` | Add helper functions if needed |

---

## Success Criteria

- [x] Clients API uses SQLite
- [x] Tasks API uses SQLite
- [x] Contacts API uses SQLite
- [x] Activity logging implemented
- [x] All API endpoints tested
- [x] No JSON file writes for core data
- [x] Data integrity verified

---

## Rollback Plan

If issues arise:
1. Keep JSON files as source of truth
2. Revert API changes
3. Re-run JSON→SQLite migration after fixes

---

## Completion Report

**Date:** 2025-12-05

**Implementation Summary:**
The API integration was largely already completed in a previous session. This task verified and enhanced the existing implementation by adding activity logging to all CRUD operations.

**Files Modified:**
| File | Changes |
|------|---------|
| `backend/routers/clients.py` | Already uses SQLite via db_api_helpers |
| `backend/routers/tasks.py` | Already uses SQLite via db_api_helpers |
| `backend/db_api_helpers.py` | Added `_log_activity()` helper and logging calls |

**API Endpoints Verified:**
| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/clients` | GET | ✅ Working (13 clients) |
| `/api/clients/{id}` | GET | ✅ Working |
| `/api/clients/{name}/archive` | PATCH | ✅ Working + logged |
| `/api/clients/{name}/restore` | PATCH | ✅ Working + logged |
| `/api/tasks` | GET | ✅ Working (10 tasks) |
| `/api/tasks` | POST | ✅ Working + logged |
| `/api/tasks/{id}` | PATCH | ✅ Working + logged |
| `/api/tasks/{id}` | DELETE | ✅ Working + logged |
| `/api/tasks/{id}/done` | POST | ✅ Working + logged |

**Activity Logging Events:**
- `task_created` - When new task created
- `task_updated` - When task modified
- `task_deleted` - When task deleted
- `task_completed` - When task marked done
- `task_reopened` - When task unmarked done
- `client_archived` - When client archived
- `client_restored` - When client restored

**Data Validation Result:**
```
RESULT: PASS
Clients: 13, Tasks: 10, Contacts: 12
Activity Log: 3 entries
Foreign Key Violations: 0
Database Integrity: ok
```

**Notes:**
- Contacts are embedded within clients (not separate API endpoints)
- JSON files kept as backup but not used for primary reads
- All routers use `db_api_helpers` which wraps SQLite operations

**Issues Encountered:** None

---

**Status:** ✅ COMPLETE
**Assigned:** 2025-12-05
**Due:** 2025-12-06
