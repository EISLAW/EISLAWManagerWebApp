<!-- Projec## 2025-11-07 - Backend tests + UI smoke after Dashboard/Tasks changes
- Scope: Post-implementation tests for Dashboard filters, Tasks/Owners local stores, FE/BE version badge.
- Backend pytest: fixed two issues breaking collection and one legacy DB schema incompatibility.
  - Syntax error in `_http_put_bytes` except block (indentation) — fixed.
  - Email index: legacy DBs without `body_preview` column caused OperationalError.
    - Change: queries in `/email/by_client` and `/email/search` now detect schema via `PRAGMA table_info(messages)` and fall back when `body_preview` is absent.
  - Result: `python -m pytest -q scoring_service/tests` → 7 passed.
- Frontend build (Vite):
  - Initial failure: stray literal `\\r\\n` tokens in `frontend/src/pages/Privacy/index.jsx` around `approvePublish()` introduced a syntax error.
  - Fix: normalized line endings and corrected `finally` to `setBusyPublish(false)`; cleaned the block.
  - Build: `npm run build` → success.
- Playwright smoke (preview):
  - Started preview on 127.0.0.1:4173 and ran `tools/playwright_probe.mjs`.
  - Result JSON: `tools/playwright_probe_result.json` shows `ok: true`, status 200, title “EISLAW Web App”.
  - Note: CORS warnings for `/health` from 4173 (expected; CORS allowlist currently only 5173). Non-blocking.
- Follow-ups:
  - Optionally add 4173 to DEV_CORS_ORIGINS for preview flows.
  - Add minimal Playwright specs for Dashboard filters and Tasks panels (selectors via `data-testid`).t: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Testing Episodic Log (Security Questionnaire)

Purpose
- Capture testing incidents, unexpected results, fixes, and rationale so we can quickly regress-test and avoid repeated mistakes.

How to use
- Before changes: add an entry describing the scenario and expected vs. actual.
- After changes: add what was fixed (file + rule/code), and a minimal test payload.
- Refer to this file during each test cycle. See also: `docs/Security_Scoring_Spec.md` and `docs/Fillout_Audit.md`.

Entries

## 2025-11-29 - RAG UI regressions (tabs/layout) and version visibility gaps
- Context: RAG assistant/ingest work was done on the archived tree; when switching to the clean repo the assistant tab and sidebar layout were missing, causing several hours of rework. Also, version/env badges were not visible in the new layout, leading to confusion between local/dev/staging.
- Symptoms:
  - `/rag` loaded without the expected assistant form/tab and without the right-side mini-nav; main app lacked the sidebar nav seen in prior screenshots.
  - Dev server ports kept auto-bumping (5180→5181→5182→5183), and the missing env/version badges made it unclear which build was running.
- Fixes applied:
  - Ported the legacy assistant UI and sidebar from the archived repo into the clean repo (`frontend/src/App.jsx`, `frontend/src/pages/RAG/index.jsx`), restoring tabs (“קליטה ואישור” / “AI / עוזר”), assistant form, and sidebar nav.
  - Added API link/badge back into the header.
  - Added an assistant stub endpoint `/api/rag/assistant` to serve the form.
- Mitigation/next time:
  - Confirm working tree and repo before UI work; avoid editing the archived tree.
  - Keep env/version badges visible on all layouts to distinguish local/dev/staging.
  - Pin dev server port when possible to avoid confusion from auto-bumped ports. Added fixed port policy (frontend 3000, backend 8080, tools 900x) and doc `docs/DEV_PORTS.md`; ensure frontend CORS/auto-detect include those.

## 2025-11-29 - RAG reviewer raw text missing, UX validation gap
- Symptom: Reviewer showed only Gemini stub text for TXT uploads and lacked “Load raw text” in UI, because backend reviewer endpoint had a syntax error and wasn’t returning `rawText`. Users couldn’t see or edit the actual transcript.
- Fixes:
  - Backend reviewer endpoint fixed (try/except syntax) and now returns `rawText` plus parsed segments for TXT lines (`Speaker: text` or plain lines).
  - Frontend reviewer parses `rawText` as fallback, adds segment editor controls (Add/Delete), and shows “Load raw text” to reload original TXT.
  - Playwright check added for Published Edit flow; port policy enforced (frontend 3000, backend 8080).
- Mitigation:
  - Always run Playwright validation before claiming UI changes; ensure `/health` and API base are correct; verify raw TXT visibility after ingest.

## 2025-11-12 - Client email sync trigger + UI button
- Scope: Backend endpoint to invoke the Graph ingestion worker per client + Client Card Emails tab CTA so ops can pull new mail for סיון בנימיני (and others) without leaving the app.
- Changes:
  - Backend (`scoring_service/main.py`): added `_registry_entry_for` helpers and `/email/sync_client` which resolves the client's addresses, runs `tools/email_sync_worker.py` with targeted participants, parses the worker JSON, and surfaces exit diagnostics. Added pytest coverage (`tests/test_email_sync.py`) to cover registry resolution, failure cases, and command construction for סיון בנימיני.
  - Frontend (`ClientOverview.jsx`): new task-style "משוך מיילים" button in the Emails tab that calls the endpoint, shows spinner/status, refreshes the indexed list, and still hydrates the Graph preview for zero-result fallbacks.
- Verification:
  - `python -m pytest -q scoring_service/tests` (10 passed; includes new email-sync tests with סיון בנימיני fixture data).
  - `npm run build` (Vite) to ensure the updated Client Card compiles.

## 2025-11-10 - Tasks UI + Task Modal overhaul
- Scope: Client Card → Tasks tab and Task Modal UX alignment; assets management.
- Changes (frontend):
  - Client Tasks tab: two-column layout. Left shows only live tasks; right shows a collapsible "משימות שבוצעו". Added row chevrons to expand subtasks inline. Done tasks move to the completed section and return on uncheck.
  - Task Modal: shows only the opened task + its subtasks (not all client tasks). Inside "פרטים" added a collapsible completed list with checkboxes; removed tag-adder and owner/date editors (owner/date are edited inline in the task row). Removed "הוסף משימה" from modal; keep "הוסף תת-משימה" only.
  - Comments now persist (create/like/resolve/reply) via task store updates.
  - Due chip is clickable (toggles date editor) and saves correctly.
  - Assets (TaskFiles):
    - New: edit link (title + URL) and delete asset actions.
    - Desktop folder picker (local): adds folder link with local_path; shows "פתח באקספלורר". Non‑desktop fallback uses SharePoint URL form.
- Backend endpoints:
  - POST /dev/desktop/pick_folder – native folder picker (guarded by DEV flags).
  - POST /tasks/{task_id}/folder_link_add – add folder asset (local_path or web_url).
  - PATCH /tasks/{task_id}/links/update – update an existing link (URL/title).
  - POST /tasks/{task_id}/assets/remove – remove asset by drive_id/web_url/local_path.
- Verification:
  - Automated Playwright probe updated to cover add/open/subtask/done/priority/due/owner/comment flows; JSON evidence: tools/tasks_ui_probe_result.json.
  - Manual: verified link edit/delete and Explorer open for local folder links.
- Rationale:
  - Clear separation of live vs. completed tasks, single‑task focus in modal, and robust cross‑desktop assets handling.

## 2025-11-10 - Codex config path canonicalized + tools_free policy
- Scope: Eliminate obsolete AppData path and env overrides; ensure agents can use tools freely during verification.
- Changes:
  - Canonical config file: `C:\Users\USER\.codex\config.toml` (VS Code default). Avoid `CODEX_CONFIG*` env vars and `codex.configPath` overrides.
  - Updated docs and scripts: `docs/20251030_Codex_Boot_Manifest.md`, `AudoProcessor Iterations/docs/OPERATIONS.md`, `EISLAW DESKTOP/AudoProcessor Iterations/docs/OPERATIONS.md`, `AudoProcessor Iterations/codex_boot_prompt.txt`, `EISLAW DESKTOP/AudoProcessor Iterations/codex_boot_prompt.txt`, `EISLAW System/start_codex_cli.bat`, and `tools/mcp_verify.ps1`.
  - Agent execution policy: profile `tools_free` with `ask_for_approval="never"`, `sandbox="danger-full-access"`, `shell_environment_policy.inherit="all"`. Agents should proactively use MCP tools and UI automation to verify features.
