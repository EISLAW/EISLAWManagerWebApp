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
- Frontend inbox/reviewer (current status: stubbed): drop-zone with MD5(first 1MB) dedupe, inbox list, publish/delete, quick-edit, reviewer panel with inline transcript edits. Next: add status polling UI, audio playback hooks, speaker rename, tag safety, bulk actions.
- Backend ingest/reviewer (current status: stubbed): `/api/rag/ingest|inbox|publish|file/{id}|reviewer/{id}` save to `Transcripts/Inbox/Library` and manage manifest. Next: integrate Gemini (latest key) for transcription, Whisper fallback, real status transitions (transcribing→ready/error), Meilisearch index/reindex on publish/save, hard delete removes index.
- Secrets: replace Gemini key with the new “Gemini 3” key in `secrets.local.json`, then validate model list and content generation; pick target model (e.g., `gemini-2.0-flash-001` or Gemini 3 equivalent) for transcription.
- Auto-extraction: date from file creation/filename; client regex against registry; tag safety filtering to Global_Tags + Client_Tags.
- QA/logging: log deletions/transcription failures; add smoke path (sample audio/text) to verify Inbox → Reviewer → Library; add tests for duplicate hash rejection and publish/delete flows.

Local‑first parity tasks (up next)
- Clients list: multi‑address email search (done).
- UI tests: fix strict selector in `tests/client_update.spec.ts` per new chips.
- Optional: add Edge app‑window launcher endpoint for Outlook (local convenience).


