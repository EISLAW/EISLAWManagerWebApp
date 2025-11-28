# CHANGELOG

Lightweight, dated notes for significant changes. Keep entries short (1–3 bullets per area) and tag releases before deploys so rollbacks are just “redeploy the last tag”.

## Rollback (light playbook)
- Deploy from tags (e.g., `git checkout v0.1.0` → build → deploy). If something breaks, redeploy the prior tag.
- For frontend preview: `cd "EISLAW System/frontend" && npm run build && npm run preview -- --host --port 5197`; backend mock: `cd "EISLAW System" && DEV_CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5197,http://127.0.0.1:5197" .venv/bin/python -m uvicorn scoring_service.main:app --host 127.0.0.1 --port 8788`.
- If a change involved config/secrets, revert the config file alongside the code tag.

## 2025-11-28
- RAG ingest PRD: updated `docs/INSIGHTS_RAG_PRD.md` with v2.0 “Inbox First” flow (MD5 dedupe, Gemini→Whisper fallback, inbox statuses, reviewer chat view, hard delete).
- Frontend RAG: rebuilt `/rag` page with drop-zone uploader, MD5(first 1MB) hashing for dedupe, inbox/published lists, status badges, and default metadata inputs; removed the old single-file transcribe form.
- Backend RAG (stub): added `/api/rag/ingest` (saves to `Transcripts/Inbox` with manifest, duplicate hash returns status=duplicate), `/api/rag/inbox` (reads manifest), `/api/rag/publish/{id}` (moves to Library and marks ready), and `DELETE /api/rag/file/{id}` (hard delete files + manifest). Scaffolded `backend/Transcripts/`.
- Reviewer path: added `/api/rag/reviewer/{id}` (GET/PATCH) for transcript + metadata edits; ingest now seeds a stub transcript. Frontend adds a Reviewer panel with inline edits and save/publish.
- Build: ran `npm ci` + `npm run build` in `frontend/` (vite build succeeds).

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
