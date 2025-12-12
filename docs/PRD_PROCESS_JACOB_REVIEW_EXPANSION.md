# PRD: Jacob's Expanded Review Ownership

**Author:** Joe (Task Master)
**Date:** 2025-12-12
**Status:** Draft
**Bin:** PROCESS
**Module:** Agent Workflow

---

## Problem Statement

Current documentation maintenance has gaps:
1. **Doc updates are optional** - Agents may skip updating docs even when changes require it
2. **Reference integrity unknown** - No verification that doc references (links, paths) are correct
3. **Skills drift from practices** - Skills may become outdated as conventions change
4. **AGENTS.md/GEMINI.md out of sync** - These files should mirror CLAUDE.md but often lag
5. **No change history** - Docs lack metadata about when/why they were last updated

---

## Proposed Solution

Expand Jacob's CTO review role to include mandatory documentation governance.

---

## New Jacob Responsibilities

### 1. Documentation Updates (Mandatory on Code Changes)

When reviewing ANY task that modifies code:

| Code Changed | Doc That MUST Be Updated |
|--------------|--------------------------|
| API endpoint | `SPEC_INFRA_API_ENDPOINTS.md` |
| Database schema | `SPEC_INFRA_DATA_STORES.md` |
| Module behavior | `SPEC_MODULE_{name}.md` |
| New feature | Relevant PRD status → "Implemented" |

**Enforcement:** If doc not updated → `NEEDS_FIXES: Update {doc_name}`

### 2. Documentation Reference Verification

On every review, Jacob MUST verify:
- [ ] Internal links resolve (e.g., `docs/XXX.md` exists)
- [ ] External links work (spot-check 1-2)
- [ ] Cross-references are accurate (e.g., "see §8" points to correct section)
- [ ] Path references match actual file locations

**Enforcement:** If broken reference found → `NEEDS_FIXES: Fix broken reference to {path}`

### 3. Skill Alignment Updates

When documentation conventions change, Jacob MUST:
- [ ] Check if change affects existing skills
- [ ] Update skill SKILL.md files to match new conventions
- [ ] Verify skill references are accurate

**Skills to check:**
- `.claude/skills/core/*`
- `.claude/skills/automation/*`
- `.claude/skills/quality/*`

### 4. Agent Config Sync (MANDATORY)

When CLAUDE.md is modified, Jacob MUST sync:
- [ ] `AGENTS.md` (for Codex)
- [ ] `GEMINI.md` (for Gemini)

**Sync command:**
```bash
# After CLAUDE.md update
diff CLAUDE.md AGENTS.md  # Identify drift
# Update AGENTS.md to match
diff CLAUDE.md GEMINI.md  # Identify drift
# Update GEMINI.md to match
```

**Enforcement:** CLAUDE.md changes are NOT approved until AGENTS.md and GEMINI.md are synced.

### 5. Document Metadata Requirements

Every documentation file MUST include this header:

```markdown
---
last_reviewed: YYYY-MM-DD
reviewer: {Agent Name}
change_summary: {Brief description}
related_to: {PRD/SPEC/Feature reference}
---
```

**Example:**
```markdown
---
last_reviewed: 2025-12-12
reviewer: Jacob
change_summary: Added archive feature endpoints
related_to: PRD_MODULE_CLIENTS_ARCHIVE
---
```

**Staleness Rules:**
- TASK/STATUS docs: Stale after 30 days
- SPEC/GUIDE/PRD docs: Stale after 90 days
- RUNBOOK docs: Stale after 180 days

**Enforcement:** Jacob flags docs with missing or stale metadata during review. Organic adoption - no bulk migration required.

---

## Updated Jacob Review Checklist

Add to CLAUDE.md Jacob's Review Checklist:

```markdown
### Documentation Governance (NEW)

11. **Doc Updates Required?**
    - Code changes → Relevant SPEC updated?
    - New feature → PRD marked as implemented?
    - If missing → `NEEDS_FIXES: Update {doc_name}`

12. **Reference Integrity (in modified sections):**
    - Check links in sections touched by the task
    - Verify cross-references in changed content are accurate
    - If broken → `NEEDS_FIXES: Fix broken reference`

13. **Skill Alignment (only if naming/process rules changed):**
    - Did CLAUDE.md §7 (naming) or §9 (memory) change?
    - If yes → Check affected skills, update if needed
    - If no → Skip this check

14. **Agent Config Sync (if CLAUDE.md changed):**
    - Run: `git diff CLAUDE.md AGENTS.md` to see drift
    - Run: `git diff CLAUDE.md GEMINI.md` to see drift
    - AGENTS.md synced?
    - GEMINI.md synced?
    - If not → Sync before approving

15. **Doc Metadata:**
    - `last_reviewed` date present and recent?
    - `change_summary` describes the change?
    - `related_to` links to source PRD/SPEC?
    - If missing → `NEEDS_FIXES: Add doc metadata`
```

---

## Migration Plan

### Phase 1: Update CLAUDE.md (Immediate)
- Add new items 11-15 to Jacob's review checklist
- Update section on agent config sync rule

### Phase 2: Update AGENTS.md and GEMINI.md (Immediate)
- Sync with current CLAUDE.md
- Add same documentation standards

### Phase 3: Add Metadata to Existing Docs (Gradual)
- Add metadata header to docs as they are modified
- No bulk update required - organic adoption

### Phase 4: Create Jacob Review Template Update
- Update `docs/JACOB_REVIEW_TEMPLATE.md` with new checklist items

---

## Decision Record

**Status:** Approved (Jacob review 2025-12-12)

**Alternatives Considered:**
1. Automated link checking CI - Rejected: doesn't catch semantic issues
2. Separate "Doc Reviewer" role - Rejected: adds overhead, Jacob already reviews
3. Expand Jacob's role ✅ - Chosen: natural fit, single accountability

**Trade-offs:**
+ Single point of accountability for doc quality
+ Catches issues at review time (before merge)
+ Ensures agent configs stay in sync
- Adds time to Jacob's reviews
- Requires Jacob to understand doc conventions

---

## Success Criteria

- [ ] Jacob's checklist updated in CLAUDE.md
- [ ] AGENTS.md and GEMINI.md synced
- [ ] At least 10 docs have metadata headers (organic adoption)
- [ ] No broken references in reviewed docs
- [ ] Skills updated to match conventions

---

## Owner

**PRD:** Joe (Task Master)
**Implementation:** Joe (CLAUDE.md updates) + Jacob (ongoing enforcement)
**Review:** Jacob (self-review for process, CEO for approval)