- Verification:
  - `codex mcp list` shows servers enabled under VS Code defaults.
  - Desktop smoke (`C:\\Coding Projects\\EISLAW DESKTOP\\desktop_smoke.ps1`) passes 3 cycles headlessly.
  - No `CODEX_CONFIG*` variables are required for VS Code usage.


## 2025-11-09 - Codex CLI missing MCP registration
- Scope: MCP preflight for Task Modal add-task/subtask work.
- Symptom: `list_mcp_resources(server="filesystem")` and the other configured servers returned `unknown MCP server`, showing the CLI was launched without the required config.
- Investigation: `CODEX_CONFIG` points to a OneDrive path while `CODEX_CONFIG_PATH` is unset in this shell, so even though `tools/mcp-local/smoke.ps1` proves the local bridge works, Codex itself never registered those servers.
- Mitigation: Halted Task Modal work per Boot Manifest (lines 37-47) and reported the blocker; awaiting a CLI restart with `--config C:\\Users\\USER\\AppData\\Roaming\\Codex\\config.toml` before continuing.
- Follow-ups: Relaunch Codex CLI with the AppData config and re-run the MCP evidence checklist (`list_mcp_resources` for filesystem, shell, playwright, puppeteer, context7, eislaw_local, figma) before coding.

## 2025-11-09 - Hebrew labels rendered as `???` in Task Modal sources
- Scope: Pre-flight for Task Modal add-task/subtask fixes.
- Symptom: Hebrew strings in `frontend/src/features/tasksNew/TaskModal.jsx` and docs like `docs/WORKING_MEMORY.md` appeared as literal `???`, blocking UX verification and raising the risk of shipping corrupted RTL labels.
- Investigation: Confirmed the canonical Figma export (`docs/TaskManagement/figma_new/2025-11-08/src/components/TaskModal.tsx`) still holds the Hebrew copy; root cause traced to editors/shell sessions saving or rendering files without UTF-8.
- Mitigation: Added a new "Hebrew Text & Encoding" checklist to `docs/20251030_Codex_Boot_Manifest.md` (lines 49-53) covering UTF-8 saves, UTF-8 console usage, and `rg "???"` linting before handoff.
- Follow-ups: Restore each `???` string from the Figma source (owners, task labels, docs) before closing the Task Modal work; consider adding an automated check in the frontend build to flag `???` occurrences in RTL-facing components.

## 2025-11-08 - Task modal tree controls + add flows
- Scope: Task modal checklist UX (client tab) - align with Figma: per-task chevron, nested subtasks, working "add task / add subtask," and tag picker popover.
- Changes: `frontend/src/features/tasksNew/TaskModal.jsx` now renders the full client task list (so new root tasks appear instantly), keeps rows expanded after inserts, adds an inline subtask composer per node, and introduces the tag dropdown (with presets + custom input). `TaskBoard.jsx` refreshes parent/child maps so new rows are visible immediately.
- Tests: `cd frontend && npm run build` (Vite) - ensures JSX compiles and catches regressions.

1) Monitoring didn't toggle DPO
- Symptom: Case 2 initially returned `dpo=false` with `monitor_1000=true`.
- Fix: Added explicit DPO coupling for monitoring in rules and post-processing.
- Files: `config/security_scoring_rules.json` (rule), `scoring_service/main.py`, `tools/security_scoring_eval.py`.
- Quick test: `{ "monitor_1000": true }` → `dpo=true`.

2) Registration didn’t imply DPO
- Symptom: Reg true didn’t always force DPO true.
- Fix: Added constraint/coupling: `reg -> dpo`.
- Files: `config/security_scoring_rules.json`, `scoring_service/main.py`, `tools/security_scoring_eval.py`.
- Quick test: `{ "directmail_biz": true, "ppl": 10000 }` → `reg=true`, `dpo=true`.

3) Biometric ≥100k didn’t set Report
- Symptom: Case 5 initially missed `report=true` when `biometric_100k=true` and `reg=false`.
- Fix: Post-processing sets `report=true` if not registered and biometric/report thresholds are met.
- Files: `scoring_service/main.py`, `tools/security_scoring_eval.py`.
- Quick test: `{ "biometric_100k": true }` → `report=true`, `dpo=true`.

4) Basic vs Mid at ppl=10000 (Case 9)
- Symptom: Returned `mid` instead of `basic` for: owners≤2, access≤2, ethics=false, ppl=10000, no transfer, no sensitive.
- Fix: Tightened Basic rule to exclude only true-lone (requires ppl<10000) and added basic fallback in evaluators.
- Files: `config/security_scoring_rules.json`, `scoring_service/main.py`, `tools/security_scoring_eval.py`.
- Quick test: payload with `ppl=10000` as above → `level=basic`.

5) Sensitive_people ≥1000 must set DPO but not level
- Symptom: DPO didn’t toggle in some paths; also level drifted to `mid` unexpectedly.
- Fix: Explicit DPO coupling by threshold; added basic fallback check to prevent unintended `mid`.
- Files: `scoring_service/main.py`, `tools/security_scoring_eval.py`.
- Quick test: `{ "sensitive": true, "sensitive_people": 1000, "ppl": 5000 }` → `level=basic`, `dpo=true`.

6) Processor variants and precedence
- Symptom: Consultation call added for sensitive/public or large org outsourcing; should be for regular processor only.
- Fix: Requirements now:
  - `processor=true` → `outsourcing_text`, plus `consultation_call` when NOT `processor_large_org`.
  - `processor_large_org=true` → `level=high`, `dpo=true`, `outsourcing_text` only.
- Files: `config/security_scoring_rules.json`, `scoring_service/main.py`, `tools/security_scoring_eval.py`.
- Quick tests:
  - `{ "processor": true }` → level ≥ mid, requirements include `consultation_call` and `outsourcing_text`.
  - `{ "processor": true, "processor_large_org": true }` → `level=high`, `dpo=true`, requirements include `outsourcing_text` only.

7) Count cascades
- Symptom: Inconsistent counts when biometric_100k selected.
- Fix: Floors ppl/sensitive_people/biometric_people to 100,000 when `biometric_100k=true`; ensure `ppl >= sensitive_people`.
- Files: `scoring_service/main.py`, `tools/security_scoring_eval.py`.
- Quick test: `{ "biometric_100k": true, "ppl": 10 }` → `ppl` coerced to 100,000.

8) High via ppl ≥ 100,000 (any personal data)
- Clarified: `ppl >= 100000` sets `level=high` (independent of sensitive).
- Files: `config/security_scoring_rules.json`.
- Test: `{ "ppl": 100000 }` → `level=high`.

9) External integrations preflight (policy)
- Symptom: Time lost when attempting full flows without verifying tokens/consent.
- Policy added: Always run a short connectivity test for any NEW integration or scope before implementation (e.g., Graph list 5 subjects; Fillout list 1 submission; Airtable metadata ping). If consent/permissions are needed, PAUSE and request approval. Log outcomes here.
- Files: `docs/AGENT_BOOT.md` (step 6), `docs/WORKING_MEMORY.md` (policy note).
- Quick tests:
  - Graph: `python "AudoProcessor Iterations\tools\graph_list_test.py"` → shows 5 recent subjects.
  - Fillout: `tools/fillout_fetch_and_score.py --form-id <id> --limit 1`.
  - Airtable: `tools/airtable_setup.ps1` (metadata read) — warn if schema write is blocked.

Keep adding…
## 2025-10-31 – Frontend preview blank page
- Cause: SPA served statically without router fallback + missing explicit React imports → runtime error React is not defined.
- Action: Switched to HashRouter, added import React across JSX pages, and verified with Playwright headless smoke on http://localhost:4173/#/.
- Policy (owner request): Always run Playwright smoke tests before surfacing UI to user. Automate as part of local preview and 
pm run build checks.
- Artifact: tools/playwright_probe.mjs (captures console logs + screenshot tools/playwright_probe.png).

