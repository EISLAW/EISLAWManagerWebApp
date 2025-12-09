# PRD: Git Branch Dependency Rules

**ID:** DOC-007  
**Author:** David (Product)  
**Date:** 2025-12-09  
**Status:** Draft — awaiting CTO approval  
**Related:** CLAUDE.md §3 (Git workflow summary), docs/GIT_WORKFLOW.md

---

## 1) Problem & Goal

Multiple agents create feature branches in parallel. When a branch depends on files or config added in another unmerged branch, downstream work breaks (e.g., DOC-006 missing DOCUMENTATION_BIBLE.md/PRD_DOCUMENTATION_GOVERNANCE.md). We need clear dependency rules so agents branch from the right base, keep dependencies in sync, and avoid missing artifacts.

Goals:
- Detect branch dependencies before branching.
- Provide a decision tree for safe branching options when dependencies are outstanding.
- Define a pre-branch checklist for all agents.
- Define post-merge cascade rules so dependents stay in sync.
- Embed a short summary in GIT_WORKFLOW.md and reference this PRD.

Non-goals: Change merge authority (Joe only) or rename existing branch patterns.

---

## 2) Principles

- **VM-first:** All branching decisions and checks are run on the VM (`~/EISLAWManagerWebApp`).
- **One source of truth:** Base decisions on `origin/main` and the dependency branch, not local stale copies.
- **Dependency before velocity:** Do not start work that references missing files; branch from the source that contains them.
- **Visibility:** Dependent branches must note their base and blockers in TEAM_INBOX.

---

## 3) Dependency Detection Rules

Agents must check for dependencies **before** creating a branch:
- **Signals in tasks:** "per DOC-005", "blocked by", "after CLI-007", explicit section references (e.g., `PRD_DOCUMENTATION_GOVERNANCE.md`).
- **File references:** If the task references files not in `origin/main`, dependency exists.
- **Branch existence:** If dependency task branch exists and is unmerged, treat it as required base.
- **Blocked status in TEAM_INBOX:** If your task is marked blocked or references another task in the Status/Doc columns, dependency exists.

If any signal is present → treat as dependent work.

---

## 4) Branching Protocol (Decision Tree)

When dependency branch is **merged to main** → **Option A (default):**
- `git checkout main && git pull && git checkout -b feature/{TASK-ID}`.

When dependency branch is **not merged** but **exists/remains active** → choose:
- **Option B (inherit):** Branch from dependency branch if you must build on its changes immediately. Example: `git checkout feature/DOC-005 && git checkout -b feature/DOC-006`.
- **Option C (pull forward):** Stay on your branch but merge dependency branch into it right away: `git merge feature/DOC-005` (or rebase if clean). Use when work already started but dependency is now ready.
- **Option D (wait):** If dependency is volatile or under review, pause until it merges, then use Option A.

Decision guidance:
- If your task **requires new files/schema/config** from dependency → Option B or C.
- If dependency is near approval and churn risk is high → Option D.
- If already on your branch when dependency emerges → Option C (merge/rebase) before continuing.

All options require noting the chosen base in your completion note and commit messages when relevant.

---

## 5) Pre-Branch Checklist (Mandatory)

Before `git checkout -b feature/{TASK-ID}`:
- [ ] Read `docs/TEAM_INBOX.md` for blockers or "per <task>" references.
- [ ] Confirm whether dependency task is merged to `origin/main`.
- [ ] If unmerged, pick Option B/C/D (Branching Protocol) and record the base branch.
- [ ] Verify referenced files exist in your base branch (e.g., `ls docs/PRD_DOCUMENTATION_GOVERNANCE.md`).
- [ ] Run `git status` to ensure a clean working tree or stash unrelated work.

---

## 6) Post-Merge Cascade

When a dependency branch merges to `main`:
- **Owner of dependent tasks** (as listed in TEAM_INBOX) must: rebase/merge `main` into their branch within one working day and resolve conflicts.
- **Dependency owner** (the merged branch author) posts an unblock note in TEAM_INBOX noting affected task IDs.
- **If Option B/C was used:** Dependent branch must rebase onto updated `main` once dependency merges, then drop temporary merges if needed.
- **Docs/tools:** Rerun failing lint/tests after rebase; regenerate artifacts (e.g., mkdocs nav) if files moved.

---

## 7) GIT_WORKFLOW.md Update (Summary Scope)

- Add a short section reminding agents to run the pre-branch checklist and, when blocked, to branch from or merge the dependency branch (Options B/C/D) instead of `main`.
- Link to this PRD for full rules: `docs/PRD_GIT_BRANCH_DEPENDENCY.md`.

---

## 8) Success Criteria

- No new branches start from `main` when required files live only in another active branch.
- TEAM_INBOX shows unblock messages after dependency merges.
- GIT_WORKFLOW.md includes the checklist + link; agents follow it (spot checks during reviews).

---

## 9) Open Questions

- Should we enforce automated checks (pre-commit hook) to verify referenced files exist in base? (Future work.)
- Should Joe auto-create dependency tasks when a PRD references new files? (TBD.)
