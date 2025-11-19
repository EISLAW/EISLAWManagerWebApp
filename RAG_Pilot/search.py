#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from typing import List

import numpy as np


def load_index(index_dir: Path):
    import faiss
    idx = faiss.read_index(str(index_dir / "index.faiss"))
    metas = json.loads((index_dir / "meta.json").read_text(encoding="utf-8"))
    return idx, metas


def embed(q: List[str]):
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    v = model.encode(q, convert_to_numpy=True, normalize_embeddings=True)
    return v


def main():
    ap = argparse.ArgumentParser(description="Search transcripts index")
    ap.add_argument("query")
    ap.add_argument("--index", default=str(Path(__file__).resolve().parent / "index_store"))
    ap.add_argument("--topk", type=int, default=5)
    args = ap.parse_args()

    idx, metas = load_index(Path(args.index))
    qv = embed([args.query]).astype(np.float32)
    D, I = idx.search(qv, args.topk)
    res = []
    for rank, (score, i) in enumerate(zip(D[0], I[0]), 1):
        if i < 0 or i >= len(metas):
            continue
        m = metas[i]
        res.append({"rank": rank, "score": float(score), **m})
    print(json.dumps(res, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

