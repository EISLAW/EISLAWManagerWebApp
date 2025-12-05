Session Readiness (Must-Do)
===========================

Purpose
- Ensure all local capabilities are available before coding so we don’t waste time on missing tools.

One‑time installs
- Native folder open: `pwsh tools/install_open_protocol.ps1`
- MCP auto‑start at login: `pwsh tools/mcp_bridge_setup.ps1`

Per‑session (local dev)
1) Start dev env and UI
   - `open_local.bat` (preferred; sets VITE_API_URL to local)
   - or `start_dev.bat` (or `pwsh tools/dev_start.ps1`)
   - Verifies: backend at http://127.0.0.1:8799 (script) or 8788 (manual), frontend dev at http://localhost:5173
2) Backend OpenAPI gate (BLOCKER rule)
   - GET `/openapi.json` and assert required endpoints are present: `/email/by_client`, `/email/search`.
   - If missing: kill uvicorn on the port and restart, then re‑check.
2) Run smoke (quick UI/API probe)
   - `smoke_dev.bat` (or `pwsh tools/dev_smoke.ps1 -ClientName "סיון בנימיני"`)
   - Produces: tools/playwright_probe_result.json and tools/playwright_probe.png
3) Ensure local MCP is running
   - Auto: Task ‘EISLAW‑MCP‑Local’ runs at login (created by the bridge setup)
   - Manual: `start_mcp.bat` (or `node tools/mcp-local/server.js`)
   - Verify IDE-level config: `pwsh tools/mcp_verify.ps1` (writes `tools/mcp_verify_result.json`)

Optional: clean workspace
- Preview: `pwsh tools/cleanup.ps1`
- Delete: `pwsh tools/cleanup.ps1 -Delete`
- Deep (also remove node_modules caches): `pwsh tools/cleanup.ps1 -Delete -Deep`

Stop/Flag Policy
- If any expected capability is missing (backend health, dev endpoints, native open, MCP tools), STOP and raise a flag to the user with the exact missing item and the command to enable it. Do not proceed assuming it works.

Notes
- If another launcher exists under `C:\Coding Projects\EISLAW-WebApp\session_start.bat`, it now forwards to the unified local launcher. Prefer `open_local.bat` at the system repo root.
 - LOCAL mode policy: never open Outlook/OWA or `mailto:`; verify via Playwright that no window opens on Emails tab before user review.
