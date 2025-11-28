EISLAW Insights RAG — Product Definition (PRD)
==============================================

> Working copy: use `/mnt/c/Coding Projects/EISLAW System Clean` (origin `github.com/EISLAW/EISLAWManagerWebApp`). The older `EISLAW System` folder is archive/reference only—do not develop or commit there.

RAG Ingest & Transcript Pipeline — PRD v2.0 (Ready for Dev)
-----------------------------------------------------------

Status: ready for development. This supersedes earlier ingest/staging notes in this document and should be treated as the source of truth for ingest + transcript review.

Core principle: “Inbox First” — upload fast, process in background, review metadata later.

1) Workflow
- Drop & Go: user drags files, front-end calculates hash (MD5 of first 1MB), checks duplicates, uploads immediately if unique.
- Processing (background): server handles transcription (prefer Gemini 1.5 Flash/Pro end-to-end; fallback chunking + Whisper).
- Inbox (staging): files surface here with “Red Badges” for missing metadata.
- Review (quality): user opens file → visual “script” editor → fixes speakers → fills tags.
- Publish: user clicks “Index” → file moves to Library.

2) Functional requirements

A. Ingestion (“robust” upload)
- Duplicate check: front-end computes MD5 of first 1MB; if hash matches existing DB hash, reject with “File already exists.”
- Auto-extraction:
  - Date: extract from file creation time or filename (e.g., 2024-11-28...).
  - Client: regex-match filename against Client Registry list.
  - Model: use Gemini 1.5 Flash/Pro when possible for transcription (1M+ context to keep speaker continuity).
  - Fallback: if Gemini fails, fall back to chunking + Whisper.

B. Inbox (metadata staging)
- Status indicators: Uploading (X%), Transcribing, Ready (Draft), Error.
- Tag safety: when “Client” is selected, filter tags to Global_Tags + This_Client_Tags.
- Bulk actions: “Apply Date to All,” “Apply Domain to All.”

C. Transcript reviewer (“WhatsApp” view)
- Layout: chat-style bubbles (not a table).
- Audio sync: clicking a text bubble plays that timestamp range (Start -> End).
- Global rename: right-click “Speaker 1” → “Rename to Eitan” → applies across document.
- Editor: inline text editing; “Save” re-indexes if already published.

D. Storage & maintenance
- File structure:
  - `Transcripts/Inbox/{hash}_filename.ext`
  - `Transcripts/Library/{Domain}/{Client}/{Date}_{filename}.txt`
- Hard delete: `DELETE /api/rag/file/{id}` must remove Meilisearch index entry, JSON/TXT files, and original audio.

Final UI layouts (summary)
- Inbox (batch upload):
  - Header “RAG PIPELINE [Drop Files Here to Upload]”.
  - Bulk controls: Select All, Bulk Actions, Refresh.
  - Inbox list shows filename, status (Ready for Review, Transcribing %, Duplicate with link), metadata badges, and actions (Open Reviewer, Quick Edit, Delete).
  - Published Library list (latest items, editable).
- Transcript reviewer (editor):
  - Left: metadata form (Date, Domain, Client, Tags) + actions (Play Audio at timestamp, Save Changes, Publish to RAG).
  - Right: chat bubbles with speaker labels and timestamps; inline editable text; right-click to rename speaker globally.

Execution plan (initial track)
- Backend: install FastAPI + python-multipart; create `Transcripts/Inbox` folder; implement POST `/ingest` with hash check and storage layout above.
- UI: build Inbox list component first to allow manual drop tests; wire statuses and actions.
- Transcription: integrate Gemini 1.5 Flash/Pro for long-form; fallback to chunked Whisper.
- Deletion: implement hard delete endpoint as specified and ensure Meilisearch cleanup.

