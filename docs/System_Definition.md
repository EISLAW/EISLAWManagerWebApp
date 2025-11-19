<!-- Project: RAGPilot | Full Context: docs/System_Definition.md#rag-pilot -->
# EISLAW Ops System — System Definition

Purpose
- Single, modular blueprint to run the firm as a quality production line: legal judgment stays with attorneys; everything else runs by playbook + tech.
- Serves as the top‑level spec that references implementation in the existing desktop app (AudoProcessor Iterations).

Vision
- Operate via standardized Service Flow Units (SFU). Minimize ad‑hoc work. Keep attorney judgment to ≤15% per matter.
- People + Process + Tech: intelligent operators follow the playbook; attorneys apply judgment; the system enforces process and traceability.

Core Principles
- Separation of judgment vs. execution
- Modularity and replaceable components
- Ownership of firm knowledge (templates, transcripts, guides)
- Templates‑first (documents, emails, processes)
- Proactive automation and auditability

Service Flow Unit (SFU)
- Definition: one complete client cycle: Consultation → Quote → Deliverables → Close/Retainer.
- Phases
  1) Consultation: paid booking → calendar → recorded call
  2) Transcription + analysis: split, transcribe, language profile
  3) Quote: modular proposal (template) adapted to client tone; capture approval
  4) Production: open client folder, choose legal templates, generate and review
  5) Delivery: modular deliverables email, attachments, follow‑ups
  6) Close or Retainer Onboarding

Current Capabilities (in existing app)
- Audio split/transcribe; language profile; email composer; client registry + Airtable sync; prompts system; automation HTTP server.
- Cross‑references (full picture for any agent):
  - Handbook: C:\Coding Projects\AudoProcessor Iterations\docs\HANDBOOK.md
  - Function Map: C:\Coding Projects\AudoProcessor Iterations\docs\SYSTEM_REFERENCE.md
  - Operations & MCP: C:\Coding Projects\AudoProcessor Iterations\docs\OPERATIONS.md
  - Agent Playbook: C:\Coding Projects\AudoProcessor Iterations\docs\AGENT_PLAYBOOK.md and C:\Coding Projects\AudoProcessor Iterations\docs\agent_playbook.json

Target Capabilities (near term)
- Quote generator agent: JSON schema → DOCX render → companion email based on transcript + tone.
- SFU status tracking: per‑matter phase, deadlines, next actions (store of truth TBD: Airtable vs. in‑app vs. per‑client file).
- Deliverables packager: pick templates, fill, export, and send with per‑client instructions.
- Retainer onboarding: onboarding email + mapping spreadsheet + guide links.

RAG Knowledge Layer (mid term)
- Ingest transcripts, templates, and procedures; retrieval‑augmented drafting and Q&A in EISLAW tone.
- Start local (vector DB), consider centralization later.

Governance
- Autonomy: assistants operate end‑to‑end; if MCP missing, request to start and proceed.
- Documentation: this spec is source of truth; update when behavior changes; mirror technical details in the app docs.

Open Decisions
- Single source of truth for SFU status: Airtable vs. in‑app dashboard vs. per‑client file.
- Quote approval capture: email reply parsing vs. link/button confirmation.
- RAG infrastructure: local vs. managed.

Next Steps
- Lock SFU JSON schema (quote, deliverables, status).
- Choose SFU status store.
- Define quote template fields and rendering rules.
- Break down MVP tasks into an Implementation Roadmap.

Appendix: SFU JSON Schema (draft placeholder)
`json
{
  "client": {"name": "", "email": "", "id": ""},
  "consultation": {"scheduled_at": "", "recording_path": "", "transcript_path": ""},
  "analysis": {"tone": "", "key_points": []},
  "quote": {"items": [], "total": 0, "currency": "ILS", "sent_at": "", "approved_at": ""},
  "production": {"templates": [], "outputs": []},
  "delivery": {"email_subject": "", "email_body": "", "attachments": []},
  "status": {"phase": "consultation|analysis|quote|production|delivery|closed|retainer", "updated_at": ""}
}
`
"@;
 = @"
# Implementation Roadmap (stub)

Purpose
- To be filled once System Definition is locked. Tracks incremental tasks aligned to SFU and the existing app.

Sections
- Milestones and phases
- Work items (small, reversible)
- Dependencies and decisions (e.g., SFU status store)
- Validation (smoke tests, sample clients)

