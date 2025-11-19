#!/usr/bin/env python3
"""
EISLAW Insights — Indexer (scaffold)

Reads transcripts and sidecar metadata, prepares entries for the RAG_Pilot index
pipeline. Final ingestion remains in RAG_Pilot/ingest_transcripts.py; this tool
normalizes inputs and emits a manifest JSON for ingestion.
"""
import argparse, json, pathlib

def main():
    ap = argparse.ArgumentParser(description="Insights index manifest generator (scaffold)")
    ap.add_argument('--root', default='RAG_Pilot/transcripts')
    ap.add_argument('--out', default='build/insights_manifest.json')
    args = ap.parse_args()
    root = pathlib.Path(args.root)
    items = []
    for p in root.rglob('*.txt'):
        meta_p = p.with_suffix(p.suffix + '.meta.json')
        meta = {}
        if meta_p.exists():
            try:
                meta = json.loads(meta_p.read_text(encoding='utf-8'))
            except Exception:
                meta = {}
        items.append({"path": str(p), "meta": meta})
    outp = pathlib.Path(args.out)
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(json.dumps({"items": items}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"wrote manifest: {outp} ({len(items)} items)")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