## 2025-11-01 – Policy: Always test before handoff
- Rule: For any change (infra, API, UI), run a quick verification locally before reporting status to the user. Prefer automated checks when possible.
- Implemented helpers:
  - `tools/dev_smoke.ps1` (starts backend, builds + previews frontend, probes UI, calls key APIs)
  - `smoke_dev.bat` for double‑click smoke
- Evidence: `tools/playwright_probe_result.json` and `tools/playwright_probe.png`

## 2025-11-01 – Open Files + UI scroll stability
- Symptom: “Open Files” didn’t open Explorer reliably; UI layout jumped when vertical scrollbar appeared on hover.
- Fixes:
  - Added native protocol `eislaw-open://` with installer `tools/install_open_protocol.ps1` (no API needed).
  - Backend dev open endpoint (`/dev/open_folder`) accepts query param and falls back to `<store_base>/<client name>`.
  - Frontend falls back to SharePoint and copy‑to‑clipboard when native/API open isn’t available.
  - Reserved vertical scrollbar space (`html { overflow-y: scroll }`, `body { scrollbar-gutter: stable both-edges }`).
- Files: `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`, `scoring_service/main.py`, `frontend/src/styles.css`, `tools/install_open_protocol.ps1`, `tools/open_folder.ps1`.
- Test: run `start_dev.bat` → client page → “Open Files”. If protocol isn’t installed, run `pwsh tools/install_open_protocol.ps1`.

## 2025-10-31 – Azure deployment end-to-end (Israel Central)
- Action: Deployed infra via Bicep (storage+plan+webapp+insights), packaged and ZIP-deployed backend, enabled static website, configured CORS, uploaded frontend.
- Commands summary: see `infra/README.md` Quick Start.
- Endpoints: backend https://eislaw-api-01.azurewebsites.net/docs, frontend https://eislawstweb.z39.web.core.windows.net/
- RBAC: Granted CI service principal Contributor on RG and Storage Blob Data Contributor on storage using `infra/grant_sp_roles.ps1` (device login as privileged user).
- After RBAC, blob upload via AAD works with `--auth-mode login`.
## 2025-10-31 – Cloud deploy status and next actions
- Azure CLI installed locally; this environment cannot run `az`, so we pivoted to ARM REST and local CLI guidance.
- Bicep fixed; provider registration needed: Microsoft.OperationalInsights, Microsoft.Insights, Microsoft.Web, Microsoft.Storage.
- Action left open: owner to run `az provider register … --wait` once (documented), then run group deployment commands in infra/README.md.
- Decision: proceed with app build locally and wire CI next to allow cloud work without owner intervention. Documented in Integrations/Infra.

9) WebApp session_start launched npm in wrong directory
- Symptom: Frontend window showed `npm ERR! enoent` for `C:\Users\USER\package.json` (no package.json) because the spawned console started in the user profile.
- Fix: Rewrote `C:\Coding Projects\EISLAW-WebApp\tools\session_start.ps1` to launch child consoles with explicit `-WorkingDirectory` for backend/frontend.
- Quick verify: Run `C:\Coding Projects\EISLAW-WebApp\session_start.bat`. Frontend should open at `http://localhost:5173/`. Optional probe: `node C:\Coding Projects\EISLAW-WebApp\tools\web_probe.mjs`.

10) MCP local API drift
- Symptom: `server.registerTool is not a function` (SDK API change), then `keyValidator._parse is not a function` on client call.
- Fix: Switched to `McpServer` and zod schemas in `tools/mcp-local/server.js`. Remaining zod parse error to be resolved by aligning tool registration to the SDK examples (`server.tool(...)`) or downgrading SDK.
- Status: TODO — will finalize and add a smoke test that calls `list_dir` and `open_path`.
11) MCP stdio server failing (zod schema mismatch)

2025-11-04 — Session Standardization (Launch + Parity)
- Canonical launchers
  - Local full session: `session_start.bat` (sets dev env, starts backend 8788 + frontend 5173, warms Outlook app-window, opens Clients).
  - Local light: `open_local.bat` (backend + Vite dev, opens Clients).
- Pre-flight checks (always)
  - Backend: `GET http://127.0.0.1:8788/health` → 200.
  - Frontend: `http://localhost:5173/#/clients` shows header “LOCAL”.
  - Secrets: `secrets.local.json` contains Graph and Airtable keys (client_id, client_secret, tenant_id; token, base_id).
- UI parity expectations
  - Clients actions visible: Open • Files • SP • Emails.
    - Files: server-first open via `/dev/open_folder`; fallback to SP link and copy-path toast.
    - Emails: Outlook opens in named window “EISLAW-OWA”; default is Search (`/mail/search?q=`), not latest deep-link.
  - Client view actions: “Airtable Search”, “Sync Airtable”, “Word Templates…”, “Open Emails (Search)”, WhatsApp.
  - Emails tab shows “Emails (Indexed)” list when index exists.
- New endpoints
  - `GET /email/by_client?name=&limit=&offset=` and `GET /email/search?q=&mailbox=&limit=&offset=` — paginated JSON.
- Standard tests
  - Backend: `python -m pytest -q` → passing.
  - UI: `npm run ui:test` → passing; includes indexed emails panel and clients list emails open.
- One-shot sync (Yael, last 90d)
  - Run: `python tools/email_sync_worker.py --participants yael@eislaw.co.il --since-days 90`
  - Expect JSON with `ok: true` and inserted count; DB at `clients/email_index.sqlite`.
  - View: Client “יעל שמיר” → Emails tab → “Emails (Indexed) — <count>”.
- Symptom: Client call returned “keyValidator._parse is not a function” / “Cannot read properties of null (_def)” when listing tools or calling a tool.
- Root cause: registerTool was passed ZodObject (z.object({...})) instead of a raw Zod shape; SDK wraps with z.object(inputSchema), causing invalid shape.
- Fix: Updated server to pass raw shapes (e.g., { path: z.string() }) for all tools; added stderr bootstrap logs and a smoke client.
- Files: tools/mcp-local/server.js, tools/mcp-local/test_client.js, tools/mcp-local/smoke.ps1.
- Quick test: node tools/mcp-local/test_client.js → prints TOOLS + CALL results.

13) SharePoint site/library defaults + Hebrew clients root
- Symptom: Unclear defaults for site path and clients root; occasional 404 resolving drive.
- Fix: Added docs/SHAREPOINT_CONNECTION.md with authoritative paths; set backend defaults to site_path=sites/EISLAWTEAM, library=Shared Documents, clients_root=לקוחות משרד, registry_path=System/registry.json.
- Verify: Call /sp/check to ensure Graph can resolve site/drive and that the clients root exists.

14) Testing protocols & autonomy
- Symptom: Ad‑hoc checks caused regressions and blank screens to slip through.
- Fix: Added formal testing protocols (docs/TESTING_PROTOCOLS.md) and WebApp test guide (EISLAW-WebApp/docs/TESTING.md). Standardized UI tests with Playwright and backend tests with pytest; CI workflow added.
- Policy (memorize): Before presenting any feature as “done”, run backend pytest and Playwright across Chromium/Firefox/WebKit + mobile, verify HTML/JUnit reports, and record anomalies here. Prefer testIDs for selectors and mock external calls in CI.
\n---
## Postmortem - 2025-11-05 (Email index + Outlook popup)
- Symptom: Emails (Indexed) consistently 0; rows not clickable; Outlook opened in LOCAL.
- Root cause: a stale FastAPI on 8788 without `/email/*` shadowed the updated app; UI auto‑opened Outlook on Emails tab.
- Fix:
  - Local backend moved to 8799 with an OpenAPI gate (restart if `/email/by_client` missing) in `tools/open_local.ps1`.
  - LOCAL mode suppresses Outlook (mailto/auto‑open disabled) in `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`.
  - UI fallback to `/email/search` by client email when primary link returns 0.
- Rules (memorize):
  - OpenAPI Gate: before accepting a running backend, GET `/openapi.json` and assert required endpoints exist; otherwise restart and BLOCK further work.
  - No-Outlook in LOCAL: never open Outlook/OWA or `mailto:` in LOCAL; verify via grep and Playwright (no `window.open` on Emails tab).
  - Index Assert: on zero results, check SQLite counts for participants and registry emails; run `tools/email_sync_worker.py` to backfill.

