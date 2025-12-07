# Task: Database Backup Utility

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P2

---

## Objective

Create a backup and restore utility for the SQLite database (`eislaw.db`) to ensure data safety and enable easy recovery.

---

## Background

Now that we have SQLite as our primary database with WAL mode, we need:
1. Regular backup capability
2. Restore capability for disaster recovery
3. Backup verification

---

## Task Checklist

### 1. Create Backup Script

**File:** `backend/backup.py`

```python
#!/usr/bin/env python3
"""
EISLAW Database Backup Utility
"""
import sqlite3
import shutil
import os
from datetime import datetime

DB_PATH = '/app/data/eislaw.db'
BACKUP_DIR = '/app/data/backups'

def create_backup():
    """Create a timestamped backup of the database."""
    os.makedirs(BACKUP_DIR, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f'{BACKUP_DIR}/eislaw_{timestamp}.db'

    # Use SQLite backup API for consistency
    source = sqlite3.connect(DB_PATH)
    dest = sqlite3.connect(backup_path)
    source.backup(dest)
    source.close()
    dest.close()

    print(f'Backup created: {backup_path}')
    return backup_path

def list_backups():
    """List all available backups."""
    if not os.path.exists(BACKUP_DIR):
        print('No backups found')
        return []

    backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.db')])
    for b in backups:
        size = os.path.getsize(f'{BACKUP_DIR}/{b}')
        print(f'  {b} ({size} bytes)')
    return backups

def restore_backup(backup_name):
    """Restore database from backup."""
    backup_path = f'{BACKUP_DIR}/{backup_name}'
    if not os.path.exists(backup_path):
        print(f'Backup not found: {backup_name}')
        return False

    # Create safety backup before restore
    safety_path = f'{DB_PATH}.before_restore'
    shutil.copy2(DB_PATH, safety_path)
    print(f'Safety backup: {safety_path}')

    # Restore
    shutil.copy2(backup_path, DB_PATH)
    print(f'Restored from: {backup_name}')
    return True

def verify_backup(backup_name):
    """Verify backup integrity."""
    backup_path = f'{BACKUP_DIR}/{backup_name}'
    try:
        conn = sqlite3.connect(backup_path)
        cursor = conn.cursor()

        # Check tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f'Tables in backup: {[t[0] for t in tables]}')

        # Count records
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f'  {table[0]}: {count} records')

        conn.close()
        return True
    except Exception as e:
        print(f'Verification failed: {e}')
        return False

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print('Usage: python backup.py [create|list|restore|verify] [backup_name]')
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == 'create':
        create_backup()
    elif cmd == 'list':
        list_backups()
    elif cmd == 'restore' and len(sys.argv) > 2:
        restore_backup(sys.argv[2])
    elif cmd == 'verify' and len(sys.argv) > 2:
        verify_backup(sys.argv[2])
    else:
        print('Invalid command')
```

### 2. Add API Endpoint (Optional)

**File:** `backend/main.py` (or new router)

```python
@app.post("/api/admin/backup")
async def create_backup():
    """Create database backup (admin only)."""
    from backup import create_backup
    path = create_backup()
    return {"status": "ok", "path": path}

@app.get("/api/admin/backups")
async def list_backups():
    """List available backups."""
    from backup import list_backups
    return {"backups": list_backups()}
```

### 3. Test Backup/Restore

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Enter container
docker exec -it eislawmanagerwebapp-api-1 bash

# Create backup
python backup.py create

# List backups
python backup.py list

# Verify backup
python backup.py verify eislaw_YYYYMMDD_HHMMSS.db

# Test restore (careful!)
python backup.py restore eislaw_YYYYMMDD_HHMMSS.db
```

---

## Success Criteria

- [x] `backup.py` script created
- [x] `create` command works
- [x] `list` command works
- [x] `verify` command works
- [x] `restore` command works
- [x] Backup survives container restart

---

## Completion Report

**Date:** 2025-12-05

**Files Created:**
| File | Description |
|------|-------------|
| `backend/backup.py` | CLI backup utility with create/list/verify/restore commands |

**Tests Passed:**
- [x] Create backup
- [x] List backups
- [x] Verify backup integrity
- [x] Restore from backup
- [x] Data survives restore
- [x] Backups persist across container restart

**Backup location:** `/app/data/backups/`

**Current backups:**
- `eislaw_20251205_192253_pre-restore-test.db`
- `eislaw_20251205_192231_test.db`
- `eislaw_2025-12-05_16-16-27_post-migration.db`
- `eislaw_2025-12-05_16-02-25_test.db`

**Issues Encountered:** None

---

**Assigned:** 2025-12-05

