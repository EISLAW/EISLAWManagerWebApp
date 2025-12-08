import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = Path(os.environ.get("DB_PATH", Path(__file__).resolve().parent.parent / "data" / "eislaw.db"))


def _connect():
    """Create SQLite connection with sensible defaults."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _ensure_tables(conn: sqlite3.Connection):
    """Create required tables if missing."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            phone TEXT,
            stage TEXT,
            types TEXT,
            airtable_id TEXT,
            airtable_url TEXT,
            sharepoint_url TEXT,
            local_folder TEXT,
            active INTEGER,
            notes TEXT,
            created_at TEXT,
            updated_at TEXT,
            last_synced_at TEXT,
            sync_source TEXT,
            slug TEXT,
            sharepoint_id TEXT,
            last_activity_at TEXT,
            archived INTEGER DEFAULT 0,
            archived_at TEXT,
            archived_reason TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT,
            desc TEXT,
            status TEXT,
            priority TEXT DEFAULT 'medium',
            due_at TEXT,
            client_name TEXT,
            client_folder_path TEXT,
            owner_id TEXT,
            parent_id TEXT,
            source TEXT DEFAULT 'manual',
            comments TEXT,
            attachments TEXT,
            template_ref TEXT,
            created_at TEXT,
            updated_at TEXT,
            done_at TEXT,
            deleted_at TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            client_id TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            role TEXT,
            notes TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        )
        """
    )
    conn.execute(
        """
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
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sync_state (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            last_sync_at TEXT,
            last_sync_cursor TEXT,
            status TEXT DEFAULT 'idle',
            error_message TEXT,
            records_synced INTEGER DEFAULT 0
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(archived)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_airtable_contacts_airtable_id ON airtable_contacts(airtable_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_airtable_contacts_name ON airtable_contacts(name)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_airtable_contacts_activated ON airtable_contacts(activated)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_airtable_contacts_client ON airtable_contacts(client_id)")
    conn.commit()


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {k: row[k] for k in row.keys()}


def _normalize_client_row(row: sqlite3.Row) -> Dict[str, Any]:
    """Normalize a client row to the shape expected by API/agents."""
    item = _row_to_dict(row)
    item["type"] = json.loads(item["types"]) if item.get("types") else []
    item["active"] = bool(item.get("active", 1)) if item.get("active") is not None else True
    item["archived"] = bool(item.get("archived", 0)) if item.get("archived") is not None else False
    item["createdAt"] = item.get("created_at")
    item["updatedAt"] = item.get("updated_at")
    item["archivedAt"] = item.get("archived_at")
    item["archivedReason"] = item.get("archived_reason")
    item["folderPath"] = item.get("local_folder") or item.get("sharepoint_url") or ""
    return item


# ─────────────────────────────────────────────────────────────
# Clients helpers
# ─────────────────────────────────────────────────────────────

def load_clients_from_sqlite() -> List[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM clients")
    rows = cur.fetchall()
    conn.close()
    return [_normalize_client_row(r) for r in rows]


def list_clients(archived_filter: str = "0") -> List[Dict[str, Any]]:
    """
    List clients filtered by archive state.
    archived_filter: "0" (active/default), "1" (archived), "all"
    """
    conn = _connect()
    _ensure_tables(conn)
    query = "SELECT * FROM clients"
    params: List[Any] = []
    if archived_filter == "0":
        query += " WHERE archived = 0 OR archived IS NULL"
    elif archived_filter == "1":
        query += " WHERE archived = 1"
    cur = conn.execute(query, params)
    rows = cur.fetchall()
    conn.close()
    return [_normalize_client_row(r) for r in rows]


def find_client_by_id(client_id: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    return _normalize_client_row(row)


def create_client(client: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    _ensure_tables(conn)
    now = datetime.utcnow().isoformat() + "Z"
    client_id = client.get("id") or str(uuid.uuid4())
    types_str = json.dumps(client.get("types") or client.get("type") or [])
    existing = find_client_by_id(client_id)
    slug = client.get("slug")
    sharepoint_id = client.get("sharepoint_id")
    last_activity_at = client.get("last_activity_at") or client.get("lastActivityAt")
    archived_value = client.get("archived")
    archived_at = client.get("archived_at") or client.get("archivedAt")
    archived_reason = client.get("archived_reason") or client.get("archivedReason")

    if existing:
        if slug is None:
            slug = existing.get("slug")
        if sharepoint_id is None:
            sharepoint_id = existing.get("sharepoint_id")
        if last_activity_at is None:
            last_activity_at = existing.get("last_activity_at") or existing.get("lastActivityAt")
        if archived_value is None:
            archived_value = existing.get("archived", 0)
        if archived_at is None:
            archived_at = existing.get("archived_at") or existing.get("archivedAt")
        if archived_reason is None:
            archived_reason = existing.get("archived_reason") or existing.get("archivedReason")

    archived_int = int(archived_value) if archived_value is not None else 0
    conn.execute(
        """
        INSERT OR REPLACE INTO clients (
            id, name, email, phone, stage, types, airtable_id, airtable_url,
            sharepoint_url, local_folder, active, notes, created_at, updated_at,
            last_synced_at, sync_source, slug, sharepoint_id, last_activity_at, archived, archived_at, archived_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            client_id,
            client.get("name"),
            client.get("email"),
            client.get("phone"),
            client.get("stage"),
            types_str,
            client.get("airtable_id"),
            client.get("airtable_url"),
            client.get("sharepoint_url"),
            client.get("local_folder"),
            int(client.get("active", 1)),
            client.get("notes"),
            client.get("created_at") or now,
            client.get("updated_at") or now,
            client.get("last_synced_at"),
            client.get("sync_source"),
            slug,
            sharepoint_id,
            last_activity_at,
            archived_int,
            archived_at,
            archived_reason,
        ),
    )
    conn.commit()
    conn.close()
    client["id"] = client_id
    client["types"] = json.loads(types_str) if types_str else []
    client["slug"] = slug
    client["sharepoint_id"] = sharepoint_id
    client["last_activity_at"] = last_activity_at
    client["archived"] = bool(archived_int)
    client["archived_at"] = archived_at
    client["archived_reason"] = archived_reason
    return client


def update_client_archive_state(client_id: str, archive: bool, reason: str = "manual") -> Tuple[Optional[Dict[str, Any]], bool, Optional[str]]:
    """
    Update archive state for a client.
    Returns (client, changed_flag, conflict_reason)
    conflict_reason is 'already_archived' or 'already_active' when applicable.
    """
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return None, False, None

    current = _normalize_client_row(row)
    if archive and current.get("archived"):
        conn.close()
        return current, False, "already_archived"
    if not archive and not current.get("archived"):
        conn.close()
        return current, False, "already_active"

    now = datetime.utcnow().isoformat() + "Z"
    archived_at = now if archive else None
    archived_reason = reason if archive else None
    archived_value = 1 if archive else 0
    active_value = 0 if archive else 1

    conn.execute(
        """
        UPDATE clients
        SET archived = ?, archived_at = ?, archived_reason = ?, active = ?, updated_at = ?
        WHERE id = ?
        """,
        (archived_value, archived_at, archived_reason, active_value, now, client_id),
    )
    conn.commit()

    cur = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
    updated_row = cur.fetchone()
    conn.close()
    return _normalize_client_row(updated_row), True, None


# ─────────────────────────────────────────────────────────────
# Tasks helpers
# ─────────────────────────────────────────────────────────────

def _deserialize_task(row: sqlite3.Row) -> Dict[str, Any]:
    task = _row_to_dict(row)
    task["comments"] = json.loads(task["comments"]) if task.get("comments") else []
    task["attachments"] = json.loads(task["attachments"]) if task.get("attachments") else []
    task["dueAt"] = task.get("due_at")
    task["clientName"] = task.get("client_name")
    task["clientFolderPath"] = task.get("client_folder_path")
    task["templateRef"] = task.get("template_ref")
    task["createdAt"] = task.get("created_at")
    task["updatedAt"] = task.get("updated_at")
    task["doneAt"] = task.get("done_at")
    task["deletedAt"] = task.get("deleted_at")
    return task


def load_tasks_from_sqlite() -> List[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM tasks")
    rows = cur.fetchall()
    conn.close()
    return [_deserialize_task(r) for r in rows]


def find_task_by_id(task_id: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = cur.fetchone()
    conn.close()
    return _deserialize_task(row) if row else None


def create_task_in_sqlite(task: Dict[str, Any]) -> None:
    conn = _connect()
    _ensure_tables(conn)
    now = datetime.utcnow().isoformat() + "Z"
    task_id = task.get("id") or str(uuid.uuid4())
    conn.execute(
        """
        INSERT OR REPLACE INTO tasks (
            id, title, desc, status, priority, due_at, client_name, client_folder_path,
            owner_id, parent_id, source, comments, attachments, template_ref,
            created_at, updated_at, done_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            task_id,
            task.get("title"),
            task.get("desc"),
            task.get("status"),
            task.get("priority"),
            task.get("dueAt") or task.get("due_at"),
            task.get("clientName") or task.get("client_name"),
            task.get("clientFolderPath") or task.get("client_folder_path"),
            task.get("ownerId") or task.get("owner_id"),
            task.get("parentId") or task.get("parent_id"),
            task.get("source") or "manual",
            json.dumps(task.get("comments") or []),
            json.dumps(task.get("attachments") or []),
            task.get("templateRef") or task.get("template_ref"),
            task.get("createdAt") or task.get("created_at") or now,
            task.get("updatedAt") or task.get("updated_at") or now,
            task.get("doneAt") or task.get("done_at"),
            task.get("deletedAt") or task.get("deleted_at"),
        ),
    )
    conn.commit()
    conn.close()


def update_task_in_sqlite(task_id: str, payload: Dict[str, Any]) -> None:
    conn = _connect()
    _ensure_tables(conn)
    now = datetime.utcnow().isoformat() + "Z"
    fields = []
    params: List[Any] = []
    mapping = {
        "title": "title",
        "desc": "desc",
        "status": "status",
        "priority": "priority",
        "dueAt": "due_at",
        "due_at": "due_at",
        "clientName": "client_name",
        "client_folder_path": "client_folder_path",
        "clientFolderPath": "client_folder_path",
        "ownerId": "owner_id",
        "owner_id": "owner_id",
        "parentId": "parent_id",
        "parent_id": "parent_id",
        "source": "source",
        "comments": "comments",
        "attachments": "attachments",
        "templateRef": "template_ref",
        "template_ref": "template_ref",
        "doneAt": "done_at",
        "deletedAt": "deleted_at",
    }
    for key, column in mapping.items():
        if key in payload:
            val = payload[key]
            if key in ["comments", "attachments"] and not isinstance(val, str):
                val = json.dumps(val or [])
            fields.append(f"{column} = ?")
            params.append(val)
    fields.append("updated_at = ?")
    params.append(payload.get("updatedAt") or payload.get("updated_at") or now)
    params.append(task_id)
    conn.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    conn.close()


def delete_task_from_sqlite(task_id: str) -> None:
    conn = _connect()
    _ensure_tables(conn)
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()


def mark_task_done_in_sqlite(task_id: str, done: bool) -> None:
    conn = _connect()
    _ensure_tables(conn)
    now = datetime.utcnow().isoformat() + "Z"
    conn.execute(
        "UPDATE tasks SET status = ?, done_at = ?, updated_at = ? WHERE id = ?",
        ("done" if done else "new", now if done else None, now, task_id),
    )
    conn.commit()
    conn.close()


def update_or_create_task_in_sqlite(task: Dict[str, Any]) -> None:
    existing = find_task_by_id(task.get("id"))
    if existing:
        update_task_in_sqlite(task["id"], task)
    else:
        create_task_in_sqlite(task)


# ─────────────────────────────────────────────────────────────
# Airtable contacts helpers
# ─────────────────────────────────────────────────────────────

def upsert_airtable_contact(contact: Dict[str, Any]) -> Tuple[Dict[str, Any], bool]:
    """
    Upsert airtable_contacts row.
    Returns (saved_contact, created_flag)
    """
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM airtable_contacts WHERE airtable_id = ?", (contact["airtable_id"],))
    row = cur.fetchone()
    now = datetime.utcnow().isoformat() + "Z"
    contact_id = contact.get("id") or (row["id"] if row else str(uuid.uuid4()))
    types_str = json.dumps(contact.get("types") or [])
    sync_hash = contact.get("sync_hash")
    conn.execute(
        """
        INSERT OR REPLACE INTO airtable_contacts (
            id, airtable_id, name, email, phone, types, stage, notes, whatsapp_url,
            meeting_email_url, airtable_created_at, airtable_modified_at, activated,
            activated_at, client_id, first_synced_at, last_synced_at, sync_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            contact_id,
            contact["airtable_id"],
            contact.get("name"),
            contact.get("email"),
            contact.get("phone"),
            types_str,
            contact.get("stage"),
            contact.get("notes"),
            contact.get("whatsapp_url"),
            contact.get("meeting_email_url"),
            contact.get("airtable_created_at"),
            contact.get("airtable_modified_at"),
            int(contact.get("activated", row["activated"] if row else 0) or 0),
            contact.get("activated_at") or (row["activated_at"] if row else None),
            contact.get("client_id") or (row["client_id"] if row else None),
            row["first_synced_at"] if row else contact.get("first_synced_at") or now,
            contact.get("last_synced_at") or now,
            sync_hash or (row["sync_hash"] if row else None),
        ),
    )
    conn.commit()
    conn.close()
    saved = contact.copy()
    saved["id"] = contact_id
    saved["types"] = json.loads(types_str) if types_str else []
    return saved, row is None


def list_airtable_contacts(activated: Optional[bool] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    query = "SELECT * FROM airtable_contacts"
    params: List[Any] = []
    clauses = []
    if activated is not None:
        clauses.append("activated = ?")
        params.append(1 if activated else 0)
    if search:
        clauses.append("LOWER(name) LIKE ?")
        params.append(f"%{search.lower()}%")
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY last_synced_at DESC"
    cur = conn.execute(query, tuple(params))
    rows = cur.fetchall()
    conn.close()
    results: List[Dict[str, Any]] = []
    for row in rows:
        item = _row_to_dict(row)
        item["types"] = json.loads(item["types"]) if item.get("types") else []
        results.append(item)
    return results


def get_airtable_contact_by_airtable_id(airtable_id: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM airtable_contacts WHERE airtable_id = ?", (airtable_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    item = _row_to_dict(row)
    item["types"] = json.loads(item["types"]) if item.get("types") else []
    return item


def get_airtable_contact_by_id(contact_id: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM airtable_contacts WHERE id = ?", (contact_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return None
    item = _row_to_dict(row)
    item["types"] = json.loads(item["types"]) if item.get("types") else []
    return item


def mark_contact_activated(contact_id: str, client_id: str) -> None:
    conn = _connect()
    _ensure_tables(conn)
    now = datetime.utcnow().isoformat() + "Z"
    conn.execute(
        "UPDATE airtable_contacts SET activated = 1, activated_at = ?, client_id = ? WHERE id = ?",
        (now, client_id, contact_id),
    )
    conn.commit()
    conn.close()


# ─────────────────────────────────────────────────────────────
# Sync state helpers
# ─────────────────────────────────────────────────────────────

def get_sync_state(source: str, entity_type: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    _ensure_tables(conn)
    cur = conn.execute("SELECT * FROM sync_state WHERE source = ? AND entity_type = ?", (source, entity_type))
    row = cur.fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def set_sync_state(source: str, entity_type: str, last_sync_at: Optional[str], cursor: Optional[str], status: str, records_synced: int, error_message: Optional[str] = None) -> Dict[str, Any]:
    conn = _connect()
    _ensure_tables(conn)
    state_id = f"{source}:{entity_type}"
    conn.execute(
        """
        INSERT OR REPLACE INTO sync_state (id, source, entity_type, last_sync_at, last_sync_cursor, status, error_message, records_synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (state_id, source, entity_type, last_sync_at, cursor, status, error_message, records_synced),
    )
    conn.commit()
    conn.close()
    return {
        "id": state_id,
        "source": source,
        "entity_type": entity_type,
        "last_sync_at": last_sync_at,
        "last_sync_cursor": cursor,
        "status": status,
        "error_message": error_message,
        "records_synced": records_synced,
    }
