#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from rich import print


def read_text(path: Path) -> str:
    suf = path.suffix.lower()
    if suf == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    if suf == ".docx":
        from docx import Document
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)
    if suf == ".pdf":
        from pypdf import PdfReader
        r = PdfReader(str(path))
        out = []
        for p in r.pages:
            try:
                out.append(p.extract_text() or "")
            except Exception:
                pass
        return "\n".join(out)
    raise ValueError(f"Unsupported file type: {path}")


def chunk_text(text: str, max_chars: int = 1200, overlap: int = 150) -> List[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    parts = []
    i = 0
    n = len(text)
    while i < n:
        j = min(n, i + max_chars)
        parts.append(text[i:j].strip())
        if j == n:
            break
        i = j - overlap
        if i < 0:
            i = 0
    return [p for p in parts if p]


def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def build_embeddings(chunks: List[str]):
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    vecs = model.encode(chunks, convert_to_numpy=True, normalize_embeddings=True)
    return vecs


def save_faiss(index_dir: Path, vectors: np.ndarray, metadatas: List[Dict[str, Any]]):
    import faiss
    index_dir.mkdir(parents=True, exist_ok=True)
    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors.astype(np.float32))
    faiss.write_index(index, str(index_dir / "index.faiss"))
    (index_dir / "meta.json").write_text(json.dumps(metadatas, ensure_ascii=False), encoding="utf-8")


def incremental_manifest(path: Path) -> Dict[str, Any]:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"files": {}}


def main():
    ap = argparse.ArgumentParser(description="Ingest transcripts to a FAISS index with embeddings")
    ap.add_argument("--src", default=str(Path(__file__).resolve().parent / "transcripts"))
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent / "index_store"))
    ap.add_argument("--rebuild", action="store_true", help="Ignore manifest and rebuild from scratch")
    args = ap.parse_args()

    src = Path(args.src)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "manifest.json"
    manifest = {"files": {}} if args.rebuild else incremental_manifest(manifest_path)

    # collect files
    exts = {".txt", ".docx", ".pdf"}
    files = [p for p in src.rglob("*") if p.is_file() and p.suffix.lower() in exts and "archive" not in str(p).lower()]
    files.sort()
    print(f"[bold]Found[/] {len(files)} files to consider.")

    chunks: List[str] = []
    metas: List[Dict[str, Any]] = []

    for fp in files:
        rel = str(fp.relative_to(src))
        stat = fp.stat()
        stamp = int(stat.st_mtime)
        prev = manifest["files"].get(rel)
        if prev and prev.get("stamp") == stamp and prev.get("ingested"):
            continue  # up-to-date
        try:
            text = read_text(fp)
        except Exception as e:
            print(f"[yellow]Skip[/] {rel} — {e}")
            continue
        parts = chunk_text(text)
        for k, part in enumerate(parts):
            uid = sha1(rel + f"#{k}")
            chunks.append(part)
            metas.append({
                "uid": uid,
                "file": rel,
                "chunk": k,
                "chars": len(part)
            })
        manifest["files"][rel] = {"stamp": stamp, "ingested": True, "chunks": len(parts), "size": stat.st_size}

    if not chunks:
        print("Nothing new to ingest. Manifest is current.")
        return 0

    print(f"Embedding {len(chunks)} chunks …")
    vecs = build_embeddings(chunks)
    save_faiss(out, vecs, metas)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[green]Done[/]. Index saved under {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

