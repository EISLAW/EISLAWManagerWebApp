#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path
import os
import urllib.request

# Ensure repo root is on sys.path for local imports (tools/*)
try:
    repo_root = str(Path(__file__).resolve().parents[1])
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
except Exception:
    pass


def load_secrets() -> dict:
    p = Path(__file__).resolve().parents[1] / "secrets.local.json"
    return json.loads(p.read_text(encoding="utf-8"))


def http_get(url: str, api_key: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    return json.loads(data.decode("utf-8"))


def list_forms(api_key: str) -> list:
    return http_get("https://api.fillout.com/v1/api/forms", api_key)


def list_submissions(api_key: str, form_id: str, limit: int = 5) -> dict:
    return http_get(f"https://api.fillout.com/v1/api/forms/{form_id}/submissions?limit={limit}", api_key)


def try_load_mapping() -> dict:
    cfg = Path(__file__).resolve().parents[1] / "docs" / "fillout_field_mapping.json"
    if cfg.exists():
        try:
            return json.loads(cfg.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _hebrew_bool(val):
    if isinstance(val, str):
        if val.strip() in {"כן", "כן.", "Yes", "yes"}:
            return True
        if val.strip() in {"לא", "No", "no"}:
            return False
    return val


def map_submission(sub: dict, mapping: dict) -> dict:
    answers = {}
    q_by_id = {q.get("id"): q for q in sub.get("questions", [])}
    q_by_name = {q.get("name"): q for q in sub.get("questions", [])}
    url_params_by_name = {p.get("name"): p.get("value") for p in sub.get("urlParameters", [])}
    # fallback mapping from our target keys -> URL parameter names
    url_fallback = {
        "contact_email": "email",
        "contact_phone": "phone",
        "contact_name": "name",
        "business_name": "business_name",
    }
    # mapping entries: { target_key: { "id": "abcd" } } or { "name_contains": "..." }
    for target, spec in mapping.items():
        val = None
        if isinstance(spec, dict):
            if "id" in spec and spec["id"] in q_by_id:
                val = q_by_id[spec["id"].strip()].get("value")
            elif "name" in spec and spec["name"] in q_by_name:
                val = q_by_name[spec["name"].strip()].get("value")
            elif "name_contains" in spec:
                for nm, q in q_by_name.items():
                    if spec["name_contains"] in (nm or ""):
                        val = q.get("value")
                        break
        if val is None:
            # Fallback to URL parameters if configured
            up_key = url_fallback.get(target)
            if up_key and up_key in url_params_by_name:
                val = url_params_by_name.get(up_key)

        if val is not None:
            # normalize booleans expressed as Hebrew Yes/No
            if isinstance(val, str):
                val = _hebrew_bool(val)
            answers[target] = val
    return answers


def main():
    ap = argparse.ArgumentParser(description="Fetch Fillout submissions and run scoring")
    ap.add_argument("--form-id", required=False, help="Fillout formId (e.g., sg4zY9dGS1us)")
    ap.add_argument("--form-name", required=False, help="Exact form name to resolve to formId")
    ap.add_argument("--limit", type=int, default=3)
    ap.add_argument("--airtable-upsert", action="store_true", help="Upsert results into Airtable Security_Submissions table")
    ap.add_argument("--airtable-status", default="waiting_review", help="Initial status when creating Airtable record (default: waiting_review)")
    args = ap.parse_args()

    secrets = load_secrets()
    api_key = secrets.get("fillout", {}).get("api_key")
    if not api_key:
        print("Missing Fillout API key in secrets.local.json", file=sys.stderr)
        return 2

    form_id = args.form_id
    if not form_id and args.form_name:
        forms = list_forms(api_key)
        hit = next((f for f in forms if f.get("name") == args.form_name), None)
        if not hit:
            # fallback: substring match
            hit = next((f for f in forms if args.form_name in (f.get("name") or "")), None)
        if not hit:
            print(json.dumps({"error": "form not found by name", "name": args.form_name}, ensure_ascii=False))
            return 2
        form_id = hit.get("formId")
        try:
            print(f"resolved_form_id={form_id}")
        except Exception:
            pass
    if not form_id:
        forms = list_forms(api_key)
        print(json.dumps(forms, ensure_ascii=False))
        return 0

    subs = list_submissions(api_key, form_id, args.limit)
    print(json.dumps({"formId": form_id, "meta": {k: v for k, v in subs.items() if k != "responses"}}, ensure_ascii=False))

    responses = subs.get("responses", [])
    if not responses:
        print("No submissions found.")
        return 0

    mapping = try_load_mapping()

    # import evaluator
    from tools.security_scoring_eval import coerce_inputs, evaluate, load_rules
    rules = load_rules(Path(__file__).resolve().parents[1] / "config" / "security_scoring_rules.json")

    # Airtable integration (optional)
    at_cfg = None
    if args.airtable_upsert:
        try:
            from tools.airtable_utils import get_cfg, upsert_security_submission
            at_cfg = get_cfg(secrets)
        except Exception as e:
            print(json.dumps({"airtable": {"enabled": False, "error": str(e)}}))
            at_cfg = None

    for idx, sub in enumerate(responses, 1):
        print(f"\n# Submission {idx} id={sub.get('submissionId')} time={sub.get('submissionTime')}")
        # show compact view
        preview = [{"id": q.get("id"), "name": q.get("name"), "type": q.get("type"), "value": q.get("value")} for q in sub.get("questions", [])]
        try:
            print(json.dumps({"questions": preview}, ensure_ascii=False))
        except Exception:
            # Fallback to ASCII-safe minimal output
            print(f"questions_count={len(preview)}")

        raw_answers = map_submission(sub, mapping)
        if not raw_answers:
            print("(No mapping found. Add docs/fillout_field_mapping.json to enable auto-scoring.)")
            continue
        answers = coerce_inputs(raw_answers)
        out = evaluate(rules, answers)
        payload = {"answers": answers, "score": out}
        try:
            print(json.dumps(payload, ensure_ascii=False))
        except Exception:
            try:
                print(json.dumps(payload, ensure_ascii=True))
            except Exception:
                print("answers_keys=" + ",".join(sorted(answers.keys())) + "; level=" + str(out.get("level")))

        # Optional Airtable upsert per submission
        if at_cfg is not None:
            try:
                # Build Airtable fields
                sub_id = sub.get("submissionId")
                submitted_at = sub.get("submissionTime")
                fields = {
                    "submission_id": sub_id,
                    "form_id": form_id,
                    "submitted_at": submitted_at,
                    "email": answers.get("contact_email"),
                    # Review defaults
                    "status": args.airtable_status,
                    "email_to": answers.get("contact_email"),
                    # Score mirrors
                    "score_level": out.get("level"),
                    "score_reg": bool(out.get("reg")),
                    "score_report": bool(out.get("report")),
                    "score_dpo": bool(out.get("dpo")),
                    "score_requirements": list(out.get("requirements") or []),
                }
                from tools.airtable_utils import upsert_security_submission
                res = upsert_security_submission(at_cfg, fields)
                try:
                    print(json.dumps({"airtable": {"upsert": True, "submission_id": sub_id}}, ensure_ascii=False))
                except Exception:
                    print(f"airtable_upsert_ok submission_id={sub_id}")
            except Exception as e:
                try:
                    print(json.dumps({"airtable": {"upsert": False, "error": str(e)}}, ensure_ascii=False))
                except Exception:
                    print("airtable_upsert_error: " + str(e))

    return 0


if __name__ == "__main__":
    sys.exit(main())
try:
    # Improve console output for non-ASCII (Hebrew names)
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Ensure repo root is on sys.path for local imports
try:
    repo_root = str(Path(__file__).resolve().parents[1])
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
except Exception:
    pass
