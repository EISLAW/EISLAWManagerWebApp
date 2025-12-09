# Team Inbox

**Project:** EISLAW Manager Web App
**CTO:** Joe (AI Agent)
**Last Updated:** 2025-12-09 (David: DOC-005 PRD delivered; DOC-006 unblocked)

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
| AOS-026 | **Alex** | Implement Langfuse tracing | ✅ DONE | `backend/orchestrator/langfuse_integration.py` |
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
| DOC-001 | **David** | PRD: MkDocs Material Documentation Wiki | ✅ DONE | `PRD_MKDOCS_WIKI.md` |
| DOC-002 | **Alex** | Build MkDocs scaffold (mkdocs.yml, nav/index, mirrored CLAUDE/AGENTS under docs/root, local build) | ✅ DONE | `PRD_MKDOCS_WIKI.md §5-7` |
| DOC-003 | **Jane** | CI + VM hosting for MkDocs (build on main, publish to VM port, robots off) | ✅ DONE | `PRD_MKDOCS_WIKI.md §5.7-7` |
| DOC-004 | **David** | IA/content pass: Home "Start here", section summaries, root-doc sync procedure | ✅ DONE | `PRD_MKDOCS_WIKI.md §4-6` |
| DOC-005 | **David** | **PRD: Documentation Governance & Wiki Sync Rules** - Define rules for: (1) Which docs MUST be in wiki, (2) When to add new docs, (3) Sync procedure local↔VM↔wiki, (4) Ownership per doc type, (5) Audit process. Update DOCUMENTATION_BIBLE.md accordingly. | ✅ DONE | `PRD_DOCUMENTATION_GOVERNANCE.md` |
| DOC-006 | **Alex** | Wiki Full Sync - Add all missing key docs to mkdocs.yml nav per DOC-005 rules | 🔄 NEW (blocked by DOC-005) | `PRD_DOCUMENTATION_GOVERNANCE.md` |

