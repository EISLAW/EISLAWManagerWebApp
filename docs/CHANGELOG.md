# CHANGELOG

Lightweight, dated notes for significant changes. Keep entries short (1–3 bullets per area) and tag releases before deploys so rollbacks are just “redeploy the last tag”.

## 2025-12-05 - AI Studio Feature
- **Feature/AI Studio**: Implemented multi-LLM chat interface per PRD:
  - Backend: FastAPI router with SSE streaming (/api/ai-studio/chat)
  - Backend: Conversation persistence (JSON file storage)
  - Backend: Provider management (Gemini, Claude, OpenAI via LiteLLM)
  - Backend: Endpoints: /chat, /providers, /conversations CRUD
  - Frontend: React chat UI with real-time streaming
  - Frontend: RTL/Hebrew support (dir=rtl, Hebrew placeholders/buttons)
  - Frontend: Provider selector dropdown with availability indicators
  - Frontend: Conversation history sidebar (load, delete, new conversation)
  - Frontend: Message display with user/assistant avatars and timestamps
  - Frontend: Error handling with user-friendly Hebrew messages
- **Fix/API Base**: Added fallback chain for API base URL detection
- **QA/Playwright**: Test suite: 17 tests, 100% pass rate
- **Docs/Review**: Senior reviews completed - APPROVED FOR DEPLOYMENT

## Rollback (light playbook)
- Deploy from tags (e.g., `git checkout v0.1.0` → build → deploy). If something breaks, redeploy the prior tag.
- For frontend preview: `cd "EISLAW System/frontend" && npm run build && npm run preview -- --host --port 5197`; backend mock: `cd "EISLAW System" && DEV_CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5197,http://127.0.0.1:5197" .venv/bin/python -m uvicorn scoring_service.main:app --host 127.0.0.1 --port 8788`.
- If a change involved config/secrets, revert the config file alongside the code tag.

## 2025-12-03
- **Backend/Tasks**: Fixed critical bug - tasks storage path was pointing to read-only `/app/backend/data` in Docker container; moved to `~/.eislaw/store/tasks.json` (same location as clients registry) with writable fallback detection.
- **Frontend/Tasks**: Fixed `crypto.randomUUID()` failure when accessing app via external IP (HTTP). Added `generateUUID()` polyfill in `tasks.js` that falls back to Math.random-based UUID generation when `crypto.randomUUID()` is unavailable (non-secure contexts like `http://20.217.86.4:5173`).
- **Frontend/API**: Fixed API base detection for VM access - added auto-detection of VM IP (`20.217.86.4`) in `apiBase.js` so frontend correctly targets local API when accessed from external IP.
- **DevEx/HMR**: Added `vite.config.js` with increased file polling interval (1000ms instead of 100ms) to reduce false auto-refreshes when using Docker volume mounts. The frequent page reloads were caused by Chokidar polling detecting phantom file changes.
- **Backend/SharePoint**: Added SharePoint integration via Microsoft Graph API:
  - `GET /api/sharepoint/sites` - Lists all available SharePoint sites
  - `GET /api/sharepoint/search?name=<client>` - Searches for client folder in SharePoint
  - `POST /api/sharepoint/link_client` - Links SharePoint folder to client registry and saves URL
  - `get_sharepoint_site_id()` now correctly targets "EISLAW OFFICE" (EISLAWTEAM) site where client folders reside
- **Backend/Email**: Fixed email search by client name to search by email addresses instead of Hebrew names (bypasses encoding issues with Graph API `$search`)
- **Backend/API**: Added missing endpoints:
  - `GET /api/client/summary` - Returns client data with correct field names for frontend (`folder`, `airtable_id`, `sharepoint_url`)
  - `GET /email/by_client` - Returns emails for EmailsWidget component
- **Backend/Fix**: Graph API limitation - `$filter` cannot be used with `$search`; changed to use search syntax with date filter (`received>=YYYY-MM-DD`)
- **Frontend/SharePoint**: Updated `ClientOverview.jsx` to check `sharepoint_url` instead of `folder` for SharePoint badge; updated `openFolderKpi()` to use stored SharePoint URL
- **DevEx/VM**: Verified email sync returns 11 emails for "סיון בנימיני"; SharePoint folder linked and badge shows green

