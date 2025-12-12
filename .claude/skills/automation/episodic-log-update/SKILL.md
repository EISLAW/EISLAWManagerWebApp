# Episodic Log Update

**Category:** automation
**Created:** 2025-12-12
**Author:** Alex

---

## Description

Automatically append incidents, bugs, fixes, and lessons learned to the episodic memory log (`docs/Testing_Episodic_Log.md`) with proper formatting and timestamp. This Skill ensures consistent documentation of important events that should be remembered across sessions.

---

## When to Use

- After fixing a non-trivial bug or issue
- When discovering a pattern that caused problems (e.g., chat integration failures, encoding issues)
- After implementing a workaround that should be remembered
- When you want to add a "MEMORIZE" rule for critical lessons
- After completing a task that revealed important insights about the codebase

---

## Prerequisites

- Write access to `docs/Testing_Episodic_Log.md`
- Clear understanding of the incident/fix/lesson to document

---

## Steps

### Step 1: Gather Information

Collect the following details:
- **Title:** Short, descriptive title (e.g., "Chat Integration Reliability Fix")
- **Date:** Current date in YYYY-MM-DD format
- **Problem:** What went wrong or what pattern was discovered
- **Fix/Solution:** What was done to resolve it
- **Evidence:** Commit hash, test results, or other proof
- **Impact:** What this prevents or enables going forward

### Step 2: Format the Entry

Use this template:

```markdown
## [Title] (YYYY-MM-DD)

**Problem:** [Description of the issue or pattern]

**Fix:** [What was done to resolve it]

**Evidence:** [Commit hash, test results, file paths, etc.]

**Impact:** [What this prevents or enables]

**MEMORIZE:** [Optional: Critical rule to always follow]
```

### Step 3: Append to Log

Append the formatted entry to the end of `docs/Testing_Episodic_Log.md`.

### Step 4: Verify

Confirm the entry was added successfully and is readable.

---

## Success Criteria

- [ ] Entry appended to `docs/Testing_Episodic_Log.md`
- [ ] Entry includes all required fields (Title, Date, Problem, Fix, Evidence)
- [ ] Formatting is consistent with existing entries
- [ ] Entry is searchable (good keywords in title)
- [ ] Optional MEMORIZE rule added if this is a critical lesson

---

## Examples

### Example 1: Bug Fix Documentation

**Input:**
- Title: "Hebrew Encoding in Email Subject Lines"
- Problem: "Email subjects with Hebrew characters showed as ??? in database"
- Fix: "Added UTF-8 encoding to email_sync_graph.py save_message() function"
- Evidence: "Commit abc123, tested with 5 Hebrew emails"
- Impact: "All future Hebrew emails will display correctly"

**Output in Testing_Episodic_Log.md:**
```markdown
## Hebrew Encoding in Email Subject Lines (2025-12-12)

**Problem:** Email subjects with Hebrew characters showed as ??? in database

**Fix:** Added UTF-8 encoding to email_sync_graph.py save_message() function

**Evidence:** Commit abc123, tested with 5 Hebrew emails

**Impact:** All future Hebrew emails will display correctly

**MEMORIZE:** Always use UTF-8 encoding when handling Hebrew text in database operations
```

### Example 2: Pattern Documentation

**Input:**
- Title: "Chat Integration Reliability Pattern"
- Problem: "Agents skipped chat posting when instructions weren't emphatic enough"
- Fix: "Created foolproof spawn templates with ═══ visual separators and 'MANDATORY' language"
- Evidence: "100% success rate in 20/20 tests after template implementation"
- Impact: "All future agent spawns will reliably post to chat"

**Output:**
```markdown
## Chat Integration Reliability Pattern (2025-12-12)

**Problem:** Agents skipped chat posting when instructions weren't emphatic enough

**Fix:** Created foolproof spawn templates with ═══ visual separators and 'MANDATORY' language

**Evidence:** 100% success rate in 20/20 tests after template implementation

**Impact:** All future agent spawns will reliably post to chat

**MEMORIZE:** Always use foolproof spawn templates from CLAUDE.md §1a - never write custom spawn commands
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| File not found | Verify path is correct: `docs/Testing_Episodic_Log.md` from project root |
| Permission denied | Check file is not open in another editor |
| Duplicate entry | Search log first to avoid repeating existing entries |
| Formatting broken | Follow template exactly, use markdown preview to verify |

---

## References

- Episodic Memory section: `CLAUDE.md §12.2`
- Testing Episodic Log: `docs/Testing_Episodic_Log.md`
- Memory Architecture Research: `docs/RESEARCH_SKILLS_ARCHITECTURE.md §4`
