#!/usr/bin/env python3
import json
import sys
import urllib.request
import urllib.parse
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


def ensure_tables():
    s = load_secrets()
    at = s.get("airtable", {})
    token = at.get("token") or at.get("token_alt")
    base = at.get("base_id")
    if not token or not base:
        raise SystemExit("Missing Airtable token/base_id in secrets.local.json")

    meta_base = f"https://api.airtable.com/v0/meta/bases/{urllib.parse.quote(base)}"
    existing = http("GET", meta_base + "/tables", token)
    names = {t.get("name"): t for t in existing.get("tables", [])}

    # Shared choices
    modules = [
        {"name": "DPO"}, {"name": "Registration"}, {"name": "Report"},
        {"name": "worker_security_agreement"}, {"name": "cameras_policy"},
        {"name": "consultation_call"}, {"name": "outsourcing_text"}, {"name": "direct_marketing_rules"},
        {"name": "level_lone"}, {"name": "level_basic"}, {"name": "level_mid"}, {"name": "level_high"},
    ]
    level_choices = [{"name": n} for n in ["lone", "basic", "mid", "high"]]

    def create_privacy_reviews():
        payload = {
            "tables": [
                {
                    "name": "PRIVACY_REVIEWS",
                    "fields": [
                        {"name": "submission_id", "type": "singleLineText"},
                        {"name": "form_id", "type": "singleLineText"},
                        {"name": "submitted_at", "type": "date", "options": {"timeFormat": "24hour", "timeZone": "UTC"}},
                        {"name": "email", "type": "email"},
                        {"name": "contact_name", "type": "singleLineText"},
                        {"name": "contact_phone", "type": "singleLineText"},
                        {"name": "business_name", "type": "singleLineText"},
                        {"name": "status", "type": "singleSelect", "options": {"choices": [{"name": "waiting_review"},{"name": "in_review"},{"name": "approved"},{"name": "sent"}]}},
                        {"name": "reviewer", "type": "singleLineText"},
                        {"name": "reviewed_at", "type": "date", "options": {"timeFormat": "24hour", "timeZone": "UTC"}},
                        {"name": "auto_selected_modules", "type": "multipleSelects", "options": {"choices": modules}},
                        {"name": "selected_modules", "type": "multipleSelects", "options": {"choices": modules}},
                        {"name": "auto_level", "type": "singleSelect", "options": {"choices": level_choices}},
                        {"name": "selected_level", "type": "singleSelect", "options": {"choices": level_choices}},
                        {"name": "level_overridden", "type": "checkbox", "options": {"color": "yellowBright", "icon": "check"}},
                        {"name": "overrides_added", "type": "multipleSelects", "options": {"choices": modules}},
                        {"name": "overrides_removed", "type": "multipleSelects", "options": {"choices": modules}},
                        {"name": "overrides_diff_json", "type": "longText"},
                        {"name": "override_reason", "type": "longText"},
                        {"name": "score_level", "type": "singleSelect", "options": {"choices": level_choices}},
                        {"name": "score_reg", "type": "checkbox", "options": {"color": "greenBright", "icon": "check"}},
                        {"name": "score_report", "type": "checkbox", "options": {"color": "redBright", "icon": "check"}},
                        {"name": "score_dpo", "type": "checkbox", "options": {"color": "orangeBright", "icon": "check"}},
                        {"name": "score_requirements", "type": "multipleSelects", "options": {"choices": modules}},
                        {"name": "is_correct_auto", "type": "checkbox", "options": {"color": "blueBright", "icon": "check"}},
                        {"name": "is_correct_reviewed", "type": "checkbox", "options": {"color": "blue", "icon": "check"}},
                    ]
                }
            ]
        }
        return http("POST", meta_base + "/tables", token, payload)

    def create_review_audit():
        payload = {
            "tables": [
                {
                    "name": "Review_Audit",
                    "fields": [
                        {"name": "submission_id", "type": "singleLineText"},
                        {"name": "module", "type": "singleSelect", "options": {"choices": modules}},
                        {"name": "from", "type": "checkbox", "options": {"color": "grayBright", "icon": "check"}},
                        {"name": "to", "type": "checkbox", "options": {"color": "grayBright", "icon": "check"}},
                        {"name": "reviewer", "type": "singleLineText"},
                        {"name": "timestamp", "type": "date", "options": {"timeFormat": "24hour", "timeZone": "UTC"}},
                        {"name": "note", "type": "longText"},
                    ]
                }
            ]
        }
        return http("POST", meta_base + "/tables", token, payload)

    out = {"created": [], "skipped": []}
    if "PRIVACY_REVIEWS" not in names:
        out["created"].append("PRIVACY_REVIEWS")
        cr = create_privacy_reviews()
        out["PRIVACY_REVIEWS_resp"] = cr
    else:
        out["skipped"].append("PRIVACY_REVIEWS")
    if "Review_Audit" not in names:
        out["created"].append("Review_Audit")
        cr2 = create_review_audit()
        out["Review_Audit_resp"] = cr2
    else:
        out["skipped"].append("Review_Audit")
    return out


def ensure_secrets_table_id():
    p = Path(__file__).resolve().parents[1] / "secrets.local.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    at = data.setdefault("airtable", {})
    if at.get("table_id") != "PRIVACY_REVIEWS":
        at["table_id"] = "PRIVACY_REVIEWS"
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return True
    return False


def main():
    created = ensure_tables()
    updated = ensure_secrets_table_id()
    print(json.dumps({"ok": True, "result": created, "secrets_updated": updated}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