Dev task breakdown (to track in tickets)
- Frontend: drop-zone + MD5(first 1MB) hashing; duplicate rejection; upload progress; statuses (Uploading, Transcribing, Ready, Error); inbox table/cards matching layout; bulk actions (Select All, Apply Date/Domain); metadata safety (client-scoped tags); Quick Edit modal; Reviewer chat view with inline edits, right-click speaker rename (global), timestamped audio playback; Publish/Save actions that trigger re-index.
- Backend API: POST `/api/rag/ingest` (hash check, store in `Transcripts/Inbox`, enqueue transcription job), GET `/api/rag/inbox` (list with statuses), PATCH metadata, POST `/api/rag/publish`, DELETE `/api/rag/file/{id}` (hard delete + Meilisearch cleanup), transcription service using Gemini 1.5 Flash/Pro with fallback to chunked Whisper, status updates, MD5 hash persistence.
- Storage/infra: ensure folder scaffolding (`Transcripts/Inbox`, `Transcripts/Library/...`), configure Meilisearch client, add Gemini and Whisper credentials/envs, add python-multipart dependency, ensure background worker or task queue for transcription, log/audit for deletions.

Purpose

Extend the existing RAG (Retrieval‑Augmented Generation) layer of the EISLAW System from a basic transcript retrieval utility into a full Insight Engine — a tool designed to extract human, emotional, and linguistic insights from client conversations, emails, and communications. This module will also serve as the knowledge substrate for marketing and storytelling prompts across the firm’s AI‑driven workflows.

Goals

- Transform transcripts into actionable insight.
- Analyze client interactions to surface emotional, linguistic, and behavioral patterns.
- Build a dynamic vector index that updates automatically whenever new transcripts are added or assigned to a client.
- Enable conversational exploration through an “Insights” tab — a chat interface with memory and contextual understanding.
- Unify data sources between insight extraction and marketing generation workflows.
- Introduce a Quality Gate to verify and correct speaker alignment before transcripts are indexed into RAG.

Scope

- Phase 1: Transcripts only (TXT / JSON), including quality control review.
- Phase 2: Integration of emails (Microsoft Graph) and WhatsApp exports.
- Phase 3: Expansion to include legal documents and structured templates.

Data Sources

| Source | Location | Format | Integration Status |
|---|---|---|---|
| Transcripts (Sales / Personal) | SharePoint / Local (clients/<name> or personal/) | TXT / JSON | Existing (manual ingest) |
| Emails | Microsoft Graph / Email Mirror | EML / JSON | Planned |
| WhatsApp | Exported Chats / Future API | TXT / JSON | Planned |
| Legal Documents | SharePoint Libraries | DOCX / PDF | Future |

Architecture Overview

The RAG layer functions as an independent module with internal API endpoints, built on top of the existing `RAG_Pilot/` scripts (`ingest_transcripts.py`, `search.py`), and integrated into both the backend and frontend stacks.

1) Backend (FastAPI)

- New endpoints under `/api/insights/*`
  - `/api/insights/search` — semantic search with filters (client, tags, source)
  - `/api/insights/add` — add or update transcripts and metadata
  - `/api/insights/review` — quality‑control interface for transcript validation
- Uses a vector store (SQLite, Elastic, or Qdrant depending on deployment).

2) Frontend (React + Vite)

- New module: Insights Tab
  - Chat interface with contextual memory (thread‑based).
  - Sidebar filters for clients, tags, and sources.
  - “Convert to Content” button linking to the Marketing module.
  - Insight cards displaying search results and extracted conclusions.

Functional Features

1) Transcription Review Queue

- Every new transcript enters Pending Review state.
- The system displays representative samples per speaker (auto‑selected).
- Reviewer can mark “Approved” or “Incorrect Speaker.”
- Corrections trigger a secondary process (`speaker_realign`) that reassigns speakers for affected excerpts.
- Upon approval, the transcript is indexed into the RAG database.

Speaker Re‑Alignment Process

When a transcript enters the Pending Review state, the reviewer may identify and flag segments where speakers were misclassified (e.g., “Speaker A” and “Speaker B” reversed or merged). The correction process combines manual review input with automated propagation:

- Sampling & Flagging – the system displays several representative excerpts per speaker; the reviewer marks incorrect attributions (e.g., “swap A ↔ B” or “mislabelled segment”).
- Pattern Extraction – the system analyzes acoustic and textual patterns (pronouns, phrasing, turn length, interjections, punctuation rhythm) from the corrected samples.
- Automated Re‑Alignment – using these identified patterns, the system automatically adjusts speaker labels across the entire transcript, focusing on sections with similar linguistic or structural signatures.
- Self‑Correction Learning – feedback from multiple reviews is logged in a local cache (`speaker_alignment_cache.json`), improving subsequent alignments for the same speakers or recurring voices.
- Re‑Validation – the corrected transcript is re‑sampled for quick verification before being approved for RAG ingestion.

