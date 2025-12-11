#!/usr/bin/env python3
"""
EISLAW Database Validation Script
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = "/app/data/eislaw.db"

def validate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("EISLAW DATABASE VALIDATION REPORT")
    print("=" * 60)

    # 1. Check tables
    print("\n1. SCHEMA VALIDATION")
    print("-" * 40)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    expected_tables = ["clients", "tasks", "contacts", "activity_log", "sync_state"]

    for t in expected_tables:
        status = "FOUND" if t in tables else "MISSING"
        print(f"   {t}: {status}")

    # 2. Row counts
    print("\n2. DATA COUNTS")
    print("-" * 40)
    counts = {}
    for t in tables:
        if t.startswith("sqlite_"):
            continue
        cursor.execute(f"SELECT COUNT(*) FROM {t}")
        count = cursor.fetchone()[0]
        counts[t] = count
        print(f"   {t}: {count} rows")

    # 3. Data integrity - clients
    print("\n3. DATA INTEGRITY - CLIENTS")
    print("-" * 40)

    # NULL/empty names
    cursor.execute("SELECT id, name FROM clients WHERE name IS NULL OR name = ''")
    null_names = cursor.fetchall()
    print(f"   NULL/empty names: {len(null_names)}")

    # Duplicate IDs
    cursor.execute("SELECT id, COUNT(*) as cnt FROM clients GROUP BY id HAVING cnt > 1")
    dup_ids = cursor.fetchall()
    print(f"   Duplicate IDs: {len(dup_ids)}")

    # Check required fields
    cursor.execute("SELECT COUNT(*) FROM clients WHERE id IS NULL")
    null_ids = cursor.fetchone()[0]
    print(f"   NULL IDs: {null_ids}")

    # 4. Data integrity - tasks
    print("\n4. DATA INTEGRITY - TASKS")
    print("-" * 40)

    cursor.execute("SELECT id, title FROM tasks WHERE title IS NULL OR title = ''")
    null_titles = cursor.fetchall()
    print(f"   NULL/empty titles: {len(null_titles)}")

    cursor.execute("SELECT id, COUNT(*) as cnt FROM tasks GROUP BY id HAVING cnt > 1")
    dup_task_ids = cursor.fetchall()
    print(f"   Duplicate IDs: {len(dup_task_ids)}")

    # 5. Foreign key check
    print("\n5. FOREIGN KEY VALIDATION")
    print("-" * 40)
    cursor.execute("PRAGMA foreign_key_check")
    fk_violations = cursor.fetchall()
    print(f"   FK violations: {len(fk_violations)}")
    if fk_violations:
        for v in fk_violations[:5]:
            print(f"      {v}")

    # 6. Index check
    print("\n6. INDEX VERIFICATION")
    print("-" * 40)
    cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
    indexes = cursor.fetchall()
    print(f"   Total indexes: {len(indexes)}")
    for idx in indexes:
        print(f"      {idx[0]} on {idx[1]}")

    # 7. WAL mode check
    print("\n7. DATABASE SETTINGS")
    print("-" * 40)
    cursor.execute("PRAGMA journal_mode")
    journal = cursor.fetchone()[0]
    print(f"   Journal mode: {journal}")

    cursor.execute("PRAGMA foreign_keys")
    fk_enabled = cursor.fetchone()[0]
    print(f"   Foreign keys: {'ON' if fk_enabled else 'OFF'}")

    cursor.execute("PRAGMA integrity_check")
    integrity = cursor.fetchone()[0]
    print(f"   Integrity: {integrity}")

    # Summary
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)

    issues = []
    if null_names:
        issues.append(f"{len(null_names)} clients with NULL/empty names")
    if dup_ids:
        issues.append(f"{len(dup_ids)} duplicate client IDs")
    if null_titles:
        issues.append(f"{len(null_titles)} tasks with NULL/empty titles")
    if dup_task_ids:
        issues.append(f"{len(dup_task_ids)} duplicate task IDs")
    if fk_violations:
        issues.append(f"{len(fk_violations)} foreign key violations")
    if integrity != "ok":
        issues.append(f"Integrity check failed: {integrity}")

    if issues:
        print("RESULT: FAIL")
        print("\nIssues found:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("RESULT: PASS")
        print("\nNo issues found. Database is healthy.")

    print(f"\nData summary:")
    print(f"   Clients: {counts.get('clients', 0)}")
    print(f"   Tasks: {counts.get('tasks', 0)}")
    print(f"   Contacts: {counts.get('contacts', 0)}")

    conn.close()
    return len(issues) == 0

if __name__ == "__main__":
    validate()
