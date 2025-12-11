"""
Database Health Monitoring Router

Provides health check and metrics endpoints for monitoring stack and CI/CD.
"""
from fastapi import APIRouter
import sqlite3
import os
from datetime import datetime
from pathlib import Path

router = APIRouter(prefix="/api/db", tags=["database"])

# Database path - works in both container and local
DB_PATH = Path("/app/data/eislaw.db")
if not DB_PATH.parent.exists():
    DB_PATH = Path.home() / ".eislaw" / "data" / "eislaw.db"

BACKUP_DIR = Path("/app/data/backups")
if not BACKUP_DIR.parent.exists():
    BACKUP_DIR = Path.home() / ".eislaw" / "backups"


@router.get("/health")
async def db_health():
    """
    Database health check endpoint.

    Returns:
        - status: "healthy" or "unhealthy"
        - timestamp: Current UTC time
        - checks: Individual check results
        - counts: Record counts per table
        - size_mb: Database file size
        - backup: Latest backup info
    """
    result = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": {},
        "counts": {},
        "size_mb": 0,
        "backup": None
    }

    db_path = str(DB_PATH)

    # Check 1: Database file exists
    result["checks"]["file_exists"] = DB_PATH.exists()

    if not result["checks"]["file_exists"]:
        result["status"] = "unhealthy"
        result["error"] = f"Database file not found: {db_path}"
        return result

    try:
        conn = sqlite3.connect(db_path, timeout=5)
        cursor = conn.cursor()
        result["checks"]["connection"] = True

        # Check 2: Integrity check
        cursor.execute("PRAGMA integrity_check")
        integrity = cursor.fetchone()[0]
        result["checks"]["integrity"] = integrity == "ok"

        # Check 3: WAL mode
        cursor.execute("PRAGMA journal_mode")
        journal_mode = cursor.fetchone()[0]
        result["checks"]["wal_mode"] = journal_mode == "wal"

        # Check 4: Table counts
        tables = ["clients", "tasks", "contacts", "activity_log", "agent_approvals", "agent_audit_log", "agent_settings", "agent_metrics"]
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                result["counts"][table] = cursor.fetchone()[0]
            except:
                result["counts"][table] = -1

        # Check 5: Database size
        result["size_mb"] = round(DB_PATH.stat().st_size / 1024 / 1024, 2)

        # Check 6: Backup status
        if BACKUP_DIR.exists():
            backups = list(BACKUP_DIR.glob("*.db"))
            if backups:
                newest = max(backups, key=lambda f: f.stat().st_mtime)
                age_hours = (datetime.now() - datetime.fromtimestamp(newest.stat().st_mtime)).total_seconds() / 3600
                result["backup"] = {
                    "latest": newest.name,
                    "age_hours": round(age_hours, 1),
                    "count": len(backups),
                    "healthy": age_hours < 26  # Alert if older than 26 hours
                }
                result["checks"]["backup_recent"] = age_hours < 26
            else:
                result["checks"]["backup_recent"] = False
                result["backup"] = {"count": 0, "healthy": False}

        conn.close()

    except Exception as e:
        result["status"] = "unhealthy"
        result["checks"]["connection"] = False
        result["error"] = str(e)
        return result

    # Determine overall status
    critical_checks = ["file_exists", "connection", "integrity"]
    for check in critical_checks:
        if not result["checks"].get(check, False):
            result["status"] = "unhealthy"
            break

    return result


@router.get("/stats")
async def db_stats():
    """
    Detailed database statistics.

    Returns record counts, table info, and index details.
    """
    db_path = str(DB_PATH)

    if not DB_PATH.exists():
        return {"error": "Database not found"}

    try:
        conn = sqlite3.connect(db_path, timeout=5)
        cursor = conn.cursor()

        stats = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "tables": {},
            "indexes": [],
            "size_mb": round(DB_PATH.stat().st_size / 1024 / 1024, 2)
        }

        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in cursor.fetchall()]

        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            stats["tables"][table] = {"count": count}

        # Get indexes
        cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
        stats["indexes"] = [{"name": row[0], "table": row[1]} for row in cursor.fetchall()]

        conn.close()
        return stats

    except Exception as e:
        return {"error": str(e)}
