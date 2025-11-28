<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Next Actions (Short Queue)

Working copy: use the clean clone at `/mnt/c/Coding Projects/EISLAW System Clean` (origin `github.com/EISLAW/EISLAWManagerWebApp`). Older `EISLAW System` tree is archive/reference only.

## Current Focus (2025-11-20)
- **State**: CI deploy workflow now builds/pushes the backend image, deploys to a staging slot, runs /health + smoke tests, and can swap into production. App Insights connection string is applied when present and a heartbeat is emitted during deploy. Frontend still ships to Azure Storage static site.
- **Next fixes**:
  1. Validate App Insights ingestion in Azure (traces/logs) and add alerts for health failures/container restarts.
  2. Tune smoke test cadence (count/timeout) and ensure Fillout/Airtable quotas are respected; add a dry-run toggle if secrets are missing.
  3. Containerized frontend path added (Dockerfile.web + optional Web App input) — decide target Web App/slot and cut over from static if desired.
  4. Enforce tagging discipline: every deploy should set `release_tag` in the workflow and update `docs/CHANGELOG.md` with the tag/image references.
- **Notes**: Kudu credentials stored under `azure_kudu` in `secrets.local.json`. Deployment history lives in `docs/DEPLOY_RUNBOOK.md`.

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

- Azure platform hardening (in progress)
  - Backend now runs as custom container. Next up: wire automated builds (GitHub Action) that runs `az acr build` + deploy, so we don’t copy contexts manually.
  - Re-enable reliable log streaming (Kudu log tail intermittently 502s) so we can trace startup errors in the container.
  - Once CI is live, run Fillout→Airtable E2E against Azure and switch the Fillout webhook URL to the production endpoint.
  - Keep using `python tools/azure_log_stream.py --site eislaw-api-01 --channel application --output build/kudu-app.log` (pass Kudu creds via env or flags) to monitor containers during each deploy.

- Create Airtable table `Security_Submissions` per `docs/airtable_schema.json` (manual UI or enable Metadata API for script).
- Add Outlook COM sender script (`tools/send_outlook.ps1`) for AutomailerBridge (optional).
- Optional: add PDF export in the Word compose step and attach.
- Author final production texts in `docs/security_texts.he-IL.json`.
- Update `docs/Testing_Episodic_Log.md` after each test round.

Insights RAG — near‑term tasks (per PRD v2.0 “Inbox First”)
- Frontend inbox: drag/drop with MD5(first 1MB) hash + duplicate rejection; upload progress and statuses (Uploading/Transcribing/Ready/Error); bulk controls (Select All, Apply Date/Domain); metadata safety (client-scoped tags); Quick Edit modal; reviewer chat view with inline edits, right-click speaker rename (global), timestamped audio playback; Publish/Save triggers re-index.
- Backend ingest: POST `/api/rag/ingest` with hash check and storage under `Transcripts/Inbox`; status polling `/api/rag/inbox`; PATCH metadata; POST `/api/rag/publish`; DELETE `/api/rag/file/{id}` removes audio + JSON/TXT + Meilisearch entry; folder scaffolding (`Transcripts/Inbox`, `Transcripts/Library/...`); persistence of MD5 hash.
- Transcription pipeline: primary Gemini 1.5 Flash/Pro for full-context transcription; fallback chunked Whisper; background worker/task queue for async processing; status updates; hook Meilisearch index/reindex on publish and on edits.
- Auto-extraction: date from file creation or filename; client regex against Client Registry; tag safety filtering to Global_Tags + Client_Tags.
- QA/logging: log deletions and transcription failures; add smoke path to upload a sample audio/text file and see it reach Inbox → Reviewer → Library.

Local‑first parity tasks (up next)
- Clients list: multi‑address email search (done).
- UI tests: fix strict selector in `tests/client_update.spec.ts` per new chips.
- Optional: add Edge app‑window launcher endpoint for Outlook (local convenience).


