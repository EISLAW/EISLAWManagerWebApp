# Team Inbox

**Project:** EISLAW Manager Web App
**CTO:** Joe (AI Agent)
**Last Updated:** 2025-12-12

> **Looking for completed work?** See [TEAM_INBOX_ARCHIVE.md](TEAM_INBOX_ARCHIVE.md)
> **Looking for rules?** See [CLAUDE.md](../../CLAUDE.md) - all workflow, VM, Git rules are there
> **Looking for task template?** See [TASK_TEMPLATE.md](TASK_TEMPLATE.md)

---

## Project Overview

EISLAW is a Hebrew-language legal practice management system with:
- Client management (Airtable-synced)
- Privacy algorithm scoring
- AI Studio chat (Gemini/Claude/OpenAI)
- RAG-based document processing
- Task management

**Tech Stack:** React + Vite (frontend) | FastAPI + SQLite (backend) | Azure VM

**Live URL:** http://20.217.86.4:5173

---

## Current Sprint Status

| Status | Count |
|--------|-------|
| ✅ Completed | 90+ tasks |
| 🔄 In Progress | 5 |
| ⏸️ On Hold | 1 |

**Current Focus:** Agent Orchestration POC (AOS-024 to AOS-028)

---

## Active Tasks FROM Joe

> Only showing pending/in-progress tasks. For completed, see archive.

### Agent Orchestration POC (Phase 2-3)

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| AOS-024 | **Alex** | Implement Alex + Jacob agent definitions | ✅ DONE | `backend/orchestrator/agents.py` |
| AOS-025 | **Alex** | Implement POC workflow (Alex → Jacob) | ✅ DONE | `backend/orchestrator/workflow.py` |
| AOS-026 | **Alex** | Implement Langfuse tracing | 🟢 READY | `backend/orchestrator/langfuse_integration.py` |
| AOS-027 | **Eli** | Run POC + acceptance tests | 🔄 NEW (blocked by AOS-026) | `POC_VALIDATION_RESULTS.md` |
| AOS-028 | **Jacob** | Review POC implementation | 🔄 NEW (blocked by AOS-027) | Messages TO Joe |

### Client Features

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| CLI-007 | **Maya** | Archive: Frontend (list, detail, contacts, modal) | 🔄 READY | `PRD_CLIENT_ARCHIVE.md §3.3-3.4` |
| CLI-008 | **Eli** | Archive: E2E tests (17 scenarios) | 🔄 NEW (blocked by CLI-007) | `PRD_CLIENT_ARCHIVE.md §7` |
| CLI-009 | **Alex** | API: Clients list ordering by `last_activity_at DESC` | 🔄 NEW | `PRD_CLIENT_OVERVIEW_CONSOLIDATION.md §3.4` |
| CLI-010 | **Alex** | API: Update `last_activity_at` on document/email actions | 🔄 NEW | `PRD_CLIENT_OVERVIEW_CONSOLIDATION.md §3.4` |
| CLI-011 | **Maya** | Frontend: Documents block consolidation | 🔄 NEW (blocked by CLI-009/010) | `PRD_CLIENT_OVERVIEW_CONSOLIDATION.md` |

### Documentation

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| DOC-001 | **David** | PRD: MkDocs Material Documentation Wiki | 🟢 READY | `PRD_MKDOCS_WIKI.md` |
| DOC-002 | **Alex** | Build MkDocs scaffold (mkdocs.yml, nav/index, mirrored CLAUDE/AGENTS under docs/root, local build) | ✅ COMPLETE | `PRD_MKDOCS_WIKI.md §5-7` |
| DOC-003 | **Jane** | CI + VM hosting for MkDocs (build on main, publish to VM port, robots off) | 🔄 NEW (blocked by DOC-002) | `PRD_MKDOCS_WIKI.md §5.7-7` |
| DOC-004 | **David** | IA/content pass: Home "Start here", section summaries, root-doc sync procedure | 🔄 NEW | `PRD_MKDOCS_WIKI.md §4-6` |

### Environment Baseline & Sync

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| ENV-001 | **Jane** | Execute Dev → `dev-main-2025-12-11` promotion plan (tag/branch, backups, cleanup, VM smoke, default flip) | ✅ COMPLETE | `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md` |
| ENV-002 | **Jane** | Implement automated local→VM sync (GitHub Action + VM webhook/SSH pull & redeploy) for feature branches and `dev-main-2025-12-11`; document the flow in TEAM_INBOX | ✅ COMPLETE | `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md` |

### Privacy & Marketing

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| PRI-002 | **Noa** | Legal Review - Full Question Text | 🔄 AWAITING CEO | `TASK_NOA_LEGAL_REVIEW_QUESTIONS.md` |
| PRI-006 | **Maya** | WordPress Privacy Report Page (Stub) | 🔄 NEW | `TASK_MAYA_WORDPRESS_REPORT_PAGE.md` |
| CEO-001 | **CEO** | Provide content per level (text + videos) | 🔄 PENDING | Separate project |
| CEO-002 | **CEO** | Provide packages/pricing for WooCommerce | 🔄 PENDING | For checkout integration |
| CEO-003 | **CEO** | Update Fillout Privacy Form with A/B copy | 🔄 NEW | `FILLOUT_COPY_CHANGES.md` |

---

## Messages TO Joe (Recent Only)

> Only showing last 5 active messages. For history, see archive.

