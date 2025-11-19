#!/usr/bin/env python3
import argparse
import json
import shutil
from pathlib import Path


def load_settings() -> dict:
    # AudoProcessor Iterations/settings.json holds store_base
    sp = Path(__file__).resolve().parents[1] / ".." / "AudoProcessor Iterations" / "settings.json"
    return json.loads(sp.read_text(encoding="utf-8"))


def load_registry(store_base: Path) -> dict:
    rp = store_base / "clients.json"
    return json.loads(rp.read_text(encoding="utf-8"))


def save_registry(store_base: Path, reg: dict):
    rp = store_base / "clients.json"
    rp.write_text(json.dumps(reg, ensure_ascii=False, indent=2), encoding="utf-8")


def ensure_email_on_client(entry: dict, email: str) -> bool:
    changed = False
    emails = entry.get("email")
    if isinstance(emails, str):
        emails = [emails]
        entry["email"] = emails
        changed = True
    if emails is None:
        entry["email"] = [email]
        return True
    if email.lower() not in [e.lower() for e in emails if e]:
        entry["email"].append(email)
        changed = True
    return changed


def msg_contains_addr(msg: dict, addr: str) -> bool:
    target = addr.lower()
    def get(obj, key):
        v = obj.get(key)
        return v if v is not None else {}
    for k in ("from", "sender"):
        a = get(msg, k)
        v = (a.get("emailAddress") or {}).get("address")
        if v and v.lower() == target:
            return True
    for k in ("toRecipients", "ccRecipients", "replyTo"):
        for x in msg.get(k, []) or []:
            v = (x.get("emailAddress") or {}).get("address")
            if v and v.lower() == target:
                return True
    return False


def main():
    ap = argparse.ArgumentParser(description="Assign emails by alias to a client and move Unassigned files")
    ap.add_argument("--client-name", required=True)
    ap.add_argument("--email", required=True)
    args = ap.parse_args()

    st = load_settings()
    store_base = Path(st.get("by_os", {}).get("windows", {}).get("store_base") or st.get("store_base"))
    reg = load_registry(store_base)

    # find client by display_name
    clients = reg.get("clients") or []
    target_idx = None
    for idx, c in enumerate(clients):
        if (c.get("display_name") or c.get("name") or "") == args.client_name:
            target_idx = idx
            break
        folder = c.get("folder")
        if folder and Path(folder).name == args.client_name:
            target_idx = idx
            break
    if target_idx is None:
        print(f"Client not found in registry: {args.client_name}")
        return 2
    entry = clients[target_idx]
    changed = ensure_email_on_client(entry, args.email)
    if changed:
        save_registry(store_base, reg)
        print(f"Updated registry: added alias {args.email} to {args.client_name}")
    target_folder = entry.get("folder")
    if not target_folder:
        print("Client folder missing in registry; cannot move files.")
        return 3

    # Move Unassigned matches
    unassigned = Path(__file__).resolve().parents[1] / "clients" / "Unassigned" / "emails"
    moved = 0
    if unassigned.exists():
        for json_path in unassigned.rglob("*.json"):
            try:
                msg = json.loads(json_path.read_text(encoding="utf-8"))
            except Exception:
                continue
            if not msg_contains_addr(msg, args.email):
                continue
            thread = msg.get("conversationId") or "no-thread"
            dest_dir = Path(target_folder) / "emails" / thread
            dest_dir.mkdir(parents=True, exist_ok=True)
            eml_src = json_path.with_suffix(".eml")
            shutil.move(str(json_path), str(dest_dir / json_path.name))
            if eml_src.exists():
                shutil.move(str(eml_src), str(dest_dir / eml_src.name))
            moved += 1
    print(f"Moved {moved} message files to {target_folder}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
