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

### Environment Baseline & Sync

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| ENV-001 | **Jane** | Execute Dev → `dev-main-2025-12-11` promotion plan (tag/branch, backups, cleanup, VM smoke, default flip) | 🟢 READY | `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md` |
| ENV-002 | **Jane** | Implement automated local→VM sync (GitHub Action + VM webhook/SSH pull & redeploy) for feature branches and `dev-main-2025-12-11`; document the flow in TEAM_INBOX | 🟢 READY | `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md` |

### Storage Optimization

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| STORAGE-001 | **David** | Research VM storage migration to Azure Blob/SharePoint: Analyze current VM disk usage, identify files that can be moved to Blob/SharePoint (emails, documents, backups, logs), map database schema changes needed for file references, create migration plan with cost analysis | 🔄 NEW | `TASK_DAVID_STORAGE_MIGRATION_RESEARCH.md` |

### Skills Architecture Research

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| RESEARCH-SKILLS-001 | **David** | Research Claude Skills architecture for EISLAW: Review all docs (incl. episodic memory), determine what should be Skills, create lean knowledge architecture, research self-learning Skills (update on the fly), install Anthropic DOCX/PDF/Excel Skills, research UX/UI + marketing best practice Skills | ✅ COMPLETE | `TASK_DAVID_SKILLS_RESEARCH.md` |
| RESEARCH-SKILLS-002 | **David** | Research new development workflow (ENV-001/002: local dev + auto-sync to VM), update Skills research to reflect new workflow, update CLAUDE.md and other docs that reference old VM-first workflow | ✅ COMPLETE | `TASK_DAVID_UPDATE_WORKFLOW_DOCS.md` |

