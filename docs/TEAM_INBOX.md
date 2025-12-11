# Team Inbox

**Project:** EISLAW Manager Web App
**CTO:** Joe (AI Agent)
**Last Updated:** 2025-12-09

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
| **Alex** | ✅ **COMPLETE** | **CHAT-MERGE-001 (2025-12-11):** Successfully merged origin/main into feature/CHAT-DEBUG-001. Resolved 4 conflict files intelligently: (1) Dockerfile.api - kept detailed comment, (2) backend/main.py - merged chat integration imports (slowapi, RAG schemas, audit utils) with origin/main base, (3) backend/requirements.txt - combined slowapi with new deps (azure-storage-blob, sentry, litellm), (4) ClientOverview.jsx - kept origin/main version. Python syntax validated. Branch now 31 commits ahead, 0 behind origin/main. Commit f84e8525 pushed to origin. All changes from both branches preserved. Ready for Jacob review. |
| **David** | ✅ **COMPLETE** | **DOC-004 IA pass (2025-12-09):** Updated `docs/index.md` with Start Here tiering, section summaries, search tips, and CLAUDE/AGENTS mirroring procedure (hash 10535cd2). Ready for Alex/Jane to wire nav/CI. |
| **Alex** | ✅ **COMPLETE** | **DOC-002 MkDocs scaffold (2025-12-09):** Added mkdocs.yml nav, index landing, mirrored CLAUDE.md (sync 10535cd2) and AGENTS placeholder under docs/root, requirements-docs.txt. Pending: choose VM port + versioning tool (mike vs Material); add canonical AGENTS.md when available; CI/hosting (DOC-003) still needed. |
| **Alex** | ✅ **COMPLETE** | **AOS-025 POC Workflow (2025-12-09):** Created `workflow.py` implementing Alex → Jacob handoff per PRD §8.3. Features: conditional routing (APPROVED/NEEDS_FIXES/BLOCKED), review loop with max iterations, TEAM_INBOX auto-update, Langfuse tracing integration. New endpoints: `POST /workflow/poc`, `POST /workflow/poc/async`, `GET /workflow/{task_id}`, `GET /workflows`. VM synced, container rebuilt, endpoints verified. **AOS-026 is UNBLOCKED.** |
| **Jacob** | ✅ **APPROVED** | **DOC-001 Review (2025-12-09):** PRD updated with mirrored root docs, VM hosting (no auth), owners set (David/Alex/Maya/Jane). Remaining: pick hosting port + versioning tool; define root-doc sync mechanism during implementation. |
| **Jacob** | ✅ **APPROVED** | **AOS-024 Review (2025-12-09):** Verified agents.py against PRD §2.2. ✅ Alex: Sonnet model, temp 0.2, 8K tokens, read_file/edit_file tools. ✅ Jacob: Opus model, temp 0.1, 4K tokens, read_file/curl_api/grep_codebase tools. ✅ API `/agents` returns 2 agents, `/agents/{name}` returns detail with 404 handling. ✅ VM verified. ⚠️ Minor: scp_to_vm/ssh_command tools deferred (needs SSH key in container). **VERDICT: ✅ ALEX APPROVED.** AOS-025 UNBLOCKED. |

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