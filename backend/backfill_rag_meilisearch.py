#!/usr/bin/env python3
"""
RAG-FIX-004 Backfill Script
Index 32 existing pilot transcripts to Meilisearch.

This script:
1. Gets all 32 transcripts from the database
2. Changes draft transcripts to 'published' status
3. Indexes them all to Meilisearch
4. Verifies search works
"""

import sqlite3
import sys
import os
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from rag_sqlite import (
    index_transcript_in_meilisearch,
    ensure_meilisearch_index,
    search_meilisearch,
    _meili_request
)
from db import get_db


def backfill_transcripts():
    """Backfill all 32 transcripts to Meilisearch."""
    db = get_db()

    print("\n" + "="*70)
    print("RAG-FIX-004: BACKFILL TRANSCRIPTS TO MEILISEARCH")
    print("="*70)

    # Step 1: Ensure Meilisearch index exists
    print("\n[1/4] Ensuring Meilisearch index exists...")
    if ensure_meilisearch_index():
        print("✅ Meilisearch index ready")
    else:
        print("❌ Failed to setup Meilisearch index")
        return False

    # Step 2: Get all transcripts (both published and draft)
    print("\n[2/4] Fetching all 32 transcripts from database...")
    transcripts = db.execute("""
        SELECT id, title, status, word_count
        FROM transcripts
        ORDER BY created_at DESC
    """)

    published_count = sum(1 for t in transcripts if t['status'] == 'published')
    draft_count = len(transcripts) - published_count

    print(f"Found {len(transcripts)} transcripts:")
    print(f"  - {published_count} published")
    print(f"  - {draft_count} draft")

    if len(transcripts) != 32:
        print(f"⚠️  Warning: Expected 32 transcripts, found {len(transcripts)}")

    # Step 3: Publish all draft transcripts and index to Meilisearch
    print(f"\n[3/4] Publishing and indexing transcripts...")
    indexed_count = 0
    failed_ids = []

    for transcript in transcripts:
        tid = transcript['id']
        title = transcript['title']
        status = transcript['status']

        # If draft, publish it first
        if status == 'draft':
            with db.connection() as conn:
                conn.execute(
                    "UPDATE transcripts SET status = 'published', updated_at = datetime('now') WHERE id = ?",
                    (tid,)
                )
            print(f"  Published: {title}")

        # Index to Meilisearch
        try:
            if index_transcript_in_meilisearch(tid):
                indexed_count += 1
                print(f"  ✅ Indexed: {title}")
            else:
                failed_ids.append(tid)
                print(f"  ❌ Failed to index: {title}")
        except Exception as e:
            failed_ids.append(tid)
            print(f"  ❌ Error indexing {title}: {e}")

    # Step 4: Verify search works
    print(f"\n[4/4] Verifying search functionality...")

    # Get Meilisearch stats
    stats_resp = _meili_request("GET", "/indexes/transcripts/stats")
    if stats_resp and stats_resp.status_code == 200:
        stats = stats_resp.json()
        indexed_in_meili = stats.get('numberOfDocuments', 0)
        print(f"Meilisearch index now contains: {indexed_in_meili} documents")

    # Test search with a common Hebrew word
    test_queries = [
        "חוזה",  # contract (common legal term)
        "הסכם",  # agreement
        "לקוח"   # client
    ]

    search_found = False
    for query in test_queries:
        try:
            results = search_meilisearch(query, limit=5)
            if results.get('total', 0) > 0:
                print(f"✅ Search test passed - found {results['total']} results for '{query}'")
                search_found = True
                # Show top result
                if results.get('results'):
                    first = results['results'][0]
                    print(f"   Top result: {first.get('title')}")
                break
        except Exception as e:
            print(f"  Search test failed for '{query}': {e}")

    if not search_found:
        print("⚠️  Warning: No search results found in test queries")

    # Summary
    print("\n" + "="*70)
    print("BACKFILL SUMMARY")
    print("="*70)
    print(f"Total transcripts processed: {len(transcripts)}")
    print(f"Successfully indexed: {indexed_count}")
    print(f"Failed: {len(failed_ids)}")

    if failed_ids:
        print(f"\nFailed transcript IDs:")
        for fid in failed_ids:
            print(f"  - {fid}")

    print("\n✅ RAG-FIX-004 COMPLETE: {}/{} transcripts indexed".format(indexed_count, len(transcripts)))
    print("="*70 + "\n")

    return len(failed_ids) == 0


if __name__ == "__main__":
    success = backfill_transcripts()
    sys.exit(0 if success else 1)
