MCP Sources And Discovery
=========================

Authoritative Lists
- Awesome MCP servers: https://github.com/punkpeye/awesome-mcp-servers
- Microsoft MCP (protocol): https://github.com/microsoft/mcp
- Curated Gist (servers, tools, examples): https://gist.github.com/didier-durand/2970be82fec6c84d522f7953ac7881b4

Selection Policy (Agent)
- Default goal: maximum local autonomy with minimal user intervention.
- Before asking the user to run or click: scan these lists for a ready‑made MCP server that fits the need.
- Prefer local‑only servers (bind to 127.0.0.1) with a shared secret; avoid exposing ports.
- Install via one‑click script and auto‑start on login when possible.

High‑Value Categories For EISLAW
- Shell/PowerShell server: run scripts, manage processes, query system.
- Filesystem server: read/write files, list directories, tail logs.
- Browser/Automation server (Chromium/Playwright): open URLs, validate flows, capture screenshots.
- Microsoft Graph/SharePoint helpers: leverage app‑only Graph for mail/drive/sites (can be inline or separate MCP).
- Clipboard/Notifications: copy paths, show toasts, small UX helpers.

Adoption Order (suggested)
1) Shell + Files MCP (local, secured)
2) Browser/Playwright MCP for UI checks
3) Optional Graph/SharePoint MCP if a solid public server exists; otherwise use built‑in app‑only Graph flows

Next Step
- If autonomy would benefit from an MCP, pick a candidate from the Awesome list, then use `docs/MCP_BRIDGE.md` to scaffold install/start scripts.

