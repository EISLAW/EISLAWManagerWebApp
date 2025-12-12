# PRD: Automatic Jacob Review (CLI-Only)

> **Version:** 1.0
> **Author:** David (Senior Product)
> **Date:** 2025-12-12
> **Status:** Draft for Review
> **Related:** `TEAM_INBOX.md`, `AGENT_ORCHESTRATION_STATUS.md`, `JACOB_REVIEW_TEMPLATE.md`

---

## § 1. Executive Summary

### Current State

- Worker agents (Alex/Maya/Jane/Eli/David/etc.) complete tasks and post a completion message to `docs/TEAM_INBOX.md`.
- Jacob reviews work manually (often after a ping), then posts a verdict to `docs/TEAM_INBOX.md`.
- The Orchestrator POC exists on the VM, but it relies on LLM API-key wiring and does not match the CEO preference for subscription-based CLI usage.

### Problem

We want **automatic** (hands-off) triggering of Jacob reviews when work is completed, but we **do not** want to integrate LLM calls into backend services via API keys.

### Solution

Create a **CLI-only “Auto Jacob Review Runner”** that watches for an explicit review request marker in `docs/TEAM_INBOX.md`, then launches Jacob using the CEO’s existing CLI subscription:

- Primary: `codex exec ...` (preferred)
- Fallback: `claude -p ... --model opus`

The runner then posts Jacob’s verdict back to `docs/TEAM_INBOX.md` (and optionally Mattermost via `tools/agent_chat.py`).

---

## § 2. Goals / Non-Goals

### 2.1 Goals

1. **Trigger automatically** after a worker agent signals completion.
2. **Use only CLI subscriptions** (Codex/Claude CLI), not backend LLM API integration.
3. **Produce a Jacob-style verdict**: `APPROVED`, `NEEDS_FIXES`, or `BLOCKED`.
4. **Write results back to TEAM_INBOX** in the “Messages TO Joe” table.
5. **Idempotent & safe**: avoid duplicate reviews, avoid executing arbitrary commands from inbox text.

### 2.2 Non-Goals

- Replace Jacob as the quality gate (Jacob remains the reviewer; this just triggers him).
- Auto-merge, auto-push, or auto-commit (review automation only).
- Rewrite the VM Orchestrator POC.
- Require GitHub CLI (`gh`) on the machine (nice-to-have only).

---

## § 3. Users & Stakeholders

- **CEO:** wants automatic reviews without API-key integration.
- **Joe (Task Master):** wants reviews to start without manual chasing.
- **Jacob (Quality Gate):** wants predictable review input and reproducible verification steps.
- **Worker agents:** need a simple “request review” mechanism.

---

## § 4. High-Level Workflow

1. Worker agent finishes work on `feature/{TASK-ID}` and posts completion to `docs/TEAM_INBOX.md`.
2. Worker agent includes a single machine-readable line (the trigger):
   - `AUTO_JACOB_REVIEW: TASK=<TASK-ID> BRANCH=<branch> BASE=<base-branch> COMMIT=<sha?>`
3. Local runner detects the trigger (file watch or periodic poll).
4. Runner checks out the branch, optionally runs a lightweight validation set, then launches Jacob via CLI.
5. Runner parses Jacob’s verdict and appends a new row to TEAM_INBOX as “Jacob”.
6. Runner marks the trigger as processed (local state file) to prevent duplicates.

---

## § 5. Trigger Specification (Single Source of Truth)

### 5.1 Trigger Line Format

**Exact prefix:** `AUTO_JACOB_REVIEW:`

**Required fields:**
- `TASK=<TASK-ID>` (e.g., `CLI-009`)
- `BRANCH=<branch>` (e.g., `feature/CLI-009`)
- `BASE=<base-branch>` (e.g., `dev-main-2025-12-11`)

**Optional fields:**
- `COMMIT=<sha>` (if known)
- `SCOPE=<backend|frontend|docs|infra|mixed>` (helps choose tests)

Example:
```
AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=dev-main-2025-12-11 COMMIT=abc1234 SCOPE=backend
```

### 5.2 Trigger Placement (IMPORTANT)

The trigger line MUST be placed:
- **On its own line** (not inside a table cell or markdown element)
- **Starting at column 0** (no leading whitespace)
- **After the completion message row** in TEAM_INBOX

**Correct placement:**
```markdown
| **Alex** | ✅ **COMPLETE** | **CLI-009 (2025-12-12):** Task completed. |

AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=dev-main-2025-12-11
```

**Incorrect (will NOT trigger):**
```markdown
| **Alex** | ✅ **COMPLETE** | **CLI-009:** Done. AUTO_JACOB_REVIEW: TASK=CLI-009 ... |
```

### 5.3 Who Writes the Trigger?

- The worker agent that completed the task MUST include this line in its completion message.
- Joe can also add it manually when needed.

---

## § 6. Runner Requirements (CLI-Only)

### 6.1 Execution Environment

