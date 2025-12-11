Desktop Automation Capabilities
==============================

Goal
- Give the local agent enough capability to open folders/URLs, probe the UI, and validate flows — without manual steps.

What’s available now
- Native folder open (no API):
  - Installer: `pwsh tools/install_open_protocol.ps1`
  - Usage: the app opens `eislaw-open://<path>` which launches Explorer directly.
- Dev desktop endpoints (local only; guarded by `DEV_DESKTOP_ENABLE=1`):
  - `POST /dev/desktop/open_path` → `{ path: "C:\\..." }`
  - `POST /dev/desktop/open_url`  → `{ url: "https://..." }`
  - `POST /dev/desktop/playwright_probe` → `{ url?: string }` (defaults to vite preview URL)
  - `POST /dev/open_folder?name=<client>` (legacy) — opens by client name using registry/store_base.

How to enable (local dev)
- Start with `start_dev.bat` or `pwsh tools/dev_start.ps1`.
- This sets `DEV_ENABLE_OPEN=1` and `DEV_DESKTOP_ENABLE=1` for the current session.

Recommended usage patterns
- Prefer `eislaw-open://` in the UI for one‑click folder open.
- Use `/dev/desktop/*` endpoints for scripted checks (smoke tests, quick diagnostics, launching Outlook search, etc.).
- Run `pwsh tools/dev_smoke.ps1` to validate UI + API automatically.

Cloud behavior
- The native protocol works on any machine where it is installed.
- `/dev/desktop/*` endpoints are local‑only helpers; they are not intended for the cloud site.