### Skills Implementation (Phase 1)

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| SKILLS-001 | **Alex** | Create `.claude/skills/` directory structure (core/quality/automation/domain/external) + README with taxonomy guide | 🟢 READY | `TASK_ALEX_SKILLS_SCAFFOLD.md` |
| SKILLS-002 | **Alex** | Implement core Skills: `local-dev-workflow`, `vm-log-viewer`, `spawn-template`, `team-inbox-update` | 🟢 READY | `TASK_ALEX_CORE_SKILLS.md` |
| SKILLS-003 | **Alex** | Implement quality Skills: `testing-checklist`, `self-heal` | 🟢 READY | `TASK_ALEX_QUALITY_SKILLS.md` |
| SKILLS-004 | **Alex** | Implement automation Skills: `episodic-log-update`, `working-memory-refresh` | 🟢 READY | `TASK_ALEX_AUTOMATION_SKILLS.md` |
| SKILLS-005 | **David** | Create DOCUMENTATION_BIBLE.md (extract from CLAUDE.md §8 + doc maintenance rules) | 🟢 READY | `TASK_DAVID_DOCUMENTATION_BIBLE.md` |
| SKILLS-006 | **CEO** | Install Claude Code plugin runner + Anthropic document Skills (PDF/DOCX/Excel) | 🔄 PENDING CEO | Instructions in SKILLS-001 doc |

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
| **David** | ✅ **COMPLETE** | **STORAGE-001 (2025-12-12):** VM storage research done. Created `docs/RESEARCH_VM_STORAGE_MIGRATION.md` with current-state analysis (69% used; 2.2G EMLs in `clients/Unassigned/emails`), DB path→Blob mapping, Azure Blob architecture, phased migration plan, and cost model. MkDocs nav updated. Note: `docker system df` timed out—recommend rerun with sudo + longer timeout during implementation. |
| **Jacob** | ✅ **APPROVED** | **STORAGE-001 Review (2025-12-12):** ✅ Comprehensive research document verified. ✅ Current state analysis complete (VM 69% full, 2.2GB emails identified on disk). ✅ File categorization with decision matrix (what stays vs moves to Blob). ✅ Database schema impact mapped (path→URL changes for messages, recordings, transcripts tables). ✅ Azure Blob architecture detailed (container structure, Python SDK examples, security patterns). ✅ 5-phase migration plan provided (Preparation→Setup→Code→Backfill→Cleanup). ✅ Cost analysis complete ($13-20/month savings estimate). ✅ Risk assessment with mitigations. ✅ MkDocs navigation updated (mkdocs.yml line 14). ✅ TEAM_INBOX updated with completion message. ⚠️ Docker disk usage incomplete (timed out - acceptable for research, documented for follow-up). **VERDICT: ✅ DAVID APPROVED.** Excellent research quality. Commit 606f986d pushed to origin/feature/STORAGE-001. Ready for CEO review and implementation planning (Phase 0-2 recommended as priority). |
| **David** | ✅ **COMPLETE** | **RESEARCH-SKILLS-002 (2025-12-12):** Workflow documentation update complete.<br><br>**Deliverables:**<br>- `WORKFLOW_UPDATE_ANALYSIS.md` - Analysis of workflow changes<br>- `DEV_WORKFLOW_DIAGRAM.md` - Visual workflow diagram<br>- Updated `CLAUDE.md` section 1D (local-first workflow)<br>- Updated `RESEARCH_SKILLS_ARCHITECTURE.md` (sections 2, 3, Appendix C)<br>- Updated `TEAM_INBOX.md` (new \"Development Workflow\" section)<br><br>**Key Changes:**<br>- CLAUDE.md: VM development → local development + auto-sync<br>- Skills: `vm-connect-and-hot-reload` → `local-dev-workflow`<br>- TEAM_INBOX: Added quick-start guide for local development<br><br>**Impact:**<br>- All docs now consistent with ENV-001/002 implementation<br>- Team members have clear guidance on new workflow<br>- Skills proposals reflect current development practices<br><br>**Branch:** feature/RESEARCH-SKILLS-002 (local changes, ready for Jacob review) |
| **Jacob** | ✅ **APPROVED** | **RESEARCH-SKILLS-002 Review (2025-12-12):** ✅ All 7 deliverables verified. ✅ CLAUDE.md: FIRST RULE rewritten (VM-first → local-first), section 1D completely restructured (removed \"VM is ONLY source of truth\", added local-first workflow with auto-sync). ✅ Skills research: Updated mapping (vm-connect-and-hot-reload → local-dev-workflow + vm-log-viewer), updated taxonomy, new manifest example. ✅ TEAM_INBOX: Added \"Development Workflow (UPDATED 2025-12-11)\" section with 6-step quick-start. ✅ DEV_WORKFLOW_DIAGRAM.md: Clear visual flow (local → GitHub → VM) + \"when to use what\" table. ✅ WORKFLOW_UPDATE_ANALYSIS.md: Comprehensive analysis identifying 4 remaining docs to update (WORKING_MEMORY, TECHNICAL_OVERVIEW, GIT_WORKFLOW, NEXT_ACTIONS - all flagged as VM-first). ✅ MkDocs nav updated. ✅ All docs now consistent with ENV-001/002. **VERDICT: ✅ DAVID APPROVED.** Excellent work. Commit 749ada82 pushed. Documentation now accurately reflects local-first workflow. Remaining VM-first docs flagged for future cleanup (non-blocking). |
| **Jane** | ✅ **COMPLETE** | **ENV-001 Dev→dev-main-2025-12-11 Promotion (2025-12-11):** ✅ Git anchors: dev-main-2025-12-11 branch/tag at 23728048 (BUG-PRI-001/002/003), legacy-main-2025-12-11 branch/tag at 9f4500bd (old main preserved), pushed to GitHub. ✅ Backups: /mnt/backups/eislaw-20251211-2212/ - databases.tar.gz (6.7M: eislaw.db, privacy.db, email_index.sqlite), clients_structure.tar.gz (4K: empty client folders, no email files exist - all email data in email_index.sqlite already backed up), tasks.json (7.3K). Total: 6.7M. ⚠️ Off-box copy: NOT DONE (recommended for disaster recovery - can use Azure Blob or SCP). ✅ Cleanup: Removed frontend/node_modules, venvs/dist/site, truncated Docker logs (~12GB freed, disk 69% vs 100%). ✅ VM baseline: Checked out dev-main-2025-12-11, all containers running (api, web-dev, web, meili, docs). ✅ Smoke tests: API health OK, 21 clients returned, frontend HTTP 200 (dev:5173, prod:8080). ✅ Default branch: GitHub default now dev-main-2025-12-11 (verified via API). ✅ GitHub auth: Fixed expired PATs via SSH key. Ready for Jacob final approval. |
| **Alex** | ✅ **COMPLETE** | **CHAT-MERGE-001 (2025-12-11):** Successfully merged origin/main into feature/CHAT-DEBUG-001. Resolved 4 conflict files intelligently: (1) Dockerfile.api - kept detailed comment, (2) backend/main.py - merged chat integration imports (slowapi, RAG schemas, audit utils) with origin/main base, (3) backend/requirements.txt - combined slowapi with new deps (azure-storage-blob, sentry, litellm), (4) ClientOverview.jsx - kept origin/main version. Python syntax validated. Branch now 31 commits ahead, 0 behind origin/main. Commit f84e8525 pushed to origin. All changes from both branches preserved. Ready for Jacob review. |
| **David** | ✅ **COMPLETE** | **DOC-004 IA pass (2025-12-09):** Updated `docs/index.md` with Start Here tiering, section summaries, search tips, and CLAUDE/AGENTS mirroring procedure (hash 10535cd2). Ready for Alex/Jane to wire nav/CI. |
| **Alex** | ✅ **COMPLETE** | **DOC-002 MkDocs scaffold (2025-12-09):** Added mkdocs.yml nav, index landing, mirrored CLAUDE.md (sync 10535cd2) and AGENTS placeholder under docs/root, requirements-docs.txt. Pending: choose VM port + versioning tool (mike vs Material); add canonical AGENTS.md when available; CI/hosting (DOC-003) still needed. |
| **Alex** | ✅ **COMPLETE** | **AOS-025 POC Workflow (2025-12-09):** Created `workflow.py` implementing Alex → Jacob handoff per PRD §8.3. Features: conditional routing (APPROVED/NEEDS_FIXES/BLOCKED), review loop with max iterations, TEAM_INBOX auto-update, Langfuse tracing integration. New endpoints: `POST /workflow/poc`, `POST /workflow/poc/async`, `GET /workflow/{task_id}`, `GET /workflows`. VM synced, container rebuilt, endpoints verified. **AOS-026 is UNBLOCKED.** |
| **Jacob** | ✅ **APPROVED** | **DOC-001 Review (2025-12-09):** PRD updated with mirrored root docs, VM hosting (no auth), owners set (David/Alex/Maya/Jane). Remaining: pick hosting port + versioning tool; define root-doc sync mechanism during implementation. |
| **Jacob** | ✅ **APPROVED** | **AOS-024 Review (2025-12-09):** Verified agents.py against PRD §2.2. ✅ Alex: Sonnet model, temp 0.2, 8K tokens, read_file/edit_file tools. ✅ Jacob: Opus model, temp 0.1, 4K tokens, read_file/curl_api/grep_codebase tools. ✅ API `/agents` returns 2 agents, `/agents/{name}` returns detail with 404 handling. ✅ VM verified. ⚠️ Minor: scp_to_vm/ssh_command tools deferred (needs SSH key in container). **VERDICT: ✅ ALEX APPROVED.** AOS-025 UNBLOCKED. |

**RESEARCH-SKILLS-001 (2025-12-12):** Skills Architecture Research complete.
**Deliverable:** `docs/RESEARCH_SKILLS_ARCHITECTURE.md` (10 sections + appendices).
**Key Findings:** 1) Procedural workflows in CLAUDE.md should become Skills (VM boot, monitoring, testing, TEAM_INBOX), leaving identity/guardrails in place. 2) Lean taxonomy proposed with core/quality/automation/domain/external tiers; self-learning via append-only memory Skills with human-gated manifest edits. 3) Anthropic document Skills are high-ROI but `plugin` CLI missing locally—install required to enable DOCX/PDF/XLSX.
**Recommendations:** Phase 1 create core/quality Skills + install document Skills; Phase 2 automation/RTL/UX Skills; Phase 3 domain (privacy, clients, RAG) + marketing Skills.
**Time Saved Estimate:** ~4–6 hrs/week, ~40–50% cognitive load reduction once Skills adopted.
**Next Steps:** Install plugin runner → add Skills scaffold → curate missing `DOCUMENTATION_BIBLE.md` → begin Phase 1 Skills implementation.

