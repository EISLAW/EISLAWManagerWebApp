# CHANGELOG

Lightweight, dated notes for significant changes. Keep entries short (1–3 bullets per area) and tag releases before deploys so rollbacks are just “redeploy the last tag”.

## Rollback (light playbook)
- Deploy from tags (e.g., `git checkout v0.1.0` → build → deploy). If something breaks, redeploy the prior tag.
- For frontend preview: `cd "EISLAW System/frontend" && npm run build && npm run preview -- --host --port 5197`; backend mock: `cd "EISLAW System" && DEV_CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5197,http://127.0.0.1:5197" .venv/bin/python -m uvicorn scoring_service.main:app --host 127.0.0.1 --port 8788`.
- If a change involved config/secrets, revert the config file alongside the code tag.

## 2025-11-21
- DevEx/Encoding: Added repo-level `.editorconfig` to enforce UTF-8 and documented Hebrew/UTF-8 handling in `docs/DEV_SETUP.md` to prevent mojibake across CSV/JSON/Markdown/Word exports.

## 2025-11-28
- RAG planning: Logged updated Tracks 1 (Ingest & Transcript Correction) and 2 (Chat with AI) in `docs/NEXT_ACTIONS.md`; added pointer in `docs/WORKING_MEMORY.md` for future sessions.
- Project Map: Added new project entry “EISLAW Privacy DPO” (docs/Privacy_DPO/README.md) to compendium and index, including source locations for the regulation table and annotated Word doc.
- Privacy DPO: Generated initial regulation table exports (CSV/JSON) and operational manual in `docs/Privacy_DPO/` for Airtable import and manager-facing guidance.

## 2025-11-27
- RAGPilot: Updated `docs/INSIGHTS_RAG_PRD.md` to reflect v1.4 (partitioned domains, inbox→library quality gate, Meili keyword index first, rebuild workflow, marketing composer path).
- Project Map: Clarified `docs/PROJECTS_COMPENDIUM.md` entry for RAGPilot (partitioned, quality-gated, Meili-backed).
- Plan: Agreed to build transcript-first core (keyword search + publish gate) before semantic/marketing phases; reuse desktop chunking logic for audio when we wire ingest.

## 2025-11-28
- Desktop/LLM: Updated AudoProcessor (desktop manager) LLM settings dialog to default `gemini-3-pro-preview`, fix API-key field handling, pull Gemini keys from central settings, and auto-fallback to available models; added guard to stop retries when a leaked key is detected.
- Desktop/Transcription: Gemini transcription now uses the latest key from secrets/settings, logs the selected model, and handles model-not-found by switching to supported 3.x/2.5 variants to keep transcription running.
- RAGPilot: Implemented Phase-1 backend with file-system Inbox/Library + optional Meilisearch indexing (`rag_service.py`), endpoints `/api/rag/ingest`, `/api/rag/ingest_audio`, `/api/rag/publish`, `/api/rag/inbox`, `/api/rag/search`, `/api/rag/rebuild`, domain/client gating, drafts/personal flags, and frontend Inbox/publish UI wiring. Audio ingestion reuses the desktop transcription prompt/pipeline.
- RAGPilot Testing: Added unit test `tests/unit/test_rag_service.py` (ingest→publish→search, drafts/personal handling) and ran `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python3 -m pytest -s --basetemp=/tmp/pytest tests/unit/test_rag_service.py` (pass; pytest installed user-local). Manual smoke: transcribed `Trachtenberg...m4a`, ingested, published, and searched (Inbox→Library flow OK; Meili optional).
- RAGPilot UI: Polished RAG tab — consistent domain labels, preloaded Inbox, post-ingest refresh, publish validation/errors inline, search result summary pills (count + source Meili/files), clearer empty-state messaging.
- RAGPilot Assistant: Added `/api/rag/assistant` and UI assistant panel on RAG tab to ask questions with domain/client/personal/drafts filters; responses stitch top RAG snippets with source listing.
- Design: Added sidebar-style dashboard mock (`/design/dashboard-mock`) using existing design language to explore a Flow-like layout (sidebar nav, hero/status strip, activity feed, quick actions).

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