Decisions (updated)
- Quote approval capture: manual by operator. The system does not auto-parse approval. Operator marks approved and advances the SFU.
- Post-approval branching:
  - One-time projects: proceed to Production → Delivery; optional closing email.
  - Retainers: trigger Retainer Onboarding (onboarding email + Fillout link + mapping spreadsheet + scheduling).
- Execution model: non-lawyer intelligent operators follow the Textbook; attorneys handle legal judgment and client questions.


Retainer Scope (updated)
- Retainers include BOTH privacy (per the detailed Excel workplan) AND ongoing commercial/legal work.
- Intake: clients complete the onboarding questionnaire and upload all existing business documents for review.
- Storage: all intake data and uploaded docs are centralized in the client’s folder; operators triage and attorneys review where judgment is needed.

Quote Defaults (locked)
- one_time projects → bundle_total by default (optional visible itemization for clarity only).
- retainer_dpo → monthly_plus_setup (onboarding/setup fee + monthly fee; scope documented by milestones/process).


RAG Knowledge Layer (expanded)
- Goals
  - Marketing support: retrieve stories/patterns from transcripts on legal topics and hand off to the marketing agent to generate assets (email, story, post) using existing prompts.
  - Non‑lawyer assistants: allow safe Q&A over your corpus (transcripts, templates, ops docs) with clear scope and citations.
  - Founder insights: mine transcripts for sales patterns, recurring objections, process opportunities.
  - Persona/context aide: surface “Eitan patterns” and style guidance learned from transcripts.

- Architecture (best‑practice)
  - Ingestion
    - Sources: transcripts/*.txt, templates (TXT/DOCX via text extraction), internal docs (MD/TXT), status/ops notes.
    - Chunking: semantic chunks (e.g., 700–1200 tokens) with overlap; store file/section, timestamps, speaker, client tags.
    - Embeddings: multilingual (Hebrew‑friendly) models; store vectors + rich metadata in a vector DB (Qdrant/Weaviate/PGVector).
  - Indexes
    - Transcript index (by client, speaker, date, topics, legal domain).
    - Templates/precedents index (legal document snippets with scope guardrails).
    - Ops/knowledge index (handbook/spec/playbooks).
    - Hybrid retrieval: vector + BM25 keyword + recency/author boosts.
  - Retrieval & Orchestration
    - Query router: classify intent (marketing vs legal Q&A vs ops) → route to index/tool.
    - Multi‑step: retrieve → critique/ground → draft → verify; always attach citations.
    - Safety: legal scope disclaimer, citation requirement, refusal rules beyond corpus.
  - Memory (from article’s patterns)
    - Working: per‑session scratchpad (conversation state, current task).
    - Episodic: logged interactions and decisions (with privacy controls) for trend analysis.
    - Semantic: distilled summaries of transcripts/templates, updated periodically.
- Ops
    - Monitoring: retrieval quality, answer quality (sampled), cost, latency.
    - Feedback: “was this useful?” with flagged examples for correction.
    - Governance: retention/PII policy, per‑client opt‑out, audit trail.

- Ingestion from Transcription Pipeline
  - After each transcript is saved by the desktop app, offer an opt‑in: "Add to RAG" with a corpus selector.
  - Default corpora:
    - `legal` – client work (Zooms, Q&A, briefings). Visible to legal/marketing agents per policy.
    - `personal` – private conversations (e.g., therapist). Strictly isolated from all business agents; only owner queries.
  - Tag each ingestion with: `corpus`, `client`, `date`, `speakers`, and file path for citations.
  - The RAG service accepts `/rag/index?corpus=...` to append/update entries from a given file path.

- Minimal viable path
  1) Index transcripts only (vector + keyword). Add citations, Hebrew‑friendly embeddings.
  2) Add templates + ops docs. Introduce query router (marketing/legal/ops).
  3) Add episodic/semantic memory rolls (weekly transcript distillation).
  4) Add agent endpoints for:
     - marketing_content_from_topic(topic, client? → assets)
     - legal_qna(question → citations)
     - ops_insights(query → actions)

- Tooling choices (swappable)
  - Vector DB: Qdrant (local or managed) or PGVector (Postgres).
  - Embeddings: GTE‑multilingual or OpenAI text-embedding‑3-large (cost vs accuracy tradeoff).
  - Extractors: python-docx for DOCX, plain TXT for transcripts, fallback OCR for stray PDFs (later).
  - Server: FastAPI service under EISLAW System with auth, called by the desktop app and agents.