## 2025-11-06 - Airtable 422s: schema vs. data writes
- Symptom: Save Review and Approve & Publish returned HTTP 422 from Airtable.
- Root cause:
  - Data API writes attempted for columns that did not exist yet in the table; Airtable rejects unknown fields with 422.
  - Some Meta API field-creation payloads were incomplete (e.g., `singleSelect` without `options.choices`; checkboxes missing `options`).
- Fix applied:
  - Created/verified all required fields on `PRIVACY_REVIEWS` using Meta API helper.
    - File: `EISLAW System/tools/airtable_add_fields.py`
    - Added: `submission_id`, `form_id`, `submitted_at`, `status` (singleSelect), `reviewer`, `reviewed_at`, `email`, `contact_name`, `contact_phone`, `business_name`, `selected_level` (singleSelect), `selected_modules` (multi), `auto_selected_modules` (multi), `auto_level` (singleSelect), `level_overridden` (checkbox), `overrides_added`/`overrides_removed` (multi), `overrides_diff_json`, `override_reason`, `score_level` (singleSelect), `score_reg`/`score_report`/`score_dpo` (checkbox), `score_requirements` (multi), `is_correct_auto`/`is_correct_reviewed` (checkbox), `report_token_hash`, `report_expires_at`, `report_url`, `share_url`.
  - Included `options.choices` for selects and minimal `options` for checkboxes to avoid 422s.
  - Validated by upserting a test record and patching all Save/Publish fields via `tools/airtable_utils.py`.
- Scopes required: `schema.bases:read/write`, `data.records:read/write` (PAT confirmed).
- Test checklist:
  1) `python "EISLAW System/tools/airtable_add_fields.py"` → all fields present/skipped.
  2) Upsert test row with `submission_id` + minimal fields.
  3) Update with Save Review payload (multi-selects, selects, checkboxes).
  4) Update with publish fields: `report_token_hash`, `report_expires_at`, `report_url`, `share_url`.
- Lessons learned:
  - Always bootstrap schema before first data write; Data API will not create columns.
  - Seed choices for select/multi-select fields in schema.
  - Approve & Publish assumes an existing row; Save Review should upsert first.
- Keep the preflight script handy: `EISLAW System/tools/airtable_preflight.py` (read/create/delete sanity).

## 2025-11-08 – Outlook/OWA Search vs. Indexed Emails (Decision Log)
- Symptom: Direct Outlook/OWA search integration was unreliable for reviewer workflows.
  - OWA deep-links (`/mail/search?q=`) produced inconsistent results and sometimes opened the wrong mailbox/tab.
  - LOCAL mode blocked popups/OWA windows; opening Outlook from the UI caused disruptive focus changes.
  - Desktop Outlook automation not viable in this stack; security policies and LOCAL rules prevented stable control.
  - Microsoft Graph search options had caveats:
    - `/me/messages?$search="…"` requires `ConsistencyLevel: eventual`, limited relevance, and inconsistent behavior across tenants.
    - Advanced Graph “search/query” endpoints require extra permissions/consent; paging and throttling made UX laggy.
    - Delegated/device-flow tokens complicated local setup; application-only search not suitable for personal mailboxes.
- Decision: Use a local, lightweight email index for deterministic results and fast UI.
  - Implemented SQLite index (`clients/email_index.sqlite`) with minimal schema and pagination.
  - Backend endpoints:
    - `GET /email/by_client?name=&limit=&offset=` — ordered by `received` DESC.
    - `GET /email/search?q=&mailbox=&limit=&offset=` — subject/body preview search with optional mailbox filter.
  - LOCAL policy: “No-Outlook in LOCAL” — never auto-open Outlook/OWA; rely on the index and copy-to-clipboard fallbacks.
  - Fallback behavior: If client drill-down returns 0, UI falls back to `/email/search` by client email.
- Rationale: Keeps the review UI stable (no window popups), fast, and testable; avoids flaky OWA deep-links and cross-window issues.
- How to seed/test quickly:
  1) `python tools/email_sync_worker.py --participants <email> --since-days 90`
  2) `GET /email/by_client?name=<Client Name>&limit=10` → expect `total>0` and descending `received` order.
  3) `GET /email/search?q=<keyword>&mailbox=<user upn>` → verify `total` and pagination.
  4) In UI, open client → Emails (Indexed) panel shows list with correct counts.

## 2025-11-08 – Task Files (Canonical folder + Upload/Rename + Email attach)
- Implemented per-task canonical SharePoint folder and file management.
- Files saved with Hebrew-safe naming and DD.MM.YY suffix; DriveItem IDs stored for stability.
- Inline rename changes title and renames on SharePoint.
- “Current deliverable” is a pointer (no move/rename of the file).
- Email attach: saves EML (source-of-truth), optional PDF snapshot (stub), and attachments with short names; attachments linked to parent by metadata (mkey/graph ids).
- UI: Task modal → Files panel supports Upload, Rename, Set Current, Add email, Open.
- Verify:
  - Create task → upload Hebrew-named file → check SharePoint name + list entry.
  - Rename title → list updates and SharePoint reflects rename.
  - Attach email from indexed search → EML appears; attachments grouped under email.
  - Set Current on a DOCX → badge visible; pointer stored.

## 2025-11-08 - Task Files canonical model (phase 1)
- Added backend endpoints:
  - POST /tasks/create_or_get_folder
  - POST /tasks/{task_id}/files/upload
  - PATCH /tasks/{task_id}/files/{drive_id}/title
  - POST /tasks/{task_id}/deliverable/set_current
  - GET /tasks/{task_id}/files
  - POST /tasks/{task_id}/emails/attach (EML required; PDF best-effort, attachments via Graph when available)
- Added filename helpers: sanitize/truncate and effective-name generator (Hebrew-safe).
- Unit tests added: 	ests/unit/test_filename_utils.py (3 passed on local venv).
- UI: New Files panel embedded in Task modal (TaskFiles.jsx) wired to the new APIs.
- Notes: Email PDF rendering is stubbed (no renderer configured); attachments require Graph Mail.Read application perms.
## 2025-11-08 – Task Modal IDs/Actions + Design System seed
- Added canonical mapping of `data-testid` and `data-action` for Task Modal and related controls.
  - Spec: `docs/TaskManagement/FIGMA_TASK_MODAL_IDS.md`
  - Manifest template: `docs/TaskManagement/figma_new/2025-11-08/TaskModal.actions.json`
- Added design system seeds for reuse across Dashboard/Tasks/Privacy:
  - Tokens: `docs/DesignSystem/DESIGN_TOKENS.md`
  - Components: `docs/DesignSystem/COMPONENT_LIBRARY.md`
  - Template: `docs/DesignSystem/TASKS_TEMPLATE.md`
- Imported and built the new TSX handoff (vite build OK).
- Began wiring testids in existing app Task Modal (frontend). Outer modal `data-testid` added; remaining inline IDs/actions queued.
- Frontend wiring:
  - TaskModal.jsx: `data-testid` for modal, progress, task-list, subtask input/add, close-modal, owner row.
  - TaskFiles.jsx: `data-testid` for list, file row open/rename/set-current, email assets/search/attach, and `data-action` (file.open|rename|deliverable.set_current|email.open|email.attachment.open|email.search|email.attach).
  - Verified via ripgrep that all IDs/actions are present under `frontend/src/features/tasksNew`.
  - No runtime UI smoke executed here; app-level smoke to be added next with Playwright once test harness is available in this repo.

## 2025-11-08 – Figma Parity Modal (visual pass)
- Replaced Task modal with Figma-parity layout (header/progress, משימות, נכסים, פרטים) while preserving working flows (TaskFiles + OwnerSelect).
  - File: `frontend/src/features/tasksNew/TaskModal.jsx`
  - Toolbar for נכסים (קובץ/לינק/תיקייה/אימייל) added visually (placeholders; emits no backend calls yet).