This semi‑supervised cycle minimizes manual effort: reviewers intervene only once per error type, and the system extrapolates and learns from the feedback automatically.

2) Batch Assignment & Tagging

- Allows multiple audio files to be selected and assigned before transcription.
- Batch grid view:

```
File           Duration  Client          Tags        Status
meeting1.m4a   28:31     Sivan Benayni   closed      transcribing
meeting2.m4a   35:10     Personal        not closed  queued
meeting3.m4a   41:02     Unicell         closed      complete
```

- Metadata structure stored in JSON:

```
{ "client": "Sivan Benayni", "tags": ["closed", "first call"], "source": "transcript", "category": "office" }
```

3) Tag Management

- CRUD for tags (create, edit, delete).
- Search and filter by tags (multi‑tag intersection supported).
- Autocomplete suggestions for tags based on transcript content.
- Metadata stored in SharePoint or local JSON registry.

4) Insights Interface (Chat)

- Conversational chat window with persistent thread memory.
- Semantic search + LLM summarization.
- Insight cards display with contextual excerpts.
- Example built‑in prompts:
  - “Analyze why the client hesitated to close.”
  - “Identify recurring metaphors in successful conversations.”
  - “Which words indicate resistance or lack of trust?”

5) Integration with Marketing Module

- Each insight can be saved as a “Seed Prompt” for the marketing workflow.
- “Convert to Content” button opens the Marketing Editor.
- Both systems rely on the same vector base, viewed from different perspectives (analytical vs. narrative).

Future Extensions

| Component | Description | Status |
|---|---|---|
| Email RAG Integration | Ingest emails via Graph API after cleaning signatures and reply chains | Planned |
| WhatsApp Integration | Import chat exports and link to clients | Planned |
| Legal Document RAG | Vectorize and analyze legal documents | Phase 3 |
| Emotion Timeline | Visualize emotional tone throughout the conversation | Future |
| Team Access & Permissions | Separation between personal and team‑level RAGs | Future |

UX Guidelines

- RTL‑ready layout; colors follow Brand Guide (#0B3B5A, #D07655).
- Font: Noto Sans Hebrew.
- Tags displayed with color coding by category.
- Pending transcripts: light amber background.
- Approved transcripts: light green.
- Search results highlight keywords and expand excerpts in context.

QA Policy

Before a transcript enters the RAG index:

- Verify: no speaker mismatch (sample review).
- Validate: required metadata (client, tags, source) present.
- Confirm: UTF‑8 encoding and token length > 100.
- Auto‑Test: ensure vector ingestion returns valid ID.
- Manual Review: random sample check weekly.

Dependencies

- `RAG_Pilot/ingest_transcripts.py` — extended for metadata support.
- `RAG_Pilot/search.py` — filters for tags and clients.
- Backend routes: `/api/insights/*` (FastAPI).
- Frontend module: `/src/pages/Insights/`.
- Shared vector store (SQLite / Elastic / Qdrant).

Versioning & Documentation

- Added file: `docs/INSIGHTS_RAG_PRD.md` (this document).
- Update `docs/PROJECTS_COMPENDIUM.md` → add under “RAGPilot Module.”
- Update `docs/TECHNICAL_OVERVIEW.md` → new section “Insights Extension.”
- New configuration: `config/insights_metadata.json` (tags & status list).
- New CLI utilities:
  - `python tools/insights_review.py`
  - `python tools/insights_tag_assign.py`
  - `python tools/insights_index.py`

Notes / Open Questions

- Preferred vector store for production? (SQLite persisted locally vs. Elastic/Qdrant managed service)
- Where to persist the review queue state — SharePoint JSON per client vs. central `System/insights_registry.json`?
- Chat model/provider standardization (match LLM policy in `secrets.local.json`)?
- Do we ingest personal transcripts separately (private namespace) with opt‑in linking to clients?
