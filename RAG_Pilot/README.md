# RAG Pilot — Transcripts

Simple local ingestion and search over transcripts.

## Layout
- Source transcripts: `RAG_Pilot/transcripts` (ignore `archive/` inside)
- Index output: `RAG_Pilot/index_store`
- Scripts:
  - `ingest_transcripts.py` — chunks + embeds files, writes FAISS index + metadata
  - `search.py` — quick semantic search over the index

## Install deps (once)
```
pip install -r RAG_Pilot/requirements.txt
```

## Ingest (incremental)
```
python RAG_Pilot/ingest_transcripts.py
```
- Scans `.txt/.docx/.pdf`, skips `archive`
- Stores `index_store/index.faiss` and `index_store/meta.json`
- Maintains `index_store/manifest.json` for incremental re-runs

## Search
```
python RAG_Pilot/search.py "privacy policy for cameras in office"
```
Returns JSON with top matches: rank, score, file, chunk, chars.

## Notes
- Embeddings: `all-MiniLM-L6-v2` (SentenceTransformers). You can swap the model easily.
- For multi-project corpora (e.g., legal vs marketing), create separate `index_store_*` folders or add a `--out` argument per corpus.
- This is local and simple by design. We can later switch to Chroma/Qdrant/PGVector and wire it to the desktop app.

