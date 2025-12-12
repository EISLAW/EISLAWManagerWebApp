# Episodic Log Update

**Category:** automation
**Created:** 2025-12-12
**Author:** Alex

---

## Description

Append lessons learned, bug patterns, and critical fixes to the episodic memory log (`docs/Testing_Episodic_Log.md`). This creates a searchable history of incidents, solutions, and "MEMORIZE" rules to prevent repeated mistakes.

---

## When to Use

- After fixing a non-trivial bug
- After discovering a pattern or anti-pattern
- After implementing a workaround for a recurring issue
- When learning something critical that must be remembered
- After resolving a production incident
- When documenting a "gotcha" or footgun

---

## Prerequisites

- Write access to `docs/Testing_Episodic_Log.md`
- Understanding of what was fixed and why it matters

---

## Steps

### Step 1: Identify the Lesson

**Ask yourself:**
- What went wrong?
- Why did it go wrong?
- How was it fixed?
- What should we remember going forward?

### Step 2: Gather Evidence

**Collect:**
- Commit hash (if code was changed)
- Test results (before/after)
- Error messages or logs
- Links to relevant docs or issues

### Step 3: Format the Entry

Use this template:

```markdown
## [Title] (YYYY-MM-DD)

**Problem:** [Description of what went wrong]

**Fix:** [What was done to resolve it]

**Evidence:** [Commit hash, test results, or proof]

**Impact:** [What this prevents or enables]

**MEMORIZE:** [Critical rule to always follow] (optional but important)
```

### Step 4: Append to Episodic Log

```bash
# Open the file
Read: docs/Testing_Episodic_Log.md

# Append your entry at the end
Edit: docs/Testing_Episodic_Log.md
# Add the formatted entry
```

### Step 5: Verify Entry Added

Check that:
- Entry appears in the log
- Date is correct
- Evidence is included
- MEMORIZE tag added if it's a critical rule

---

## Success Criteria

- [ ] Entry added to `docs/Testing_Episodic_Log.md`
- [ ] Title is descriptive and searchable
- [ ] Problem clearly explained
- [ ] Fix documented with evidence
- [ ] Impact described (what this prevents)
- [ ] MEMORIZE tag added for critical rules
- [ ] Date stamped (YYYY-MM-DD)

---

## Examples

### Example 1: Chat Integration Reliability

```markdown
## Chat Integration Reliability Fixed (2025-12-11)

**Problem:** Spawned agents failed to post chat messages 40% of the time. Bash helper used `jq` which wasn't available in Windows CMD. Spawn instructions were optional, agents skipped them when not emphatic.

**Fix:** Created foolproof spawn templates with:
- Python helper (works everywhere, no `jq` dependency)
- ═══ visual separators (impossible to miss)
- "MANDATORY" + "DO NOT SKIP" language
- 5 numbered steps force sequential execution

**Evidence:**
- Testing results: docs/CHAT_DEBUG_001_RESULTS.md (20/20 tests passed)
- Commit: f84e8525 (CHAT-DEBUG-001)
- 100% success rate after fix

**Impact:** All future agent spawns will reliably post chat messages and trigger Jacob auto-review.

**MEMORIZE:**
- ALWAYS use CLI spawn templates from CLAUDE.md §1b for agent spawning
- NEVER use bash helper for chat (fails in CMD/WSL)
- NEVER make chat posting optional (must be MANDATORY)
```

### Example 2: Database Migration Pattern

```markdown
## SQLite Migration Footgun (2025-11-20)

**Problem:** Migration script ran successfully but changes didn't persist. Forgot to commit transaction before closing connection.

**Fix:** Added explicit `conn.commit()` before `conn.close()` in all migration scripts.

**Evidence:**
- Commit: a3b2c1d (STORAGE-004)
- PRAGMA table_info verification shows columns exist after commit

**Impact:** Future migrations will persist changes correctly.

**MEMORIZE:**
- ALWAYS call conn.commit() before conn.close() in migrations
- ALWAYS verify migration with PRAGMA table_info after running
```

### Example 3: Codex Spawn Location

```markdown
## Codex Must Spawn from WSL (2025-12-11)

**Problem:** Codex agents spawned from Windows CMD didn't have MCP tools available. ssh-manager, filesystem, postgres MCPs all failed to load.

**Fix:** All Codex spawns must use WSL wrapper:
```bash
wsl -e bash -c "cd '/mnt/c/Coding Projects/EISLAW System Clean' && codex exec..."
```

**Evidence:**
- Test results: docs/TASK_ELI_TOOLS005_CODEX_SSH_TEST_RESULTS.md
- 8/8 MCPs working when spawned from WSL
- 0/8 MCPs working when spawned from Windows CMD

**Impact:** Codex agents will have full MCP tool access for VM operations, DB queries, GitHub operations.

**MEMORIZE:**
- ALWAYS spawn Codex from WSL (NOT Windows CMD)
- If MCP tools not working, check spawn location first
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't open episodic log | Check path: `docs/Testing_Episodic_Log.md` (not `Testing_Episodic_Log.md`) |
| Don't know what to write | Focus on: What broke? How fixed? What to remember? |
| Unsure if entry is needed | If it took >30 min to debug, document it |
| MEMORIZE rule unclear | Make it actionable: "ALWAYS X", "NEVER Y" |
| Too many entries | That's good! Searchable history prevents repeated mistakes |

---

## Entry Template (Copy-Paste)

```markdown
## [Title] (YYYY-MM-DD)

**Problem:**

**Fix:**

**Evidence:**

**Impact:**

**MEMORIZE:** (optional - use for critical rules)
```

---

## References

- Episodic memory section: CLAUDE.md §12.1
- Current log: `docs/Testing_Episodic_Log.md`
- Memory architecture research: `docs/RESEARCH_SKILLS_ARCHITECTURE.md` §4
- Manifest file: `.claude/skills/automation/episodic-log-update/manifest.json`
