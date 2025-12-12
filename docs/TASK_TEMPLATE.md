# TASK_{AGENT}_{DESCRIPTION}

**Agent:** {Agent Name}
**Date:** {YYYY-MM-DD}
**Branch:** `feature/{TASK-ID}`
**Status:** 🔄 In Progress

---

## Objective

{Clear, concise description of what needs to be done}

---

## Context

{Background information, related PRDs/specs, why this task exists}

**Related Docs:**
- {Link to PRD or SPEC}
- {Link to related tasks}

---

## Requirements

- [ ] {Requirement 1}
- [ ] {Requirement 2}
- [ ] {Requirement 3}

---

## Pre-Task Checklist

> **MANDATORY:** Complete before starting work

- [ ] Read related PRD/SPEC docs
- [ ] **Check Episodic Log** - Search `docs/Testing_Episodic_Log.md` for related issues
  - Keywords searched: `{keyword1}`, `{keyword2}`
  - Relevant lessons found: {yes/no - note any applicable lessons}
- [ ] Verify branch created: `feature/{TASK-ID}`
- [ ] Understand success criteria

---

## Implementation Notes

{Agent fills this in as they work - decisions made, blockers encountered, etc.}

---

## Completion Checklist

> **MANDATORY:** All items must be checked before marking complete

### Code & Testing
- [ ] Code synced to VM and tested (Handshake Rule)
- [ ] All requirements met
- [ ] No new bugs introduced
- [ ] Security review passed (no vulnerabilities)

### Git
- [ ] Committed to feature branch
- [ ] Pushed to origin: `git push -u origin feature/{TASK-ID}`

### Documentation
- [ ] Relevant docs updated (per CLAUDE.md §8 mapping):
  - [ ] API changed → `SPEC_INFRA_API_ENDPOINTS.md`
  - [ ] DB changed → `SPEC_INFRA_DATA_STORES.md`
  - [ ] Module changed → `SPEC_MODULE_{name}.md`
- [ ] MkDocs wiki updated (if new doc created)
- [ ] `mkdocs build` passes (if docs changed)

### Episodic Memory (CRITICAL)
- [ ] **Non-trivial bug fixed?** → Added lesson to `docs/Testing_Episodic_Log.md`
  - Pattern: `### MEMORIZE: {title}` with context and fix
- [ ] **Recurring issue encountered?** → Checked if already in episodic log
- [ ] **New "gotcha" discovered?** → Document in episodic log

### Communication
- [ ] Completion message posted to TEAM_INBOX "Messages TO Joe" section
- [ ] Ready for Jacob review

---

## Outcome

**Result:** {SUCCESS / PARTIAL / BLOCKED}

**Summary:** {Brief description of what was accomplished}

**Lessons Learned:** {Any insights worth remembering - copy to Episodic Log if significant}

---

## Review

**Reviewer:** Jacob (CTO)
**Verdict:** {APPROVED / APPROVED - TASK COMPLETE / NEEDS_FIXES}
**Notes:** {Review feedback}