- Styling uses tokens (`heading`, `subheading`, `card` classes; petrol/copper/cardGrey).
- Built frontend successfully via `vite build`.

Placeholders to wire next
- Priority chips, assignee badges, due chip and menu; tags add/remove; comments thread.
- Calendar sync: Graph event create (button stub present).
- Assets toolbar buttons to integrate with underlying TaskFiles flows.

How to verify
- Open any task → modal shows petrol header, copper progress, two columns with Hebrew headers, TaskFiles inside a card, Details as a card with Owner row.

Assumptions/Decisions
- Owner/Assignee IDs use internal `user.<kebab-slug>` (map to AAD IDs at runtime).
- Calendar sync enabled; default to signed-in Outlook calendar.
- Subtask assets remain under the task folder (prefix filenames for subtask context).

Next Steps (UI-ready gates)
1) Frontend wiring: add missing `data-testid` and `data-action` attributes to `frontend/src/features/tasksNew/TaskModal.jsx` and `TaskFiles.jsx` (priority/assignee menus, due confirm, tags add/remove, email open-in-outlook, asset delete action with id).
2) Playwright smokes: basic flows for add file/link/folder/email, due set, calendar sync, owner/assignee, tags, comments.
3) Verify UI parity: user can open a task, see Files panel actions, and perform each operation without console errors.

How to Verify
- Open a task → ensure modal renders with `data-testid="task-modal"`.
- Check Files panel shows upload/link/email actions and that email rows provide “Open in Outlook”.
- Confirm due-date can be set and calendar sync button is visible.
- Confirm owner/assignee menus show choices and persist on change.
## 2025-11-09 – Figma handoff drift → New Preview Bundle protocol
- Problem: Visual drift between Figma modal and app modal (legacy inline forms, Tailwind purge outside `frontend/src`, no shared IDs/actions contract).
- Decision: Designers deliver a runnable Preview Bundle per screen under `frontend/src/design/<screen>/` that uses our tokens, Tailwind, `lucide-react`, and `data-testid`/`data-action` per spec. Attach an actions JSON manifest.
- Docs:
  - Protocol: `docs/DesignSystem/FIGMA_HANDOFF_PROTOCOL.md`
  - IDs/actions: `docs/TaskManagement/FIGMA_TASK_MODAL_IDS.md`
  - Tokens/components/templates: `docs/DesignSystem/` (see DESIGN_TOKENS.md, COMPONENT_LIBRARY.md, TASKS_TEMPLATE.md)
- Next:
  1) Add `/design/task-modal` route and render the preview component.
  2) Once pixel-parity verified, swap live modal body with the preview component.
  3) Wire actions to APIs; leave placeholders documented.
  4) Add Playwright screenshot smoke to lock visual parity.

## 2025-11-09 – Task Modal integration (live UI)
- Replaced `frontend/src/features/tasksNew/TaskModal.jsx` with the new two-column layout (משימות / נכסים+פרטים) using live task data.
- Rebuilt assets panel (`TaskFiles.jsx`) with the toolbar (`tm.assets.add.file|link|folder|email`), SharePoint/Outlook actions, link modal, email attach modal, rename/set-current flows, and Outlook button (`email.open_in_outlook`). Actions reuse the existing SharePoint endpoints.
- TaskBoard now uses a generic `handleUpdate` (via `updateTaskFields`) so future metadata updates (priority/due/etc.) can persist without extra plumbing.
- Added “הוסף משימה +” trigger (wires to `task.add` placeholder), fixed “הוסף תת-משימה” button to refresh immediately, and implemented a local comment composer (textarea + “פרסם תגובה”).
- Task row action bar now matches Figma: permanent controls for “הגדר חשיבות”, “קבע תאריך”, “הוסף אחראי” (buttons emit `priority.open`, `due.open`, `assignee.open` and menus update local storage via `updateTaskFields`). Expand/collapse toggle shows or hides sub tasks.
- Comments: reply button now opens inline composer with “פרסם תשובה”/“ביטול”, likes show counts + toggle state, and “סמן כנפתר” toggles to a green “נפתר” badge.
- Outstanding placeholders: `task.add`, nested comments/replies, and future backend persistence for priority/due/tag (we currently update local storage only). Need server endpoints before wiring.
- How to verify:
  1. `npm run dev` → open any client → open a task modal.
  2. Assets tab shows the new toolbar + cards; uploading a file, adding a link, or attaching an email updates the list.
  3. Owner select updates and persists (TaskBoard refresh confirms).
  4. `/design/task-modal` still shows the preview bundle for parity reference.
## 2025-11-11 - Figma MCP bridge + channel join fix
- Scope: Re-establish TalkToFigma connectivity so Codex can annotate the Privacy report header inside Figma.
- Incident:
  - `TalkToFigma.get_selection` returned `Not connected to Figma` despite the desktop MCP server running at `http://127.0.0.1:3845/mcp`.
  - After enabling the server, commands still failed with `Must join a channel before sending commands`; plugin UI was missing because the manifest lacked Dev mode support, so no channel could be joined.
- Fix:
  - In `cursor-talk-to-figma-mcp`, ran `bun install`, created `.cursor/mcp.json` pointing to `bunx cursor-talk-to-figma-mcp@latest`, and launched the socket bridge via `bun socket` (PID 45248).
  - Updated `src/cursor_mcp_plugin/manifest.json` to include `"dev"` in `editorType`, re-linked the plugin in Figma, and set Image Source to Local server so the desktop bridge can serve assets.
  - From the plugin UI (and via the `join_channel` MCP tool), joined channel `0w59vxe2`; after that `get_selection` and `read_my_design` succeeded.
  - Added annotations on header nodes `1:48`, `1:50`, `1:55`, `1:60`, `1:65` documenting the questionnaire/metadata fields (`questionnaire.contact_name`, `report.meta.report_id`, etc.) that must populate each text block.
- Verification:
  - `TalkToFigma.get_selection` now reports `{selectionCount:1}` for `Modular RTL HTML Report`, and subsequent tool calls return full JSON.
  - Annotation payloads visible in Figma; future sessions can reuse or change the channel after following these setup steps.
## 2025-11-13 – Email sync/api-base QA hardening
- Issue: Client detail page (`ClientOverview.jsx`) always used the compile-time `VITE_API_URL` (defaulting to Azure), so even when `ClientsList` resolved a local backend the detail screen still called the wrong host. Result: `/api/client/summary`, `/email/by_client`, and `/email/sync_client` all failed and surfaced the generic “Email sync failed” alert.
- Fixes:
  1. Added `frontend/src/utils/apiBase.js` with shared detection/storage helpers (tries local ports 8788/localhost, Azure fallback, persists to `localStorage`).
  2. `ClientsList.jsx` now seeds its API base from storage, uses the helper for detection, and writes back once a healthy backend responds.
  3. `ClientOverview.jsx` reads the stored base, re-detects when missing, and re-runs `loadSummary`/email sync against the resolved host. This keeps SOLID parity with the desktop registry (same API endpoints, no divergent assumptions).
- QA / Tools:
  - `pwsh tools\mcp-local\smoke.ps1` (filesystem/shell/browser MCP availability).
  - Verified `/email/sync_client` via `Invoke-WebRequest` (PowerShell) on both 8788/8799.
  - `npm run build` (Vite) + `npm run ui:test -- tests/clients.spec.ts` (Playwright, headless, new spec asserts the “Open” button + API base usage).
