# EISLAW Flow Launcher Plugin (local)

Action keyword: `ei`

Commands:
- `ei health` — check backend health.
- `ei clients <name>` — open client card in browser.
- `ei sync <name>` — POST `/email/sync_client` with `since_days: 90`.
- `ei reindex` — POST `/email/reindex_search` to refresh Meilisearch index.
- `ei search <term>` — search emails (uses `/email/search`, Meili-backed when running) and open client emails tab.
- `ei grafana` / `ei prom` / `ei meili` — open dashboards.

Config (env vars, optional):
- `EISLAW_API_URL` (default `http://127.0.0.1:8799`)
- `EISLAW_FRONT_URL` (default `http://localhost:5173`)

Install (Flow Launcher):
1. Copy `tools/flowlauncher/eislaw` folder into your Flow Launcher Plugins directory.
2. Ensure Python + requests available (uses system Python).
3. Trigger with `ei` in Flow Launcher.
