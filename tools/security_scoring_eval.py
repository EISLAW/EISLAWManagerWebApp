#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def safe_eval(expr: str, ctx: dict) -> bool:
    # Extremely limited eval for boolean expressions used in rules
    # Variables in ctx; allow 'and', 'or', 'not', '==', '!=', comparison ops.
    allowed = {k: v for k, v in ctx.items()}
    return bool(eval(expr, {"__builtins__": {}}, allowed))


def load_rules(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def coerce_inputs(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        if isinstance(v, str):
            vl = v.strip().lower()
            if vl in {"true", "yes", "1"}:
                out[k] = True
                continue
            if vl in {"false", "no", "0", ""}:
                out[k] = False
                continue
            # try number
            try:
                out[k] = int(v)
                continue
            except Exception:
                pass
        out[k] = v
    return out


def evaluate(rules: dict, answers: dict) -> dict:
    # derive/normalize based on current questionnaire
    derived = dict(answers)
    try:
        sp = int(derived.get("sensitive_people", 0) or 0)
    except Exception:
        sp = 0
    if not derived.get("sensitive") and sp > 0:
        derived["sensitive"] = True
    # ensure ppl >= sensitive_people
    try:
        ppl_val = int(derived.get("ppl", 0) or 0)
    except Exception:
        ppl_val = 0
    if sp > ppl_val:
        derived["ppl"] = sp
    # multi-select sensitive types implies sensitive
    stypes = derived.get("sensitive_types")
    if isinstance(stypes, (list, tuple, set)) and len(stypes) > 0:
        derived["sensitive"] = True
    # biometric boolean implies minimum floors for counts
    if derived.get("biometric_100k"):
        thr = rules.get("thresholds", {})
        bio_thr = int(thr.get("biometric_high", 100000))
        if (derived.get("biometric_people") or 0) < bio_thr:
            derived["biometric_people"] = bio_thr
        if (derived.get("sensitive_people") or 0) < bio_thr:
            derived["sensitive_people"] = bio_thr
        if (derived.get("ppl") or 0) < bio_thr:
            derived["ppl"] = bio_thr

    ctx = dict(derived)
    # install thresholds and True/False in ctx
    ctx["thresholds"] = rules.get("thresholds", {})
    ctx.setdefault("True", True)
    ctx.setdefault("False", False)

    level = None
    level_min = None
    dpo = answers.get("dpo")
    reg = answers.get("reg")
    report = answers.get("report")

    # apply rules
    for r in rules.get("rules", []):
        expr = r.get("when", "")
        try:
            ok = safe_eval(expr, ctx)
        except Exception:
            ok = False
        if not ok:
            continue
        st = r.get("set", {})
        if "level" in st:
            # choose higher severity using precedence order
            prec = rules.get("precedence", ["high", "mid", "basic", "lone"])  # high best
            new_level = st["level"]
            if level is None:
                level = new_level
            else:
                try:
                    if prec.index(new_level) < prec.index(level):
                        level = new_level
                except Exception:
                    level = new_level
        if "level_min" in st:
            level_min = st["level_min"]
        if "dpo" in st:
            dpo = st["dpo"]
        if "reg" in st:
            reg = st["reg"]
        if "report" in st:
            report = st["report"]

    # enforce constraints
    ctx2 = dict(ctx)
    ctx2.update({"level": level, "level_min": level_min, "dpo": dpo, "reg": reg, "report": report})
    for c in rules.get("constraints", []):
        expr = c.get("if", "")
        try:
            ok = safe_eval(expr, ctx2)
        except Exception:
            ok = False
        if not ok:
            continue
        enf = c.get("enforce", {})
        if "level_min" in enf:
            # raise level to at least this minimum using precedence
            prec = rules.get("precedence", ["high", "mid", "basic", "lone"])  # high best
            target = enf["level_min"]
            if level is None or prec.index(level) > prec.index(target):
                level = target
        if "dpo" in enf:
            dpo = enf["dpo"]

    # finalize level if still None
    if level is None:
        # Basic fallback check to avoid accidental mid default
        ppl_mid = int(rules.get("thresholds", {}).get("ppl_mid", 10000))
        access_basic_max = int(rules.get("thresholds", {}).get("access_basic_max", 10))
        ethics_v = bool(derived.get("ethics"))
        owners_v = int(derived.get("owners") or 0)
        access_v = int(derived.get("access") or 0)
        transfer_v = bool(derived.get("transfer"))
        dmail_biz_v = bool(derived.get("directmail_biz"))
        ppl_v = int(derived.get("ppl") or 0)
        sensitive_v = bool(derived.get("sensitive"))
        lone_possible = (not ethics_v) and (owners_v <= 2) and (access_v <= 2) and (not dmail_biz_v) and (not transfer_v) and (ppl_v < ppl_mid)
        basic_cond = (not dmail_biz_v) and (not transfer_v) and (not lone_possible) and ((not sensitive_v) or (sensitive_v and access_v <= access_basic_max))
        if basic_cond:
            level = "basic"
    if level is None:
        # default based on level_min else mid (per spec)
        level = level_min or "mid"
    else:
        # Enforce level_min against chosen level
        if level_min:
            prec = rules.get("precedence", ["high", "mid", "basic", "lone"])  # high best
            try:
                if prec.index(level) > prec.index(level_min):
                    level = level_min
            except Exception:
                pass

    # derive requirements from non-scoring questions
    requirements = []
    if bool(derived.get("employees_exposed")):
        requirements.append("worker_security_agreement")
    if bool(derived.get("cameras")):
        requirements.append("cameras_policy")
    if bool(derived.get("processor")):
        requirements.append("outsourcing_text")
        if not bool(derived.get("processor_sensitive_org")):
            requirements.append("consultation_call")
    if bool(derived.get("processor_sensitive_org")):
        if "outsourcing_text" not in requirements:
            requirements.append("outsourcing_text")
    if bool(derived.get("processor_large_org")):
        if "outsourcing_text" not in requirements:
            requirements.append("outsourcing_text")
    if bool(derived.get("directmail_biz")) or bool(derived.get("directmail_self")):
        requirements.append("direct_marketing_rules")

    # post-couplings
    # registration fallback (defensive)
    try:
        ppl_mid = int(rules.get("thresholds", {}).get("ppl_mid", 10000))
        if (bool(derived.get("transfer")) or bool(derived.get("directmail_biz"))) and int(derived.get("ppl") or 0) >= ppl_mid:
            reg = True
    except Exception:
        pass
    if report:
        dpo = True
    if reg:
        dpo = True
    thr = rules.get("thresholds", {})
    if not reg:
        if bool(derived.get("biometric_100k")) or int(derived.get("sensitive_people") or 0) >= int(thr.get("sensitive_report", 100000)):
            report = True
    # dpo via sensitive_people threshold
    try:
        if int(derived.get("sensitive_people") or 0) >= int(thr.get("sensitive_dpo", 1000)):
            dpo = True
    except Exception:
        pass
    # dpo via monitoring
    if bool(derived.get("monitor_1000")):
        dpo = True

    # ensure single level and return
    return {
        "level": level,
        "dpo": bool(dpo) if dpo is not None else False,
        "reg": bool(reg) if reg is not None else False,
        "report": bool(report) if report is not None else False,
        "requirements": requirements,
    }


def main():
    ap = argparse.ArgumentParser(description="Evaluate privacy security scoring from answers")
    ap.add_argument("--rules", default=str(Path(__file__).resolve().parents[1] / "config" / "security_scoring_rules.json"))
    ap.add_argument("--answers", help="JSON string or path to JSON file with questionnaire answers")
    args = ap.parse_args()

    rules = load_rules(Path(args.rules))

    if not args.answers:
        print(json.dumps({"error": "no answers"}))
        return 1
    ans_arg = args.answers
    if ans_arg.strip().startswith("{"):
        answers = json.loads(ans_arg)
    else:
        p = Path(ans_arg)
        answers = json.loads(p.read_text(encoding="utf-8"))
    answers = coerce_inputs(answers)
    out = evaluate(rules, answers)
    print(json.dumps(out, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
