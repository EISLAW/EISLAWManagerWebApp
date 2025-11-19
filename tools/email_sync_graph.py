#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional

import msal
import requests


def load_automailer_config() -> dict:
    cfg_path = Path(__file__).resolve().parents[1] / ".." / "AudoProcessor Iterations" / "project_config.json"
    cfg_path = cfg_path.resolve()
    if not cfg_path.exists():
        raise FileNotFoundError(f"project_config.json not found at {cfg_path}")
    return json.loads(cfg_path.read_text(encoding="utf-8"))


def acquire_app_token(graph_cfg: dict) -> str:
    authority = graph_cfg["authority"].replace("{tenant_id}", graph_cfg["tenant_id"])
    app = msal.ConfidentialClientApplication(
        graph_cfg["client_id"], authority=authority, client_credential=graph_cfg["client_secret"]
    )
    result = app.acquire_token_for_client(scopes=graph_cfg.get("scope", ["https://graph.microsoft.com/.default"]))
    if "access_token" not in result:
        raise RuntimeError(f"Token error: {result}")
    return result["access_token"]


def graph_get(url: str, token: str) -> dict:
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Graph GET {r.status_code}: {r.text}")
    return r.json()


def list_messages(mailbox: str, token: str, endpoint: str, since: dt.datetime, top: int = 50):
    base = endpoint.rstrip("/")
    # Filter by receivedDateTime ge ... (UTC, ISO8601)
    since_iso = since.strftime("%Y-%m-%dT%H:%M:%SZ")
    url = (
        f"{base}/users/{mailbox}/messages?$top={top}"
        f"&$orderby=receivedDateTime desc"
        f"&$filter=receivedDateTime ge {since_iso}"
        f"&$select=id,conversationId,receivedDateTime,subject,from,toRecipients,ccRecipients,sender,replyTo,bodyPreview"
    )
    while True:
        data = graph_get(url, token)
        for it in data.get("value", []):
            yield it
        url = data.get("@odata.nextLink")
        if not url:
            break


def normalize_addresses(msg: dict) -> List[str]:
    out = []
    for key in ("from", "sender"):
        x = msg.get(key) or {}
        addr = (x.get("emailAddress") or {}).get("address")
        if addr:
            out.append(addr.lower())
    for key in ("toRecipients", "ccRecipients", "replyTo"):
        for x in msg.get(key, []) or []:
            addr = (x.get("emailAddress") or {}).get("address")
            if addr:
                out.append(addr.lower())
    return list(dict.fromkeys(out))


def load_clients_mapping() -> Dict[str, Dict[str, Any]]:
    """Return { email_lower: {slug, folder} } from AudoProcessor registry if available."""
    settings_path = Path(__file__).resolve().parents[1] / ".." / "AudoProcessor Iterations" / "settings.json"
    mapping: Dict[str, Dict[str, Any]] = {}
    try:
        st = json.loads(settings_path.read_text(encoding="utf-8"))
        store_base = st.get("by_os", {}).get("windows", {}).get("store_base") or st.get("store_base")
        if store_base:
            reg_path = Path(store_base) / "clients.json"
            if reg_path.exists():
                reg = json.loads(reg_path.read_text(encoding="utf-8"))
                clients = reg.get("clients") or []
                if isinstance(clients, dict):
                    iterable = clients.values()
                else:
                    iterable = clients
                for c in iterable:
                    emails = c.get("email")
                    if isinstance(emails, str):
                        emails = [emails]
                    if not emails:
                        continue
                    folder = c.get("folder") or c.get("output_dir") or c.get("store")
                    slug = c.get("slug") or (c.get("display_name") or "client")
                    for em in emails:
                        if not em:
                            continue
                        mapping[str(em).lower()] = {"slug": slug, "folder": folder}
    except Exception:
        pass
    return mapping


def ensure_path(p: Path):
    p.parent.mkdir(parents=True, exist_ok=True)


def save_message(mailbox: str, endpoint: str, token: str, msg: dict, client_dir: Path):
    thread = msg.get("conversationId") or "no-thread"
    msg_id = msg.get("id")
    thread_dir = client_dir / "emails" / thread
    thread_dir.mkdir(parents=True, exist_ok=True)
    # Save normalized JSON
    jpath = thread_dir / f"{msg_id}.json"
    with jpath.open("w", encoding="utf-8") as f:
        json.dump(msg, f, ensure_ascii=False, indent=2)
    # Save MIME (.eml)
    mime_url = endpoint.rstrip("/") + f"/users/{mailbox}/messages/{msg_id}/$value"
    r = requests.get(mime_url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code == 200:
        (thread_dir / f"{msg_id}.eml").write_bytes(r.content)


def resolve_client(addresses: List[str], mapping: Dict[str, Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    for addr in addresses:
        if addr in mapping:
            return mapping[addr]
    return None


def main():
    ap = argparse.ArgumentParser(description="Sync last N days of messages via Microsoft Graph and map to client folders")
    ap.add_argument("--days", type=int, default=180)
    ap.add_argument("--limit", type=int, default=200, help="Max messages to save in this run")
    ap.add_argument("--dry", action="store_true", help="List only; do not save")
    args = ap.parse_args()

    cfg = load_automailer_config()
    gcfg = cfg["microsoft_graph"]
    mailbox = cfg.get("email", {}).get("sender") or "eitan@eislaw.co.il"
    token = acquire_app_token(gcfg)
    since = dt.datetime.utcnow() - dt.timedelta(days=args.days)

    client_map = load_clients_mapping()
    # Default base for unassigned if registry path not available
    base_clients = Path(__file__).resolve().parents[1] / "clients"
    base_clients.mkdir(exist_ok=True)

    saved = 0
    printed = 0
    for msg in list_messages(mailbox, token, gcfg["endpoint"], since):
        addrs = normalize_addresses(msg)
        m = resolve_client(addrs, client_map)
        target_dir: Path
        if m and m.get("folder"):
            target_dir = Path(m["folder"])  # use real client folder
        elif m:
            target_dir = base_clients / m["slug"]
        else:
            target_dir = base_clients / "Unassigned"

        if args.dry and printed < 10:
            printed += 1
            subj = msg.get("subject")
            rcv = msg.get("receivedDateTime")
            print(f"{rcv} | {subj} -> {target_dir}")
            continue

        if args.limit and saved >= args.limit:
            break
        save_message(mailbox, gcfg["endpoint"], token, msg, target_dir)
        saved += 1

    if not args.dry:
        print(f"Saved {saved} messages (limit {args.limit}).")
    else:
        print("Dry-run complete.")


if __name__ == "__main__":
    raise SystemExit(main())
