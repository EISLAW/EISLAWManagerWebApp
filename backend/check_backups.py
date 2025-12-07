#!/usr/bin/env python3
"""
EISLAW Backup Health Check

Checks that recent backups exist and alerts if backup is too old.
Can be run manually or integrated into monitoring system.

Usage:
    python check_backups.py         - Check backup status
    python check_backups.py --json  - Output as JSON
"""
import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
BACKUP_DIR = Path("/app/data/backups")
MAX_AGE_HOURS = 26  # Alert if no backup in 26 hours (allows for daily + 2hr buffer)
MIN_BACKUP_COUNT = 1  # Minimum number of backups to keep


def check_backups():
    """Check backup health and return status."""
    result = {
        "healthy": True,
        "issues": [],
        "backup_count": 0,
        "latest_backup": None,
        "latest_age_hours": None,
        "auto_backups": 0,
        "manual_backups": 0
    }

    # Check backup directory exists
    if not BACKUP_DIR.exists():
        result["healthy"] = False
        result["issues"].append("Backup directory does not exist")
        return result

    # Get all backup files
    backups = list(BACKUP_DIR.glob("*.db"))
    result["backup_count"] = len(backups)

    if not backups:
        result["healthy"] = False
        result["issues"].append("No backups found")
        return result

    # Categorize backups
    for b in backups:
        if "auto-daily" in b.name:
            result["auto_backups"] += 1
        else:
            result["manual_backups"] += 1

    # Find newest backup
    newest = max(backups, key=lambda f: f.stat().st_mtime)
    mtime = datetime.fromtimestamp(newest.stat().st_mtime)
    age = datetime.now() - mtime
    age_hours = age.total_seconds() / 3600

    result["latest_backup"] = newest.name
    result["latest_age_hours"] = round(age_hours, 1)

    # Check if backup is too old
    if age_hours > MAX_AGE_HOURS:
        result["healthy"] = False
        result["issues"].append(f"Latest backup is {age_hours:.1f} hours old (max: {MAX_AGE_HOURS})")

    # Check minimum backup count
    if len(backups) < MIN_BACKUP_COUNT:
        result["healthy"] = False
        result["issues"].append(f"Only {len(backups)} backup(s) found (min: {MIN_BACKUP_COUNT})")

    return result


def main():
    result = check_backups()

    # JSON output mode
    if "--json" in sys.argv:
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["healthy"] else 1)

    # Human-readable output
    status = "✅ HEALTHY" if result["healthy"] else "❌ UNHEALTHY"
    print(f"Backup Status: {status}")
    print(f"")
    print(f"  Total backups:  {result['backup_count']}")
    print(f"  Auto backups:   {result['auto_backups']}")
    print(f"  Manual backups: {result['manual_backups']}")
    print(f"")

    if result["latest_backup"]:
        print(f"  Latest backup:  {result['latest_backup']}")
        print(f"  Backup age:     {result['latest_age_hours']} hours")

    if result["issues"]:
        print(f"")
        print(f"Issues:")
        for issue in result["issues"]:
            print(f"  - {issue}")

    sys.exit(0 if result["healthy"] else 1)


if __name__ == "__main__":
    main()
