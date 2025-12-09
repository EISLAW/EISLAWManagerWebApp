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
| **Branch** | `feature/{TASK-ID}` |

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

### Git
- [ ] On feature branch `feature/{TASK-ID}`
- [ ] All changes committed
- [ ] Pushed to origin

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
