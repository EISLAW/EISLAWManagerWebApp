<!-- Project: RAGPilot | Full Context: docs/System_Definition.md#rag-pilot -->
# Implementation Roadmap (stub)

Purpose
- To be filled once System Definition is locked. Tracks incremental tasks aligned to SFU and the existing app.

Sections
- Milestones and phases
- Work items (small, reversible)
- Dependencies and decisions (e.g., SFU status store)
- Validation (smoke tests, sample clients)
RAG Workstream (initial backlog)
- Ingestion
  - Build loaders for transcripts/templates/docs; store text + metadata.
  - Configure vector DB (Qdrant/PGVector) and embedding model; run first index.
- Retrieval
  - Implement hybrid retriever (vector + BM25) with filters (client, date, topic).
  - Add query router for marketing/legal/ops intents.
- Serving
  - Add FastAPI endpoints: /rag/search, /rag/legal_qna, /rag/marketing_assets.
  - Response format: JSON with citations array (file, line/time, snippet).
- Memory
  - Nightly/weekly semantic distillation of transcripts to update summaries.
  - Store episodic interaction logs with opt‑out per client.
- Safety & Governance
  - Redaction pipeline for PII on export; per‑client retention config.
  - Add disclaimers and refusal rules for out‑of‑scope legal advice.
- Integration
  - Desktop app: new tab “RAG” for queries; marketing agent consumes /rag endpoints.
  - MCP: expose a Filesystem+HTTP path for agents.

Post‑Transcription Ingest (opt‑in)
- Desktop app: after successful transcription, present a checkbox “Add to RAG” and a dropdown “Corpus” with defaults {legal, personal}.
- Agent path (tools/agent_transcribe.py): add flags `--rag-upload` and `--rag-corpus legal|personal` to call `/rag/index` with the saved transcript path.
- Service: support multiple corpora as separate collections/namespaces (`rag_legal`, `rag_personal`) with isolated access policies.
- Policy: exclude `personal` from all business agents; require explicit owner context to query.