| From | Status | Message |
|------|--------|---------|
| **Jane** | ✅ **UPDATE** | **ENV-002 implemented locally (2025-12-12):** Added `.github/workflows/sync_to_vm.yml` (push dev-main-2025-12-11 + feature/** + manual dispatch) that SSHes to VM and runs `tools/remote_sync.sh` (stash dirty, reset to origin/branch, rebuild services, restore stash). Added `tools/remote_sync.sh` and `tools/mirror_root_docs.sh`. Changes are on VM working copy (`dev-main-2025-12-11`) and uncommitted; `VM_SSH_KEY` already added in GitHub secrets; optional overrides: host/port/user/target, `SYNC_SERVICES`. Awaiting commit/push to GitHub. |
| **Jane** | ✅ **COMPLETE** | **ENV-002 CI→VM Sync (2025-12-12):** Added `.github/workflows/sync_to_vm.yml` (push to dev-main-2025-12-11 + feature/** + manual dispatch). Workflow SSHes to VM with `VM_SSH_KEY` and runs `tools/remote_sync.sh` (stashes dirty state, fetches `BRANCH`, resets to origin, rebuilds docker services via `docker-compose-v2` with `SYNC_SERVICES` default `api web orchestrator`, then restores stash). Secrets needed: `VM_SSH_HOST/PORT/USER/KEY/TARGET_DIR`. Added helper `tools/mirror_root_docs.sh` for CLAUDE/AGENTS mirroring. Robots remain disallow. |
| **David** | ✅ **COMPLETE** | **DOC-004 IA pass (2025-12-09):** Updated `docs/index.md` with Start Here tiering, section summaries, search tips, and CLAUDE/AGENTS mirroring procedure (hash 10535cd2). Ready for Alex/Jane to wire nav/CI. |
| **Alex** | ✅ **COMPLETE** | **DOC-002 MkDocs scaffold (2025-12-09):** Added mkdocs.yml nav, index landing, mirrored CLAUDE.md (sync 10535cd2) and AGENTS placeholder under docs/root, requirements-docs.txt. Pending: choose VM port + versioning tool (mike vs Material); add canonical AGENTS.md when available; CI/hosting (DOC-003) still needed. |
| **Alex** | ✅ **COMPLETE** | **AOS-025 POC Workflow (2025-12-09):** Created `workflow.py` implementing Alex → Jacob handoff per PRD §8.3. Features: conditional routing (APPROVED/NEEDS_FIXES/BLOCKED), review loop with max iterations, TEAM_INBOX auto-update, Langfuse tracing integration. New endpoints: `POST /workflow/poc`, `POST /workflow/poc/async`, `GET /workflow/{task_id}`, `GET /workflows`. VM synced, container rebuilt, endpoints verified. **AOS-026 is UNBLOCKED.** |


---

## Backlog

| ID | To | Task | Priority | Doc |
|----|-----|------|----------|-----|
| CLI-001 | **Alex** | Add Missing Agent Tools (Clients) | P1 | `AUDIT_ACTION_INVENTORY_CLIENTS.md` |
| CLI-002 | **Alex + Maya** | File Upload to SharePoint | P2 | `TASK_ALEX_MAYA_FILE_UPLOAD.md` |
| CLI-003 | **Alex** | DOCX Template Generation Backend | P3 | `PRD_QUOTE_TEMPLATES.md` |
| AOS-004 | **Joe** | Configure Codex MCP servers | P3 | `~/.codex/config.toml` |

---

## Open Questions for CEO

1. **Short URLs:** Use bit.ly or custom domain (e.g., `eis.law/r/xxx`)?

---

## Quick Links

### Bibles (Authoritative Sources of Truth)
| Resource | Path | Purpose |
|----------|------|---------|
| **CLAUDE.md** | `../../CLAUDE.md` | All rules, workflow, VM, Git |
| **Documentation Bible** | `DOCUMENTATION_BIBLE.md` | Doc maintenance rules |
| **Data Bible** | `DATA_STORES.md` | Where ALL data is stored |
| **API Bible** | `API_ENDPOINTS_INVENTORY.md` | All API endpoints |
| **Agent Bible** | `AGENT_BIBLE.md` | CLI spawn patterns |
| **Port Bible** | `DEV_PORTS.md` | All service ports on VM |

### Feature Specs
| Module | Spec |
|--------|------|
| Clients | `CLIENTS_FEATURES_SPEC.md` |
| Privacy | `PRIVACY_FEATURES_SPEC.md` |
| AI Studio | `AI_STUDIO_PRD.md` |
| RAG | `RAG_FEATURES_SPEC.md` |
| Documentation | `DOCUMENTATION_BIBLE.md` |

### Task Management
| Resource | Path |
|----------|------|
| Task Template | `TASK_TEMPLATE.md` |
| Completed work | `TEAM_INBOX_ARCHIVE.md` |
| Orchestration Status | `AGENT_ORCHESTRATION_STATUS.md` |

---

## How to Use This Document

**Team Members:**
1. Find your task in "Active Tasks FROM Joe"
2. Read the linked PRD/spec doc
3. Use `TASK_TEMPLATE.md` for task doc
4. Post completion to "Messages TO Joe"
5. Update docs per CLAUDE.md §8

**Status Codes:**
- 🟢 READY (unblocked, can start)
- 🔄 In Progress / NEW
- ✅ Complete
- ❌ Blocked
- ⏸️ On Hold

---

*This document is the primary communication channel. Check it daily.*
*For rules and workflow, see CLAUDE.md. For history, see TEAM_INBOX_ARCHIVE.md.*
### Archive Fixes (from ARCHIVE_FEATURE_REVIEW.md)

| ID | To | Task | Status | Doc |
|----|----|------|--------|-----|
| AF-001 | **Alex + Maya** | Archive P1 fixes: add loading