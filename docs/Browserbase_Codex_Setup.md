<!-- Quick reference for future Codex agents on Browserbase streaming -->
# Browserbase + Codex Streaming SOP

Use this guide whenever you need live UI access through Browserbase. The default assumption inside Codex is “I can’t see the user’s desktop”; following these steps removes that blocker.

## 1. Prerequisites
1. API credentials must exist in `secrets.local.json` under:
   ```json
   "browserbase": {
     "api_key": "<BROWSERBASE_API_KEY>",
     "project_id": "<BROWSERBASE_PROJECT_ID>"
   }
   ```
2. `~/.codex/config.toml` must define the Browserbase MCP:
   ```toml
   [mcp_servers.Browserbase]
   type = "stdio"
   command = "npx"
   args = ["@browserbasehq/mcp-server-browserbase"]
   [mcp_servers.Browserbase.env]
   BROWSERBASE_API_KEY = "{{browserbase.api_key}}"
   BROWSERBASE_PROJECT_ID = "{{browserbase.project_id}}"
   GEMINI_API_KEY = "{{llm.api_keys.gemini}}"
   ```
   > The GEMINI key is used by Stagehand inside Browserbase; it does **not** replace Codex.

## 2. Launch sequence (run on the user desktop)
### A. Start Browserbase MCP (keep terminal open)
**Quick option:** run `C:\Coding Projects\start_browserbase_mcp.bat` (edit the file once to insert the real GEMINI key).  
The script executes the commands below automatically.
```powershell
cd "C:\Coding Projects\EISLAW System"
$env:BROWSERBASE_API_KEY  = 'bb_live_gR4gaHZCq-fGhRfpdVkYnxJQXfI'
$env:BROWSERBASE_PROJECT_ID = 'b6b95dac-9c2e-4fee-bdc6-cbe5a52b90ce'
$env:GEMINI_API_KEY = 'AIzaSyCHxGOlLlTUk6rii_PyM2iv8dnySMxsKGM'
npx @browserbasehq/mcp-server-browserbase
```
- This terminal must stay running. If the env vars are missing, Browserbase falls back to dummy keys and Codex cannot connect.

### B. Authenticate Codex CLI (one-time per session)
```powershell
codex login
```
- A URL prints to the console. Open it in your local browser, approve the request with your ChatGPT Plus/Pro account, and wait for “Login successful.”
- Codex now has the permissions needed to call the Browserbase MCP.

### C. Verify MCP availability
```powershell
codex mcp list
```
Ensure you see `Browserbase` listed as `enabled`.

## 3. Using Browserbase inside Codex
- From here, agents can call Browserbase MCP tools (e.g., `browserbase.open`, `browserbase.screenshot`, etc.) through the standard MCP interface. When a future agent claims “I can’t see the UI,” instruct them to follow the steps in this file before escalating.
- Quick-check list for new agents:
  - [ ] Browserbase MCP terminal running with env vars set.
  - [ ] `codex login` completed (session not expired).
  - [ ] `codex mcp list` shows Browserbase as `enabled`.
  - [ ] Manual notes or blockers recorded in `docs/Testing_Episodic_Log.md`.

## 4. Troubleshooting
| Symptom | Fix |
| --- | --- |
| Browserbase MCP immediately exits with “command not found” | Ensure `npx @browserbasehq/mcp-server-browserbase` is installed (Node 18+ required). |
| MCP shows “Using dummy value” warnings | Set the env vars **before** running `npx`. Strings typed by themselves are treated as commands. |
| Codex still says “transport closed” | Re-run `codex login`, then restart Codex CLI or reload MCP servers. |
| Browserbase session idle timeout | Re-launch step A; Stagehand sessions expire after ~10 minutes of inactivity. |

Keep this SOP handy so new agents can bootstrap Browserbase access without asking the user for instructions every time.
