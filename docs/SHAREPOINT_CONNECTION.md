SharePoint Connection — EISLAW
==============================

Authoritative Paths
- Hostname: eislaw.sharepoint.com
- Site (Graph path): sites/EISLAWTEAM
- Default library (Graph name): Shared Documents
- Clients root folder (Hebrew): לקוחות משרד
- Registry file (JSON): Shared Documents/System/registry.json

Local Mirror (Windows)
- C:\Users\USER\Eitan Shamir & Co\EISLAW TEAM - מסמכים\לקוחות משרד

Graph App Requirements
- Azure AD App (client_id / client_secret / tenant_id) in secrets.local.json → microsoft_graph
- Recommended application permissions (admin consent):
  - Sites.ReadWrite.All (or Sites.Selected with per-site assignment)
  - Files.ReadWrite.All (optional if write is needed via Graph)

Backend Helpers (scoring_service)
- Env defaults are set by `tools/dev_env.ps1`:
  - `SP_SITE_PATH=eislaw.sharepoint.com:/sites/EISLAWTEAM`
  - `SP_DOC_BASE=לקוחות משרד`
- Key endpoints (local backend at 127.0.0.1:8788):
  - `GET /sp/check?ensure_base=true` → verifies site/drive and ensures the clients root folder exists.
  - `POST /sp/folder_create` with JSON `{ "name": "סיון בנימיני" }` → creates `לקוחות משרד/סיון בנימיני` and returns `{ webUrl, id, created }`.
  - `GET /api/client/locations?name=סיון בנימיני` → returns both `localFolder` (from registry) and `sharepointUrl` (via Graph), used by the UI "SharePoint" button.

Troubleshooting Notes (Episodic)
- Earlier session stalled on locating the correct site/library and Hebrew clients root. Defaults now point to sites/EISLAWTEAM, library "Shared Documents", folder "לקוחות משרד". See docs/Testing_Episodic_Log.md entries for status.
