"""
Add SharePoint URL columns to messages table in email_index.sqlite

Migration: add_sharepoint_urls_to_messages
Date: 2025-12-12
"""

import sqlite3
from pathlib import Path


def migrate():
    """Add sharepoint_url and sharepoint_json_url columns to messages table."""
    db_path = Path.home() / "EISLAWManagerWebApp" / "clients" / "email_index.sqlite"

    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(messages)")
        columns = [row[1] for row in cursor.fetchall()]

        if "sharepoint_url" not in columns:
            cursor.execute(
                """
                ALTER TABLE messages
                ADD COLUMN sharepoint_url TEXT
                """
            )
            print("Added sharepoint_url column")
        else:
            print("sharepoint_url column already exists")

        if "sharepoint_json_url" not in columns:
            cursor.execute(
                """
                ALTER TABLE messages
                ADD COLUMN sharepoint_json_url TEXT
                """
            )
            print("Added sharepoint_json_url column")
        else:
            print("sharepoint_json_url column already exists")

        conn.commit()
        print("Migration completed successfully")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
