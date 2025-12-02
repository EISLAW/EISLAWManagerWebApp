#!/usr/bin/env python3
"""
Sync clients from Airtable to local clients.json registry.
Run this to pull latest client data from Airtable.
"""
import json
import os
import sys
from pathlib import Path
from datetime import datetime
import urllib.request
import urllib.error

def load_secrets():
    paths = [
        Path(__file__).resolve().parents[1] / "secrets.local.json",
        Path.home() / ".eislaw" / "secrets.local.json",
    ]
    for p in paths:
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    return {}

def get_store_path():
    sec = load_secrets()
    sb = sec.get("store_base")
    if sb:
        return Path(sb) / "clients.json"
    return Path.home() / ".eislaw" / "store" / "clients.json"

def fetch_airtable_clients():
    sec = load_secrets()
    at = sec.get("airtable", {})
    token = at.get("token")
    base_id = at.get("base_id")
    table_id = at.get("clients_table")
    view_id = at.get("view_clients")
    
    if not all([token, base_id, table_id]):
        print("Missing Airtable credentials in secrets.local.json")
        sys.exit(1)
    
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"
    if view_id:
        url += f"?view={view_id}"
    
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"Airtable API error: {e.code} {e.reason}")
        sys.exit(1)
    
    return data.get("records", [])

def transform_record(rec):
    fields = rec.get("fields", {})
    rec_id = rec.get("id", "")
    
    # Get name - try multiple field names
    name = (
        fields.get("לקוחות") or 
        fields.get("Name") or 
        fields.get("שם") or 
        "Unknown"
    )
    
    # Get email
    email = fields.get("אימייל") or fields.get("Email") or ""
    if isinstance(email, str):
        email = [email] if email else []
    
    # Get phone
    phone = fields.get("מספר טלפון") or fields.get("Phone") or ""
    
    # Get client type
    client_type = fields.get("סוג לקוח") or []
    if isinstance(client_type, str):
        client_type = [client_type]
    
    base_id = "appv3nlRQTtsk97Y5"
    table_id = "tbloKUYGtEEdM76Nm"
    airtable_url = f"https://airtable.com/{base_id}/{table_id}/{rec_id}"
    
    return {
        "id": rec_id,
        "airtable_id": rec_id,
        "display_name": name,
        "slug": name.replace(" ", "-"),
        "email": email,
        "phone": phone,
        "client_type": client_type,
        "contacts": [],
        "folder": "",
        "notes": "",
        "airtable_url": airtable_url,
        "synced_at": datetime.utcnow().isoformat(),
    }

def main():
    print("Fetching clients from Airtable...")
    records = fetch_airtable_clients()
    print(f"Found {len(records)} clients")
    
    clients = [transform_record(r) for r in records]
    
    registry = {"clients": clients}
    
    store_path = get_store_path()
    store_path.parent.mkdir(parents=True, exist_ok=True)
    store_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8")
    
    print(f"Saved {len(clients)} clients to {store_path}")

if __name__ == "__main__":
    main()
