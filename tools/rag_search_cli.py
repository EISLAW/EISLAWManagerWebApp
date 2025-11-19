import argparse
import json
import re
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
TRANSCRIPTS = BASE / "RAG_Pilot" / "transcripts"

def iter_text_files(root: Path):
    if not root.exists():
        return []
    for p in root.rglob("*.txt"):
        # skip large/binary-like by size heuristic
        if p.is_file() and p.stat().st_size < 5_000_000:
            yield p

def find_snippet(text: str, query: str, width: int = 160) -> str:
    i = text.lower().find(query.lower())
    if i == -1:
        return text[:width] + ("…" if len(text) > width else "")
    start = max(0, i - width//2)
    end = min(len(text), i + len(query) + width//2)
    return ("…" if start>0 else "") + text[start:end].replace("\n"," ") + ("…" if end < len(text) else "")

def score_text(text: str, query: str) -> int:
    # simple token overlap score
    toks = [t for t in re.split(r"\W+", query.lower()) if t]
    score = sum(text.lower().count(t) for t in toks)
    # boost for full phrase
    score += text.lower().count(query.lower()) * 2
    return score

def main():
    ap = argparse.ArgumentParser(description="Simple local RAG search over transcripts")
    ap.add_argument('--q', required=True, help='Query text')
    ap.add_argument('--client', default='', help='Optional client name filter (substring in path)')
    ap.add_argument('--limit', type=int, default=10, help='Max results')
    args = ap.parse_args()

    roots = [TRANSCRIPTS]
    results = []
    for root in roots:
        for p in iter_text_files(root):
            if args.client and args.client.lower() not in p.as_posix().lower():
                continue
            try:
                text = p.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            s = score_text(text, args.q)
            if s > 0:
                results.append({
                    'path': str(p.relative_to(BASE)),
                    'score': int(s),
                    'snippet': find_snippet(text, args.q),
                })
    results.sort(key=lambda r: r['score'], reverse=True)
    out = {
        'query': args.q,
        'client': args.client or None,
        'count': len(results),
        'results': results[:max(1,args.limit)]
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()

