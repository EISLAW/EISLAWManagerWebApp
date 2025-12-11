"""
Database Backup/Restore Utilities for EISLAW

Provides backup, restore, verification, and cleanup functions
for the unified SQLite database.
"""
import shutil
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List
import sqlite3

# Import paths from main db module
try:
    from db import DB_PATH, BACKUP_DIR
except ImportError:
    # Fallback for standalone use
    if os.path.exists("/app"):
        DB_PATH = Path("/app/data/eislaw.db")
        BACKUP_DIR = Path("/app/data/backups")
    else:
        DB_PATH = Path.home() / ".eislaw" / "store" / "eislaw.db"
        BACKUP_DIR = Path.home() / ".eislaw" / "backups"


def backup(destination: Optional[Path] = None, tag: str = "manual") -> Path:
    """
    Create database backup using SQLite's backup API.

    Args:
        destination: Optional custom path for backup file
        tag: Label for the backup (e.g., 'manual', 'scheduled', 'pre-restore')

    Returns:
        Path to the created backup file

    Raises:
        FileNotFoundError: If database doesn't exist
    """
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found: {DB_PATH}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_name = f"eislaw_{timestamp}_{tag}.db"
    backup_path = destination or (BACKUP_DIR / backup_name)

    # Use SQLite's built-in backup API for consistent backup
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
    Creates a backup of the current DB first for safety.

    Args:
        backup_path: Path to the backup file to restore from

    Returns:
        True if restore was successful

    Raises:
        FileNotFoundError: If backup file doesn't exist
    """
    if not backup_path.exists():
        raise FileNotFoundError(f"Backup not found: {backup_path}")

    # Safety: backup current DB first
    if DB_PATH.exists():
        backup(tag="pre-restore")

    # Ensure parent directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Use SQLite backup API for restore too (ensures consistency)
    source = sqlite3.connect(str(backup_path))
    dest = sqlite3.connect(str(DB_PATH))
    source.backup(dest)
    source.close()
    dest.close()

    print(f"Restored from: {backup_path}")
    return True


def list_backups() -> List[dict]:
    """
    List available backups sorted by creation time (newest first).

    Returns:
        List of dicts with backup info (path, name, size_mb, created)
    """
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


def verify(db_path: Path = None) -> dict:
    """
    Verify database integrity and return statistics.

    Args:
        db_path: Path to database (defaults to main DB)

    Returns:
        Dict with integrity status and record counts
    """
    path = db_path or DB_PATH

    if not path.exists():
        return {
            "integrity": "database not found",
            "ok": False,
            "clients": 0,
            "tasks": 0,
            "contacts": 0
        }

    conn = sqlite3.connect(str(path))

    # Integrity check
    cursor = conn.execute("PRAGMA integrity_check")
    integrity = cursor.fetchone()[0]

    # Record counts (handle missing tables gracefully)
    clients_count = 0
    tasks_count = 0
    contacts_count = 0

    try:
        cursor = conn.execute("SELECT COUNT(*) FROM clients")
        clients_count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        pass

    try:
        cursor = conn.execute("SELECT COUNT(*) FROM tasks")
        tasks_count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        pass

    try:
        cursor = conn.execute("SELECT COUNT(*) FROM contacts")
        contacts_count = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        pass

    # Check journal mode
    cursor = conn.execute("PRAGMA journal_mode")
    journal_mode = cursor.fetchone()[0]

    conn.close()

    return {
        "integrity": integrity,
        "ok": integrity == "ok",
        "clients": clients_count,
        "tasks": tasks_count,
        "contacts": contacts_count,
        "journal_mode": journal_mode,
        "path": str(path),
        "size_mb": round(path.stat().st_size / 1024 / 1024, 2)
    }


def cleanup(keep_days: int = 7, keep_min: int = 3) -> int:
    """
    Remove backups older than keep_days, but always keep at least keep_min backups.

    Args:
        keep_days: Remove backups older than this many days
        keep_min: Always keep at least this many backups

    Returns:
        Number of backups removed
    """
    if not BACKUP_DIR.exists():
        return 0

    backups = list_backups()

    # Always keep minimum number of backups
    if len(backups) <= keep_min:
        return 0

    cutoff = datetime.now().timestamp() - (keep_days * 24 * 60 * 60)
    removed = 0

    # Sort by date, keep newest keep_min regardless of age
    for i, b in enumerate(backups):
        if i < keep_min:
            continue  # Always keep newest keep_min

        backup_path = Path(b["path"])
        if backup_path.stat().st_mtime < cutoff:
            backup_path.unlink()
            removed += 1
            print(f"Removed old backup: {b['name']}")

    return removed


def get_backup_info() -> dict:
    """
    Get summary info about backup status.

    Returns:
        Dict with backup count, latest backup time, total size
    """
    backups = list_backups()

    if not backups:
        return {
            "count": 0,
            "latest": None,
            "total_size_mb": 0,
            "oldest": None
        }

    total_size = sum(b["size_mb"] for b in backups)

    return {
        "count": len(backups),
        "latest": backups[0]["created"] if backups else None,
        "oldest": backups[-1]["created"] if backups else None,
        "total_size_mb": round(total_size, 2),
        "backup_dir": str(BACKUP_DIR)
    }
