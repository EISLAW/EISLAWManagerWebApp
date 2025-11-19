# Developer Docs Portal — EISLAW

Purpose
- One place to jump to official docs we use day‑to‑day (APIs, SDKs, build tools) with the exact scope relevant to our stack.

Microsoft 365 / Graph
- Graph REST v1.0 overview: https://learn.microsoft.com/graph/api/overview?view=graph-rest-1.0
- Query params ($select/$top/$filter/$search, ConsistencyLevel): https://learn.microsoft.com/graph/query-parameters
- Messages — list/search/delta: https://learn.microsoft.com/graph/api/resources/message?view=graph-rest-1.0
- Drive/SharePoint — root:/path:/ addressing + upload bytes: https://learn.microsoft.com/graph/api/driveitem-put-content?view=graph-rest-1.0
- App registration (app‑only vs delegated): https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
- Permissions reference (Sites.Selected, Mail.Read): https://learn.microsoft.com/graph/permissions-reference

Outlook Add‑ins (Phase 1.5/2)
- Overview: https://learn.microsoft.com/office/dev/add-ins/outlook/outlook-add-ins-overview
- Command surface + Item context: https://learn.microsoft.com/office/dev/add-ins/outlook/add-in-commands-for-outlook
- Office SSO: https://learn.microsoft.com/office/dev/add-ins/develop/sso-in-office-add-ins

Frontend
- React 18: https://react.dev/
- React Router 6: https://reactrouter.com/
- Vite 5: https://vitejs.dev/guide/
- Tailwind: https://tailwindcss.com/docs
- Playwright: https://playwright.dev/docs/intro
- Changelog (project updates + rollback note): ./CHANGELOG.md

Backend
- FastAPI: https://fastapi.tiangolo.com/
- Uvicorn: https://www.uvicorn.org/
- MSAL (Python): https://github.com/AzureAD/microsoft-authentication-library-for-python

Data / Indexing
- SQLite/FTS5: https://www.sqlite.org/fts5.html

Integrations
- Airtable API v0: https://airtable.com/developers/web/api/introduction
- Fillout API: https://www.fillout.com/developers

Automation / Scripting
- PowerShell 7: https://learn.microsoft.com/powershell/
- python-docx: https://python-docx.readthedocs.io/
- pywin32 Word (SaveAs2): https://learn.microsoft.com/office/vba/api/word.document.saveas2

MCP (Model Context Protocol)
- Spec: https://github.com/modelcontextprotocol/spec
- Filesystem server: https://github.com/modelcontextprotocol/servers/tree/main/servers/filesystem
- Shell MCP (kevinwatt): https://github.com/kevinwcox/shell-mcp
- Playwright MCP: https://github.com/microsoft/playwright-mcp
 - Context7 MCP (docs hub): https://github.com/upstash/context7
 - Puppeteer MCP server: https://github.com/imazhar101/mcp-puppeteer-server

Notes
- Local stack pins: Node v22.15.1, npm 10.9.2, Python 3.13, Vite ^5.4.x, React ^18.3.x, Playwright ^1.46.x.
- For cloud parity, reference infra/README.md.
