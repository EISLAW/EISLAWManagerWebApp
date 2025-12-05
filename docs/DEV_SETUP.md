Local Development (Fast, No Deploy)
===================================

Goal
- Run backend (FastAPI) and frontend (Vite + React) locally for fast iteration, and deploy only when ready.

Prereqs
- Python 3.10+ (3.13 is fine)
- Node 18+
- Secrets present in `secrets.local.json` (Graph + Airtable)

One-time
- (Optional) Create a venv and install deps: `pip install -r scoring_service/requirements.txt`

Start dev environment
1) Load env vars for this PowerShell session
   - `pwsh tools/dev_env.ps1`
   - This sets `GRAPH_*`, `VITE_API_URL=http://127.0.0.1:8788`, and enables CORS for Vite dev
2) Start backend with reload
   - `uvicorn scoring_service.main:app --host 127.0.0.1 --port 8788 --reload`
3) In a second terminal, start the frontend
- `cd frontend`
- `npm run dev`

Desktop launchers
- Double‑click `session_start.bat` (single entry) — installs/starts MCP, launches backend + frontend, runs quick checks.
- Double‑click `start_dev.bat` to start backend + frontend and open the browser.
- Double‑click `smoke_dev.bat` to run a quick local smoke test.

Optional: native folder open (no API)
- One-time install: `pwsh tools/install_open_protocol.ps1`
- After that, the app will use `eislaw-open://<path>` to open Explorer directly.
- You can test it from a terminal: `Start-Process "eislaw-open://C:/Windows"`.

Quick smoke test (API + UI)
- `pwsh tools/dev_smoke.ps1 -ClientName "סיון בנימיני"`
  - Starts backend, builds + previews frontend, probes UI, and hits key API endpoints (health, clients, locations).
  - Outputs a JSON snapshot at `tools/playwright_probe_result.json` and a screenshot `tools/playwright_probe.png`.

Notes
- Frontend calls the backend at `http://127.0.0.1:8788` via `VITE_API_URL`.
- Backend enables CORS for `http://localhost:5173` and `http://127.0.0.1:5173` when running locally.
- To test Graph without local files, use the Client page “Sync” button (calls `/api/client/summary_online`).

When ready to ship
- Backend: `pwsh infra/package_backend.ps1` → `az webapp deploy ... --type zip`
- Frontend: `npm run build` → `az storage blob upload-batch -s dist -d '$web' --account-name eislawstweb --auth-mode login --overwrite`
