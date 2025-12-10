# Agent Orchestration Status

**Document ID:** AGENT_ORCHESTRATION_STATUS
**Last Updated:** 2025-12-10
**Owner:** Joe (CTO)

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [AGENT_BIBLE.md](AGENT_BIBLE.md) | CLI spawn patterns, wait semantics, anti-patterns |
| [PRD_AGENT_FRAMEWORK_LANGFUSE.md](PRD_AGENT_FRAMEWORK_LANGFUSE.md) | Microsoft Agent Framework + Langfuse PRD |
| [ORCHESTRATION_SYSTEM.md](ORCHESTRATION_SYSTEM.md) | Joe as router architecture |
| [PRD_AOS_005_AGENT_TASK_FLOW.md](PRD_AOS_005_AGENT_TASK_FLOW.md) | TEAM_INBOX workflow rules |
| [RESEARCH_MASTER_AGENT_ORCHESTRATION.md](RESEARCH_MASTER_AGENT_ORCHESTRATION.md) | Framework comparison research |
| [TEAM_INBOX.md](TEAM_INBOX.md) | Current task assignments |

---

## 1. Current State (What Works TODAY)

### 1.1 CLI-Based Agent Spawning (PRODUCTION)

**Status:** ✅ Fully operational

Joe spawns agents via bash commands:
```bash
claude -p "You are Alex. Check TEAM_INBOX for task CLI-009." --tools default --dangerously-skip-permissions
```

| Component | Status | Details |
|-----------|--------|---------|
| Joe (Orchestrator) | ✅ Working | Parses requests, spawns agents, waits for results |
| Agent spawning | ✅ Working | Claude CLI with `--dangerously-skip-permissions` |
| TEAM_INBOX workflow | ✅ Working | Tasks assigned, agents read, output written |
| Jacob reviews | ✅ Working | All work reviewed before completion |
| Parallel execution | ✅ Working | Multiple agents via `&` + `wait` |

### 1.2 Microsoft Agent Framework POC (IN PROGRESS)

**Status:** 🔄 Phase 2 complete, Phase 3 ready

| Component | Status | URL/Location |
|-----------|--------|--------------|
| Langfuse (Observability) | ✅ Running | http://20.217.86.4:3001 |
| Orchestrator Container | ✅ Running | http://20.217.86.4:8801 |
| Orchestrator Health | ✅ Working | `/health` returns JSON |
| Langfuse API Keys | ✅ Configured | Keys in .env.local |
| Agent Definitions | ✅ Implemented | `agents.py` - Alex + Jacob (AOS-024) |
| Workflow Engine | ✅ Implemented | `workflow.py` - POC workflow (AOS-025) |
| Langfuse Tracing | 🟢 Ready | AOS-026 (next task) |

### 1.3 CLI Enhancement via MCP Integration (COMPLETE)

**Status:** ✅ Phase 1 complete (78%), Phase 2 complete (78%)

**Project Goal:** Bring Claude CLI and Codex CLI to IDE-level capabilities via Model Context Protocol (MCP) servers.

**Business Value:**
- **Cost savings:** $20/month (Claude Plus) vs $200/month (Claude Pro) = **$180/month savings**
- **Extended capabilities:** CLI agents gain filesystem access, database querying, GitHub operations, browser automation, memory context, Docker management
- **Hybrid strategy:** Use best CLI for each task type (Claude for filesystem/browser, Codex for DB/GitHub/cost-efficient tasks)

| Component | Status | Details |
|-----------|--------|---------|
| **Claude CLI MCP** | ✅ **78% functional** | 7/9 MCP servers working (Phase 1 complete) |
| **Codex CLI MCP** | ✅ **78% functional** | 7/9 MCP servers working after CLI-CDX-002-FIX |
| **Documentation** | ✅ **Complete** | CLAUDE.md §1b updated with Codex MCP config (CLI-CDX-003) |
| **Testing** | 🟢 Ready | CLI-MCP-004 and CLI-CDX-004 unblocked |
| **Integration** | 🟢 Ready | Phase 3 can proceed |

#### MCP Servers Status Matrix (Updated 2025-12-10)

