<!-- Project: SystemCore | Full Context: docs/INDEX.md -->
# EISLAW — Project Status & Scope

Purpose
- Give a single, always‑current snapshot of scope, what’s done vs. in progress, and where to click for deeper docs.

Scope (What we’re building)
- ClientComms: client registry, folders (local/SharePoint), in‑app email view (indexed), Airtable sync.
- PrivacyExpress: questionnaire → scoring → Word compose, ready to send.
- AutomailerBridge: bridge to compose/send deliverables (Outlook/Automailer).
- RAG/Insights: transcript review → semantic search → insight cards (phased rollout).

Non‑goals (for now)
- Full mailbox migration or replacement of Outlook UX.
- Storing full email bodies by default (we store previews; full body fetch on demand later).

Status — 2025‑11‑04
- Done
  - Local app parity improvements; forced LOCAL mode for dev.
  - Clients list actions (Open • Files • SP • Emails) and name clickable.
  - In‑app Emails (Indexed) panel + row preview; reply/forward via mailto.
  - Word Templates discovery + DOCX generation (COM + python‑docx fallback).
  - SharePoint folder mapping + registry cleanup helpers.
  - Tests: backend pytest + Playwright e2e (UI) are green locally.
- In Progress
  - Email ingestor (Graph app‑only) hardening: delta/resync, deletes/moves.
  - Attachments: save to client folder with size cap + blocklist.
  - Global Email Search page UI.
  - Outlook Add‑in Phase 1.5 (no‑OAuth) – “Assign to Client”.
- Upcoming
  - Add‑in Phase 2 (SSO) for native reply/forward and live mailbox in‑pane.
  - Cloud parity for Word outputs (upload to SP and return webUrl).

Where to read next
- Feature Overview: docs/EISLAW_System_Feature_Spec.md
- Email Index PRD: docs/EMAIL_INDEX_PRD.md
- Technical Overview: docs/TECHNICAL_OVERVIEW.md (see Email Index section)
- Dev Docs Portal (external docs): docs/DEV_DOCS_PORTAL.md
- Test/Run routine: docs/Testing_Episodic_Log.md (Session Standardization)

