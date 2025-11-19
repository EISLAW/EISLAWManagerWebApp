#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request
from pathlib import Path


def load_secrets() -> dict:
    p = Path(__file__).resolve().parents[1] / "secrets.local.json"
    return json.loads(p.read_text(encoding="utf-8"))


def http(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        return {"raw": raw.decode("utf-8", errors="replace")}


def existing_fields(base_id: str, token: str) -> dict:
    meta_base = f"https://api.airtable.com/v0/meta/bases/{urllib.parse.quote(base_id)}/tables"
    out = http("GET", meta_base, token)
    by_table = {}
    for t in out.get("tables", []):
        by_table[t.get("id") or t.get("name")] = {f.get("name"): f for f in (t.get("fields") or [])}
    return by_table


def ensure_fields(base_id: str, table_id: str, token: str) -> dict:
    ex = existing_fields(base_id, token)
    ex_fields = ex.get(table_id) or {}
    endpoint = f"https://api.airtable.com/v0/meta/bases/{urllib.parse.quote(base_id)}/tables/{urllib.parse.quote(table_id)}/fields"

    def add(field: dict):
        name = field.get("name")
        if name in ex_fields:
            return {"ok": True, "skipped": True, "name": name}
        try:
            r = http("POST", endpoint, token, field)
            return {"ok": True, "name": name, "resp": r}
        except Exception as e:
            return {"ok": False, "name": name, "error": str(e)}

    # minimal, conservative types to avoid 422s
    to_add = [
        {"name": "submission_id", "type": "singleLineText"},
        {"name": "form_id", "type": "singleLineText"},
        {"name": "submitted_at", "type": "singleLineText"},
        {"name": "status", "type": "singleSelect", "options": {"choices": [{"name": v} for v in ["waiting_review","in_review","approved","sent"]]}},
        {"name": "reviewer", "type": "singleLineText"},
        {"name": "reviewed_at", "type": "singleLineText"},
        {"name": "email", "type": "singleLineText"},
        {"name": "contact_name", "type": "singleLineText"},
        {"name": "contact_phone", "type": "singleLineText"},
        {"name": "business_name", "type": "singleLineText"},
        {"name": "selected_level", "type": "singleSelect", "options": {"choices": [{"name": v} for v in ["lone","basic","mid","high"]]}},
        {"name": "selected_modules", "type": "multipleSelects", "options": {"choices": [{"name": v} for v in [
            "DPO","Registration","Report",
            "worker_security_agreement","cameras_policy","consultation_call","outsourcing_text","direct_marketing_rules",
            "level_lone","level_basic","level_mid","level_high",
        ]]}},
        # Additional fields used by /privacy/save_review
        {"name": "auto_selected_modules", "type": "multipleSelects", "options": {"choices": [{"name": v} for v in [
            "DPO","Registration","Report",
            "worker_security_agreement","cameras_policy","consultation_call","outsourcing_text","direct_marketing_rules",
            "level_lone","level_basic","level_mid","level_high",
        ]]}},
        {"name": "auto_level", "type": "singleSelect", "options": {"choices": [{"name": v} for v in ["lone","basic","mid","high"]]}},
        {"name": "level_overridden", "type": "checkbox", "options": {"color": "greenBright", "icon": "check"}},
        {"name": "overrides_added", "type": "multipleSelects", "options": {"choices": [{"name": v} for v in [
            "DPO","Registration","Report",
            "worker_security_agreement","cameras_policy","consultation_call","outsourcing_text","direct_marketing_rules",
            "level_lone","level_basic","level_mid","level_high",
        ]]}},
        {"name": "overrides_removed", "type": "multipleSelects", "options": {"choices": [{"name": v} for v in [
            "DPO","Registration","Report",
            "worker_security_agreement","cameras_policy","consultation_call","outsourcing_text","direct_marketing_rules",
            "level_lone","level_basic","level_mid","level_high",
        ]]}},
        {"name": "overrides_diff_json", "type": "singleLineText"},
        {"name": "override_reason", "type": "singleLineText"},
        {"name": "score_level", "type": "singleSelect", "options": {"choices": [{"name": v} for v in ["lone","basic","mid","high"]]}},
        {"name": "score_reg", "type": "checkbox", "options": {"color": "greenBright", "icon": "check"}},
        {"name": "score_report", "type": "checkbox", "options": {"color": "greenBright", "icon": "check"}},
        {"name": "score_dpo", "type": "checkbox", "options": {"color": "greenBright", "icon": "check"}},
        {"name": "score_requirements", "type": "multipleSelects", "options": {"choices": [{"name": v} for v in [
            "worker_security_agreement","cameras_policy","consultation_call","outsourcing_text","direct_marketing_rules",
        ]]}},
        {"name": "is_correct_auto", "type": "checkbox", "options": {"color": "greenBright", "icon": "check"}},
        {"name": "is_correct_reviewed", "type": "checkbox", "options": {"color": "greenBright", "icon": "check"}},
        {"name": "report_token_hash", "type": "singleLineText"},
        {"name": "report_expires_at", "type": "singleLineText"},
        {"name": "report_url", "type": "singleLineText"},
        {"name": "share_url", "type": "singleLineText"},
    ]

    results = [add(f) for f in to_add]
    return {"ok": True, "results": results}


def main():
    s = load_secrets()
    at = s.get("airtable", {})
    token = at.get("token") or at.get("token_alt")
    base = at.get("base_id")
    table = at.get("table_id")
    if not token or not base or not table:
        print(json.dumps({"ok": False, "error": "missing airtable token/base/table in secrets"}))
        return 2
    out = ensure_fields(base, table, token)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