| MCP Server | Claude CLI | Codex CLI | Package Name | Notes |
|------------|-----------|-----------|--------------|-------|
| **Filesystem** | ✅ Working | ✅ Working | `@modelcontextprotocol/server-filesystem` | Schema errors on Codex (use shell fallback) |
| **Fetch** | 🟡 Partial | ✅ Working | `mcp-fetch-server` | Fixed: was using wrong package name |
| **PostgreSQL** | ✅ Working | ✅ Working | `@modelcontextprotocol/server-postgres` | Read-only queries (`eislaw_readonly` user) |
| **SQLite** | ✅ Working | ✅ Working | `mcp-server-sqlite-npx` | Fixed: was using wrong package name |
| **GitHub** | 🟢 Configured | ✅ Working | `@modelcontextprotocol/server-github` | Classic PAT configured |
| **Playwright** | 🟡 Partial | ❌ Timeout | `@ejazullah/mcp-playwright` | 60s timeout on Codex |
| **Sequential Thinking** | 🟢 Configured | ✅ Working | `@modelcontextprotocol/server-sequential-thinking` | Task breakdown |
| **Memory** | ✅ Working | ✅ Working | `@modelcontextprotocol/server-memory` | Context store/recall |
| **Docker** | ✅ Working | ❌ Handshake | `mcp-docker` | Use shell `docker` commands on Codex |

**Success Rates:**
- **Claude CLI:** 78% (7/9 servers working or configured)
- **Codex CLI:** 78% (7/9 servers working) - **Improved from 33%!**

#### Root Causes Fixed (CLI-CDX-002-FIX)

