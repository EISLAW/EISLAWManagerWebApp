#!/usr/bin/env python3
import argparse
import json
import random
from pathlib import Path
import urllib.request


def load_secrets() -> dict:
    p = Path(__file__).resolve().parents[1] / "secrets.local.json"
    return json.loads(p.read_text(encoding="utf-8"))


def http_post(url: str, token: str, payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": raw}


def load_mapping() -> dict:
    p = Path(__file__).resolve().parents[1] / "docs" / "fillout_field_mapping.json"
    return json.loads(p.read_text(encoding="utf-8"))


def q(id_: str, value):
    return {"id": id_, "value": value}


def make_submission(mapping: dict, email: str, name: str, business: str, phone: str, scenario: str) -> dict:
    # Required contact fields
    qs = [
        q(mapping["contact_name"]["id"], name),
        q(mapping["contact_email"]["id"], email),
        q(mapping["contact_phone"]["id"], phone),
        q(mapping["business_name"]["id"], business),
    ]

    # Common Hebrew toggles
    YES, NO = "כן", "לא"

    # Scenario knobs (aiming to exercise rules)
    if scenario == "lone":
        qs += [
            q(mapping["owners"]["id"], 1),
            q(mapping["access"]["id"], 1),
            q(mapping["ethics"]["id"], NO),
            q(mapping["ppl"]["id"], 500),
            q(mapping["directmail_biz"]["id"], NO),
            q(mapping["transfer"]["id"], NO),
            q(mapping["sensitive_people"]["id"], 0),
            q(mapping["employees_exposed"]["id"], NO),
            q(mapping["cameras"]["id"], NO),
        ]
    elif scenario == "basic":
        qs += [
            q(mapping["owners"]["id"], 3),
            q(mapping["access"]["id"], 3),
            q(mapping["ethics"]["id"], NO),
            q(mapping["ppl"]["id"], 8000),
            q(mapping["directmail_biz"]["id"], NO),
            q(mapping["transfer"]["id"], NO),
            q(mapping["sensitive_people"]["id"], 0),
            q(mapping["employees_exposed"]["id"], YES),
            q(mapping["cameras"]["id"], NO),
        ]
    elif scenario == "mid":
        qs += [
            q(mapping["owners"]["id"], 5),
            q(mapping["access"]["id"], 7),
            q(mapping["ethics"]["id"], NO),
            q(mapping["ppl"]["id"], 15000),
            q(mapping["sensitive_types"]["id"], ["מידע על צנעת הפרט (לרבות נטייה מינית)"]),
            q(mapping["sensitive_people"]["id"], 2000),
            q(mapping["directmail_biz"]["id"], NO),
            q(mapping["transfer"]["id"], NO),
            q(mapping["employees_exposed"]["id"], YES),
            q(mapping["cameras"]["id"], YES),
        ]
    elif scenario == "high":
        qs += [
            q(mapping["owners"]["id"], 10),
            q(mapping["access"]["id"], 20),
            q(mapping["ethics"]["id"], YES),
            q(mapping["ppl"]["id"], 120000),
            q(mapping["biometric_100k"]["id"], YES),
            q(mapping["sensitive_people"]["id"], 100000),
            q(mapping["directmail_biz"]["id"], YES),
            q(mapping["transfer"]["id"], YES),
            q(mapping["processor_large_org"]["id"], YES),
            q(mapping["employees_exposed"]["id"], YES),
            q(mapping["cameras"]["id"], YES),
        ]
    else:
        # default sprinkle
        qs += [
            q(mapping["owners"]["id"], random.randint(1, 4)),
            q(mapping["access"]["id"], random.randint(1, 6)),
            q(mapping["ethics"]["id"], random.choice([YES, NO])),
            q(mapping["ppl"]["id"], random.choice([500, 3000, 12000, 50000])),
            q(mapping["directmail_biz"]["id"], NO),
            q(mapping["transfer"]["id"], NO),
        ]

    return {"questions": qs}


def main() -> int:
    ap = argparse.ArgumentParser(description="Seed Fillout submissions via API")
    ap.add_argument("--form-id", required=True)
    ap.add_argument("--count", type=int, default=10)
    ap.add_argument("--email", required=True)
    ap.add_argument("--name", default="בדיקת מערכת")
    ap.add_argument("--business", default="בדיקה בע\"מ")
    ap.add_argument("--phone", default="0500000000")
    args = ap.parse_args()

    secrets = load_secrets()
    api_key = secrets.get("fillout", {}).get("api_key")
    if not api_key:
        print(json.dumps({"ok": False, "error": "missing fillout.api_key in secrets"}, ensure_ascii=False))
        return 2

    mapping = load_mapping()

    scenarios = ["lone", "basic", "mid", "high"]
    subs = []
    for i in range(args.count):
        scenario = scenarios[i % len(scenarios)]
        sub = make_submission(mapping, args.email, f"{args.name} {i+1}", args.business, args.phone, scenario)
        subs.append(sub)

    payload = {"submissions": subs}
    url = f"https://api.fillout.com/v1/api/forms/{args.form_id}/submissions"
    out = http_post(url, api_key, payload)
    print(json.dumps({"ok": True, "created": out.get("submissions") or out}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

