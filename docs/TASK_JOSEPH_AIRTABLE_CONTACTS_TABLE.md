# Task: Create airtable_contacts Table

**Assigned To:** Joseph (Database Developer)
**Priority:** P1 - High
**Status:** Pending
**Created:** 2025-12-07
**Dependencies:** None

---

## Objective

Create a new SQLite table `airtable_contacts` to store all contacts synced from Airtable CRM. This is part of the new architecture where SQLite is the source of truth.

---

## Context

**Architecture Decision:** AD-001 (see `ARCHITECTURE_DECISIONS.md`)

The CEO decided:
1. SQLite = Source of Truth (not Airtable)
2. Airtable contacts are synced in batch to local `airtable_contacts` table
3. Users see all contacts in "רשימת קשר" tab
4. When user clicks "פתח תיקייה", contact is copied to `clients` table

---

## Table Schema

Create in `data/eislaw.db`:

```sql
CREATE TABLE IF NOT EXISTS airtable_contacts (
    id TEXT PRIMARY KEY,                    -- Local UUID
    airtable_id TEXT UNIQUE NOT NULL,       -- Airtable record ID (e.g., rec0CKdM2lTytvxHY)

    -- Core Fields (from Airtable)
    name TEXT NOT NULL,                     -- לקוחות field
    email TEXT,                             -- אימייל[0] field
    phone TEXT,                             -- מספר טלפון field
    types TEXT,                             -- סוג לקוח (JSON array)
    stage TEXT,                             -- בטיפול field
    notes TEXT,                             -- הערות field

    -- Airtable Metadata
    whatsapp_url TEXT,                      -- From ווצאפ.url button
    meeting_email_url TEXT,                 -- From מייל תיאום פגישה.url button
    airtable_created_at TEXT,               -- Created field from Airtable
    airtable_modified_at TEXT,              -- Last Modified field from Airtable

    -- Local Metadata
    activated INTEGER DEFAULT 0,            -- 1 if copied to clients table
    activated_at TEXT,                      -- When activated
    client_id TEXT,                         -- FK to clients.id (if activated)

    -- Sync Tracking
    first_synced_at TEXT DEFAULT (datetime('now')),
    last_synced_at TEXT DEFAULT (datetime('now')),
    sync_hash TEXT,                         -- Hash of Airtable data for change detection

    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_airtable_contacts_airtable_id ON airtable_contacts(airtable_id);
CREATE INDEX IF NOT EXISTS idx_airtable_contacts_name ON airtable_contacts(name);
CREATE INDEX IF NOT EXISTS idx_airtable_contacts_activated ON airtable_contacts(activated);
CREATE INDEX IF NOT EXISTS idx_airtable_contacts_client ON airtable_contacts(client_id);
```

---

## Implementation Steps

### Step 1: Create Migration Script

Create `backend/migrations/add_airtable_contacts.py`:

```python
import sqlite3
import os

DB_PATH = os.environ.get('DB_PATH', 'data/eislaw.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create table
    cursor.execute('''
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
        )
    ''')

    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_airtable_contacts_airtable_id ON airtable_contacts(airtable_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_airtable_contacts_name ON airtable_contacts(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_airtable_contacts_activated ON airtable_contacts(activated)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_airtable_contacts_client ON airtable_contacts(client_id)')

    conn.commit()
    conn.close()
    print("Migration complete: airtable_contacts table created")

if __name__ == '__main__':
    migrate()
```

### Step 2: Run Migration on VM

```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
python backend/migrations/add_airtable_contacts.py
```

### Step 3: Verify Table

```bash
sqlite3 data/eislaw.db ".schema airtable_contacts"
```

### Step 4: Update DATA_STORES.md

Add table documentation under Database Schema section.

---

## Field Mapping Reference

| SQLite Column | Airtable Field | Transform |
|---------------|----------------|-----------|
| `name` | `לקוחות` | Direct |
| `email` | `אימייל` | Extract `[0]` from array |
| `phone` | `מספר טלפון` | Direct |
| `types` | `סוג לקוח` | JSON stringify array |
| `stage` | `בטיפול` | Direct |
| `notes` | `הערות` | Direct |
| `whatsapp_url` | `ווצאפ.url` | Extract from button object |
| `meeting_email_url` | `מייל תיאום פגישה.url` | Extract from button object |
| `airtable_created_at` | `Created` | ISO 8601 |
| `airtable_modified_at` | `Last Modified` | ISO 8601 |

---

## Success Criteria

- [ ] Table `airtable_contacts` exists in `data/eislaw.db`
- [ ] All indexes created
- [ ] Can INSERT test record
- [ ] Can SELECT by name, airtable_id
- [ ] Documentation updated

---

## Completion Report

*Fill this in when done:*

| Item | Status |
|------|--------|
| Table created | |
| Indexes created | |
| Migration script works | |
| Tested on VM | |
| Docs updated | |

**Completed By:**
**Date:**
**Notes:**

---

## Related Documents

- `ARCHITECTURE_DECISIONS.md` → AD-001
- `DATA_STORES.md` → Airtable Integration section
- `TASK_ALEX_AIRTABLE_SYNC_ENDPOINTS.md` (depends on this table)
