#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def load_texts(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def derive_triggers(ans: dict, score: dict) -> list:
    out = []
    # effective ppl: max(ppl, sensitive_people)
    try:
        ppl = int(ans.get("ppl") or 0)
    except Exception:
        ppl = 0
    try:
        sp = int(ans.get("sensitive_people") or 0)
    except Exception:
        sp = 0
    ppl_eff = max(ppl, sp)

    if ppl_eff >= 100000:
        out.append("ppl_100k")
    if sp >= 100000:
        out.append("sensitive_people_100k")
    try:
        access = int(ans.get("access") or 0)
    except Exception:
        access = 0
    sensitive = bool(ans.get("sensitive")) or sp > 0 or bool(ans.get("sensitive_types"))
    if sensitive and access >= 101:
        out.append("access_101_sensitive")
    if bool(ans.get("monitor_1000")):
        out.append("monitor_1000")
    if sp >= 1000:
        out.append("sensitive_people_1000")
    if score.get("reg") and bool(ans.get("transfer")):
        out.append("reg_transfer")
    if score.get("reg") and bool(ans.get("directmail_biz")):
        out.append("reg_directmail_biz")
    return out


def compose_email(texts: dict, score: dict, triggers: list, include_triggers: bool = True) -> str:
    parts = []
    # level
    lvl = (score.get("level") or "").lower()
    if lvl and lvl in texts.get("level", {}):
        parts.append(texts["level"][lvl])
    # obligations
    ob = texts.get("obligation", {})
    if score.get("reg") and "reg" in ob:
        parts.append(ob["reg"]) 
    if score.get("report") and "report" in ob:
        parts.append(ob["report"]) 
    if score.get("dpo") and "dpo" in ob:
        parts.append(ob["dpo"]) 
    # requirements
    req_codes = score.get("requirements") or []
    req_texts = texts.get("requirement", {})
    for r in req_codes:
        if r in req_texts:
            parts.append(req_texts[r])
    # triggers
    if include_triggers:
        trig_texts = texts.get("trigger", {})
        trig_lines = [trig_texts[t] for t in triggers if t in trig_texts]
        if trig_lines:
            parts.append("\n".join(["סיבות/הסברים:"] + [f"• {ln}" for ln in trig_lines]))
    return "\n\n".join([p for p in parts if p])


def main():
    ap = argparse.ArgumentParser(description="Compose security email text from score + texts JSON")
    ap.add_argument("--texts", default=str(Path(__file__).resolve().parents[1] / "docs" / "security_texts.he-IL.json"))
    ap.add_argument("--answers", help="Answers JSON string/path (optional; used to derive triggers)")
    ap.add_argument("--score", help="Score JSON string/path (level, reg, report, dpo, requirements)")
    ap.add_argument("--no-triggers", action="store_true", help="Do not append trigger blurbs")
    args = ap.parse_args()

    texts = load_texts(Path(args.texts))

    if not args.score:
        print(json.dumps({"error": "--score is required"}, ensure_ascii=False))
        return 2

    def load_json_arg(val: str):
        if val.strip().startswith("{"):
            return json.loads(val)
        p = Path(val)
        return json.loads(p.read_text(encoding="utf-8"))

    score = load_json_arg(args.score)
    answers = load_json_arg(args.answers) if args.answers else {}

    triggers = derive_triggers(answers, score)
    body = compose_email(texts, score, triggers, include_triggers=not args.no_triggers)
    try:
        print(body)
    except Exception:
        print(body.encode("utf-8", errors="ignore").decode("utf-8", errors="ignore"))
    return 0


if __name__ == "__main__":
    try:
        # improve unicode output in some consoles
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main())

