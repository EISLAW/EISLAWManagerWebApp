# Task: SQLite Phase 4 - Complete Client WRITE Migration

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P2
**Depends On:** Phase 3 Complete ✅

---

## Objective

Complete the client endpoints migration by adding SQLite WRITE operations (POST, PUT, DELETE) for clients. Currently only READ operations use SQLite.

---

## Current State (from Phase 3)

| Endpoint | Method | Status |
|----------|--------|--------|
| GET /api/clients | ✅ SQLite | Done |
| POST /api/clients | ⚠️ JSON | **Needs migration** |
| GET /api/clients/{cid} | ✅ SQLite | Done |
| PUT /api/clients/{cid} | ⚠️ JSON | **Needs migration** |
| DELETE /api/clients/{cid} | ⚠️ JSON | **Needs migration** |

---

## Task Checklist

### Task 1: Add ClientsDB.create() Method

**File:** `backend/db.py`

**Steps:**
1. Add `create()` method to ClientsDB class
2. Insert new client into SQLite
3. Return the created client with ID

**Example:**
```python
def create(self, client_data: dict) -> dict:
    cursor = self.db.conn.cursor()
    cursor.execute('''
        INSERT INTO clients (name, email, phone, address, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ''', (
        client_data.get('name'),
        client_data.get('email'),
        client_data.get('phone'),
        client_data.get('address'),
        client_data.get('status', 'active')
    ))
    self.db.conn.commit()
    return self.get(cursor.lastrowid)
```

---

### Task 2: Add ClientsDB.update() Method

**File:** `backend/db.py`

**Steps:**
1. Add `update()` method to ClientsDB class
2. Update existing client in SQLite
3. Return the updated client

**Example:**
```python
def update(self, client_id: int, client_data: dict) -> dict:
    fields = []
    values = []
    for key, value in client_data.items():
        if key != 'id':
            fields.append(f"{key} = ?")
            values.append(value)
    fields.append("updated_at = datetime('now')")
    values.append(client_id)

    cursor = self.db.conn.cursor()
    cursor.execute(f'''
        UPDATE clients SET {', '.join(fields)} WHERE id = ?
    ''', values)
    self.db.conn.commit()
    return self.get(client_id)
```

---

### Task 3: Add ClientsDB.delete() Method

**File:** `backend/db.py`

**Steps:**
1. Add `delete()` method to ClientsDB class
2. Delete client from SQLite
3. Return success/failure

**Example:**
```python
def delete(self, client_id: int) -> bool:
    cursor = self.db.conn.cursor()
    cursor.execute('DELETE FROM clients WHERE id = ?', (client_id,))
    self.db.conn.commit()
    return cursor.rowcount > 0
```

---

### Task 4: Update main.py Client Endpoints

**File:** `backend/main.py`

**Find and update:**

1. **POST /api/clients** - Use `clients_db.create()`
2. **PUT /api/clients/{cid}** - Use `clients_db.update()`
3. **DELETE /api/clients/{cid}** - Use `clients_db.delete()`

**Keep dual-write strategy** (write to both SQLite and JSON for safety)

---

## Testing Requirements

### Test 1: Create Client
```bash
curl -X POST http://20.217.86.4:8799/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Client", "email": "test@example.com"}'

# Verify in SQLite
sqlite3 /app/data/eislaw.db "SELECT * FROM clients ORDER BY id DESC LIMIT 1"
```

### Test 2: Update Client
```bash
curl -X PUT http://20.217.86.4:8799/api/clients/{id} \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Verify update
sqlite3 /app/data/eislaw.db "SELECT * FROM clients WHERE id = {id}"
```

### Test 3: Delete Client
```bash
# Create test client first
curl -X POST http://20.217.86.4:8799/api/clients -d '{"name": "Delete Me"}'

# Delete it
curl -X DELETE http://20.217.86.4:8799/api/clients/{id}

# Verify deletion
sqlite3 /app/data/eislaw.db "SELECT COUNT(*) FROM clients WHERE id = {id}"
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/db.py` | Add create(), update(), delete() to ClientsDB |
| `backend/main.py` | Update POST/PUT/DELETE endpoints |

---

## Success Criteria

- [x] ~~POST /api/clients writes to SQLite~~ (N/A - endpoint doesn't exist)
- [x] ~~PUT /api/clients/{cid} updates SQLite~~ (N/A - endpoint doesn't exist)
- [x] ~~DELETE /api/clients/{cid} removes from SQLite~~ (N/A - uses archive instead)
- [x] PATCH archive/restore syncs to SQLite
- [x] Dual-write to JSON maintained for safety
- [x] Archive/restore tests pass

---

## Completion Report

When complete, fill in this section:

**Date:** 2025-12-05

**Note:** POST/PUT/DELETE endpoints for clients do not exist in the current API.
Client creation is done via Airtable sync, not direct API calls.
The existing archive/restore endpoints were updated to sync with SQLite.

**Endpoints Updated:**
| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /api/clients | ❌ N/A | Endpoint does not exist (clients created via Airtable sync) |
| PUT /api/clients/{cid} | ❌ N/A | Endpoint does not exist |
| DELETE /api/clients/{cid} | ❌ N/A | Only soft-delete via archive |
| PATCH /api/clients/{name}/archive | ✅ Done | Now writes to SQLite + JSON |
| PATCH /api/clients/{name}/restore | ✅ Done | Now writes to SQLite + JSON |

**Tests Passed:**
- [x] Archive client works (SQLite + JSON)
- [x] Restore client works (SQLite + JSON)
- [x] Data persists after restart
- [x] Frontend archive/restore still works

**Issues Encountered:**
- POST/PUT/DELETE endpoints don't exist - clients are managed via Airtable sync
- Soft-delete (archive) is the standard pattern, not hard delete

---

**Assigned:** 2025-12-05

