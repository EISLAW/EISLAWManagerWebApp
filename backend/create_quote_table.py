#!/usr/bin/env python3
"""Create quote_templates table in SQLite database."""
import sqlite3
import os

# Find database path
if os.path.exists("/app/data/eislaw.db"):
    db_path = "/app/data/eislaw.db"
else:
    db_path = os.path.expanduser("~/.eislaw/store/eislaw.db")

print(f"Using database: {db_path}")

conn = sqlite3.connect(db_path)

# Create table
conn.execute('''
CREATE TABLE IF NOT EXISTS quote_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    variables TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    version INTEGER DEFAULT 1
)
''')

# Create index
conn.execute('CREATE INDEX IF NOT EXISTS idx_templates_category ON quote_templates(category)')

conn.commit()
conn.close()

print("quote_templates table created successfully!")
