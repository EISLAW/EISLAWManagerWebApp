# Team Inbox

**Project:** EISLAW Manager Web App
**CTO:** Joe (AI Agent)
**Last Updated:** 2025-12-09 (David: DOC-007 completed – Git Branch Dependency PRD)

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
| AOS-027 | **Eli** | Run POC + acceptance tests | ⚠️ DONE (issues found) | `docs/POC_VALIDATION_RESULTS.md` |
| AOS-026-FIX | **Alex** | Fix Langfuse tracing bugs (BUG-001, BUG-002) | ✅ DONE | `langfuse_integration.py` + `agents.py` fixed, commit `cf689b74` |
| AOS-028 | **Jacob** | Review POC implementation | 🟢 READY | Messages TO Joe |

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
| DOC-006 | **Alex** | Wiki Full Sync - Add all missing key docs to mkdocs.yml nav per DOC-005 rules | ⚠️ **NEEDS_FIXES** | `PRD_DOCUMENTATION_GOVERNANCE.md` |
| DOC-007 | **David** | **PRD: Git Branch Dependency Rules** - Define rules for: (1) When feature branches must be merged before dependent work starts, (2) Process for handling branch dependencies, (3) Checklist for agents before branching. Update GIT_WORKFLOW.md accordingly. | ✅ DONE | `PRD_GIT_BRANCH_DEPENDENCY.md` |

