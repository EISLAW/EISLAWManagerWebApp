<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Next Actions (Short Queue)

Owner: You
Last updated: 2025-11-04

- Clients module parity and UX fixes (done)
  - Named Outlook window (EISLAW-OWA) for all opens.
  - “Open Files” now uses server helper first; protocol removed to avoid prompts.
  - “Word Templates…” modal and DOCX generation wired.
  - SharePoint link resolves exact client folder from registry.

- New: Airtable buttons (added)
  - “Airtable Search” opens the matching record or Clients view in Airtable.
  - “Sync Airtable” upserts the client (name/email) via API.

- Owner workflow (in progress)
  - Await Figma delivery for owner pill + popover + modal (prompt issued 2025-11-15).
  - Implement shared owners store (backend + Airtable Clients view) and refactor TaskCard/TaskModal to use the new UX.
  - Extend Playwright coverage: assign owner, verify chip updates across Dashboard, Clients tab, and Task Modal.

- Create Airtable table `Security_Submissions` per `docs/airtable_schema.json` (manual UI or enable Metadata API for script).
- Add Outlook COM sender script (`tools/send_outlook.ps1`) for AutomailerBridge (optional).
- Optional: add PDF export in the Word compose step and attach.
- Author final production texts in `docs/security_texts.he-IL.json`.
- Update `docs/Testing_Episodic_Log.md` after each test round.

Insights RAG — near‑term tasks
- Scaffold backend endpoints `/api/insights/search|add|review` (FastAPI stubs returning 200 + shapes per PRD).
- Add `src/pages/Insights/` (basic route + placeholder chat UI; link from nav hidden behind env flag if desired).
- Extend `RAG_Pilot/ingest_transcripts.py` to accept manifest from `tools/insights_index.py` (metadata: client, tags, source).
- Implement review queue store (SharePoint JSON `System/insights_registry.json`) and sample selection per transcript.
- Implement `speaker_realign` helper (semi‑supervised) with cache: `speaker_alignment_cache.json`.
- Decide vector store for staging (SQLite vs. Elastic/Qdrant) and wrap with an adapter.

Local‑first parity tasks (up next)
- Clients list: multi‑address email search (done).
- UI tests: fix strict selector in `tests/client_update.spec.ts` per new chips.
- Optional: add Edge app‑window launcher endpoint for Outlook (local convenience).


