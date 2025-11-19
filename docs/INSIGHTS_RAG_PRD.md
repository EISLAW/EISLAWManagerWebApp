EISLAW Insights RAG — Product Definition (PRD)
==============================================

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