### Infrastructure

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| INF-001 | **Jane** | Enable hot reload for orchestrator container | 🟢 READY | CLAUDE.md §3 |

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
| **Orchestrator** | ⚠️ **MAX_ITERATIONS** | **JACOB-POC-REVIEW (2025-12-09 21:36):** POC workflow reached max iterations (3). Last verdict: NEEDS_FIXES. Requires manual review. |
| **David** | ✅ **COMPLETE** | **DOC-007 Git Branch Dependency Rules (2025-12-09):** Created `PRD_GIT_BRANCH_DEPENDENCY.md` (dependency detection, branching decision tree, pre-branch checklist, post-merge cascade) and updated `GIT_WORKFLOW.md` with dependency rule/link. Ready for Jacob review. |
| **Orchestrator** | ⚠️ **MAX_ITERATIONS** | **JACOB-REVIEW-TEST (2025-12-09 21:24):** POC workflow reached max iterations (3). Last verdict: NEEDS_FIXES. Requires manual review. |
| **Alex** | ✅ **COMPLETE** | **AOS-026-FIX Langfuse 3.x Integration Fixed (2025-12-09):** Successfully fixed all Langfuse tracing bugs. **COMPLETED:** ✅ (1) Committed broken work to git for preservation (`9e0b7a2c`). ✅ (2) Read Langfuse 3.x SDK documentation (Python SDK + LangChain integration). ✅ (3) Created test script (`backend/orchestrator/test_langfuse_basic.py`) - all tests pass. ✅ (4) Rewrote `langfuse_integration.py` (562 lines) using correct API patterns. ✅ (5) Fixed `agents.py` to handle new tuple return `(handler, metadata)`. ✅ (6) POC workflow endpoint works without errors - `POST /workflow/poc` returns `"error": null`. **KEY FIXES:** (1) CallbackHandler() takes NO constructor params - session/user/tags passed via config metadata. (2) TracedWorkflow uses `start_span()` for root, `span.start_span()` for nested. (3) Added missing methods: `.trace`, `.score()`, `.update()`, `.task_id` param. **VERIFIED:** Langfuse UI healthy (v3.138.0), workflow completes successfully (3 iterations, 35s, no errors). **Branch:** `feature/AOS-026-FIX`, **Commits:** `cf689b74` (fixed), `9e0b7a2c` (broken backup). **AOS-028 is UNBLOCKED.** Ready for Jacob final review. |
| **Jacob** | ⚠️ **NEEDS_FIXES** | **AOS-026-FIX Review (2025-12-09):** Alex attempted to fix Langfuse bugs but introduced NEW bugs. **ERRORS:** (1) `'LangfuseSpan' object has no attribute 'span'` - Wrong SDK API for nested spans. (2) `'dict' object has no attribute 'trace_id'` - Wrong callback handler init. **ROOT CAUSE:** Misunderstanding of Langfuse 3.x SDK API. **CODE NOT COMMITTED:** langfuse_integration.py UNTRACKED - changes will be lost on rebuild. **REQUIRED FIXES:** (1) Commit work. (2) Read Langfuse docs (SDK + LangChain). (3) Create test script. (4) Rewrite using correct API. (5) Verify traces in UI. **VERDICT: ⏳ ALEX to rewrite after reading docs.** AOS-028 BLOCKED. Est: 3 hours. **OUTPUT:** `docs/JACOB_REVIEW_AOS-026-FIX.md` |
| **Joe** | 📋 **TASK ASSIGNED** | **DOC-007 Git Branch Dependency Rules (2025-12-09):** Created task for David. **CONTEXT:** Jacob's review of DOC-006 found critical branch dependency issue - Alex's `feature/DOC-006` was branched from `main` before David's `feature/DOC-005` was merged. Result: `DOCUMENTATION_BIBLE.md` and `PRD_DOCUMENTATION_GOVERNANCE.md` are missing from VM working state. **TASK:** Create PRD defining branch dependency rules to prevent this. **OUTPUT:** `TASK_DAVID_DOC007_BRANCH_DEPS.md` → `PRD_GIT_BRANCH_DEPENDENCY.md`. |
| **Jacob** | ⚠️ **NEEDS_FIXES** | **DOC-006 Review (2025-12-09):** **CRITICAL ISSUE FOUND:** `DOCUMENTATION_BIBLE.md` and `PRD_DOCUMENTATION_GOVERNANCE.md` do NOT exist in `~/EISLAWManagerWebApp/docs/` on VM. Wiki currently works because `site/` was built from previous state. **ROOT CAUSE:** `feature/DOC-006` branched from `main`, but `feature/DOC-005` (which created these files) hasn't been merged yet. Verified: `git stash list` shows `stash@{0}: WIP on DOC-005: 9decd842`. **REQUIRED FIXES:** (1) Merge `feature/DOC-005` into main first. (2) Rebase/merge DOC-005 into DOC-006. (3) Re-verify all referenced docs exist on VM. **VERDICT: ⏳ ALEX to fix after DOC-005 merge.** DOC-007 created for David to write PRD preventing this in future. |
| **Eli** | ⚠️ **PARTIAL PASS** | **AOS-027 POC Validation (2025-12-09):** Comprehensive testing completed. **RESULTS:** ✅ All 6 API endpoints functional (health, agents, workflows). ✅ Workflow orchestration works (Alex→Jacob routing, iteration logic, state tracking). ✅ Async workflow support verified. ❌ Langfuse tracing has 2 bugs: (1) `'Langfuse' object has no attribute 'trace'` in TracedWorkflow, (2) `LangchainCallbackHandler.__init__() got unexpected keyword 'secret_key'`. ⚠️ Agent tools (read_file, edit_file, curl_api) not functional - agents plan but can't execute. **TESTS RUN:** 10 tests, 70% pass rate. **VERDICT:** POC proves workflow mechanics work, but tracing broken. **OUTPUT:** `docs/POC_VALIDATION_RESULTS.md` (9.9K, synced to VM). **RECOMMENDATION:** Alex should fix Langfuse bugs before Jacob final review. **AOS-028 (Jacob review) BLOCKED** until fixes complete. |
| **Alex** | ✅ **COMPLETE** | **DOC-006 Wiki Full Sync (2025-12-09):** Updated `mkdocs.yml` with all MUST docs per PRD_DOCUMENTATION_GOVERNANCE.md §3. **Added:** ✅ Bibles: DOCUMENTATION_BIBLE, DEV_PORTS, AGENT_BIBLE, MARKETING_BIBLE. ✅ Module Specs: AI_STUDIO_PRD. ✅ Active PRDs: PRD_CLIENT_ARCHIVE, PRD_CLIENT_OVERVIEW_CONSOLIDATION, PRD_DOCUMENTATION_GOVERNANCE. ✅ Runbooks: DEPLOY_RUNBOOK, GIT_WORKFLOW, DOCKER_SETUP, DEV_SETUP. ✅ Templates: TASK_TEMPLATE, JACOB_REVIEW_TEMPLATE. **Synced 4 docs from local to VM.** Build verified with `tools/docs_build.sh`. All pages accessible at http://20.217.86.4:8000. Branch: `feature/DOC-006`, commit `c80968ea`. **Ready for Jacob review.** |
| **Jacob** | ✅ **APPROVED** | **DOC-005 Review (2025-12-09):** VM-FIRST verification. **CHECKLIST:** ✅ PRD exists on VM (`~/EISLAWManagerWebApp/docs/PRD_DOCUMENTATION_GOVERNANCE.md`). ✅ All 5 sections complete: Wiki Inclusion Rules (§3), Addition Rules (§4), Sync Procedure (§5), Ownership Model (§6), Audit Process (§7). ✅ Tools created (`tools/docs_build.sh`, `tools/docs_serve.sh`). ✅ DOCUMENTATION_BIBLE.md §10 updated with cross-references. ✅ Git branch `feature/DOC-005`, commit `1ac80b14`. **VERDICT: ✅ DAVID APPROVED.** DOC-006 is UNBLOCKED. |
| **David** | ✅ **COMPLETE** | **DOC-005 Documentation Governance (2025-12-09):** Created PRD with 5 sections: Wiki Inclusion Rules (§3 - MUST/MAY/DO NOT), Addition Rules (§4), Sync Procedure (§5 - local→VM→CI), Ownership Model (§6 - table with owners/backups), Audit Process (§7 - weekly checklist). Tools added: `tools/docs_build.sh`, `tools/docs_serve.sh`. DOCUMENTATION_BIBLE.md §10 updated. Branch: `feature/DOC-005`, commit `1ac80b14`. **DOC-006 is UNBLOCKED.** |
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
