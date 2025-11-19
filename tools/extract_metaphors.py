import argparse
import json
import os
import re
from typing import List, Dict, Any, Tuple


PRIVACY_TERMS = [
    "פרטיות",
    "הגנת הפרטיות",
    "GDPR",
    "מידע אישי",
    "נתונים אישיים",
    "עיבוד",
    "עיבוד נתונים",
    "עוגיות",
    "קוקיז",
    "Cookie",
    "הסכמה",
    "מטרה",
    "מינימיזציה",
    "DPIA",
    "השפעה על פרטיות",
    "אבטחת מידע",
    "דליפה",
    "הפרת אבטחה",
    "מחיקה",
    "שימור",
]

METAPHOR_TRIGGERS = [
    "זה כמו",
    "כמו ",
    "בדיוק כמו",
    "תחשבו על",
    "תחשבו שזה",
    "דמיינו",
    "תדמיינו",
    "תארו לכם",
    "נגיד שזה",
    "נניח שזה",
    "משל",
    "אנלוג",
    # Common metaphor nouns/images
    "כספת",
    "מנעול",
    "מפתח",
    "דלת",
    "שער",
    "גדר",
    "רמזור",
    "תמרור",
    "חגורת בטיחות",
    "תיבת דואר",
    "חדר נעול",
    "שומר סף",
    "בדיקה בכניסה",
]

SHAMIR_SPEAKER_PATTERNS = [
    r"^\s*(עו[\"\'\”\״]?ד\s+)?איתן\s+שמיר\s*[:：]",
    r"^\s*(עו[\"\'\”\״]?ד\s+)?שמיר\s*[:：]",
    r"^\s*(עו[\"\'\”\״]?ד\s+)?איתן\s*[:：]",
    r"^\s*עו[\"\'\”\״]?ד\s+איתן\s*[:：]",
]


def is_privacy_file(text: str) -> bool:
    return any(term in text for term in PRIVACY_TERMS)


def is_shamir_speaker(line: str) -> bool:
    return any(re.search(pat, line) for pat in SHAMIR_SPEAKER_PATTERNS)


def find_metaphors(lines: List[str]) -> List[Tuple[int, str, str]]:
    results: List[Tuple[int, str, str]] = []
    for i, line in enumerate(lines):
        for trig in METAPHOR_TRIGGERS:
            if trig in line:
                results.append((i, line, trig))
                break
    return results


def window(lines: List[str], center: int, before: int = 2, after: int = 2) -> str:
    start = max(0, center - before)
    end = min(len(lines), center + after + 1)
    return "\n".join(lines[start:end]).strip()

def trim_around(text: str, needle: str, pre: int = 80, post: int = 140) -> str:
    try:
        idx = text.index(needle)
    except ValueError:
        # Fallback: simple trim
        t = text.strip()
        return (t[: pre + post] + '…') if len(t) > (pre + post) else t
    start = max(0, idx - pre)
    end = min(len(text), idx + len(needle) + post)
    out = text[start:end].strip()
    if start > 0:
        out = '…' + out
    if end < len(text):
        out = out + '…'
    return out

def trim_lines(text: str, max_len: int = 220) -> str:
    parts = []
    for ln in text.splitlines():
        ln = ln.strip()
        if len(ln) > max_len:
            parts.append(ln[:max_len] + '…')
        else:
            parts.append(ln)
    return "\n".join(parts)


def guess_concept(context: str) -> str:
    # Very light heuristic: map nearby terms to a rough concept label
    concept_map = [
        ("עוגיות", "Cookies / tracking"),
        ("קוקיז", "Cookies / tracking"),
        ("Cookie", "Cookies / tracking"),
        ("הסכמה", "Consent"),
        ("GDPR", "GDPR compliance"),
        ("מינימיזציה", "Data minimization"),
        ("מטרה", "Purpose limitation"),
        ("DPIA", "DPIA / impact assessment"),
        ("אבטחת מידע", "Security safeguards"),
        ("דליפה", "Data breach"),
        ("הפרת אבטחה", "Data breach"),
        ("מחיקה", "Retention / deletion"),
        ("שימור", "Retention / deletion"),
        ("מידע אישי", "Personal data"),
        ("נתונים אישיים", "Personal data"),
    ]
    for term, label in concept_map:
        if term in context:
            return label
    return "General privacy concept"


