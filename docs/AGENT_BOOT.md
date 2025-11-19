<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Agent Boot (Session Start)

Use this lightweight routine to get up-to-speed and pick up exactly where we left off.

1) Open the index: `docs/README.md`.
2) Skim current state: `docs/WORKING_MEMORY.md`.
2.1) Run readiness checklist: `docs/SESSION_READINESS.md` (and execute any missing steps).
3) Review short queue: `docs/NEXT_ACTIONS.md`.
4) If touching Privacy module:
   - Mapping IDs: `docs/fillout_field_mapping.json`.
   - Rules/spec: `docs/Security_Scoring_Spec.md`.
   - Episodic incidents: `docs/Testing_Episodic_Log.md`.
   - UX/UI Controls Map: `docs/UX_UI/Controls_Map.md` (verify buttons + test IDs before UI work).
   - Task Files flow: see `docs/Testing_Episodic_Log.md` (2025-11-08 entry) and `docs/PrivacyExpress/PROJECT_OVERVIEW.md` (Task Files section).
   - Tools to run:
     - Pull & score: `tools/fillout_fetch_and_score.py`.
     - Compose email text: `tools/security_email_compose.py`.
     - Word review flow: `tools/make_word_review_example.ps1`, `tools/word_apply_selection.ps1`.
5) Confirm secrets present: `../secrets.local.json`.
6) Preflight any NEW integration or scope change:
   - Run a small connectivity test first (e.g., Graph list-test, Fillout fetch 1 item).
   - If consent/permissions are needed, PAUSE and request approval; do not loop.
7) If increased autonomy is helpful (desktop actions / shell / browser checks):
   - Consult MCP discovery: `docs/MCP_SOURCES.md` and `docs/MCP_BRIDGE.md`.
   - Prefer local-only MCP servers with shared secret. If suitable server exists, propose install using the bridge script.
   - Default local MCP available: `tools/mcp-local/server.js` (auto-start via `tools/mcp_bridge_setup.ps1`).
   - Figma Desktop MCP probe: `tools/figma_mcp_probe.ps1` (expects Dev Mode + server at http://127.0.0.1:3845/mcp).
7) If ready to send results, choose review path (Word or Airtable) per `docs/Integrations.md`.

When done this session, update:
- `docs/WORKING_MEMORY.md` (state + pointers)
- `docs/NEXT_ACTIONS.md` (queue)
- `docs/Testing_Episodic_Log.md` (any incidents)
