# Working Memory Refresh

**Category:** automation
**Created:** 2025-12-12
**Author:** Alex

---

## Description

Update the working memory document (`docs/WORKING_MEMORY.md`) with current sprint status, active development priorities, recent completions, and blockers. This Skill ensures the working memory stays synchronized with the actual project state, serving as a quick-start snapshot for resuming work.

---

## When to Use

- At the end of a major task or sprint
- After completing a significant feature
- When priorities change
- Before long breaks (to capture current state)
- After major infrastructure changes (VM, deployment, services)
- When new blockers are identified
- When starting a new sprint or phase

---

## Prerequisites

- Write access to `docs/WORKING_MEMORY.md`
- Access to TEAM_INBOX.md for current sprint status
- Understanding of recent completions and active priorities

---

## Steps

### Step 1: Review Current State

Check these sources for latest information:
- `docs/TEAM_INBOX.md` - Active tasks and sprint status
- Recent commits - What was completed
- Running services - Infrastructure changes
- Open PRDs - Current priorities

### Step 2: Update Context Snapshot

Update the "Context Snapshot" section with:
- Infrastructure changes (new services, ports, containers)
- Recent session activity (last 2-3 major completions)
- Service status (what's running, new additions)

### Step 3: Update Active Development

Update "Active Development" section with:
- Current priorities (P1, P2, P3 from TEAM_INBOX)
- Task checklists (checked/unchecked status)
- New PRDs or specifications
- Removed/completed priorities

### Step 4: Update Open Items / Blockers

Refresh the "Open Items / Blockers" section:
- Add new blockers
- Remove resolved blockers
- Update status of existing items

### Step 5: Update Timestamp

Change the "Last Updated" date at the top to current date (YYYY-MM-DD).

### Step 6: Verify Accuracy

- Ensure dates are current
- Verify task checklists match reality
- Confirm no stale information remains
- Check that all sections are updated

---

## Success Criteria

- [ ] "Last Updated" timestamp is current
- [ ] Context Snapshot reflects latest infrastructure state
- [ ] Recent Session Activity lists last 2-3 completions
- [ ] Active Development shows current sprint priorities from TEAM_INBOX
- [ ] Open Items / Blockers is accurate (no stale items)
- [ ] Quick Resume Commands are still valid
- [ ] No outdated information in any section

---

## Examples

### Example 1: After Sprint Completion

**Scenario:** Skills Phase 1 just completed (SKILLS-001 through SKILLS-004)

**Updates to make:**

1. Update timestamp:
```markdown
**Last Updated:** 2025-12-12
```

2. Add to Recent Session Activity:
```markdown
### Recent Session Activity (2025-12-12)
1. **Skills Phase 1** - Complete
   - Created .claude/skills/ directory scaffold
   - Implemented 3 core Skills (local-dev-workflow, team-inbox-update, vm-log-viewer)
   - Implemented 2 quality Skills (testing-checklist, self-heal)
   - Implemented 2 automation Skills (episodic-log-update, working-memory-refresh)
```

3. Update Active Development:
```markdown
### Priority 1: Skills Phase 2
**PRD:** docs/RESEARCH_SKILLS_ARCHITECTURE.md §7

Tasks:
- [ ] Install Anthropic document Skills (SKILLS-006)
- [ ] Create RTL/a11y sweep Skill
- [ ] Create status report Skill
- [ ] Create ADR creator Skill
```

### Example 2: Infrastructure Change

**Scenario:** New monitoring stack deployed (Grafana, Prometheus, Loki)

**Updates to make:**

1. Add to Services Running:
```markdown
- **Services Running**:
  - Frontend prod (8080), dev (5173)
  - API (8799)
  - Meilisearch (7700)
  - Monitoring stack (Grafana/Prometheus/Loki) ← NEW
```

2. Add to Quick Resume Commands:
```markdown
### Access Monitoring
```bash
# From WSL - creates SSH tunnel for Grafana
ssh -i ~/.ssh/eislaw-dev-vm.pem -L 3000:localhost:3000 -N azureuser@20.217.86.4
# Then open http://localhost:3000 (admin/eislaw2024)
```
```

### Example 3: Blocker Resolution

**Scenario:** SQLite migration completed, no longer a blocker

**Updates to make:**

Remove from Open Items / Blockers:
```markdown
## Open Items / Blockers

1. **TaskBoard English Labels** - Need Hebrew translation (6+ strings)
2. **Privacy RTL** - Layout broken, needs swap
3. ~~**SQLite Migration** - Not started, blocks stress test~~ ✅ COMPLETE
4. **WooCommerce Setup** - Waiting for product creation
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Unsure what changed | Review last 5 commits with `git log --oneline -5` |
| Don't know current priorities | Check TEAM_INBOX.md "Active Tasks FROM Joe" |
| Unclear what's blocked | Check TEAM_INBOX.md for tasks with "BLOCKED" status |
| Services list outdated | SSH to VM and run `docker ps` to see running containers |
| Can't remember completions | Check TEAM_INBOX_ARCHIVE.md for recently completed tasks |

---

## Template for Updates

Use this checklist when refreshing:

```markdown
## Working Memory Refresh Checklist

- [ ] Updated "Last Updated" timestamp
- [ ] Updated Recent Session Activity (last 2-3 completions)
- [ ] Updated Services Running (if infrastructure changed)
- [ ] Updated Active Development priorities from TEAM_INBOX
- [ ] Updated task checklists (checked completed items)
- [ ] Updated Open Items / Blockers (added new, removed resolved)
- [ ] Verified Quick Resume Commands still work
- [ ] Removed stale information
- [ ] Confirmed accuracy by cross-checking TEAM_INBOX
```

---

## References

- Working Memory section: `CLAUDE.md §12.1`
- Current state document: `docs/WORKING_MEMORY.md`
- Sprint status: `docs/TEAM_INBOX.md`
- Completed work: `docs/TEAM_INBOX_ARCHIVE.md`
- Memory Architecture Research: `docs/RESEARCH_SKILLS_ARCHITECTURE.md §4`