- Result: Email sync now targets the same backend as the clients list, no more stuck loading states, and the MCP browser probe / automated tests confirm the UI shows “Open | Reply | Forward” after refresh.
## 2025-11-13 – API base detection + Outlook open hardening
- Added `frontend/src/utils/apiBase.js` detection helpers. Wired App chrome, Clients list, and Client detail views to reuse the resolved backend URL (stores in localStorage, probes localhost 8788/8799, Azure fallback). Now the FE env badge flips to LOCAL when the backend is up and the BE version shows correctly.
- Updated the email "Open" button to reserve a popup window before fetching `/email/open`; once the Graph link arrives the window navigates to the exact Outlook item, avoiding browsers blocking delayed popups. Still falls back to the Outlook search path if the API can’t deliver a link.
- MCP/tooling: reran `tools\mcp-local\smoke.ps1`, manual PowerShell probes against `/email/open` and `/health`, Playwright UI smoke (`npm run ui:test -- tests/clients.spec.ts`), and `npm run build`.
- Result: Email sync + open now operate against the same backend the rest of the app uses, FE/BE version badges populate, and the Open action reliably launches Outlook even on machines with strict popup blockers (desktop parity preserved).
## 2025-11-13 – Outlook auto-open cleanup
- Removed the legacy “auto search” hook that opened a generic Outlook tab whenever you visited the Emails tab. The client view now only opens Outlook when the user clicks “Open”.
- Simplified the Open handler: no more placeholder `about:blank` window. We wait for `/email/open` to return the `webLink` and then open exactly one tab (or show the fallback path/alert if blocked). This prevents spare blank tabs and avoids the inbox homepage.
- Rebuilt + reran `npm run ui:test -- tests/clients.spec.ts` (Playwright) to ensure the Open action still renders, and `npm run build` for bundle parity.
## 2025-11-13 – Outlook "Open" UX fix
- Removed the legacy autop-open path entirely and reintroduced a popup placeholder only while the `/email/open` call is in-flight. If Graph returns a `webLink`, the placeholder tab is reused; if the call fails, we close it and fall back to the Outlook search path. No more extra inbox tabs or blank windows.
- Rebuilt (`npm run build`) and re-ran Playwright (`npm run ui:test -- tests/clients.spec.ts`) to confirm the Clients flow still renders the Open action and the popup logic doesn’t regress.
## 2025-11-13 – Outlook open window tweak
- Requirement: open each email in its own browser window (not a reused blank tab). Updated `ClientOverview.jsx` so clicking “Open” invokes `window.open(link, '_blank', 'noopener,noreferrer,resizable=yes,scrollbars=yes,width=1200,height=900')` directly when `/email/open` returns the Graph webLink. If no link exists we still show the saved `.eml` path and fall back to the Outlook search helper.
- QA: `npm run build` + `npm run ui:test -- tests/clients.spec.ts` passed (2 specs). Verified `/email/open` via PowerShell still returns the link.
## 2025-11-13 – Outlook open window placeholder
- Added a lightweight placeholder window when clicking “Open” so popup blockers allow the eventual Outlook navigation. The placeholder shows “פותח את המייל באאוטלוק…” while `/email/open` fetches the Graph link; once available we replace the placeholder’s location. If the call fails we close it and fall back to the previous search path.
- `npm run build` + `npm run ui:test -- tests/clients.spec.ts` confirm the flow still renders and the change doesn’t regress other screens.
## 2025-11-13 – MCP enforcement + desktop verification requirement
- Boot Manifest updated to enumerate every MCP server listed in `config.toml` (desktop-commander, Fetch, Browserbase, Puppeteer, Sequential Thinking, context7, deepwiki, TalkToFigma, Playwright MCP, WhatsApp, figma HTTP, filesystem, shell, local MCP bridge). Added explicit command to start/run all MCP servers (including desktop-commander) proactively at session start and to treat MCP failures as stop-gate blockers.
- Added mandate to capture desktop evidence via desktop-commander (or equivalent MCP) before declaring UI work complete. If desktop verification cannot run, the agent must stop and report the blocker.
- Context logged so future sessions do not require repeated user reminders about MCP usage or desktop verification.
## 2025-11-13 – Desktop Commander interaction blockers
- Attempting to run `npx -y @wonderwhy-er/desktop-commander --help` from the CLI leaves the process waiting for interactive input in a spawned cmd window; the agent must send the required keystrokes (e.g., Enter/Ctrl+C) or kill the window rather than leaving it stuck. Future sessions must remember this behavior so we don't wait on user input.
- Revised: do **not** call `--help`. Launch desktop-commander directly (`npx -y @wonderwhy-er/desktop-commander`) and handle any prompts yourself to avoid hanging the session.
## 2025-11-14 – Added screenshot MCP server
- Created `tools/mcp-screenshot/` (Node-based MCP using screenshot-desktop) and registered it in `~/.codex/config.toml` as `screenshot_local` (command: `node tools/mcp-screenshot/server.js`).
- Verified by running `node tools/mcp-screenshot/test_client.js`; captured PNG saved under `%TEMP%\eislaw-mcp-screens\screen-<timestamp>.png`.
- Boot Manifest updated to mention this server among the mandatory MCPs.
## 2025-11-14 – Email viewer window + MCP evidence
- Problem: “Open” in the client email tab still delegated to Outlook search, spawning blank inbox tabs and never showing the selected message. No self-serve HTML view existed for the `.eml` snapshot, so we could not verify locally without Outlook.
- Fixes:
  1. Backend: `/email/open` now always returns a `viewer` URL; added `_email_viewer_path`, `_absolute_url`, `_render_email_view_page()`, and a new `/email/viewer` endpoint for a sanitized HTML shell (with optional “Open in Outlook”). Added `tests/unit/test_email_viewer_page.py` to lock the helpers.
  2. Frontend: `openIndexedEmail` prefers the viewer window (Graph link if available, viewer otherwise) and no longer falls back to the Outlook search helper. Kept the inline modal as final fallback.
  3. MCP/manual: ran `open_loac.bat`, opened Edge on `#/clients/סיון-בנימיני?tab=emails` plus the viewer URL for message `AAMkAGYz…AAA=` and captured proof via `node tools\mcp-screenshot\test_client.js` → `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763105567928.png`.
- Tests:
  - `python -m pytest tests/unit/test_email_viewer_page.py`
  - `npm run build` (frontend)
  - `npm run ui:test -- tests/clients.spec.ts`
- Result: “Open” now launches a first-party viewer window that mirrors the design system, still links out to Outlook when available, and every run must attach MCP evidence before handoff.
## 2025-11-14 – Popup fallback + manual Outlook links
- Added `openAssist` state to `ClientOverview.jsx` so when browsers block the auto popup, the UI shows explicit “Open in Outlook / Open viewer” links per email plus an alert explaining why nothing opened. This uses the same `/email/open` response but guarantees the user always has a manual option.
- `openIndexedEmail` now records popup blockers, alerts the user, and stores the returned Outlook/web viewer URLs for manual use. We only show the inline modal automatically if every other path fails.
- QA: `npm run build` (frontend) and `npm run ui:test -- tests/clients.spec.ts`.
## 2025-11-14 – Outlook desktop launch + clipboard fallback
- `/email/open` now reuses `_launch_outlook_app()` so as soon as a Graph `webLink` is available the backend opens it via Edge-app (works for both new Outlook and classic). The response includes `desktop_launched` plus the viewer URL so the FE knows the attempt outcome.
- `ClientOverview.jsx` tries the server-launched Outlook first. If the browser popup is blocked, we copy the Outlook link to the clipboard (with an alert) and show a helper panel under the email row with “Open in Outlook / Open viewer” links and copy status. Inline modal is still the final safety net.
- Tests: `python -m pytest tests/unit/test_email_viewer_page.py`, `npm run build` (Vite), `npm run ui:test -- tests/clients.spec.ts` (Playwright).
- Verification: backend+frontend via `open_loac.bat`, manual open on סיון בנימיני → Emails tab, screenshot captured through `node tools\mcp-screenshot\test_client.js` → `%TEMP%\eislaw-mcp-screens\screen-1763110518317.png` showing the new fallback banner.
## 2025-11-14 – Streamlined email actions
- Requirement: “Open” created multiple browser/app windows. Replaced the auto-fallback flow with three explicit controls per email (viewer modal, Outlook launch, copy link) so nothing fires implicitly.
- Backend: `/email/open` now honors `launch_outlook` (default true) so copy-only requests don’t spawn Edge windows. Added `_bool_from_payload()` helper (unit-tested) to normalize the flag.
- Frontend: Dropped `openIndexedEmail` and reply/forward shortcuts. Each email now renders three buttons – Open in Viewer, Open in Outlook (server-only launch with alert fallback), Copy Outlook Link (clipboard helper). Removed popup placeholders and stateful fallbacks.
- Tests: `python -m pytest tests/unit/test_email_viewer_page.py`, `npm run build`, `npm run ui:test -- tests/clients.spec.ts`.
- Verification: ran `open_loac.bat`, opened סיון בנימיני › Emails, confirmed only the chosen action fires; captured desktop proof via `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763112917797.png`.

