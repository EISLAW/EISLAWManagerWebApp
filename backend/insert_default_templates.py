#!/usr/bin/env python3
"""Insert default Hebrew quote templates."""
import sqlite3
import uuid
import json
import os
from datetime import datetime

# Find database path
if os.path.exists("/app/data/eislaw.db"):
    db_path = "/app/data/eislaw.db"
else:
    db_path = os.path.expanduser("~/.eislaw/store/eislaw.db")

print(f"Using database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

now = datetime.utcnow().isoformat() + "Z"

templates = [
    {
        "id": str(uuid.uuid4()),
        "name": "הצעת מחיר - ייעוץ כללי",
        "category": "general",
        "content": """לכבוד {{client_name}},

בהמשך לפגישתנו, להלן הצעת המחיר שלנו:

שירות: {{service_description}}
מחיר: {{price}} ₪

תוקף ההצעה: 30 יום

בברכה,
משרד עורכי דין איזלאו""",
        "variables": ["client_name", "service_description", "price"],
    },
    {
        "id": str(uuid.uuid4()),
        "name": "הצעת מחיר - ייעוץ פרטיות",
        "category": "privacy",
        "content": """לכבוד {{client_name}},

בהמשך לשיחתנו בנושא ציות לחוק הגנת הפרטיות, להלן הצעתנו:

חבילה: {{package_name}}
מחיר: {{price}} ₪
{{#if monthly}}תשלום חודשי: {{monthly}} ₪{{/if}}

השירותים כוללים:
{{services_list}}

תוקף ההצעה: 14 יום

בברכה,
משרד עורכי דין איזלאו""",
        "variables": ["client_name", "package_name", "price", "monthly", "services_list"],
    },
    {
        "id": str(uuid.uuid4()),
        "name": "הצעת מחיר - ליטיגציה",
        "category": "litigation",
        "content": """לכבוד {{client_name}},

בהמשך לפגישתנו בעניין {{case_subject}}, להלן הצעתנו:

סוג התיק: {{case_type}}
ריטיינר פתיחה: {{retainer}} ₪
תעריף שעתי: {{hourly_rate}} ₪

הערות:
{{notes}}

תוקף ההצעה: 7 ימים

בברכה,
משרד עורכי דין איזלאו""",
        "variables": ["client_name", "case_subject", "case_type", "retainer", "hourly_rate", "notes"],
    },
]

for template in templates:
    variables_json = json.dumps(template["variables"], ensure_ascii=False)
    cursor.execute(
        """
        INSERT INTO quote_templates (id, name, category, content, variables, created_at, updated_at, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """,
        (template["id"], template["name"], template["category"], template["content"], variables_json, now, now)
    )
    print(f"Inserted: {template['name']}")

conn.commit()
conn.close()

print("\nAll default templates inserted successfully!")
