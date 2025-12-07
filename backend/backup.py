#!/usr/bin/env python3
"""
EISLAW Database Backup Utility

Usage:
    python backup.py create           - Create timestamped backup
    python backup.py list             - List all backups
    python backup.py verify <name>    - Verify backup integrity
    python backup.py restore <name>   - Restore from backup
"""
import sqlite3
import shutil
import os
from datetime import datetime
from pathlib import Path

# Paths - work both in container and local
DB_PATH = Path("/app/data/eislaw.db")
BACKUP_DIR = Path("/app/data/backups")

# Fallback for local development
if not DB_PATH.parent.exists():
    DB_PATH = Path.home() / ".eislaw" / "data" / "eislaw.db"
    BACKUP_DIR = Path.home() / ".eislaw" / "backups"


def create_backup(tag: str = None) -> str:
    """Create a timestamped backup of the database."""
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    suffix = f"_{tag}" if tag else ""
    backup_path = BACKUP_DIR / f"eislaw_{timestamp}{suffix}.db"

    # Use SQLite backup API for consistency (handles WAL mode properly)
    source = sqlite3.connect(str(DB_PATH))
    dest = sqlite3.connect(str(backup_path))
    source.backup(dest)
    source.close()
    dest.close()

    size_mb = backup_path.stat().st_size / (1024 * 1024)
    print(f"Backup created: {backup_path}")
    print(f"Size: {size_mb:.2f} MB")
    return str(backup_path)


def list_backups() -> list:
    """List all available backups."""
    if not BACKUP_DIR.exists():
        print("No backups found")
        return []

    backups = sorted(BACKUP_DIR.glob("*.db"), key=lambda f: f.stat().st_mtime, reverse=True)

    if not backups:
        print("No backups found")
        return []

    header = f"{'Name':<45} {'Size (MB)':<10} Created"
    print(header)
    print("-" * 75)

    result = []
    for b in backups:
        size_mb = b.stat().st_size / (1024 * 1024)
        mtime = datetime.fromtimestamp(b.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"{b.name:<45} {size_mb:<10.2f} {mtime}")
        result.append(b.name)

    print(f"\nTotal: {len(backups)} backup(s)")
    return result


def verify_backup(backup_name: str) -> bool:
    """Verify backup integrity."""
    backup_path = BACKUP_DIR / backup_name

    if not backup_path.exists():
        print(f"Backup not found: {backup_name}")
        return False

    try:
        conn = sqlite3.connect(str(backup_path))
        cursor = conn.cursor()

        # Run integrity check
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()[0]

        if result != "ok":
            print(f"Integrity check FAILED: {result}")
            conn.close()
            return False

        print("Integrity check: OK")

        # Check tables and record counts
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()

        print("\nTables in backup:")
        for table in tables:
            table_name = table[0]
            if table_name.startswith("sqlite_"):
                continue
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"  {table_name}: {count} records")

        conn.close()
        print(f"\nBackup verified: {backup_name}")
        return True

    except Exception as e:
        print(f"Verification failed: {e}")
        return False


def restore_backup(backup_name: str) -> bool:
    """Restore database from backup."""
    backup_path = BACKUP_DIR / backup_name

    if not backup_path.exists():
        print(f"Backup not found: {backup_name}")
        return False

    # Create safety backup before restore
    if DB_PATH.exists():
        safety_path = DB_PATH.with_suffix(".before_restore.db")
        print(f"Creating safety backup: {safety_path}")

        source = sqlite3.connect(str(DB_PATH))
        dest = sqlite3.connect(str(safety_path))
        source.backup(dest)
        source.close()
        dest.close()

    # Remove WAL and SHM files if they exist
    wal_path = Path(str(DB_PATH) + "-wal")
    shm_path = Path(str(DB_PATH) + "-shm")
    if wal_path.exists():
        wal_path.unlink()
    if shm_path.exists():
        shm_path.unlink()

    # Restore using SQLite backup API
    source = sqlite3.connect(str(backup_path))
    dest = sqlite3.connect(str(DB_PATH))
    source.backup(dest)
    source.close()
    dest.close()

    print(f"Restored from: {backup_name}")
    return True


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "create":
        tag = sys.argv[2] if len(sys.argv) > 2 else None
        create_backup(tag)
    elif cmd == "list":
        list_backups()
    elif cmd == "verify":
        if len(sys.argv) < 3:
            print("Usage: python backup.py verify <backup_name>")
            sys.exit(1)
        verify_backup(sys.argv[2])
    elif cmd == "restore":
        if len(sys.argv) < 3:
            print("Usage: python backup.py restore <backup_name>")
            sys.exit(1)
        restore_backup(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)
