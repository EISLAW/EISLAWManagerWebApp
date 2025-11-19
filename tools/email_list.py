#!/usr/bin/env python3
import argparse
import sqlite3
from pathlib import Path


def open_db(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(str(path))


def list_threads(conn: sqlite3.Connection, client: str, top: int = 20):
    sql = (
        "SELECT thread_id, MAX(received) as latest, COUNT(*) as n, MAX(subject) as subj "
        "FROM messages WHERE client=? GROUP BY thread_id ORDER BY latest DESC LIMIT ?"
    )
    cur = conn.execute(sql, (client, top))
    rows = cur.fetchall()
    print(f"Client: {client}")
    for i, (tid, latest, n, subj) in enumerate(rows, 1):
        print(f"{i}. {latest} | {n} msg | {subj}")


def search(conn: sqlite3.Connection, client: str, q: str, top: int = 10):
    # Join FTS with messages for client filter
    sql = (
        "SELECT m.received, m.subject, m.from_addr, m.json_path "
        "FROM messages_fts f JOIN messages m ON m.id=f.id "
        "WHERE m.client=? AND messages_fts MATCH ? "
        "ORDER BY rank LIMIT ?"
    )
    cur = conn.execute(sql, (client, q, top))
    rows = cur.fetchall()
    print(f"Search in {client}: '{q}'")
    for i, (rcv, subj, frm, path) in enumerate(rows, 1):
        print(f"{i}. {rcv} | {frm} | {subj}")


def main():
    ap = argparse.ArgumentParser(description="List threads or search emails for a client")
    ap.add_argument("--db", default=str(Path(__file__).resolve().parents[1] / "clients" / "email_index.sqlite"))
    ap.add_argument("--client", required=True, help="Client folder name (e.g., 'סיון בנימיני')")
    ap.add_argument("--search", help="FTS query")
    ap.add_argument("--top", type=int, default=20)
    args = ap.parse_args()

    conn = open_db(Path(args.db))
    if args.search:
        search(conn, args.client, args.search, args.top)
    else:
        list_threads(conn, args.client, args.top)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