### Infrastructure

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| INF-001 | **Jane** | Enable hot reload for orchestrator container | ✅ DONE | CLAUDE.md §3 |

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
| **Jane** | ✅ **COMPLETE** | **INF-001 Hot Reload (2025-12-09):** Verified orchestrator hot reload running (`uvicorn --reload` via docker-compose `orchestrator`). Docs updated: CLAUDE.md + docs/root/CLAUDE.md now list orchestrator in hot-reload table; AGENTS mirror updated; DEV_PORTS already marked hot reload; TEAM_INBOX status set to ✅. |
| **David** | ✅ **COMPLETE** | **DOC-005 PRD Delivered (2025-12-09):** Authored `PRD_DOCUMENTATION_GOVERNANCE.md` with wiki inclusion/addition/sync/ownership/audit rules and updated `DOCUMENTATION_BIBLE.md` with governance summary. Ready for Jacob review; DOC-006 unblocked. |
| **Alex** | ✅ **COMPLETE** | **AOS-026 Langfuse Tracing (2025-12-09):** Created `langfuse_integration.py` with comprehensive tracing utilities per PRD §4. **Features:** ✅ `get_langfuse_client()` - Singleton Langfuse client management. ✅ `get_langchain_callback()` - LangChain CallbackHandler factory for automatic LLM tracing. ✅ `create_agent_callback()` - Agent-specific callback with task_id/session_id. ✅ `TracedWorkflow` context manager - Spans, scores, generations. ✅ Cost estimation utilities. **Updated:** `agents.py` invoke() uses callbacks, `workflow.py` uses TracedWorkflow. **VM Verified:** Health endpoint shows `langfuse_configured: true`, LangChain callback handler loads successfully. **Dependencies:** Added `langchain>=0.3.0` to requirements-orchestrator.txt (required for callback handler). **AOS-027 is UNBLOCKED.** Ready for Jacob review. |
| **Jacob** | ✅ **APPROVED** | **DOC-003 Final Review (2025-12-09):** All fixes VERIFIED. **CHECKLIST:** ✅ Port 8000 listening (`ss -tlnp` confirmed). ✅ MkDocs site served (HTTP 200, valid HTML with mkdocs-material-9.5.14). ✅ docker-compose.yml has `docs` service (nginx:alpine, port 8000). ✅ docs.yml has full deploy pipeline (SSH setup, rsync, docker compose restart). ✅ robots.txt returns `Disallow: /`. ✅ DEV_PORTS.md updated (8000 = docs primary). **NOTE:** Requires `DOCS_SSH_KEY` secret in GitHub for CI deploy. **VERDICT: ✅ APPROVED.** Documentation Wiki complete - all DOC-00x tasks done! |
| **Jacob** | ✅ **APPROVED** | **AOS-025 Final Review (2025-12-09):** Bug fix VERIFIED. **CHECKLIST:** ✅ Code Quality - `invoke()` method correctly handles list responses from LangChain (checks `isinstance(content, list)`, extracts text from dict/object blocks). ✅ VM Tested - `POST /workflow/poc` returns `{"status":"completed","verdict":"APPROVED"}` with both agents executing successfully. ✅ Docs Updated - `API_ENDPOINTS_INVENTORY.md` has all 6 orchestrator endpoints. ✅ Git - Correct branch (`feature/AOS-025`), commit `4442137e` pushed. ✅ Security - No vulnerabilities (data parsing fix only). **VERDICT: ✅ APPROVED.** AOS-026 (Langfuse tracing) is UNBLOCKED. |
| **Alex** | ✅ **FIXED** | **AOS-025 Bug Fix (2025-12-09):** Fixed `invoke()` method in `agents.py` to handle list responses from LangChain. When tools are bound, `response.content` returns a list of content blocks - now extracts text properly. Container rebuilt, health check verified. Commit: `4442137e`. **Ready for Jacob re-review. AOS-026 UNBLOCKED.** |
| **Jacob** | ⚠️ **NEEDS_FIXES** | **DOC-003 Review (2025-12-09):** Partial completion. **DONE:** ✅ `docs.yml` GitHub Actions workflow exists (triggers on main, builds site). ✅ `robots.txt` exists with `Disallow: /`. ✅ `site/` directory built locally. **NOT DONE:** ❌ Port 8000 not listening - nothing hosting docs. ❌ No docs service in docker-compose.yml. ❌ CI workflow only builds + uploads artifact, doesn't deploy to VM. **REQUIRED FIXES:** (1) Add docs service to docker-compose (nginx/serve static site/). (2) Add deploy step to docs.yml to SCP site/ to VM and restart container. (3) Verify http://20.217.86.4:8000 accessible. **VERDICT: ⏳ JANE to complete VM hosting.** |
| **Jacob** | ⚠️ **NEEDS_FIXES** | **AOS-025 Re-Review (2025-12-09):** Previous issues FIXED: ✅ API_ENDPOINTS_INVENTORY.md updated (6 endpoints). ✅ Git branch correct (`feature/AOS-025`). ✅ Commit pushed (`f1539828`). **NEW ISSUE FOUND:** 🐛 `POST /workflow/poc` fails with `'list' object has no attribute 'upper'`. **Root cause:** In `agents.py:invoke()`, `response.content` returns a **list** when LangChain tools are bound, but `parse_review_verdict()` calls `.upper()` expecting a string. **FIX REQUIRED:** Handle list responses in `invoke()` method - extract text from content blocks. **VERDICT: ⏳ ALEX to fix.** AOS-026 BLOCKED until workflow endpoint works. |
| **Jacob** | ✅ **APPROVED** | **DOC-002 & DOC-004 Review CORRECTED (2025-12-09):** Previous review checked local files only - work lives on VM. **VM VERIFIED:** ✅ PRD_MKDOCS_WIKI.md exists (9KB). ✅ mkdocs.yml with full nav structure. ✅ docs/index.md home page. ✅ docs/root/CLAUDE.md + AGENTS.md mirrored. ✅ requirements-docs.txt. **VERDICT: ✅ BOTH APPROVED.** DOC-003 (Jane) is now UNBLOCKED for CI/VM hosting. |
| **Alex** | ✅ **FIXED** | **AOS-025 Fixes Complete (2025-12-09):** All 3 issues from Jacob's review resolved: (1) ✅ API_ENDPOINTS_INVENTORY.md updated - added Orchestrator section with 6 endpoints. (2) ✅ Created `feature/AOS-025` branch from main. (3) ✅ Committed all orchestrator code and pushed to remote. Commit: `f1539828`. **Ready for Jacob re-review. AOS-026 UNBLOCKED.** |
| **Jacob** | ⚠️ **NEEDS_FIXES** | **AOS-025 Review (2025-12-09):** Code quality GOOD - workflow.py implements PRD §8.3 correctly. VM endpoints verified working (health, workflows, agents, 404 handling). **ISSUES:** (1) API_ENDPOINTS_INVENTORY.md NOT updated - 6 orchestrator endpoints undocumented (`/workflow/poc`, `/workflow/poc/async`, `/workflow/{task_id}`, `/workflows`, `/agents`, `/agents/{name}`). (2) Wrong git branch - working on `feature/AOS-011` instead of `feature/AOS-025`. (3) Code uncommitted - `backend/orchestrator/` is untracked. **REQUIRED FIXES:** Update API docs, commit to proper branch, push to remote. **VERDICT: ⏳ ALEX to amend.** AOS-026 BLOCKED until fixes complete. |
| **Alex** | ✅ **COMPLETE** | **AOS-025 POC Workflow (2025-12-09):** Created `workflow.py` implementing Alex → Jacob handoff per PRD §8.3. Features: conditional routing (APPROVED/NEEDS_FIXES/BLOCKED), review loop with max iterations, TEAM_INBOX auto-update, Langfuse tracing integration. New endpoints: `POST /workflow/poc`, `POST /workflow/poc/async`, `GET /workflow/{task_id}`, `GET /workflows`. VM synced, container rebuilt, endpoints verified. **AOS-026 is UNBLOCKED.** |
| **Jacob** | ✅ **APPROVED** | **DOC-001 Review (2025-12-09):** PRD updated with mirrored root docs, VM hosting (no auth), owners set (David/Alex/Maya/Jane). Remaining: pick hosting port + versioning tool; define root-doc sync mechanism during implementation. |
| **Jacob** | ✅ **APPROVED** | **AOS-024 Review (2025-12-09):** Verified agents.py against PRD §2.2. ✅ Alex: Sonnet model, temp 0.2, 8K tokens, read_file/edit_file tools. ✅ Jacob: Opus model, temp 0.1, 4K tokens, read_file/curl_api/grep_codebase tools. ✅ API `/agents` returns 2 agents, `/agents/{name}` returns detail with 404 handling. ✅ VM verified. ⚠️ Minor: scp_to_vm/ssh_command tools deferred (needs SSH key in container). **VERDICT: ✅ ALEX APPROVED.** AOS-025 UNBLOCKED. |
| **Alex** | ✅ **COMPLETE** | **AOS-024 Agent Definitions (2025-12-09):** Created `agents.py` with Alex and Jacob agents. 4 tool definitions, API endpoints `/agents` and `/agents/{name}`. VM verified. **AOS-025 is UNBLOCKED.** |
| **Jacob** | ✅ **APPROVED** | **AOS-023 Review (2025-12-09):** Config + main.py + __init__.py all verified. Health check returns all keys configured. **VERDICT: ✅ APPROVED.** |
| **Noa** | 🔄 **PHASE 1** | **A/B Test Design (2025-12-08):** Hybrid methodology defined, feedback forms ready. **AWAITING CEO:** Approve methodology, provide pilot list. |

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
| **Jacob Review Template** | `JACOB_REVIEW_TEMPLATE.md` |
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
