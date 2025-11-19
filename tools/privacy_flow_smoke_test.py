#!/usr/bin/env python3
"""Seed Fillout questionnaire submissions and verify Airtable ingestion."""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import urllib.error

# Ensure repo root on sys.path for local imports
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.fillout_seed_submissions import (  # type: ignore
    http_post,
    load_mapping,
    load_secrets,
    make_submission,
)
from tools.fillout_fetch_and_score import map_submission  # type: ignore
from tools.security_scoring_eval import (  # type: ignore
    coerce_inputs,
    evaluate,
    load_rules,
)
from tools.airtable_utils import (  # type: ignore
    find_by_submission_id,
    get_cfg,
    upsert_security_submission,
)


def format_email(template: str, ts: str, idx: int) -> str:
    try:
        return template.format(ts=ts, n=idx)
    except KeyError as exc:
        raise ValueError(f"Invalid placeholder in email template: {exc}")


def seed_submissions(
    api_key: str,
    form_id: str,
    mapping: dict,
    *,
    count: int,
    email_template: str,
    name_prefix: str,
    business_name: str,
    phone: str,
    run_id: str,
) -> List[Dict[str, Any]]:
    scenarios = ["lone", "basic", "mid", "high"]
    submissions = []
    payloads = []
    for idx in range(1, count + 1):
        email = format_email(email_template, run_id, idx)
        scenario = scenarios[(idx - 1) % len(scenarios)]
        name = f"{name_prefix} Run {run_id} #{idx}"
        business = f"{business_name} Run {run_id}"
        submission = make_submission(mapping, email, name, business, phone, scenario)
        payloads.append(submission)
        submissions.append(
            {
                "email": email.lower(),
                "display_email": email,
                "name": name,
                "business": business,
                "phone": phone,
                "scenario": scenario,
            }
        )
    url = f"https://api.fillout.com/v1/api/forms/{form_id}/submissions"
    try:
        resp = http_post(url, api_key, {"submissions": payloads})
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8")
        except Exception:
            detail = str(exc)
        raise RuntimeError(f"Fillout submission failed ({exc.code}): {detail}") from exc
    if not isinstance(resp, dict) or resp.get("error"):
        raise RuntimeError(f"Fillout submission failed: {resp}")
    api_submissions = resp.get("submissions") or []
    lookup: Dict[str, dict] = {}
    for sub in api_submissions:
        mapped = map_submission(sub, mapping)
        email = (mapped.get("contact_email") or "").strip().lower()
        if not email:
            continue
        lookup[email] = {"submission": sub, "answers": mapped}
    results = []
    for meta in submissions:
        hit = lookup.get(meta["email"])
        if not hit:
            raise RuntimeError(f"Submission for {meta['display_email']} not returned by Fillout API.")
        meta["submission"] = hit["submission"]
        meta["answers"] = hit["answers"]
        results.append(meta)
    return results


def build_airtable_fields(
    answers: dict,
    score: dict,
    *,
    submission_id: str,
    form_id: str,
    submitted_at: str,
    status: str,
) -> dict:
    return {
        "submission_id": submission_id,
        "form_id": form_id,
        "submitted_at": submitted_at,
        "status": status,
        "email": answers.get("contact_email"),
        "score_level": score.get("level"),
        "score_reg": bool(score.get("reg")),
        "score_report": bool(score.get("report")),
        "score_dpo": bool(score.get("dpo")),
        "score_requirements": list(score.get("requirements") or []),
    }


def run(args: argparse.Namespace) -> dict:
    secrets = load_secrets()
    api_key = (secrets.get("fillout") or {}).get("api_key")
    if not api_key:
        raise RuntimeError("Missing fillout.api_key in secrets.local.json")
    mapping = load_mapping()
    form_id = args.form_id or os.getenv("PRIVACY_FORM_ID", "t9nJNoMdBgus")
    if not form_id:
        raise RuntimeError("Missing form id (use --form-id or PRIVACY_FORM_ID)")
    run_id = args.run_id or datetime.utcnow().strftime("%Y%m%d%H%M%S")
    seeded = seed_submissions(
        api_key,
        form_id,
        mapping,
        count=args.count,
        email_template=args.email_template,
        name_prefix=args.name_prefix,
        business_name=args.business_name,
        phone=args.phone,
        run_id=run_id,
    )
    rules = load_rules(REPO_ROOT / "config" / "security_scoring_rules.json")
    at_cfg = get_cfg(secrets)
    summaries = []
    for item in seeded:
        sub = item.get("submission") or {}
        submission_id = sub.get("submissionId")
        answers = coerce_inputs(item.get("answers") or {})
        score = evaluate(rules, answers)
        fields = build_airtable_fields(
            answers,
            score,
            submission_id=submission_id,
            form_id=form_id,
            submitted_at=sub.get("submissionTime"),
            status=args.airtable_status,
        )
        try:
            upsert_security_submission(at_cfg, fields)
        except urllib.error.HTTPError as exc:
            detail = ""
            try:
                detail = exc.read().decode("utf-8")
            except Exception:
                detail = str(exc)
            raise RuntimeError(f"Airtable upsert failed ({exc.code}): {detail}") from exc
        rec = find_by_submission_id(at_cfg["token"], at_cfg["base_id"], at_cfg["table_id"], submission_id)
        rec_fields = (rec or {}).get("fields", {})
        lookup = item
        summaries.append(
            {
                "submission_id": submission_id,
                "email": answers.get("contact_email"),
                "scenario": lookup.get("scenario"),
                "score_level": score.get("level"),
                "airtable_id": rec.get("id") if rec else None,
                "airtable_status": rec_fields.get("status"),
                "airtable_level": rec_fields.get("score_level"),
            }
        )
    return {"ok": True, "run_id": run_id, "form_id": form_id, "count": len(summaries), "records": summaries}


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Seed Fillout submissions and verify Airtable ingestion.")
    ap.add_argument("--form-id", help="Fillout form id (default: PRIVACY_FORM_ID env or t9nJNoMdBgus)")
    ap.add_argument("--count", type=int, default=10, help="Number of submissions to create (default: 10)")
    ap.add_argument(
        "--email-template",
        default="privacy-test+{ts}-{n}@eislaw.co.il",
        help="Email template supporting {ts} timestamp and {n} counter placeholders.",
    )
    ap.add_argument("--name-prefix", default="Privacy Smoke Test", help="Prefix for contact_name field.")
    ap.add_argument("--business-name", default="Privacy QA", help="Base business name before run suffix.")
    ap.add_argument("--phone", default="0500000000", help="Contact phone to use in submissions.")
    ap.add_argument("--airtable-status", default="waiting_review", help="Status value stored in Airtable.")
    ap.add_argument("--run-id", help="Override run identifier (default: UTC timestamp).")
    return ap.parse_args()


if __name__ == "__main__":
    try:
        result = run(parse_args())
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        raise SystemExit(1)
