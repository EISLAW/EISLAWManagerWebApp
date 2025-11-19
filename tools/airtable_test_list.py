#!/usr/bin/env python3
import argparse
import json
import urllib.parse
from pathlib import Path
import requests


def load_secrets() -> dict:
    sp = Path(__file__).resolve().parents[1] / "secrets.local.json"
    if sp.exists():
        return json.loads(sp.read_text(encoding="utf-8"))
    sp2 = Path(__file__).resolve().parents[1] / ".." / "AudoProcessor Iterations" / "settings.json"
    if sp2.exists():
        st = json.loads(sp2.read_text(encoding="utf-8"))
        return {"airtable": {"token": st.get("airtable", {}).get("token"), "base_id": st.get("airtable", {}).get("base_id")}}
    raise FileNotFoundError("No Airtable token/base found")


def main():
    ap = argparse.ArgumentParser(description="List records from an Airtable table to test access")
    ap.add_argument("--base", help="Base id (app...)")
    ap.add_argument("--table", required=True, help="Table id or name")
    ap.add_argument("--view", help="View id (viw...) optional")
    ap.add_argument("--max", type=int, default=3)
    args = ap.parse_args()

    sec = load_secrets()
    token = sec.get("airtable", {}).get("token")
    base = args.base or sec.get("airtable", {}).get("base_id")
    if not token or not base:
        raise RuntimeError("Missing Airtable token/base")

    params = {"maxRecords": args.max}
    if args.view:
        params["view"] = args.view
    url = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(args.table)}"
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params, timeout=30)
    print("HTTP", r.status_code)
    if r.status_code != 200:
        print(r.text[:1000])
        return 1
    data = r.json()
    for i, rec in enumerate(data.get("records", []), 1):
        fid = rec.get("id")
        fields = rec.get("fields", {})
        # Print a compact line with any name/email fields
        name = fields.get("שם") or fields.get("Name") or fields.get("לקוח") or fields.get("Client")
        email = fields.get("מייל") or fields.get("Email")
        print(f"{i}. id={fid} name={name!r} email={email!r}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