## 2025-12-02
- **Backend/Clients**: Switched `/api/clients` to read from local registry (`~/.eislaw/store/clients.json`) instead of Airtable; added `get_clients_store_path()` with multi-path fallback for Docker mounts.
- **Backend/CORS**: Added `http://20.217.86.4:8080` and `http://20.217.86.4:5173` to allowed origins for VM frontend access.
- **Backend/Email**: Implemented `POST /email/sync_client` endpoint for Microsoft Graph email sync; searches across organization mailboxes by client name using MSAL app-only authentication.
- **Backend/Fix**: Added `msal>=1.28.0` and `httpx>=0.25.0` to requirements.txt; fixed import path for fixtures module to work with Docker deployment (`from backend import fixtures` with fallback).
- **DevEx/Hot-Reload**: Configured docker-compose with volume mount (`./backend:/app/backend`) and uvicorn `--reload` flag; backend changes now apply instantly without rebuild.
- **DevEx/Docs**: Updated CLAUDE.md with new hot-reload workflow; documented VS Code Remote SSH as preferred development method.
- **DevEx/VM**: Deployed email sync endpoint to dev VM (http://20.217.86.4:8799); verified endpoint returns 200 OK.

## 2025-12-01
- **QA/Playwright**: Created comprehensive UX/UI audit test suite (53 tests total):
  - `tests/ux-audit.spec.cjs` (22 tests) - Core UX validation: Hebrew localization, RTL layout, client list, client overview, search, badges, tabs, widgets
  - `tests/adversarial-audit.spec.cjs` (16 tests) - Security & edge cases: XSS prevention, SQL injection, special characters, API unavailability, mobile/tablet viewports
  - `tests/adversarial-audit-2.spec.cjs` (14 tests) - Deep testing: form validation, state management, RTL positioning, visual consistency, error boundaries
- **QA/Fix**: Identified and fixed hash routing issue (app uses `/#/clients` not `/clients`); killed stale dev server process that was serving old frontend version
- **Frontend/Hebrew**: Verified Hebrew localization on Clients page (כותרת, כפתורים, תגיות, מצב ריק) - all passing
- **Docs/PRD**: Reviewed `docs/PRD_Client_Airtable_Sync.md` for bidirectional Airtable sync feature; designed Smart Flow UX approach for unified create/import modal
- **Frontend/AddClientModal**: Complete rewrite with Smart Flow UX:
  - Unified search + create flow (search → if not found → auto-create mode)
  - Full Hebrew UI (labels, buttons, placeholders, error messages)
  - Client type multi-select chips (בטיפול, ריטיינר, ליטיגציה, etc.)
  - Stage dropdown with Hebrew options (חדש, בתהליך, ממתין, הושלם)
  - Duplicate detection with warning message
  - Optional folder linking
  - Airtable sync on submit (non-blocking)
  - Reduced code from 813 lines to ~400 lines
- **QA/AddClientModal**: Added `tests/add-client-modal.spec.cjs` (13 tests) covering modal open/close, Hebrew UI, form validation, RTL support
- Backend/Docker: Fixed Dockerfile.api to run `backend.main:app` (with RAG endpoints) instead of `scoring_service.main:app`; API now serves `/api/rag/inbox`, `/api/rag/ingest`, etc.
- Backend/Fix: Corrected syntax error in `backend/main.py:375` (`} except` → `except`), fixed import path (`import fixtures` → `from backend import fixtures`), added `httpx>=0.25.0` to `backend/requirements.txt`, created `backend/__init__.py` to make backend a proper Python package.
- DevEx/VM: Rebuilt API container on dev VM with fixes; RAG tab inbox loading now works at `http://20.217.86.4:8080`.

## 2025-11-28
- RAG ingest PRD: updated `docs/INSIGHTS_RAG_PRD.md` with v2.0 “Inbox First” flow (MD5 dedupe, Gemini→Whisper fallback, inbox statuses, reviewer chat view, hard delete).
- Frontend RAG: rebuilt `/rag` page with drop-zone uploader, MD5(first 1MB) hashing for dedupe, inbox/published lists, status badges, and default metadata inputs; removed the old single-file transcribe form.
- Backend RAG (stub): added `/api/rag/ingest` (saves to `Transcripts/Inbox` with manifest, duplicate hash returns status=duplicate), `/api/rag/inbox` (reads manifest), `/api/rag/publish/{id}` (moves to Library and marks ready), and `DELETE /api/rag/file/{id}` (hard delete files + manifest). Scaffolded `backend/Transcripts/`.
- Reviewer path: added `/api/rag/reviewer/{id}` (GET/PATCH) for transcript + metadata edits; ingest now seeds a stub transcript. Frontend adds a Reviewer panel with inline edits and save/publish.
- Gemini check: verified the existing Gemini key reaches `models/gemini-2.0-flash-001`; `gemini-1.5-flash-latest` path 404s. Awaiting the new “Gemini 3” key to replace the current one in `secrets.local.json`.
- Build: ran `npm ci` + `npm run build` in `frontend/` (vite build succeeds).

## 2025-11-29
- Backend RAG: integrated Gemini transcription in ingest (configurable model), added `/api/rag/models` (lists Gemini/OpenAI/Anthropic via env keys), audio streaming `/api/rag/audio/{id}`, and ensured library moves keep file paths.
- Frontend RAG: added tabbed split “קליטה ואישור” (ingest/reviewer) and “AI / עוזר” (assistant form using search flow); reviewer now includes audio playback and global speaker rename.
- DevEx/Detect: added `/health` endpoint to backend to let frontend auto-detect API base (fixes empty Clients list when health probe failed).
- DevEx/Ports: pinned dev ports (frontend 3000, backend 8080, dev tools 900x) and documented in `docs/DEV_PORTS.md`; frontend dev script uses port 3000, backend CORS updated for 3000, API auto-detect prefers fixed ports.
- RAG UI: “Edit” in Published Library now opens the reviewer, and a Playwright check script (`tools/playwright_rag_edit_check.mjs`) verifies the flow end-to-end.
- RAG reviewer: added segment editor controls (add/delete) and raw-text fallback; backend reviewer endpoint now returns `rawText` and parsed segments. Fixed syntax in reviewer endpoint try/except and ensured TXT ingests can be reloaded as raw text for editing.

## 2025-11-23
- Infra/Dev VM: Provisioned `eislaw-dev-vm` (Ubuntu 22.04, israelcentral) and enabled hot-reload stack via `docker-compose.dev.yml` (API 8799, Vite frontend 5173, Meili 7700). NSG updated to allow inbound 5173/8799 for easy browser access; SSH key stored at `EISLAWManagerWebApp/eislaw-dev-vm_key.pem`. Usage: `docker compose -f docker-compose.dev.yml up --build -d` in `~/EISLAWManagerWebApp`; tunnel if ports are blocked.
- DevEx/Local: docker-compose now mounts `secrets.local.json` into the API container so Airtable/Graph/Fillout work locally without baking secrets; documented local vs Azure vs PC/WSL handling in `docs/DOCKER_SETUP.md` (env vars in cloud, file mount only locally).

## 2025-11-26
- Marketing: Added canonical brand voice (`docs/MarketingOps/VOICE_OF_BRAND.md`), Hebrew style appendix, and marketing content prompt (`docs/MarketingOps/MARKETING_CONTENT_PROMPT_EITAN_SHAMIR.md`); linked in MarketingOps README and Projects Compendium.
- Privacy: Fixed Fillout field mapping to live form IDs, ship mapping in API image, and cache submissions locally so details render even if Fillout is down.
- DevEx: CORS/VITE updated for VM host; Graph health uses app creds for badge; sidecar continues hourly email/fillout sync.

## 2025-11-20
- Infra/Backups: Added Airtable snapshot CLI (Azure Blob upload + retention GC) and scheduled GitHub Action to run every 6h or on-demand; backup plan + deploy runbook updated with steps.
- DevEx: Documented how to run local snapshots and metadata-based `--all-tables` option (requires Airtable metadata scope).
- DevEx/Process: Created the main GitHub repo (`EISLAW/EISLAWManagerWebApp`) and wrote down the push workflow so code + automations rely on the same remote.
- DevEx/Infra: Fixed `infra/deploy_privacy_only.ps1` to vendor backend deps automatically and fall back to `powershell.exe` when `pwsh` is missing, so Azure deploys no longer choke on missing packages.
- Infra/Containers: Built Docker image (`Dockerfile.api`) for the backend, created ACR `eislawacr`, and switched `eislaw-api-01` to run the container (`privacy-api:2025-11-20`). `/health` now served from the containerized stack; zip deploy is deprecated except for local fallbacks.
- CI/Slots: GitHub Actions deploy now builds/pushes the backend image, deploys to a staging slot, runs /health + privacy smoke tests, emits an App Insights heartbeat (if configured), and swaps into production on success; adds ACR promote tag support and updates the runbook.
- Frontend/Containers: Added optional frontend container build/deploy path (Dockerfile.web) via workflow inputs (frontend Web App + API URL) while keeping static upload for compatibility; workflow can push git tags (`release_tag`) to enforce version traceability.
- Infra/Azure: Added `tools/azure_log_stream.py` + docs so we can stream App Service logs via Kudu when `az webapp log tail` flakes (auto-reconnect + file output) while chasing the `/health` failure on `eislaw-api-01`.

## 2025-11-19
- Infra/Azure: Mirrored Fillout/Airtable/Graph secrets into `eislaw-api-01`, built a production zip with vendored deps, deployed backend + refreshed static site (`eislawstweb`) so cloud env matches local (API still failing `/health`; continuing to investigate uvicorn start in App Service).
- Frontend/UI: Privacy dashboard polish — added refresh control, auto-open latest submission, clearer metrics badges, toasts for actions, and empty-state guidance. Preview at `http://localhost:5197/#/privacy` (commands above).
- DevEx/Process: Added this changelog + lightweight rollback note; keep entries dated and scoped (Frontend/UI, Backend/API, DevEx/Infra).
- RAG/Desktop parity: Added a stub doc-transcription uploader on the web RAG tab and mock backend endpoint so we can route desktop transcripts into the index flow.
- DevEx/Design: Boot instructions now link to the design system quick guide + tokens/templates so every UI task defaults to the same visual language.
- DevEx/Containers: Dockerfiles (`Dockerfile.api`, `Dockerfile.web`) + `docker-compose.yml` now drive `start_local.bat`, so running that script launches the API, web, and Meilisearch containers automatically.
- Privacy QA: Added `tools/privacy_flow_smoke_test.py` to seed 10 questionnaire submissions end-to-end (Fillout → scoring → Airtable) with JSON summaries, trimmed Airtable field writes to the currently provisioned columns, and documented the flow in `docs/PrivacyExpress/PROJECT_OVERVIEW.md`.
