### Summary
- Added `--reload` to the orchestrator's `uvicorn` command in `docker-compose.yml` so Python file changes reflect immediately without rebuilds.
- Confirmed the backend source mount remains `./backend:/app/backend:ro`, satisfying the hot reload watcher requirement.
- Updated both `CLAUDE.md` and `AGENTS.md` hot-reload tables to mark the orchestrator container as ✅ working.

### Files Changed
- `docker-compose.yml` – added `uvicorn backend.orchestrator.main:app --host 0.0.0.0 --port 8801 --reload` command for the orchestrator service.
- `CLAUDE.md` – updated Hot Reload Rule table entry for `orchestrator` to ✅.
- `AGENTS.md` – mirrored the Hot Reload Rule table update per sync rule.

### Docs Updated
- `CLAUDE.md` §3 Hot Reload Rule now lists the orchestrator container as hot-reload enabled.
- `AGENTS.md` mirrors the same status per documentation sync requirements.

### Test Results
- Not run locally; VM containers not available in this environment. After syncing changes to `~/EISLAWManagerWebApp`, run `/usr/local/bin/docker-compose-v2 up -d orchestrator && /usr/local/bin/docker-compose-v2 logs -f orchestrator` while editing a file in `backend/orchestrator/` to confirm uvicorn reports "Detected file change".

### Notes for Reviewer
- Please deploy the updated `docker-compose.yml` to the Azure VM (`feature/INF-001` branch) and restart only the orchestrator service so existing containers remain untouched.
- Once restarted, touch `backend/orchestrator/agents.py` (e.g., add/remove a comment) to verify uvicorn reload behavior as described above.
