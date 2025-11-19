#!/usr/bin/env python3
"""
EISLAW Insights — Batch tag assignment (scaffold)

Usage (placeholder):
  python tools/insights_tag_assign.py --client "<Name>" --tags closed,first_call --files a.txt b.txt

Writes a tiny sidecar JSON with metadata next to each file for Phase 1.
"""
import argparse, json, pathlib

def main():
    ap = argparse.ArgumentParser(description="Batch tag assign (scaffold)")
    ap.add_argument('--client', required=True)
    ap.add_argument('--tags', default='')
    ap.add_argument('--files', nargs='*', default=[])
    args = ap.parse_args()
    tags = [t.strip() for t in args.tags.split(',') if t.strip()]
    for f in args.files:
        p = pathlib.Path(f)
        meta = {"client": args.client, "tags": tags, "source": "transcript"}
        p.with_suffix(p.suffix + '.meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"tagged: {p}")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