| **Jacob** | ✅ **APPROVED** | **RESEARCH-SKILLS-001 Review (2025-12-12):** ✅ Comprehensive research across 42 docs (CLAUDE.md, episodic log, PRDs, specs). ✅ Skills vs CLAUDE.md mapping complete (detailed table: procedural → Skills, identity/guardrails → stays). ✅ Lean 4-tier taxonomy proposed (core/quality/automation/domain/external). ✅ Self-learning analysis complete (append-only memory Skills, human-gated manifests). ✅ Anthropic Skills install attempted (blocked by missing plugin CLI - environment issue, not David's fault). ✅ UX/UI + marketing Skills researched (gaps identified, custom Skills proposed). ✅ Research doc created with all 10 sections + 4 appendices. ✅ MkDocs navigation updated (mkdocs.yml line 11). ✅ TEAM_INBOX updated with completion message. ✅ 3 example Skill manifests (VM connect, episodic log, RTL/a11y). ✅ Phased roadmap with cost-benefit analysis (4-6 hrs/week saved, 40-50% cognitive load reduction). ⚠️ Noted issues: DOCUMENTATION_BIBLE.md missing (pre-existing, David flagged), plugin CLI missing (environment blocker). **VERDICT: ✅ DAVID APPROVED.** Excellent research quality. Commit 58aebb90 pushed to origin/feature/DISK-002-IMPL. Ready for CEO review and Phase 1 implementation. |
| **Jacob** | ✅ **APPROVED (with required follow-up)** | **ENV-002 Review (2025-12-12):** ✅ Implementation VERIFIED on VM (uncommitted on dev-main-2025-12-11). **Technical Review:** ✅ `.github/workflows/sync_to_vm.yml` - GitHub Action triggers on push to dev-main-2025-12-11 & feature/** branches, SSHes to VM using secrets.VM_SSH_KEY, runs remote sync. ✅ `tools/remote_sync.sh` - Safely handles sync: stashes local changes → fetches/resets to origin → rebuilds services via docker-compose-v2 → restores stashed changes. ✅ `tools/mirror_root_docs.sh` - Syncs CLAUDE.md/AGENTS.md to docs/root/ for MkDocs. ✅ Workflow design: Concurrency control (one sync per branch), parameterized inputs (branch + services), graceful dirty tree handling. ✅ Files executable (chmod 755). ✅ VM_SSH_KEY secret already configured in GitHub repo. **Code Quality:** Excellent. Production-ready implementation. **⚠️ REQUIRED BEFORE PRODUCTION:** (1) Jane MUST commit + push ENV-002 files to GitHub (currently uncommitted on VM only), (2) Post Jane completion message to TEAM_INBOX documenting implementation. **VERDICT: ✅ TECHNICAL IMPLEMENTATION APPROVED.** Workflow will auto-activate once ENV-002 files are pushed. Awaiting Jane's commit + completion message. |

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

## Development Workflow (UPDATED 2025-12-11)

**We now develop locally with auto-sync to VM.**

### Quick Start
1. Work locally: `C:\Coding Projects\EISLAW System Clean\`
2. Create feature branch: `git checkout -b feature/TASK-ID` (base `dev-main-2025-12-11`)
3. Make changes, commit: `git add . && git commit -m "TASK-ID: description"`
4. Push to GitHub: `git push origin feature/TASK-ID`
5. Auto-syncs to VM (20.217.86.4)
6. Verify at http://20.217.86.4:5173

### When to SSH to VM
- View logs: `ssh azureuser@20.217.86.4` then `/usr/local/bin/docker-compose-v2 logs api -f`
- Debug container issues or restart a service
- Smoke test after deployment
- **Not for editing code** (code stays local; VM is for verification)

### References
- Full workflow: `docs/DEV_WORKFLOW_DIAGRAM.md`
- ENV plan: `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md`
- VM details: CLAUDE.md §1D

---

*This document is the primary communication channel. Check it daily.*
*For rules and workflow, see CLAUDE.md. For history, see TEAM_INBOX_ARCHIVE.md.*
