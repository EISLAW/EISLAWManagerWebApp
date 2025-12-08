import os
import sqlite3

DB_PATH = os.environ.get("DB_PATH", "data/eislaw.db")


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
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

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_airtable_contacts_airtable_id ON airtable_contacts(airtable_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_airtable_contacts_name ON airtable_contacts(name)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_airtable_contacts_activated ON airtable_contacts(activated)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_airtable_contacts_client ON airtable_contacts(client_id)"
    )

    conn.commit()
    conn.close()
    print("Migration complete: airtable_contacts table created")


if __name__ == "__main__":
    migrate()