- Runs on the CEO’s machine (Windows/WSL) where `codex` and/or `claude` CLI are installed.
- Operates inside the repo working copy: `C:\Coding Projects\EISLAW System Clean\` (WSL: `/mnt/c/Coding Projects/EISLAW System Clean`).

### 6.2 Inputs / Outputs

**Inputs:**
- `docs/TEAM_INBOX.md`
- Git repo state (branches/commits)
- Optional: VM access via `ssh-manager` inside Codex (if Jacob chooses to validate on VM)

**Outputs:**
- New “Jacob” row in `docs/TEAM_INBOX.md` with verdict + summary
- Optional: Mattermost update via `tools/agent_chat.py`
- Local state file recording processed triggers

### 6.3 Idempotency & Dedupe

The runner MUST not re-run the same review request repeatedly.

Proposed dedupe key:
- `TASK + BRANCH + COMMIT (if present)`, else `TASK + BRANCH + latest_commit_sha`

State file example:
- `~/.eislaw/auto_jacob_review_state.json` (or repo-local `.eislaw/auto_jacob_review_state.json`)

### 6.4 Safety / Trust Boundary (STRICT Mode)

The runner MUST treat TEAM_INBOX text as untrusted input using **STRICT parsing**:

1. **Column 0 requirement:** Trigger must start at beginning of line (no leading whitespace)
2. **KEY=VALUE enforcement:** All tokens must be valid `KEY=VALUE` pairs
3. **Allowed keys only:** Only TASK, BRANCH, BASE, COMMIT, SCOPE are recognized
4. **Extra content rejection:** Any non-KEY=VALUE token causes entire line rejection
5. **Allowlist regex:** Branch/base patterns validated against strict regex
6. **No command execution:** Never execute arbitrary content from TEAM_INBOX

This prevents command injection, path traversal, and accidental triggering from malformed lines.

---

## § 7. Jacob Review Prompt (CLI)

### 7.1 Core Jacob Prompt Requirements

Jacob must:
- inspect `git diff BASE...BRANCH`
- identify touched areas
- verify required docs updates (API inventory, data stores, module specs, mkdocs nav)
- run tests when applicable (or explicitly state “not run” + why)
- output a machine-parseable verdict line:
  - `VERDICT: APPROVED` or `VERDICT: NEEDS_FIXES: ...` or `VERDICT: BLOCKED: ...`

### 7.2 CLI Choice

**Preferred:** Codex CLI (CEO subscription)
- `codex exec ... "You are Jacob ..."`

**Fallback:** Claude CLI
- `claude -p "You are Jacob ..." --model opus`

### 7.3 Optional VM Verification (Jacob-Driven)

If the change must be verified on the VM, Jacob can:
- use Codex MCP (`ssh-manager`) to run checks on `20.217.86.4`
- or instruct Joe to validate on VM if the runner is offline

---

## § 8. Acceptance Criteria

1. When a new trigger line is appended to TEAM_INBOX, Jacob review starts automatically within **≤ 2 minutes**.
2. Runner posts Jacob’s verdict back to TEAM_INBOX in the correct table format.
3. Runner does not duplicate reviews for the same `TASK+BRANCH(+COMMIT)`.
4. Runner rejects malformed triggers and posts a clear error row (as “Orchestrator/Runner”) describing what to fix.
5. Runner can run in **Codex-first** mode with **Claude fallback**.

---

## § 9. Rollout Plan

### Phase 0 (Manual Dry Run)

- Create 1 trigger line in TEAM_INBOX for a completed task.
- Run the runner manually once to validate parsing + posting behavior.

### Phase 1 (Always-On Runner)

- Run the watcher on the CEO machine at login (WSL task, Windows scheduled task, or a simple terminal “screen” session).
- Enable optional Mattermost messages.

### Phase 2 (Standardize Worker Outputs)

- Update worker completion templates (TEAM_INBOX instructions) to always include the trigger line.
- Add a lightweight lint step to reject completions without trigger when “review required”.

---

## § 10. Risks & Mitigations

- **Risk: Trigger not posted** → Mitigation: completion template enforcement + Joe can add trigger manually.
- **Risk: Duplicate triggers** → Mitigation: dedupe state file + commit-aware key.
- **Risk: Unsafe input** → Mitigation: strict parsing + branch allowlist + no command execution from inbox.
- **Risk: Runner not running** → Mitigation: startup service + Mattermost heartbeat (“runner online”).
- **Risk: Review quality drift** → Mitigation: require `VERDICT:` line + checklist alignment with `JACOB_REVIEW_TEMPLATE.md`.

---

## § 11. Open Questions

1. Should the trigger be placed in TEAM_INBOX only, or also in Git (e.g., commit trailer `Review-Requested: Jacob`)?
2. Do we want a “review required” default for all tasks, or only some tasks (e.g., code vs docs)?
3. What is the minimal test set Jacob must run by scope (backend/frontend/docs)?

