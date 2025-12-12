# RAG Documentation Audit (RAG-AUDIT-003)

**Date:** 2025-12-12  
**Auditor:** David (Product)  
**Sources Reviewed:** docs/RAG_FEATURES_SPEC.md, docs/API_ENDPOINTS_INVENTORY.md, backend/main.py, backend/rag_sqlite.py, backend/create_rag_tables.py, backend/db.py, frontend/src/pages/RAG/index.jsx

## Accuracy Score
- **45%** of the documented RAG details match the current implementation. Major shifts (SQLite, Meilisearch, Zoom pipeline) are not reflected in the docs, and several statuses are incorrect.

## Discrepancies (Doc vs. Reality)
- **Data storage:** Spec says everything is JSON (`index.json`, `recordings_cache.json`); backend now routes RAG endpoints through `rag_sqlite` and expects SQLite tables (`transcripts`, `recordings`, `rag_documents`). A helper script exists (`backend/create_rag_tables.py`), but `backend/db.py` never creates these tables, so the live schema dependency is undocumented and likely unmet.
- **Search:** Spec marks `/api/rag/search` as a stub returning empty. Implementation performs SQLite search with Meilisearch fallback (`backend/main.py:1589`, `backend/rag_sqlite.py`), requiring Meilisearch availability—none of this is documented.
- **Publish/reviewer/file operations:** Spec says they read/write `index.json`; code writes to SQLite and optionally indexes/deletes in Meilisearch (`rag_sqlite.publish_transcript_sqlite`, `update_transcript_sqlite`, `delete_transcript_sqlite`).
- **Transcribe document:** Spec calls it “Gemini transcription (untested)”; actual endpoint is a stub preview generator only—no transcription (`backend/main.py:1605`).
- **Zoom transcribe:** Spec claims `/api/zoom/transcribe/{id}` is missing; code implements it (`backend/main.py:3959`) but it expects a `recordings` row in SQLite. The Zoom sync/download flow still writes to the JSON manifest, not SQLite, so the endpoint returns 404/400 rather than being absent.
- **Zoom recordings list:** Spec says it “works” and returns 36 items from cache; backend endpoint now reads from SQLite (`backend/main.py:3545` → `rag_sqlite.zoom_recordings_sqlite`), so it is empty unless the table is backfilled.
- **Zoom transcript import:** Spec says import moves items into `index.json`; implementation writes to a local `rag-manifest.json` under `~/.eislaw/store/` and never touches SQLite (`backend/main.py:3475`).
- **Frontend status claims:** Spec marks client assignment dropdown/Zoom flows as “Working.” Frontend code has a broken clients fetch (`frontend/src/pages/RAG/index.jsx:118` fetch with no URL) and depends on the now-SQLite `/api/zoom/recordings`, so the documented working state is overstated.
- **API inventory:** RAG section shows 12/12 ✅. `/api/rag/transcribe_doc` is a stub, `/api/rag/search` behavior differs (SQLite+Meili), and new `/api/zoom/transcribe/{id}` is absent from the inventory.

## Missing Documentation
- **Schema & data model:** No canonical doc for the RAG SQLite tables (`recordings`, `transcripts`, `rag_documents`) or how they relate to legacy manifests/Blobs.
- **Migration/runbook:** No guide for running `create_rag_tables.py`, seeding `recordings`/`transcripts` from existing JSON/Blob data, or deprecating `index.json`/`zoom-manifest.json`.
- **API details:** No up-to-date request/response examples for RAG endpoints (ingest, reviewer, publish, assistant) or Zoom endpoints (sync/download/transcribe/import). Meilisearch requirements and fallbacks are undocumented.
- **Ops/config:** No checklist for enabling Gemini/Meilisearch/Azure Blob in local/VM environments for the RAG flow.
- **User guide:** No current RAG/Zoom workflow guide reflecting the SQLite backend and the limitations of the Zoom pipeline + ingest/review UI.

## Recommendations for Docs Updates
- Refresh `docs/RAG_FEATURES_SPEC.md` to reflect SQLite as the source of truth, remove JSON-index language, and document the Meilisearch dependency and current gaps (Zoom pipeline still on manifest, `transcribe_doc` stub).
- Update `docs/API_ENDPOINTS_INVENTORY.md` RAG section: note `/api/rag/transcribe_doc` is a stub, describe `/api/rag/search` SQLite/Meili behavior, and add `/api/zoom/transcribe/{id}` with its current limitations.
- Add a short data-flow/schema note to `DATA_STORES.md` (or new RAG data note) covering tables, Blob paths, and where manifests are still used.
- Publish a migration runbook: run `create_rag_tables.py`, backfill recordings/transcripts from manifest + Azure blobs, and retire `index.json`/`rag-manifest.json`.
- Add an ops checklist for Meilisearch/Gemini/Azure setup and a brief RAG/Zoom user guide aligned with the new backend behavior.
