# Task: SQLite Data Validation

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P2

---

## Objective

Verify SQLite database integrity and data consistency after migration and sync implementations.

---

## Background

Multiple database operations have been implemented:
- SQLite migration from JSON
- Airtable sync to SQLite
- Backup/restore utility

We need to validate data integrity.

---

## Task Checklist

### 1. Schema Validation

Check all expected tables exist:
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Expected tables:
- [ ] clients
- [ ] tasks
- [ ] privacy_submissions (or similar)
- [ ] marketing (if applicable)

### 2. Data Count Verification

Compare counts between sources:

| Table | SQLite | JSON | Match? |
|-------|--------|------|--------|
| clients | | | |
| tasks | | | |

```bash
# SQLite count
sqlite3 /app/data/eislaw.db "SELECT COUNT(*) FROM clients"

# JSON count
cat /app/data/clients.json | jq length
```

### 3. Data Integrity Checks

For clients table:
```sql
-- Check for NULL required fields
SELECT id, name FROM clients WHERE name IS NULL OR name = '';

-- Check for duplicate IDs
SELECT id, COUNT(*) as cnt FROM clients GROUP BY id HAVING cnt > 1;

-- Check date formats
SELECT id, created_at FROM clients WHERE created_at NOT LIKE '____-__-__T%';
```

### 4. Foreign Key Validation

If foreign keys exist:
```sql
PRAGMA foreign_key_check;
```

### 5. Index Verification

Check indexes exist:
```sql
SELECT name, tbl_name FROM sqlite_master WHERE type='index';
```

### 6. Create Validation Report

Document findings in a structured format.

---

## Validation Script

```python
import sqlite3
import json

def validate_database(db_path, json_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    results = {
        "tables": [],
        "counts": {},
        "issues": []
    }

    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    results["tables"] = [row[0] for row in cursor.fetchall()]

    # Check counts
    for table in results["tables"]:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        results["counts"][table] = cursor.fetchone()[0]

    # Check for issues
    cursor.execute("SELECT id FROM clients WHERE name IS NULL OR name = ''")
    null_names = cursor.fetchall()
    if null_names:
        results["issues"].append(f"Found {len(null_names)} clients with NULL/empty names")

    conn.close()
    return results

if __name__ == "__main__":
    results = validate_database("/app/data/eislaw.db", "/app/data/clients.json")
    print(json.dumps(results, indent=2))
```

---

## Success Criteria

- [x] All expected tables exist
- [x] Data counts verified (SQLite is primary source now)
- [x] No NULL required fields
- [x] No duplicate IDs
- [x] Foreign keys valid (0 violations)
- [x] Validation report created

---

## Completion Report

**Date:** 2025-12-05

**Database Path:** `/app/data/eislaw.db`

**Tables Found:**
| Table | Row Count |
|-------|-----------|
| clients | 13 |
| tasks | 9 |
| contacts | 12 |
| activity_log | 1 |
| sync_state | 0 |

**Data Consistency:**
| Source | Clients | Tasks |
|--------|---------|-------|
| SQLite | 13 | 9 |
| JSON (legacy) | 12 | 8 |
| Notes | SQLite has 1 extra from Airtable sync | SQLite has migrated + new tasks |

**Note:** SQLite is now the primary data source. JSON files are kept as backup.

**Integrity Checks:**
| Check | Result |
|-------|--------|
| NULL/empty client names | 0 (PASS) |
| Duplicate client IDs | 0 (PASS) |
| NULL/empty task titles | 0 (PASS) |
| Duplicate task IDs | 0 (PASS) |
| Foreign key violations | 0 (PASS) |
| Database integrity | ok (PASS) |

**Database Settings:**
| Setting | Value |
|---------|-------|
| Journal mode | WAL |
| Foreign keys | OFF (not enforced at runtime) |
| Indexes | 10 indexes present |

**Validation Result:** [x] PASS / [ ] FAIL

**Issues Encountered:** None

**Validation Script:** `backend/validate_db.py` created for future use

---

**Assigned:** 2025-12-05
