# CHANGELOG

Lightweight, dated notes for significant changes. Keep entries short (1–3 bullets per area) and tag releases before deploys so rollbacks are just “redeploy the last tag”.

## Rollback (light playbook)
- Deploy from tags (e.g., `git checkout v0.1.0` → build → deploy). If something breaks, redeploy the prior tag.
- For frontend preview: `cd "EISLAW System/frontend" && npm run build && npm run preview -- --host --port 5197`; backend mock: `cd "EISLAW System" && DEV_CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5197,http://127.0.0.1:5197" .venv/bin/python -m uvicorn scoring_service.main:app --host 127.0.0.1 --port 8788`.
- If a change involved config/secrets, revert the config file alongside the code tag.

## 2025-11-20
- Infra/Backups: Added Airtable snapshot CLI (Azure Blob upload + retention GC) and scheduled GitHub Action to run every 6h or on-demand; backup plan + deploy runbook updated with steps.
- DevEx: Documented how to run local snapshots and metadata-based `--all-tables` option (requires Airtable metadata scope).

## 2025-11-19
- Frontend/UI: Privacy dashboard polish — added refresh control, auto-open latest submission, clearer metrics badges, toasts for actions, and empty-state guidance. Preview at `http://localhost:5197/#/privacy` (commands above).
- DevEx/Process: Added this changelog + lightweight rollback note; keep entries dated and scoped (Frontend/UI, Backend/API, DevEx/Infra).
- RAG/Desktop parity: Added a stub doc-transcription uploader on the web RAG tab and mock backend endpoint so we can route desktop transcripts into the index flow.
- DevEx/Design: Boot instructions now link to the design system quick guide + tokens/templates so every UI task defaults to the same visual language.