def rank_score(excerpt: str, context: str) -> float:
    # Simple scoring: longer excerpt with clear trigger + concept keywords
    score = 0.0
    # Trigger strength
    if "זה כמו" in excerpt:
        score += 3
    if "בדיוק כמו" in excerpt:
        score += 2
    if any(k in excerpt for k in ("דמיינו", "תדמיינו", "תחשבו")):
        score += 2
    # Context relevance
    score += sum(1 for t in PRIVACY_TERMS if t in context)
    # Length, capped
    score += min(len(excerpt) / 80.0, 3)
    return score


def collect(path_root: str, glob_substr: str | None = None) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for root, _, files in os.walk(path_root):
        for fname in files:
            if not fname.lower().endswith('.txt'):
                continue
            if glob_substr and glob_substr not in fname:
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
            except Exception:
                continue
            if not is_privacy_file(text):
                continue
            lines = text.splitlines()

            # Track current speaker (heuristic)
            speaker_is_shamir = False
            shamir_line_idxs = set()
            for i, line in enumerate(lines):
                if is_shamir_speaker(line):
                    speaker_is_shamir = True
                    shamir_line_idxs.add(i)
                elif re.match(r"^\s*\S+\s*[:：]", line):
                    # another speaker
                    speaker_is_shamir = False
                # if current line is not a speaker line, we still use the flag

            # Find metaphors anywhere, then filter to ones spoken by Shamir by proximity
            for mi, mline, trig in find_metaphors(lines):
                # Determine if within Shamir segment: look back up to 3 lines for a Shamir speaker marker
                is_shamir = False
                for back in range(0, 4):
                    bi = mi - back
                    if bi in shamir_line_idxs:
                        is_shamir = True
                        break
                    if bi >= 0 and is_shamir_speaker(lines[bi]):
                        is_shamir = True
                        break
                if not is_shamir:
                    # As a fallback, accept if the line itself mentions איתן or עו"ד
                    if not re.search(r"איתן|שמיר|עו[\"\'\”\״]?ד", mline):
                        continue

                ctx = window(lines, mi, before=2, after=2)
                # Require context to include privacy-related terms to reduce noise
                if not any(term in ctx for term in PRIVACY_TERMS):
                    continue
                concept = guess_concept(ctx)
                score = rank_score(mline, ctx)
                excerpt_trim = trim_around(mline, trig)
                context_trim = trim_lines(ctx)
                out.append({
                    "path": os.path.relpath(fpath, start=os.path.join(path_root, '..', '..'))
                            if path_root.endswith('transcripts') else os.path.relpath(fpath, start=path_root),
                    "line": mi + 1,
                    "trigger": trig,
                    "excerpt": excerpt_trim,
                    "context": context_trim,
                    "concept": concept,
                    "score": round(score, 2),
                })

    # Sort by score desc, then path
    out.sort(key=lambda x: (-x["score"], x["path"], x["line"]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=os.path.join('EISLAW System', 'RAG_Pilot', 'transcripts'))
    ap.add_argument('--limit', type=int, default=50)
    ap.add_argument('--offset', type=int, default=0)
    ap.add_argument('--glob', type=str, default=None, help='only filenames containing this substring')
    args = ap.parse_args()

    items = collect(args.root, glob_substr=args.glob)
    if args.offset:
        items = items[args.offset:]
    if args.limit:
        items = items[: args.limit]
    print(json.dumps({
        "count": len(items),
        "results": items,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
