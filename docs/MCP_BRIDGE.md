MCP Bridge (Optional)
=====================

Purpose
- Allow a local MCP server to expose controlled desktop and shell capabilities to the agent, so routine checks don’t require manual steps.

Status
- Local MCP (shell/files/open) is available via `tools/mcp-local/server.js` using `@modelcontextprotocol/sdk`.
- Auto-start installer: `pwsh tools/mcp_bridge_setup.ps1` (adds a scheduled task `EISLAW-MCP-Local`).

Design choices
- Keep servers local-only and scoped to your user.
- Use a shared secret and 127.0.0.1 binding.
- Expose only the minimum tools we need (shell/files/open-url), since we already have Playwright and native open.

Setup (proposed)
1) Install Node 18+ and Git.
2) Choose/clone an MCP server (examples):
   - A shell/files server (public MCP server from the community list)
   - A lightweight browser/open-url server
3) Configure the server to bind to `127.0.0.1` and require a secret token.
4) Start the server at login via Task Scheduler.

Local server included
- `tools/mcp-local/server.js` exposes tools:
  - `read_file`, `write_file`, `list_dir`, `open_path`, `open_url`, `run_powershell` (Windows only)
- Start now: `node tools/mcp-local/server.js` (stdio transport)
- Auto-start on login: `pwsh tools/mcp_bridge_setup.ps1`

Future: external servers
- `tools/mcp_bridge_setup.ps1` can be extended to clone and run selected public servers from the Awesome list.

Security
- Local‑only, user‑level service.
- Secret token stored in `secrets.local.json`.

Next steps
- Provide the exact GitHub repo(s) you prefer for the MCP servers, or ask me to draft `tools/mcp_bridge_setup.ps1` with a specific public implementation.
