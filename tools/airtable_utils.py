#!/usr/bin/env python3
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional


def load_secrets() -> dict:
    p = Path(__file__).resolve().parents[1] / "secrets.local.json"
    return json.loads(p.read_text(encoding="utf-8"))


def get_cfg(secrets: Optional[dict] = None) -> dict:
    if secrets is None:
        secrets = load_secrets()
    at = secrets.get("airtable", {})
    token = at.get("token") or at.get("token_alt")
    base_id = at.get("base_id")
    table_id = at.get("table_id")
    view = at.get("view")
    if not token or not base_id or not table_id:
        raise RuntimeError("Missing Airtable token/base_id/table_id in secrets.local.json")
    return {"token": token, "base_id": base_id, "table_id": table_id, "view": view}


def _req(method: str, url: str, token: str, payload: Optional[dict] = None) -> dict:
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {"raw": raw.decode("utf-8", errors="replace")}


def _v0_url(base_id: str, table_id: str, path: str = "") -> str:
    base = f"https://api.airtable.com/v0/{urllib.parse.quote(base_id)}/{urllib.parse.quote(table_id)}"
    if path:
        if not path.startswith("?"):
            path = "?" + path
        return base + path
    return base


def filter_by_formula(formula: str) -> str:
    # Caller should provide a valid Airtable formula string, e.g.,
    # {submission_id} = "abc". This just URL-encodes it for the query.
    return "filterByFormula=" + urllib.parse.quote(formula, safe="(){}=")


def find_by_submission_id(token: str, base_id: str, table_id: str, submission_id: str) -> Optional[dict]:
    formula = f'{{submission_id}} = "{submission_id}"'
    url = _v0_url(base_id, table_id, filter_by_formula(formula) + "&maxRecords=1")
    out = _req("GET", url, token)
    recs = out.get("records") or []
    return recs[0] if recs else None


def create_record(token: str, base_id: str, table_id: str, fields: dict) -> dict:
    url = _v0_url(base_id, table_id)
    payload = {"records": [{"fields": fields}], "typecast": True}
    return _req("POST", url, token, payload)


def update_record(token: str, base_id: str, table_id: str, record_id: str, fields: dict) -> dict:
    url = _v0_url(base_id, table_id)
    payload = {"records": [{"id": record_id, "fields": fields}], "typecast": True}
    return _req("PATCH", url, token, payload)


def delete_record(token: str, base_id: str, table_id: str, record_id: str) -> dict:
    # Airtable bulk delete via query param: DELETE ...?records[]=recXXXX
    qp = urllib.parse.urlencode({"records[]": record_id})
    url = _v0_url(base_id, table_id, qp)
    return _req("DELETE", url, token)


def compact_fields(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        if v is None:
            continue
        if isinstance(v, (list, tuple)) and len(v) == 0:
            continue
        out[k] = v
    return out


def upsert_security_submission(cfg: dict, fields: dict) -> dict:
    token = cfg["token"]
    base_id = cfg["base_id"]
    table_id = cfg["table_id"]
    key = fields.get("submission_id")
    if not key:
        raise ValueError("submission_id is required for upsert")
    cur = find_by_submission_id(token, base_id, table_id, key)
    if cur:
        rec_id = cur.get("id")
        return update_record(token, base_id, table_id, rec_id, compact_fields(fields))
    else:
        return create_record(token, base_id, table_id, compact_fields(fields))