| Root Cause | Fix Applied |
|------------|-------------|
| Wrong npm package names | `mcp-server-sqlite-npx`, `mcp-fetch-server` (NOT `@modelcontextprotocol/*`) |
| TOML env var interpolation | Hardcoded values (TOML doesn't support `${VAR}`) |
| Incorrect file paths | WSL paths (`/mnt/c/...`) instead of VM paths |
| Missing explicit npx path | Changed `npx` to `/usr/bin/npx` |

**Config Location:** `~/.codex/config.toml` (see CLAUDE.md §1b for full configuration)

**Recommended Hybrid Strategy:**
- **Use Codex for:** PostgreSQL/SQLite queries, GitHub ops, Memory, Sequential Thinking, Fetch (cheaper)
- **Use Claude for:** Filesystem (schema errors on Codex), Playwright, Docker (failures on Codex), complex reasoning

---

## 2. Implementation Progress

### Phase 1: POC Infrastructure (Jane)

| Task | Description | Status |
|------|-------------|--------|
| AOS-019 | Install Langfuse on VM | ✅ Done - v3.138.0 at :3001 |
| AOS-020 | Create Dockerfile.orchestrator | ✅ Done |
| AOS-021 | Create requirements-orchestrator.txt | ✅ Done |
| AOS-022 | Update docker-compose.yml | ✅ Done |
| AOS-022a | Start orchestrator container | ✅ Done - healthy on :8801 |
| AOS-022b | Configure Langfuse keys | ✅ Done - keys in .env.local |

### Phase 2: POC Backend (Alex)

| Task | Description | Status | Blocker |
|------|-------------|--------|---------|
| AOS-023 | Orchestrator scaffold + config.py | ✅ Done - Jacob approved | - |
| AOS-024 | Alex + Jacob agent definitions | ✅ Done - agents.py complete | AOS-023 ✅ |
| AOS-025 | POC workflow (Alex → Jacob) | ✅ Done - workflow.py complete | AOS-024 ✅ |
| AOS-026 | Langfuse tracing integration | 🟢 Ready | AOS-025 ✅ |

### Phase 3: POC Validation (Eli + Jacob)

| Task | Description | Status | Blocker |
|------|-------------|--------|---------|
| AOS-027 | Run POC + acceptance tests | ⏳ Pending | AOS-026 |
| AOS-028 | Jacob skeptical review | ⏳ Pending | AOS-027 |

### Phase 4: Full Implementation

> Planned after Phase 3 completes. Will include:
> - All 8 agent definitions (Joseph, Alex, Maya, Jacob, Eli, David, Noa, Jane)
> - TEAM_INBOX auto-update integration
> - Escalation webhooks
> - Complex workflow patterns

---

## 3. Services & Endpoints

### 3.1 Current Services

| Service | Port | Health Check | Status |
|---------|------|--------------|--------|
| API (FastAPI) | 8799 | `GET /health` | ✅ Running |
| Frontend (Vite) | 5173 | N/A | ✅ Running |
| Meilisearch | 7700 | `GET /health` | ✅ Running |
| Langfuse | 3001 | `GET /api/public/health` | ✅ Running |
| Orchestrator | 8801 | `GET /health` | ✅ Running |
| Grafana | 3000 | SSH tunnel only | ✅ Running |

### 3.2 Orchestrator API Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/health` | Health check | ✅ Implemented |
| GET | `/` | Service info | ✅ Implemented |
| GET | `/status` | Detailed config status | ✅ Implemented |
| GET | `/agents` | List available agents | ✅ AOS-024 |
| GET | `/agents/{name}` | Get agent details | ✅ AOS-024 |
| POST | `/workflow/poc` | Run Alex→Jacob POC (sync) | ✅ AOS-025 |
| POST | `/workflow/poc/async` | Run POC async | ✅ AOS-025 |
| GET | `/workflow/{task_id}` | Get workflow status | ✅ AOS-025 |
| GET | `/workflows` | List all workflows | ✅ AOS-025 |

### 3.3 Langfuse Dashboard

**URL:** http://20.217.86.4:3001

**Metrics to Track (after AOS-026):**
- Token usage per agent per task
- Cost per workflow
- Latency (time to completion)
- Success/failure rate
- Trace replay for debugging

---

## 4. Agent Roster

| Agent | Role | Model | Status |
|-------|------|-------|--------|
| **Joe** | CTO/Orchestrator | Claude Opus | ✅ Active (CLI) |
| **Jacob** | Skeptical Reviewer | Claude Opus | ✅ Active (CLI) |
| **David** | Product Manager | Claude Opus | ✅ Active (CLI) |
| **Alex** | Senior Backend | Sonnet/Codex | ✅ Active (CLI) |
| **Maya** | Senior Frontend | Sonnet/Codex | ✅ Active (CLI) |
| **Joseph** | Database Dev | Sonnet/Codex | ✅ Active (CLI) |
| **Sarah** | UX/UI Designer | Sonnet/Codex | ✅ Active (CLI) |
| **Eli** | QA Engineer | Sonnet/Codex | ✅ Active (CLI) |
| **Jane** | DevOps | Sonnet/Codex | ✅ Active (CLI) |
| **Noa** | Legal/Copy | Claude Opus | ✅ Active (CLI) |

**Framework Status:** All agents work via CLI spawning. Framework-based definitions in AOS-024.

---

## 5. Blocking Issues

### Current Blockers

| Blocker | Impact | Owner | Action |
|---------|--------|-------|--------|
| *None* | Phase 1 complete | - | Alex can start AOS-023 |

### Recently Resolved

| Issue | Resolution | Date |
|-------|------------|------|
| Langfuse keys not configured | CEO created project, keys added to .env.local | 2025-12-09 |
| Orchestrator container not started | Jane ran `docker-compose-v2 up -d orchestrator` | 2025-12-09 |
| LangSmith cost concerns | CEO decided Langfuse (self-hosted, $0) | 2025-12-09 |

---

## 6. Next Steps

### Phase 2: Alex Implementation (COMPLETE)

1. ~~**AOS-023:** Alex creates orchestrator scaffold with config.py~~ ✅ Done
2. ~~**AOS-024:** Alex implements Alex + Jacob agent definitions~~ ✅ Done
3. ~~**AOS-025:** Alex implements POC workflow~~ ✅ Done
4. **AOS-026:** Alex adds Langfuse tracing 🟢 READY

### Phase 3: Validation

5. **AOS-027:** Eli runs acceptance tests (blocked by AOS-026)
6. **AOS-028:** Jacob reviews POC (blocked by AOS-027)

---

## 7. Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT STATE (CLI)                       │
│                                                              │
│   CEO → Joe → claude -p "You are Alex..." → Agent executes  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Migration (AOS-019 to AOS-028)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FUTURE STATE (Framework)                  │
│                                                              │
│   CEO → Joe → Orchestrator API → Workflow Engine → Agents   │
│                       │                                      │
│                       ▼                                      │
│                  Langfuse (traces, metrics, replay)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Cost Summary

| Component | Current | After Migration |
|-----------|---------|-----------------|
| CLI Spawning | Claude API costs | Same |
| Observability | None | $0 (Langfuse self-hosted) |
| Framework | None | $0 (open source) |
| **Total Additional** | - | **$0/month** |

---

## 9. Acceptance Tests (POC)

| ID | Test | Status |
|----|------|--------|
| AF-001 | Orchestrator /health returns 200 | ✅ Pass |
| AF-002 | Langfuse /api/public/health returns OK | ✅ Pass |
| AF-003 | Langfuse web UI accessible | ✅ Pass (http://20.217.86.4:3001) |
| AF-004 | Langfuse keys configured | ✅ Pass |
| AF-005 | Alex agent defined with tools | ✅ Pass (AOS-024) |
| AF-006 | Jacob agent defined with tools | ✅ Pass (AOS-024) |
| AF-007 | Workflow routes APPROVED→complete | ✅ Pass (AOS-025 - route_after_review) |
| AF-008 | Workflow routes NEEDS_FIXES→retry | ✅ Pass (AOS-025 - route_after_review) |
| AF-009 | Traces visible in Langfuse | ⏳ AOS-026 |

---

*This document is the single source of truth for agent orchestration implementation status.*
*For task assignments, see [TEAM_INBOX.md](TEAM_INBOX.md).*
