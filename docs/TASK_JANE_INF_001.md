# TASK_JANE_INF_001_HOT_RELOAD_ORCHESTRATOR

> **Template Version:** 1.0 | **Created:** 2025-12-11
> **Purpose:** Enable hot reload for orchestrator container

---

## Assignment

| Field | Value |
|-------|-------|
| **Task ID** | INF-001 |
| **Agent** | Jane |
| **Status** | 🔄 In Progress |
| **PRD/Spec** | CLAUDE.md §3 (Hot Reload Rule) |
| **Output Doc** | `docs/TASK_JANE_INF_001_OUTPUT.md` |
| **Branch** | `feature/INF-001` |
| **CLI** | Codex |

---

## CLI Selection & Limitations

| Item | Value |
|------|-------|
| **Primary CLI** | Codex (free, unlimited) |
| **Fallback** | Gemini 2.5 Flash API ($0.30/$2.50) |
| **Reason** | Simple docker-compose.yml modification - perfect for Codex |
| **Known Limitations** | Docker MCP may fail, but shell commands work |
| **Fallback Trigger** | If Docker MCP fails, use shell docker-compose commands |

---

## Requirements

Enable hot reload for the `orchestrator` container so that code changes in `backend/orchestrator/` are reflected without rebuilding.

**Current State:**
- `web-dev` container: ✅ Has hot reload (Vite HMR)
- `api` container: ✅ Has hot reload (`uvicorn --reload`)
- `orchestrator` container: ❌ No hot reload

**What to Change:**
1. Locate the orchestrator service definition in `docker-compose.yml` (on Azure VM: `~/EISLAWManagerWebApp/docker-compose.yml`)
2. Add `--reload` flag to the uvicorn command
3. Ensure the volume mount for `backend/orchestrator/` is correct

**Expected Command:**
```yaml
command: uvicorn backend.orchestrator.main:app --host 0.0.0.0 --port 8801 --reload
```

---

## Acceptance Criteria

- [ ] `docker-compose.yml` updated with `--reload` flag for orchestrator service
- [ ] Orchestrator container restarts with new command
- [ ] Code changes in `backend/orchestrator/` trigger auto-reload
- [ ] No build required after Python file changes

---

## Technical Context

**Files to Modify:**
- `docker-compose.yml` (orchestrator service section)

**VM Location:**
- `~/EISLAWManagerWebApp/docker-compose.yml`

**Testing:**
1. SSH to VM
2. Edit `backend/orchestrator/agents.py` (add a comment)
3. Check orchestrator logs - should see "Detected file change, reloading..."
4. No manual restart needed

---

## Completion Checklist (REQUIRED)

### Code & Testing
- [ ] `docker-compose.yml` modified
- [ ] Changes synced to VM
- [ ] Orchestrator container restarted
- [ ] Hot reload verified (file change triggers reload)

### Git (Agent Checklist)
- [ ] On feature branch `feature/INF-001`
- [ ] All changes saved locally

### Documentation
- [ ] Update CLAUDE.md §3 table (mark orchestrator as ✅ Yes)

### Handoff
- [ ] Completion message posted to TEAM_INBOX "Messages TO Joe"
- [ ] Ready for Jacob review

---

## Completion Report

*Fill this section when task is complete*

### Summary
{Describe what was done}

### Files Changed
- `docker-compose.yml` - {what changed}

### Docs Updated
- `CLAUDE.md` - {update hot reload table}

### Test Results
{Show logs confirming hot reload works}

### Notes for Reviewer
{Any context for Jacob}

---

*See CLAUDE.md §3 for Hot Reload Rule context*