## 2025-11-14 – Client card sync + email tasking
- AddClientModal now supports edit mode (search suppressed, folder pill reflects existing mapping, summary mirrors draft edits) and reuses the same upsert flow to push edits to Airtable + the JSON registry.
- ClientOverview exposes a “Client Card” modal trigger, a hardened “Sync Airtable” button, attachment indicators beside each subject, and a “Create task” CTA that seeds TaskBoard entries via `addClientTask`/`updateTaskFields`.
- TaskFiles surfaces `email_meta` details (subject/from/received/attachments) plus viewer / Outlook / copy buttons, and includes a modal viewer so email assets can be audited in place; folder open now pipes through the backend helper instead of calling `API` from the row.
- Tests attempted:
  - `python3 -m pytest tests/unit/test_email_viewer_page.py` → **blocked** (Python runtime lacks `pip`/`pytest`; no installer available here).
  - `npm run build` → **blocked** (script not defined in root `package.json`).
  - `npm run ui:test -- tests/clients.spec.ts` → **blocked** (Playwright `webServer` command requires a `python` binary for `uvicorn`; only `python3` exists in this environment).
- Need either a `python` shim (or config change to use `python3`) plus pytest installation before these gates can run locally.
- Follow-up: confirmed the Windows venv at `.venv-az` already includes pytest; invoking `.\.venv-az\Scripts\python.exe -m pytest tests/unit/test_email_viewer_page.py` passes (WSL `python3` should be avoided for repo commands).
- 2025-11-15 follow-up: 
  - TaskFiles now hides/disables viewer/Outlook/copy buttons when `email_meta` is missing, surfaces a toast when legacy attachments lack metadata, and adds aria-labels to the attachment chips.
  - “Create task” CTA in `ClientOverview.jsx` still seeds the local TaskBoard but now notifies the backend via `POST /tasks/create_or_get_folder` (SharePoint folder + task meta) and emits `tasks:refresh` so TaskBoard instances reload automatically.
  - Tests: `.\.venv-az\Scripts\python.exe -m pytest tests/unit/test_email_viewer_page.py`, `cd frontend && npm run build`, `npm run ui:test -- tests/clients.spec.ts`. Manual verification captured via `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763144582341.png`.
- 2025-11-15 note: Airtable integrations must target the **Clients view** (`tblokUYGtEEdM76Nm / viw34b0ytkGoQd1n3`). The Privacy Reviews view (`tblEKRjM7Z9zRRf6a / viwFafyTTI4HC7Yc5`) is dedicated to privacy scoring and must not be used for client registry sync or UI telemetry.
- 2025-11-15 – Dashboard overhaul (phase 1)
  - Added dropdown client picker, segmented CTA group (Add Client, Create Task, Sync Registry, Open SharePoint), and SharePoint/Graph status chips.
  - Introduced `DashboardEmails` widget with empty state + client quick link; unified “My Tasks” card (TasksPanel + “Open Task Board” CTA) and simplified activity feed placeholder.
  - Tests: `.\.venv-az\Scripts\python.exe -m pytest tests/unit/test_email_viewer_page.py`, `cd frontend && npm run build`, `npm run ui:test -- tests/clients.spec.ts`.
  - MCP evidence: `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763150708030.png`.
- 2025-11-15 – Clients tab toolbar/side rail refresh
  - Rebuilt the header action clusters (primary vs communications) with status pills for Airtable + SharePoint, added “View Tasks” shortcut, and ensured toolbar aligns with dashboard CTA styling.
  - Moved Word templates + contact form into a dedicated side rail; Word panel now fetches templates on-demand and contact card mirrors Airtable clients view before syncing.
  - Tests: `.\.venv-az\Scripts\python.exe -m pytest tests/unit/test_email_viewer_page.py`, `cd frontend && npm run build`, `npm run ui:test -- tests/clients.spec.ts`.
  - MCP evidence: `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763151831992.png`.

## 2025-11-15 – Dashboard client picker parity
- Scope: Dashboard “My Tasks” parity was blocked because the client dropdown always called the static `VITE_API_URL`, so in LOCAL mode (or when the env var pointed at a locked host) the list stayed empty and the TaskBoard never matched the client card.
- Changes:
  - `frontend/src/components/DashboardClientPicker.jsx` now accepts the resolved `apiBase`, re-fetches when it changes, aborts inflight calls on unmount, and disables the select until data arrives. When no base is available it keeps the dropdown empty to avoid stale data.
  - `frontend/src/pages/Dashboard/index.jsx` passes the detected API base into the picker so it reuses the same `/health` probing logic as the rest of the page.
- Verification:
  - `.\.venv-az\Scripts\python.exe -m pytest tests/unit/test_email_viewer_page.py`
  - `cd frontend && npm run build`
  - `npm run ui:test -- tests/clients.spec.ts`
  - Manual: `open_loac.bat`, Dashboard → select סיון בנימיני from the now-populated picker, confirm TaskBoard opens with the same controls as the client card; screenshot via screenshot MCP `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763154786952.png`.

## 2025-11-15 – Task owner UX review + Figma hand-off prompt
- Scope: Evaluate whether the existing task owner controls should stay or be removed, per user request.
- Findings:
  - OwnerSelect is hidden inside TaskCard “Details” blocks and duplicates inside Task Modal, conflicting with UX spec that owner chips live alongside status/due indicators.
  - Owners persist only in localStorage (`frontend/src/lib/owners.js`) so dashboard filters (“Me / Delegated”) do not work across machines; Add Owner inline form clutters the card and isn’t RTL-friendly.
  - Dashboard, Clients tab, and Task Modal all surface inconsistent controls, creating friction and misaligned state.
- Outcome:
  - Decided to keep owners but redesign: top-row owner pill, anchored popover for assignment, dedicated “Manage Owners” modal linked to Airtable “Clients” view, audit trail entry when changing owners.
  - Authored a three-iteration Figma AI prompt (see response in history) covering card, popover, modal, and Task Modal header updates with annotations for developers/testers.
  - Captured current UI evidence via `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763155139307.png`.
- Next steps:
  - UX team to produce updated components in `docs/TaskManagement/figma_new/2025-11-08`.
  - Engineering to sync owners with backend/Airtable, refactor OwnerSelect into chip+popover, and expand Playwright tests for owner assignment.

## 2025-11-15 – Figma reference assets workflow
- Issue: Figma AI prompts referenced `.fig` and screenshot assets that were not yet tracked in the repo, so each handoff stalled until files were found manually.
- Procedure now in place:
  - `docs/TaskManagement/figma_exports/` holds exported `.fig` files (add via File → Save local copy…).
  - `docs/TaskManagement/figma_references/` stores PNG/JPG snapshots (Dashboard, Task Modal, Clients). Initial set copied from existing Playwright/mcp screenshots: `dashboard_tasks_snap.png`, `task_modal_snap.png`, `clients_overview_smoke.png`.
  - Prompts must cite these paths explicitly so Figma AI can ingest them (“attach dashboard_tasks_snap.png from docs/TaskManagement/figma_references/”).
- Boot Manifest updated with this workflow so future sessions automatically create/drop references when `.fig` exports are missing.

## 2025-11-15 – Dashboard TaskBoard shows global tasks
- Scope: Dashboard “My Tasks” card only rendered when selecting a client, defeating the purpose of the dashboard view.
- Changes:
  - `frontend/src/features/tasksNew/TaskBoard.jsx`: now treats `clientName=null` as “global read-only” mode, shows an info banner, hides the composer, and passes `showClientBadge` down to `TaskCard`.
  - `frontend/src/features/tasksNew/TaskCard.jsx`: added optional client badge + “View client” link so dashboard rows reveal their owner and link back to the client card.
  - `frontend/src/pages/Dashboard/index.jsx`: always renders TaskBoard, adds helper copy, and toggles badges when no client filter is applied.
