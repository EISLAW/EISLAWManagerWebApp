#!/usr/bin/env python3
import argparse
import os
from pathlib import Path
from typing import List, Dict, Tuple

import chromadb
from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer
from docx import Document as DocxDocument  # type: ignore


def read_txt(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except Exception:
        return p.read_text(errors="ignore")


def read_docx(p: Path) -> str:
    try:
        d = DocxDocument(str(p))
        return "\n".join([p.text for p in d.paragraphs])
    except Exception:
        return ""


def load_files(root: Path) -> List[Tuple[Path, str]]:
    out: List[Tuple[Path, str]] = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        if p.suffix.lower() == ".txt":
            text = read_txt(p)
        elif p.suffix.lower() == ".docx":
            text = read_docx(p)
        else:
            continue
        text = (text or "").strip()
        if not text:
            continue
        out.append((p, text))
    return out


def chunk_text(text: str, max_chars: int = 1500, overlap: int = 200) -> List[str]:
    text = text.replace("\r\n", "\n")
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    buf: List[str] = []
    cur_len = 0
    for para in paras:
        if cur_len + len(para) + 2 <= max_chars:
            buf.append(para)
            cur_len += len(para) + 2
        else:
            if buf:
                chunks.append("\n\n".join(buf))
            # start new buffer with overlap from previous
            if chunks and overlap > 0:
                tail = chunks[-1]
                buf = [tail[-overlap:]]
                cur_len = len(buf[0])
            else:
                buf = []
                cur_len = 0
            buf.append(para)
            cur_len += len(para) + 2
    if buf:
        chunks.append("\n\n".join(buf))
    return chunks


def ensure_collection(client: PersistentClient, name: str):
    try:
        return client.get_collection(name)
    except Exception:
        return client.create_collection(name)


def build_index(src: Path, corpus: str, store: Path):
    store.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(store))
    col = ensure_collection(client, name=f"rag_{corpus}")

    model_name = "intfloat/multilingual-e5-small"
    model = SentenceTransformer(model_name)

    files = load_files(src)
    if not files:
        print("No transcripts found to index.")
        return

    print(f"Indexing {len(files)} files to corpus '{corpus}'...")
    ids: List[str] = []
    docs: List[str] = []
    metas: List[Dict] = []
    embeds = []

    for fp, text in files:
        rel = str(fp.relative_to(src))
        parts = chunk_text(text)
        # E5 format: prepend 'passage: '
        vecs = model.encode(["passage: " + p for p in parts], batch_size=16, normalize_embeddings=True, convert_to_numpy=True)
        for i, (p, v) in enumerate(zip(parts, vecs)):
            ids.append(f"{rel}#{i}")
            docs.append(p)
            metas.append({"file": str(fp), "rel": rel, "chunk": i})
            embeds.append(v.tolist())
    # Remove previous docs from this collection for re-index
    try:
        existing = col.get()["ids"]
        if existing:
            col.delete(ids=existing)
    except Exception:
        pass
    # Add new
    col.add(ids=ids, embeddings=embeds, documents=docs, metadatas=metas)
    print(f"Indexed {len(ids)} chunks from {len(files)} files.")


def main():
    ap = argparse.ArgumentParser(description="Build/update local RAG index (transcripts only)")
    ap.add_argument("--src", required=True, help="Path to transcripts folder")
    ap.add_argument("--corpus", default="legal", help="Corpus namespace (e.g., legal, personal)")
    ap.add_argument("--store", default=str(Path(__file__).resolve().parent / "chroma_legal"), help="Chroma persist dir")
    args = ap.parse_args()
    build_index(Path(args.src), args.corpus, Path(args.store))


if __name__ == "__main__":
    main()
