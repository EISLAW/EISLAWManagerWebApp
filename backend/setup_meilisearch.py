#!/usr/bin/env python3
"""
Set up Meilisearch index and populate with published transcripts.
Phase 4L.2 - Alex
"""
import os
import sys
import json
import sqlite3
import requests

# Config
MEILI_URL = os.environ.get("MEILISEARCH_URL", "http://meili:7700")
DB_PATH = "/app/data/eislaw.db"

print(f"Connecting to Meilisearch at {MEILI_URL}")

def meili_request(method, path, data=None):
    """Make a request to Meilisearch without auth."""
    url = f"{MEILI_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if method == "GET":
        return requests.get(url, headers=headers)
    elif method == "POST":
        return requests.post(url, headers=headers, json=data)
    elif method == "PUT":
        return requests.put(url, headers=headers, json=data)
    elif method == "PATCH":
        return requests.patch(url, headers=headers, json=data)

# Check if index exists
r = meili_request("GET", "/indexes/transcripts")
if r.status_code == 200:
    print("Index 'transcripts' already exists")
elif r.status_code == 404:
    print("Creating index 'transcripts'...")
    r = meili_request("POST", "/indexes", {"uid": "transcripts", "primaryKey": "id"})
    print(f"Create response: {r.status_code} - {r.text[:200]}")
    import time
    time.sleep(2)
else:
    print(f"Unexpected response: {r.status_code} - {r.text}")

# Configure index settings
print("Configuring index settings...")
settings = {
    "searchableAttributes": ["title", "content", "client_name", "domain"],
    "filterableAttributes": ["client_id", "domain", "status"],
    "sortableAttributes": ["created_at", "word_count"]
}
r = meili_request("PATCH", "/indexes/transcripts/settings", settings)
print(f"Settings response: {r.status_code}")

# Get published transcripts from SQLite
print("Fetching published transcripts from SQLite...")
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.execute("""
    SELECT
        t.id,
        t.title,
        t.content,
        t.domain,
        t.client_id,
        t.status,
        t.word_count,
        t.created_at,
        c.name as client_name
    FROM transcripts t
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.status = 'published'
""")

transcripts = [dict(row) for row in cursor]
conn.close()

print(f"Found {len(transcripts)} published transcripts")

if transcripts:
    print("Indexing transcripts in Meilisearch...")
    r = meili_request("POST", "/indexes/transcripts/documents", transcripts)
    print(f"Index response: {r.status_code}")
    if r.status_code in [200, 202]:
        print("Waiting for indexing to complete...")
        import time
        time.sleep(3)

        # Check index stats
        r = meili_request("GET", "/indexes/transcripts/stats")
        print(f"Index stats: {r.json()}")
else:
    print("No published transcripts to index")

# Test search
print("\nTesting search...")
r = meili_request("POST", "/indexes/transcripts/search", {"q": "open", "limit": 5})
if r.status_code == 200:
    results = r.json()
    print(f"Search results: {len(results.get('hits', []))} hits")
    for hit in results.get("hits", []):
        print(f"  - {hit.get('id')}: {hit.get('title')}")
else:
    print(f"Search error: {r.status_code} - {r.text}")

print("\nDone!")
