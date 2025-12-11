# Development Workflow Update Analysis

**Author:** David
**Date:** 2025-12-12
**Task:** RESEARCH-SKILLS-002

## Executive Summary
Local-first development is now the standard: build locally in `C:\Coding Projects\EISLAW System Clean\`, push to GitHub, and the VM pulls via the ENV-002 automation path before hot-reloading containers. Documentation and Skills have been updated to steer agents away from on-box editing and toward push-to-sync with VM-only for logs/smoke tests.

## 1. New Workflow Details
- **Default branch:** `dev-main-2025-12-11` (promoted via ENV-001; now repo default).
- **Flow:** Local edits → commit → `git push` (feature/* or dev-main-2025-12-11) → GitHub Action fires → VM webhook/SSH pull updates `~/EISLAWManagerWebApp` → containers auto-reload or restart.
- **VM role now:** Observability/logs, smoke tests, and container restarts only. Coding happens locally.
- **Live endpoints for verification:** frontend dev `http://20.217.86.4:5173`, API `http://20.217.86.4:8799`.
- **Gaps noted:** GitHub Action + VM pull script are referenced in ENV-002 but not present in repo; presumed installed on VM (Jane). Diagram and docs flag script location as TBD/VM-resident.

## 2. Documentation Audit (old VM-first references)
| File | Section/Line | Status |
|------|--------------|--------|
| `CLAUDE.md` | §1D, FIRST RULE | Updated to local-first + push-to-sync; VM only for logs/smoke. |
| `docs/WORKING_MEMORY.md` | Header + Quick Resume commands | Still describe VM-first editing; flagged for follow-up alignment. |
| `docs/TECHNICAL_OVERVIEW.md` | Intro + VM SSH guidance | Still VM-first; flagged. |
| `docs/GIT_WORKFLOW.md` | Start task flow (pull on main/VM) | VM-first examples; flagged. |
| `docs/NEXT_ACTIONS.md` | Azure VM section | VM-first tone; flagged. |

## 3. Updates Made

### 3.1 CLAUDE.md
- §1D rewritten to "Development Workflow (Local-First + VM Sync)" with default flow, when-to-SSH, and VM hot-reload references.
- FIRST RULE updated to point to local-first and push-to-sync.

### 3.2 Skills Architecture Research
- Mapping table now points to `core/local-dev-workflow` (replacing VM-only Skill) and adds `vm-log-viewer` helper.
- Taxonomy tree + roadmap updated; Appendix C prototype manifest now describes local setup + push + VM verify.

### 3.3 TEAM_INBOX
- Added "Development Workflow (UPDATED 2025-12-11)" section (quick start + when to SSH + references) after "How to Use This Document".

### 3.4 Workflow Diagram
- Created `docs/DEV_WORKFLOW_DIAGRAM.md` showing local → GitHub → VM sync and when to use which commands.

### 3.5 Analysis Doc
- This file summarizes research, audit, and deltas.

## 4. Impact on Skills
- Procedural VM-runbook Skill swapped for `core/local-dev-workflow` to enforce local edits + push-to-sync.
- Added `vm-log-viewer` placeholder in taxonomy for SSH log-only scenarios.
- Other Skills remain aligned; future Skill manifests should import the new workflow doc and diagram.

## 5. Recommendations
- Align remaining VM-first docs (`WORKING_MEMORY.md`, `TECHNICAL_OVERVIEW.md`, `GIT_WORKFLOW.md`, `NEXT_ACTIONS.md`) to local-first.
- Surface the GitHub Action + VM pull script path (ENV-002) in repo docs for traceability; consider adding to `infra/` or `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md` appendix.
- Add smoke-test checklist post-push (Playwright/API health) to TEAM_INBOX and Skills once ENV-002 is confirmed stable.
- Consider adding a short "How to override auto-sync" note (e.g., emergency hotfix on VM) once policy is agreed.
