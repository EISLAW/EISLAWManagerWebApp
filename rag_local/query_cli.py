#!/usr/bin/env python3
import argparse
import re
from pathlib import Path
from typing import List, Dict

import chromadb
from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer


def ensure_collection(client: PersistentClient, name: str):
    try:
        return client.get_collection(name)
    except Exception:
        return client.create_collection(name)


def search(corpus: str, store: Path, query: str, k: int = 6) -> List[Dict]:
    client = chromadb.PersistentClient(path=str(store))
    col = ensure_collection(client, name=f"rag_{corpus}")
    model = SentenceTransformer("intfloat/multilingual-e5-small")
    q_emb = model.encode(["query: " + query], normalize_embeddings=True, convert_to_numpy=True)[0]
    res = col.query(query_embeddings=[q_emb.tolist()], n_results=k, include=["documents", "metadatas", "distances"])
    out = []
    for i in range(len(res.get("ids", [[]])[0])):
        out.append({
            "id": res["ids"][0][i],
            "doc": res["documents"][0][i],
            "meta": res["metadatas"][0][i],
            "score": 1 - float(res["distances"][0][i]) if res.get("distances") else None,
        })
    return out


def pretty_snippet(text: str, limit: int = 500) -> str:
    t = re.sub(r"\s+", " ", text).strip()
    return t[:limit] + ("..." if len(t) > limit else "")


def interactive(corpus: str, store: Path):
    print(f"RAG local chat — corpus={corpus} (type 'exit' to quit)")
    while True:
        try:
            q = input("Q> ").strip()
        except EOFError:
            break
        if not q or q.lower() in {"exit", "quit"}:
            break
        hits = search(corpus, store, q, k=6)
        if not hits:
            print("No results.")
            continue
        print("\nTop results (snippets with citations):")
        for i, h in enumerate(hits, 1):
            rel = h["meta"].get("rel")
            chunk = h["meta"].get("chunk")
            print(f"{i}. {pretty_snippet(h['doc'])}")
            print(f"   ↳ {rel}#{chunk}  score={h.get('score'):.3f}")
        print()


def main():
    ap = argparse.ArgumentParser(description="Query local RAG index (interactive chat)")
    ap.add_argument("--corpus", default="legal")
    ap.add_argument("--store", default=str(Path(__file__).resolve().parent / "chroma_legal"))
    args = ap.parse_args()
    interactive(args.corpus, Path(args.store))


if __name__ == "__main__":
    main()


