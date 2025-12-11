EISLAW — Local Mode
===================

Purpose
- Always run the local development version (UI + backend) while we iterate.
- Confirms that the frontend calls the local API at `http://127.0.0.1:8788`.

One‑click start
- Run `open_local.bat` from the repo root.
- It will:
  - Set dev env (`VITE_API_URL=http://127.0.0.1:8788`).
  - Start backend (FastAPI) on `127.0.0.1:8788` if not running.
  - Start frontend (Vite) on `http://localhost:5173` if not running.
  - Open `http://localhost:5173/#/clients` in your browser.

Expectations
- “Clients” should list local/SharePoint‑synced entries (Hebrew names OK).
- SharePoint buttons open the client folder under “לקוחות משרד/<שם לקוח>”.
- Editing a client updates the local registry and Airtable.

Troubleshooting
- If the page is blank or shows “No active clients found”, confirm the local URL:
  - Use the opened tab `http://localhost:5173/#/clients` (not the cloud link).
  - API health: `http://127.0.0.1:8788/health` → 200.
- To re‑create test clients: `python tools/create_test_client.py`.
- To update the last test client: `python tools/update_test_client.py`.

Cloud parity
- While we work locally, backend writes the registry to SharePoint (`System/registry.json`) and mirrors locally. When we deploy the backend, the cloud UI will show the same data.

