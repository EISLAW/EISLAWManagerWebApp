import os
import sqlite3
from typing import Set

DB_PATH = os.environ.get("DB_PATH", "data/eislaw.db")


def _get_columns(cursor: sqlite3.Cursor, table: str) -> Set[str]:
    cursor.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cursor.fetchall()}


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    columns = _get_columns(cursor, "clients")
    if "last_activity_at" not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN last_activity_at TEXT")
    if "archived" not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN archived INTEGER DEFAULT 0")
    if "archived_at" not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN archived_at TEXT")
    if "archived_reason" not in columns:
        cursor.execute("ALTER TABLE clients ADD COLUMN archived_reason TEXT")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_clients_archived ON clients(archived)")

    conn.commit()
    conn.close()
    print("Migration complete: clients archive columns added")


if __name__ == "__main__":
    migrate()
