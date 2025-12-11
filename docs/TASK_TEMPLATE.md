# TASK_{AGENT}_{DESCRIPTION}

> **Template Version:** 1.0 | **Created:** 2025-12-09
> **Purpose:** Standard template for all task assignments

---

## Assignment

| Field | Value |
|-------|-------|
| **Task ID** | {XXX-000} |
| **Agent** | {Name} |
| **Status** | 🔄 In Progress |
| **PRD/Spec** | `docs/{relevant_doc}.md` |
| **Output Doc** | `docs/TASK_{AGENT}_{DESC}.md` |
| **Branch** | `feature/{TASK-ID}` _(Created by Joe - agent works here, does NOT commit/push)_ |
| **CLI** | {Codex / Claude} |

---

## CLI Selection & Limitations

> **For Joe:** When CEO says "no Claude," use Codex first, Gemini API as fallback. Do NOT ask permission.
> **For Agent:** If you hit Codex limitations, task will auto-fallback to Gemini API.

| Item | Value |
|------|-------|
| **Primary CLI** | Codex (free, unlimited) |
| **Fallback** | Gemini 2.5 Flash API ($0.30/$2.50) |
| **Reason** | {Why this task is Codex-suitable or needs fallback} |
| **Known Limitations** | {List Codex limitations for this task, if any} |
| **Fallback Trigger** | {What would cause Gemini fallback?} |

### Codex Limitations Reference (Triggers Gemini Fallback)

**Codex CANNOT (use Gemini instead):**
- ❌ Docker operations (Docker MCP fails) → Gemini 2.5 Flash API
- ❌ Complex browser automation (Playwright timeout) → Gemini 2.5 Flash API
- ❌ SSH to VM in sandbox mode → Gemini 2.5 Flash API
- ❌ Complex multi-file refactoring → Gemini 2.5 Pro API

**Codex CAN (99% of tasks):**
- ✅ SQLite queries (excellent, fast) - Model: Codex 5.1
- ✅ File read/write (via shell fallback) - Free unlimited
- ✅ Sequential thinking (task breakdown) - MCP working
- ✅ Code reviews - Cost-efficient, good quality
- ✅ Research tasks (Memory MCP) - Context retention
- ✅ Simple/moderate implementations - 69-72% SWE-bench

### Example CLI Selection Logic

```
Task: "Add SQLite migration for new table"
✅ Codex CLI: SQLite is Codex's strength ($0 cost)

Task: "Build Docker image and test on VM"
⚠️ Codex tries first → Docker fails → Gemini 2.5 Flash fallback (~$0.50 cost)

Task: "Implement API endpoint + write Playwright tests"
⚠️ Codex does API → Playwright fails → Gemini 2.5 Flash for tests (~$0.50 total)

Task: "Review code quality and suggest improvements"
✅ Codex CLI: Code review is perfect for Codex (free, fast, accurate)
```

---

## Requirements

{Describe what needs to be done. Be specific about:}
- What to build/change
- Where the code lives
- What behavior to implement

---

## Acceptance Criteria

{How to verify the task is complete:}
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Technical Context

{Optional - provide relevant context:}
- Related files: `path/to/file.py`
- Related API: `GET /api/endpoint`
- Related PRD section: §X.X

---

## Completion Checklist (REQUIRED)

> **IMPORTANT:** Do NOT mark task complete until ALL items checked.
>
> **MANDATORY:** Before marking done, run:
> ```bash
> bash tools/validate_task_completion.sh {TASK-ID}
> ```
> This script verifies: correct branch, commits pushed, docs updated.
>
> See CLAUDE.md §8 for the full Docs Update Rule mapping.

### Code & Testing
- [ ] Code works locally/in container
- [ ] Code synced to VM (`scp` or git)
- [ ] Tested on VM (http://20.217.86.4:...)
- [ ] No console errors or warnings

### Git (Agent Checklist - DO NOT commit/push)
- [ ] On feature branch `feature/{TASK-ID}` (created by Joe)
- [ ] All changes saved locally
- [ ] **DO NOT commit** (Jacob does this after approval)
- [ ] **DO NOT push** (Jacob does this after approval)

### Documentation (per CLAUDE.md §8)
- [ ] `API_ENDPOINTS_INVENTORY.md` (if API changed)
- [ ] `DATA_STORES.md` (if DB schema changed)
- [ ] `{MODULE}_FEATURES_SPEC.md` (if module behavior changed)
- [ ] `AGENT_ORCHESTRATION_STATUS.md` (if orchestration changed)

### Handoff
- [ ] Completion message posted to TEAM_INBOX "Messages TO Joe"
- [ ] Ready for Jacob review

---

## Completion Report

*Fill this section when task is complete:*

### Summary
{1-2 sentences describing what was done}

### Files Changed
- `path/to/file1.py` - {what changed}
- `path/to/file2.jsx` - {what changed}

### Docs Updated
- `docs/XXX.md` - {what was added/changed}

### Test Results
{How was it verified? Screenshots, curl commands, test output}

### Notes for Reviewer
{Any context Jacob should know for review}

---

*Template location: `docs/TASK_TEMPLATE.md`*
*See CLAUDE.md §7-8 for task management rules*
