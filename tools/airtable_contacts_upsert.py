#!/usr/bin/env python3
import argparse
import json
import urllib.parse
from pathlib import Path
import requests


def load_secrets() -> dict:
    # Prefer EISLAW System/secrets.local.json
    sp = Path(__file__).resolve().parents[1] / "secrets.local.json"
    if sp.exists():
        return json.loads(sp.read_text(encoding="utf-8"))
    # Fallback to AudoProcessor Iterations/settings.json
    sp2 = Path(__file__).resolve().parents[1] / ".." / "AudoProcessor Iterations" / "settings.json"
    if sp2.exists():
        st = json.loads(sp2.read_text(encoding="utf-8"))
        return {"airtable": {"token": st.get("airtable", {}).get("token"), "base_id": st.get("airtable", {}).get("base_id")}}
    raise FileNotFoundError("No secrets found for Airtable")


def air_headers(token: str):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def airtable_list(base: str, table: str, token: str, params: dict):
    url = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(table)}"
    r = requests.get(url, headers=air_headers(token), params=params, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Airtable list error {r.status_code}: {r.text}")
    return r.json()


def airtable_list_all(base: str, table: str, token: str, params: dict, max_pages: int = 20):
    out = []
    p = dict(params)
    for _ in range(max_pages):
        data = airtable_list(base, table, token, p)
        out.extend(data.get("records", []))
        off = data.get("offset")
        if not off:
            break
        p["offset"] = off
    return out


def airtable_create(base: str, table: str, token: str, fields: dict):
    url = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(table)}"
    body = {"records": [{"fields": fields}], "typecast": True}
    r = requests.post(url, headers=air_headers(token), data=json.dumps(body), timeout=30)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Airtable create error {r.status_code}: {r.text}")
    return r.json()


def airtable_update(base: str, table: str, token: str, rec_id: str, fields: dict):
    url = f"https://api.airtable.com/v0/{base}/{urllib.parse.quote(table)}"
    body = {"records": [{"id": rec_id, "fields": fields}], "typecast": True}
    r = requests.patch(url, headers=air_headers(token), data=json.dumps(body), timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"Airtable update error {r.status_code}: {r.text}")
    return r.json()


def find_client(base: str, token: str, clients_table: str, client_name: str) -> str:
    # Attempt a filter on common name fields first; if invalid, fall back to scan
    try:
        formula = f"OR({{שם}}='{client_name}', {{Name}}='{client_name}', {{לקוח}}='{client_name}', {{Client}}='{client_name}')"
        data = airtable_list(base, clients_table, token, {"maxRecords": 1, "filterByFormula": formula})
        recs = data.get("records", [])
        if recs:
            return recs[0]["id"]
    except Exception:
        pass
    # Fallback: scan the first page and match by any string field
    recs = airtable_list_all(base, clients_table, token, {"pageSize": 100})
    target = client_name.strip().lower()
    for rec in recs:
        fields = rec.get("fields", {})
        for k, v in fields.items():
            if isinstance(v, str) and v.strip().lower() == target:
                return rec["id"]
    raise RuntimeError(f"Client not found: {client_name}")


def discover_contact_fields(base: str, token: str, contacts_table: str) -> dict:
    """Probe the contacts table to discover usable field names.
    Returns a dict with keys: name, email, phone, role, link.
    Values may be None if not detected.
    """
    # Fetch a small sample of records and aggregate seen field names
    recs = airtable_list_all(base, contacts_table, token, {"pageSize": 50})
    seen = set()
    for rec in recs:
        seen.update(rec.get("fields", {}).keys())

    def pick(candidates: list[str]) -> str | None:
        for c in candidates:
            if c in seen:
                return c
        return None

    return {
        "name": pick(["שם", "Name"]),
        "email": pick(["מייל", "Email", "דוא\"ל", "E-mail", "email", "EMAIL"]),
        "phone": pick(["טלפון", "Phone", "phone", "טלפון נייד"]),
        "role": pick(["תפקיד איש קשר", "Contact Role", "Role", "תפקיד"]),
        "link": pick(["לקוח", "Client", "לקוח/ים", "Clients"]),
    }


def find_contact(base: str, token: str, contacts_table: str, email: str) -> str | None:
    fields = discover_contact_fields(base, token, contacts_table)
    email_field = fields.get("email")
    # Try filterByFormula on the detected email field first
    if email_field:
        try:
            formula = f"{{{email_field}}}='{email}'"
            data = airtable_list(base, contacts_table, token, {"maxRecords": 1, "filterByFormula": formula})
            recs = data.get("records", [])
            if recs:
                return recs[0]["id"]
        except Exception:
            pass
    # Fallback: scan first pages and compare values
    recs = airtable_list_all(base, contacts_table, token, {"pageSize": 100})
    target = (email or "").strip().lower()
    for rec in recs:
        for k, v in rec.get("fields", {}).items():
            if isinstance(v, str) and v.strip().lower() == target:
                return rec["id"]
    return None


def build_contact_fields(base: str, token: str, contacts_table: str, name: str, email: str, phone: str, role: str, client_rec_id: str) -> dict:
    # Only set fields that actually exist in the table to avoid 422 errors
    f = discover_contact_fields(base, token, contacts_table)
    out: dict = {}
    if f.get("name"):
        out[f["name"]] = name
    if f.get("email"):
        out[f["email"]] = email
    if f.get("phone") and phone:
        out[f["phone"]] = phone
    if f.get("role") and role:
        out[f["role"]] = role
    if f.get("link"):
        out[f["link"]] = [client_rec_id]
    return out


def main():
    ap = argparse.ArgumentParser(description="Upsert an Airtable contact and link to a client")
    ap.add_argument("--client", required=True, help="Client name as appears in Airtable")
    ap.add_argument("--name", required=True)
    ap.add_argument("--email", required=True)
    ap.add_argument("--phone", default="")
    ap.add_argument("--role", default="")
    ap.add_argument("--base", help="Override base id")
    ap.add_argument("--clients-table", default="לקוחות")
    ap.add_argument("--contacts-table", default="אנשי קשר")
    ap.add_argument("--clients-table-id", help="Override Clients table id (tbl...) instead of name")
    ap.add_argument("--contacts-table-id", help="Override Contacts table id (tbl...) instead of name")
    ap.add_argument("--contacts-view-id", help="Optional view id to apply when listing contacts (viw...)")
    args = ap.parse_args()

    secrets = load_secrets()
    token = secrets.get("airtable", {}).get("token")
    base = args.base or secrets.get("airtable", {}).get("base_id")
    if not token or not base:
        raise RuntimeError("Missing Airtable token or base id in secrets")

    clients_table = args.clients_table_id or args.clients_table
    contacts_table = args.contacts_table_id or args.contacts_table
    client_id = find_client(base, token, clients_table, args.client)
    # If a view id is provided, ensure searches specify that view (non-fatal if it doesn't exist)
    if args.contacts_view_id:
        # no-op here; find_contact uses filterByFormula; view can be added by caller if needed
        pass
    contact_id = find_contact(base, token, contacts_table, args.email)
    fields = build_contact_fields(base, token, contacts_table, args.name, args.email, args.phone, args.role, client_id)
    if contact_id:
        out = airtable_update(base, contacts_table, token, contact_id, fields)
        print(f"Updated contact: {args.email}")
    else:
        out = airtable_create(base, contacts_table, token, fields)
        print(f"Created contact: {args.email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