- Verification:
  - `.\.venv-az\Scripts\python.exe -m pytest tests/unit/test_email_viewer_page.py`
  - `cd frontend && npm run build`
  - `npm run ui:test -- tests/clients.spec.ts`
 - Manual: `open_loac.bat`, load Dashboard without selecting a client → task list visible with client chips; screenshot via `C:\Users\USER\AppData\Local\Temp\eislaw-mcp-screens\screen-1763213487062.png`.

## 2025-11-15 – Browserbase + Codex streaming SOP
- Pain: every new agent claims they cannot view the UI because Browserbase/Codex steps aren’t documented; setup took multiple attempts (missing env vars, dummy keys, no codex login).
- Fix:
  - Added `docs/Browserbase_Codex_Setup.md` documenting prerequisites, exact PowerShell commands, codex login flow, and troubleshooting.
  - Boot Manifest now references this SOP and mandates keeping the Browserbase MCP terminal open while Codex runs.
- Procedure (condensed):
  1. `secrets.local.json` must contain `browserbase.api_key` + `project_id`.
  2. In PowerShell: set `$env:BROWSERBASE_API_KEY`, `$env:BROWSERBASE_PROJECT_ID`, `$env:GEMINI_API_KEY`, then run `npx @browserbasehq/mcp-server-browserbase`.
  3. Run `codex login`, open the auth URL locally, confirm “Login successful.”
  4. Validate via `codex mcp list` (Browserbase enabled). Only then start remote inspections.
- Outcome: future agents can self-service Browserbase access; blockers should no longer reach the user unless credentials expire.

## 2025-11-15 – Airtable linking CTA on client card
- Issue: Legacy clients created before Airtable integration show “Airtable: Missing” with no way to link the record. “Sync Airtable” falsely reports success without a remote record.
- Fix:
  - Added `LinkAirtableModal` (searches `/airtable/search`, lets the user select a record, then posts to `/airtable/clients_upsert` + `/registry/clients` to store `airtable_id` and URL).
  - “Airtable: Missing” badge is now a Link button; `Sync Airtable` prompts for linking when no `airtable_id` is present.
  - Linking after hitting Sync automatically replays the sync once the record is connected.
- Verification:
  - Frontend build: `cd frontend && npm run build`.
- Manual: open client without Airtable link, click the badge, link a record, ensure badge turns green and Sync now runs without warnings.

## 2025-11-18 – Airtable contacts upsert pipeline (contacts view)
- Issue: `/airtable/contacts_upsert` returned 500s; root causes were (a) contact field discovery missing the Hebrew “שם איש קשר” column, so Airtable rejected unknown field names, and (b) a local helper `_airtable_create` name collision that masked the real create function.
- Fix:
  - Updated contact field discovery to explicitly include “שם איש קשר” for name, along with “מייל”, “טלפון”, “לקוח”, etc., so empty tables still map required fields.
  - Removed the helper override and kept the proper `_airtable_create` path for create/update; added a temporary debug to confirm field mapping during the fix (now removed).
- Verification (local API on 8801):
  - Added test contact under רני דבוש (Name: איתן שמיר, Email: eitan@eislaw.co.il, Phone: 0525903675) → success. Created Airtable record `rec52amHcyA7yaLgB` in “אנשי קשר נוספים” linked to client `recTX3GWmVmbAIaea`.
  - Removed the test contact from Airtable (deleted `rec52amHcyA7yaLgB`) to leave no residue.
- Notes/Next: When running the normal stack (8799 + frontend), UI “Add Contact” should now write to Airtable correctly provided the backend is running. If contact add fails again, check Airtable schema changes first (link/name/email columns). 

## 2025-11-20 – Backend containerization
- Issue: Zip deploy kept missing native deps and Azure Identity modules, causing `/health` to return 503. Needed a reproducible packaging path before the SaaS pilot.
- Actions:
- Added `opencensus-ext-azure`, `azure-identity`, `azure-core`, and `cryptography==44.0.3` to backend requirements.
- Built Docker image via `Dockerfile.api` and pushed to new Azure Container Registry `eislawacr` (tag `privacy-api:2025-11-20`).
- Switched App Service `eislaw-api-01` to run the container (`linuxFxVersion=DOCKER|eislawacr.azurecr.io/privacy-api:2025-11-20`) and set `WEBSITES_PORT=8799`.
- `curl https://eislaw-api-01.azurewebsites.net/health` → 200.
- Lesson: dashboard "Graph/SharePoint offline" and empty Clients/Privacy can be caused by CORS missing the active frontend host. Added VM host to `DEV_CORS_ORIGINS` in compose and set `/graph/check` to use app creds; add CORS host checklist to runbooks to avoid recurrence.
- Notes/Next: Wire GitHub Action for container builds/push + slot swap; add Application Insights exporter verification inside the container.

## 2025-12-03 – SharePoint integration + Graph API lessons
- **Scope:** Add SharePoint folder linking to client cards; fix email search for Hebrew client names.
- **Key lessons learned:**
  1. **Graph API `$filter` + `$search` limitation:** Cannot use both together. When searching emails, must use search syntax only (e.g., `$search="from:{email} AND received>=2025-01-01"`) without `$filter` parameter.
  2. **Hebrew encoding in Graph API:** Hebrew names arrive corrupted (`???? ???????`) when sent via POST body to `$search`. Solution: Search by email addresses instead of client names – first look up the client in the local registry to get their emails, then search using `from:{email} OR to:{email}`.
  3. **SharePoint site targeting:** The `get_sharepoint_site_id()` function must specifically look for "EISLAW OFFICE" / "EISLAWTEAM" site (where client folders live), not just any site with "eislaw" in the name.
  4. **Field name mapping (frontend/backend):** Frontend expects `sharepoint_url`, `airtable_id`, `folder`; registry stores `sharepoint_url`, `airtable_id`, `folder`. The `find_local_client_by_name()` helper must return these exact field names.
  5. **Badge logic:** `sharepointLinked` should check `sharepoint_url` (SharePoint web URL), not `folder` (local Windows path). Fixed in `ClientOverview.jsx:59`.
- **New endpoints added:**
  - `GET /api/sharepoint/sites` – Lists all SharePoint sites
  - `GET /api/sharepoint/search?name=<client>` – Searches for client folder
  - `POST /api/sharepoint/link_client` – Links folder and updates registry with `sharepoint_url`
  - `GET /api/client/summary` – Returns client with correct field names for frontend
  - `GET /email/by_client` – Returns emails for EmailsWidget
- **Verification:** סיון בנימיני now has:
  - 11 emails found (searching by `sivan@thepowerskill.com` and `sisivani@gmail.com`)
  - SharePoint folder linked: `https://eislaw.sharepoint.com/sites/EISLAWTEAM/Shared%20Documents/לקוחות%20משרד/סיון%20בנימיני`
  - Both badges (Airtable + SharePoint) show green in UI
- **Files modified:**
  - `backend/main.py` – Added SharePoint endpoints, fixed email search, added `/api/client/summary` and `/email/by_client`
  - `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx` – Changed `sharepointLinked` logic, updated `openFolderKpi()` and `ensureLocations()`

## 2025-12-01 – User preference: Always use hot-reload development mode
- **Preference:** User wants to always work in hot-reload mode during development (never rebuild containers for code changes).
- **Setup:**
  - Use `docker-compose -f docker-compose.dev.yml up -d` on the Azure VM (`20.217.86.4`).
  - Frontend runs on port **5173** (Vite dev server with HMR).
  - API runs on port **8799** with `--reload` flag (auto-restarts on file changes).
  - Code is volume-mounted, so edits on the VM apply immediately.
- **CORS requirement:** Must include `http://20.217.86.4:5173` and `http://20.217.86.4:8080` in `backend/main.py` origins list for external browser access.
- **Access URLs:**
  - Frontend: `http://20.217.86.4:5173`
  - API: `http://20.217.86.4:8799`
- **Key files:**
  - `docker-compose.dev.yml` – hot-reload stack config
  - `backend/main.py` – CORS origins list
- **Lesson:** When switching to dev mode, always verify CORS includes the VM's external IP + port, otherwise browser requests will fail silently.
