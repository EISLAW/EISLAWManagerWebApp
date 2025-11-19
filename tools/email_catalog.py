#!/usr/bin/env python3
import argparse
import json
import os
import sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


def open_db(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          thread_id TEXT,
          client TEXT,
          client_path TEXT,
          received TEXT,
          subject TEXT,
          from_addr TEXT,
          to_addrs TEXT,
          cc_addrs TEXT,
          json_path TEXT,
          eml_path TEXT
        )
        """
    )
    # FTS5 for quick keyword search over subject/bodyPreview
    conn.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
          id, subject, body
        )
        """
    )
    return conn


def upsert_message(conn: sqlite3.Connection, row: dict, fts: dict):
    conn.execute(
        """
        INSERT INTO messages(id, thread_id, client, client_path, received, subject, from_addr, to_addrs, cc_addrs, json_path, eml_path)
        VALUES(:id,:thread_id,:client,:client_path,:received,:subject,:from_addr,:to_addrs,:cc_addrs,:json_path,:eml_path)
        ON CONFLICT(id) DO UPDATE SET
          thread_id=excluded.thread_id,
          client=excluded.client,
          client_path=excluded.client_path,
          received=excluded.received,
          subject=excluded.subject,
          from_addr=excluded.from_addr,
          to_addrs=excluded.to_addrs,
          cc_addrs=excluded.cc_addrs,
          json_path=excluded.json_path,
          eml_path=excluded.eml_path
        """,
        row,
    )
    # FTS: delete then insert (UPSERT unsupported)
    conn.execute("DELETE FROM messages_fts WHERE id=?", (row["id"],))
    conn.execute("INSERT INTO messages_fts(id, subject, body) VALUES(?,?,?)", (row["id"], fts.get("subject", ""), fts.get("body", "")))


def find_client_folders(settings_path: Path) -> List[Path]:
    out: List[Path] = []
    try:
        st = json.loads(settings_path.read_text(encoding="utf-8"))
        store_base = st.get("by_os", {}).get("windows", {}).get("store_base") or st.get("store_base")
        if store_base:
            reg_path = Path(store_base) / "clients.json"
            if reg_path.exists():
                reg = json.loads(reg_path.read_text(encoding="utf-8"))
                for cid, c in (reg.get("clients", {}) or {}).items():
                    folder = c.get("folder") or c.get("output_dir") or c.get("store")
                    if folder and Path(folder).exists():
                        out.append(Path(folder))
    except Exception:
        pass
    return out


def scan_email_jsons(root: Path) -> Iterable[Tuple[Path, Path]]:
    # Yield (json_path, eml_path)
    if not root.exists():
        return []
    for j in root.rglob("emails/*/*.json"):
        eml = j.with_suffix(".eml")
        yield j, eml


def parse_addrs(objs) -> str:
    vals = []
    for x in objs or []:
        addr = (x.get("emailAddress") or {}).get("address")
        if addr:
            vals.append(addr)
    return "; ".join(vals)


def main():
    ap = argparse.ArgumentParser(description="Catalog saved Graph messages into SQLite with FTS")
    ap.add_argument("--settings", default=str(Path(__file__).resolve().parents[1] / ".." / "AudoProcessor Iterations" / "settings.json"))
    ap.add_argument("--extra", default=str(Path(__file__).resolve().parents[1] / "clients"))
    ap.add_argument("--db", default=str(Path(__file__).resolve().parents[1] / "clients" / "email_index.sqlite"))
    args = ap.parse_args()

    settings_path = Path(args.settings).resolve()
    client_folders = find_client_folders(settings_path)
    extra = Path(args.extra).resolve()
    if extra.exists():
        client_folders.append(extra)

    conn = open_db(Path(args.db))
    total = 0
    for cdir in client_folders:
        client_name = cdir.name
        for jpath, eml in scan_email_jsons(cdir):
            try:
                msg = json.loads(jpath.read_text(encoding="utf-8"))
            except Exception:
                continue
            row = {
                "id": msg.get("id"),
                "thread_id": msg.get("conversationId") or "",
                "client": client_name,
                "client_path": str(cdir),
                "received": msg.get("receivedDateTime") or "",
                "subject": msg.get("subject") or "",
                "from_addr": ((msg.get("from") or {}).get("emailAddress") or {}).get("address") or "",
                "to_addrs": parse_addrs(msg.get("toRecipients")),
                "cc_addrs": parse_addrs(msg.get("ccRecipients")),
                "json_path": str(jpath),
                "eml_path": str(eml) if eml.exists() else "",
            }
            fts = {"subject": row["subject"], "body": msg.get("bodyPreview") or ""}
            upsert_message(conn, row, fts)
            total += 1
    conn.commit()
    print(f"Indexed {total} messages across {len(client_folders)} client folders.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
