# TEAM_INBOX Update

**Purpose:** Standardized procedure for posting completion messages to TEAM_INBOX.

**When to use:** After completing any task, before requesting Jacob review, updating project status.

## TEAM_INBOX Structure

**File:** `C:\Coding Projects\EISLAW System Clean\docs\TEAM_INBOX.md`

### Key Sections
1. **Project Overview** - Readonly reference
2. **Current Sprint Status** - Readonly status counts
3. **Active Tasks FROM Joe** - Task assignments by category
4. **Messages TO Joe** - Where agents post completion messages
5. **Backlog** - Future tasks
6. **Quick Links** - Reference docs

## Posting Completion Messages

### Location
Add to the **"Messages TO Joe (Recent Only)"** table.

### Template

```markdown
| **{NAME}** | ✅ **COMPLETE** | **{TASK-ID} ({DATE}):** {SUMMARY}. {DELIVERABLES}. {CHANGES}. {DURATION}. {NEXT_STEPS}. Ready for Jacob review. |
```

### Example Entry

```markdown
| **Alex** | ✅ **COMPLETE** | **CLI-009 (2025-12-12):** API Clients Ordering complete. Added GET /clients?sort=name endpoint with last_activity_at DESC ordering. Updated API_ENDPOINTS_INVENTORY.md. Tests passing. Duration: 1.5 hours. Branch: feature/CLI-009. Commit: a3b2c1d. Unblocks: CLI-010. Ready for Jacob review. |
```

## Required Information

Every completion message MUST include:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Agent name | `Alex` |
| **Status** | ✅ COMPLETE or 🔄 IN PROGRESS | `✅ **COMPLETE**` |
| **Task ID** | Task identifier | `CLI-009` |
| **Date** | Completion date | `2025-12-12` |
| **Summary** | 1-sentence description | `API Clients Ordering complete` |
| **Deliverables** | What was created/changed | `Added GET /clients?sort=name endpoint` |
| **Changes** | Files/docs updated | `Updated API_ENDPOINTS_INVENTORY.md` |
| **Duration** | Time spent | `1.5 hours` |
| **Branch** | Git branch | `feature/CLI-009` |
| **Commit** | Git commit hash | `a3b2c1d` (short hash) |
| **Unblocks** | What tasks this enables | `CLI-010` |

## Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| ✅ **COMPLETE** | Task finished, ready for review | After all work done |
| 🔄 **IN PROGRESS** | Still working | Mid-task update |
| ❌ **BLOCKED** | Cannot proceed | Waiting on dependency |
| ⏸️ **ON HOLD** | Paused | Deprioritized |
| ✅ **APPROVED** | Jacob reviewed and approved | After Jacob review |

## Update Procedure

### Step 1: Read Current TEAM_INBOX
```bash
# View current messages
grep "Messages TO Joe" -A 20 "C:\Coding Projects\EISLAW System Clean\docs\TEAM_INBOX.md"
```

### Step 2: Add Your Message
Insert at the TOP of the "Messages TO Joe" table (after header row).

**Important:** Keep only last 5-10 active messages. Older messages move to `TEAM_INBOX_ARCHIVE.md`.

### Step 3: Verify Formatting
- [ ] Proper markdown table format
- [ ] All required fields present
- [ ] Status emoji correct
- [ ] Task ID matches assigned task
- [ ] Date is today's date

### Step 4: Commit Changes (if in Git workflow)
```bash
git add docs/TEAM_INBOX.md
git commit -m "TASK-ID: Update TEAM_INBOX with completion"
```

## Common Patterns

### Simple Task Completion
```markdown
| **Maya** | ✅ **COMPLETE** | **CLI-007 (2025-12-12):** Archive UI complete. Implemented list view, detail page, contacts section, archive/restore modal. Tests passing. Duration: 2 hours. Branch: feature/CLI-007. Ready for Eli E2E tests. |
```

### Documentation Task
```markdown
| **David** | ✅ **COMPLETE** | **DOC-004 (2025-12-09):** MkDocs IA pass complete. Updated docs/index.md with Start Here tiering, section summaries, search tips, and CLAUDE/AGENTS mirroring procedure. Hash: 10535cd2. Ready for review. |
```

### Research/PRD Task
```markdown
| **David** | ✅ **COMPLETE** | **STORAGE-001 (2025-12-12):** VM storage research done. Created docs/RESEARCH_VM_STORAGE_MIGRATION.md with current-state analysis (69% used; 2.2G EMLs), DB path→Blob mapping, Azure Blob architecture, phased migration plan, and cost model. MkDocs nav updated. Duration: 3 hours. |
```

### Blocked Task
```markdown
| **Eli** | ❌ **BLOCKED** | **CLI-008 (2025-12-12):** Archive E2E tests blocked. Waiting for Maya to complete CLI-007 (Archive UI). Test plan ready in PRD_CLIENT_ARCHIVE.md §7. |
```

## Jacob Review Updates

When Jacob completes review, he posts verdict:

```markdown
| **Jacob** | ✅ **APPROVED** | **CLI-009 Review (2025-12-12):** ✅ Code quality verified. ✅ Tests passing. ✅ API_ENDPOINTS_INVENTORY.md updated. ✅ VM tested. **VERDICT: ✅ ALEX APPROVED.** Commit a3b2c1d pushed to origin/feature/CLI-009. |
```

## Dependencies Between Tasks

When tasks have dependencies, include in message:

```markdown
| **Alex** | ✅ **COMPLETE** | **CLI-009 (2025-12-12):** API complete. **Unblocks CLI-010 (Alex - update last_activity_at) and CLI-011 (Maya - frontend consolidation).** |
```

## Archive Procedure

When "Messages TO Joe" table exceeds 10 rows:
1. Copy older entries to `docs/TEAM_INBOX_ARCHIVE.md`
2. Keep only last 5-10 active/recent messages
3. Add note: `> Only showing last 5 active messages. For history, see archive.`

## References

- Full TEAM_INBOX: `docs/TEAM_INBOX.md`
- Archive: `docs/TEAM_INBOX_ARCHIVE.md`
- Task template: `docs/TASK_TEMPLATE.md`
- Team roles: `docs/TEAM.md`

## Common Mistakes to Avoid

❌ Posting to wrong section (use "Messages TO Joe", not "Active Tasks")
❌ Missing required fields (task ID, date, deliverables)
❌ Wrong status emoji
❌ Not mentioning what tasks are unblocked
❌ Not updating when task status changes
❌ Forgetting to commit TEAM_INBOX.md changes
