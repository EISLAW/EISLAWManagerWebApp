#!/usr/bin/env python3
"""
CLI tool for database backup/restore.

Usage:
    python backup_db.py backup [--tag TAG]
    python backup_db.py restore BACKUP_FILE
    python backup_db.py list
    python backup_db.py verify
    python backup_db.py cleanup [--days DAYS]
    python backup_db.py info

Examples:
    python backup_db.py backup --tag daily
    python backup_db.py restore ~/.eislaw/backups/eislaw_2025-12-05_manual.db
    python backup_db.py list
    python backup_db.py verify
    python backup_db.py cleanup --days 7
"""
import argparse
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

try:
    from db_backup import backup, restore, list_backups, verify, cleanup, get_backup_info
except ImportError as e:
    print(f"Error importing db_backup module: {e}")
    print("Make sure you're running from the project root directory.")
    sys.exit(1)


def cmd_backup(args):
    """Handle backup command."""
    try:
        path = backup(tag=args.tag)
        print(f"Backup created: {path}")
        return 0
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return 1
    except Exception as e:
        print(f"Backup failed: {e}")
        return 1


def cmd_restore(args):
    """Handle restore command."""
    backup_path = Path(args.file)

    if not backup_path.exists():
        print(f"Error: Backup file not found: {backup_path}")
        return 1

    try:
        restore(backup_path)
        print("Restore complete")

        # Verify the restored database
        result = verify()
        if result["ok"]:
            print(f"  Clients: {result['clients']}")
            print(f"  Tasks: {result['tasks']}")
            print(f"  Contacts: {result['contacts']}")
        else:
            print(f"Warning: Integrity check returned: {result['integrity']}")

        return 0
    except Exception as e:
        print(f"Restore failed: {e}")
        return 1


def cmd_list(args):
    """Handle list command."""
    backups = list_backups()

    if not backups:
        print("No backups found")
        return 0

    print(f"{'Name':<45} {'Size (MB)':<12} {'Created'}")
    print("-" * 80)

    for b in backups:
        print(f"{b['name']:<45} {b['size_mb']:<12} {b['created']}")

    print(f"\nTotal: {len(backups)} backup(s)")
    return 0


def cmd_verify(args):
    """Handle verify command."""
    result = verify()

    if result["ok"]:
        print("Database OK")
        print(f"  Path: {result['path']}")
        print(f"  Size: {result['size_mb']} MB")
        print(f"  Journal: {result['journal_mode']}")
        print(f"  Clients: {result['clients']}")
        print(f"  Tasks: {result['tasks']}")
        print(f"  Contacts: {result['contacts']}")
        return 0
    else:
        print(f"Database integrity check FAILED")
        print(f"  Result: {result['integrity']}")
        return 1


def cmd_cleanup(args):
    """Handle cleanup command."""
    removed = cleanup(keep_days=args.days)
    print(f"Removed {removed} old backup(s)")
    return 0


def cmd_info(args):
    """Handle info command."""
    info = get_backup_info()

    print("Backup Status")
    print("-" * 40)
    print(f"  Backup directory: {info.get('backup_dir', 'N/A')}")
    print(f"  Total backups: {info['count']}")
    print(f"  Total size: {info['total_size_mb']} MB")

    if info['latest']:
        print(f"  Latest backup: {info['latest']}")
    if info['oldest']:
        print(f"  Oldest backup: {info['oldest']}")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="EISLAW Database Backup Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # backup command
    backup_parser = subparsers.add_parser("backup", help="Create a new backup")
    backup_parser.add_argument(
        "--tag",
        default="manual",
        help="Tag for the backup (default: manual)"
    )

    # restore command
    restore_parser = subparsers.add_parser("restore", help="Restore from backup")
    restore_parser.add_argument("file", help="Path to backup file")

    # list command
    subparsers.add_parser("list", help="List available backups")

    # verify command
    subparsers.add_parser("verify", help="Verify database integrity")

    # cleanup command
    cleanup_parser = subparsers.add_parser("cleanup", help="Remove old backups")
    cleanup_parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Remove backups older than N days (default: 7)"
    )

    # info command
    subparsers.add_parser("info", help="Show backup status info")

    args = parser.parse_args()

    # Dispatch to appropriate handler
    handlers = {
        "backup": cmd_backup,
        "restore": cmd_restore,
        "list": cmd_list,
        "verify": cmd_verify,
        "cleanup": cmd_cleanup,
        "info": cmd_info
    }

    handler = handlers.get(args.command)
    if handler:
        sys.exit(handler(args))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
