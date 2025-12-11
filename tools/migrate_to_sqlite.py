#!/usr/bin/env python3
"""
Migration script: JSON to SQLite
Migrates clients.json and tasks.json to the unified SQLite database.

Usage:
    python migrate_to_sqlite.py [--dry-run]
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from db import Database, ClientsDB, TasksDB, ContactsDB, log_activity

# Paths
if os.path.exists("/app"):
    STORE_PATH = Path.home() / ".eislaw" / "store"
else:
    STORE_PATH = Path.home() / ".eislaw" / "store"

CLIENTS_JSON = STORE_PATH / "clients.json"
TASKS_JSON = STORE_PATH / "tasks.json"


def migrate_clients(db: Database, dry_run: bool = False) -> dict:
    """Migrate clients from JSON to SQLite."""
    if not CLIENTS_JSON.exists():
        print(f"Warning: {CLIENTS_JSON} not found")
        return {"migrated": 0, "contacts": 0, "errors": []}

    with open(CLIENTS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    clients_data = data.get("clients", data) if isinstance(data, dict) else data

    clients_db = ClientsDB(db)
    contacts_db = ContactsDB(db)

    migrated = 0
    contacts_migrated = 0
    errors = []

    for client in clients_data:
        try:
            # Map fields
            email = client.get("email", "")
            if isinstance(email, list):
                email = email[0] if email else ""

            client_data = {
                "id": client.get("id"),
                "name": client.get("display_name", "Unknown"),
                "email": email,
                "phone": client.get("phone", ""),
                "stage": client.get("stage") or "new",
                "types": client.get("client_type", []),
                "airtable_id": client.get("airtable_id", ""),
                "airtable_url": client.get("airtable_url", ""),
                "sharepoint_url": client.get("sharepoint_url", ""),
                "local_folder": client.get("folder", ""),
                "active": 1 if client.get("active", True) else 0,
                "notes": client.get("notes", ""),
                "sync_source": "json_migration"
            }

            if dry_run:
                print(f"  Would migrate client: {client_data['name']}")
            else:
                client_id = clients_db.save(client_data)
                migrated += 1
                print(f"  Migrated client: {client_data['name']} -> {client_id}")

                # Migrate contacts for this client
                for contact in client.get("contacts", []):
                    if contact.get("name") or contact.get("email"):
                        contact_data = {
                            "client_id": client_id,
                            "name": contact.get("name", ""),
                            "email": contact.get("email", ""),
                            "phone": contact.get("phone", ""),
                            "role": contact.get("role", contact.get("role_desc", "")),
                            "notes": ""
                        }
                        contacts_db.save(contact_data)
                        contacts_migrated += 1

        except Exception as e:
            errors.append(f"Client {client.get('display_name', 'unknown')}: {str(e)}")
            print(f"  Error: {e}")

    return {
        "migrated": migrated,
        "contacts": contacts_migrated,
        "errors": errors
    }


def migrate_tasks(db: Database, dry_run: bool = False) -> dict:
    """Migrate tasks from JSON to SQLite."""
    if not TASKS_JSON.exists():
        print(f"Warning: {TASKS_JSON} not found")
        return {"migrated": 0, "errors": []}

    with open(TASKS_JSON, "r", encoding="utf-8") as f:
        tasks_data = json.load(f)

    tasks_db = TasksDB(db)
    clients_db = ClientsDB(db)

    migrated = 0
    errors = []

    # Map JSON status to SQLite status
    status_map = {
        "new": "todo",
        "in_progress": "doing",
        "done": "done",
        "cancelled": "cancelled"
    }

    for task in tasks_data:
        try:
            # Try to find client by name
            client_id = None
            client_name = task.get("clientName", "")
            if client_name:
                client = clients_db.get_by_name(client_name)
                if client:
                    client_id = client["id"]

            # Map fields
            status = status_map.get(task.get("status", "new"), "todo")
            done = 1 if status == "done" else 0

            task_data = {
                "id": task.get("id"),
                "client_id": client_id,
                "client_name": client_name,
                "title": task.get("title", "Untitled"),
                "description": task.get("desc", ""),
                "done": done,
                "status": status,
                "priority": task.get("priority") or "medium",
                "due_date": task.get("dueAt", "").split("T")[0] if task.get("dueAt") else None,
                "assigned_to": task.get("ownerId", ""),
                "source_type": task.get("source", "migration"),
                "source_id": task.get("parentId", "")  # Store parent task reference
            }

            if dry_run:
                print(f"  Would migrate task: {task_data['title']}")
            else:
                task_id = tasks_db.save(task_data)
                migrated += 1
                print(f"  Migrated task: {task_data['title']} -> {task_id}")

                # If task was completed, update completed_at
                if done and task.get("doneAt"):
                    db.execute(
                        "UPDATE tasks SET completed_at = ? WHERE id = ?",
                        (task.get("doneAt"), task_id)
                    )

        except Exception as e:
            errors.append(f"Task {task.get('title', 'unknown')}: {str(e)}")
            print(f"  Error: {e}")

    return {
        "migrated": migrated,
        "errors": errors
    }


def verify_migration(db: Database) -> dict:
    """Verify migration was successful."""
    clients_db = ClientsDB(db)
    tasks_db = TasksDB(db)

    return {
        "clients_count": clients_db.count(active_only=False),
        "active_clients": clients_db.count(active_only=True),
        "tasks_count": tasks_db.count(),
        "done_tasks": tasks_db.count(done=True),
        "open_tasks": tasks_db.count(done=False)
    }


def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("EISLAW JSON to SQLite Migration")
    print("=" * 60)

    if dry_run:
        print("DRY RUN MODE - No changes will be made\n")

    # Initialize database
    db = Database()

    # Migrate clients
    print("\n--- Migrating Clients ---")
    clients_result = migrate_clients(db, dry_run)
    print(f"\nClients migrated: {clients_result['migrated']}")
    print(f"Contacts migrated: {clients_result['contacts']}")
    if clients_result['errors']:
        print(f"Errors: {len(clients_result['errors'])}")
        for e in clients_result['errors']:
            print(f"  - {e}")

    # Migrate tasks
    print("\n--- Migrating Tasks ---")
    tasks_result = migrate_tasks(db, dry_run)
    print(f"\nTasks migrated: {tasks_result['migrated']}")
    if tasks_result['errors']:
        print(f"Errors: {len(tasks_result['errors'])}")
        for e in tasks_result['errors']:
            print(f"  - {e}")

    # Verify
    if not dry_run:
        print("\n--- Verification ---")
        stats = verify_migration(db)
        print(f"Total clients in SQLite: {stats['clients_count']}")
        print(f"Active clients: {stats['active_clients']}")
        print(f"Total tasks in SQLite: {stats['tasks_count']}")
        print(f"Done tasks: {stats['done_tasks']}")
        print(f"Open tasks: {stats['open_tasks']}")

        # Log the migration
        log_activity(
            db,
            event_type="migration",
            entity_type="system",
            details={
                "clients_migrated": clients_result['migrated'],
                "contacts_migrated": clients_result['contacts'],
                "tasks_migrated": tasks_result['migrated'],
                "timestamp": datetime.now().isoformat()
            },
            success=True
        )

    print("\n" + "=" * 60)
    if dry_run:
        print("DRY RUN COMPLETE - Run without --dry-run to migrate")
    else:
        print("MIGRATION COMPLETE")
    print("=" * 60)

    return 0 if not (clients_result['errors'] or tasks_result['errors']) else 1


if __name__ == "__main__":
    sys.exit(main())
