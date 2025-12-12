# Git Workflow

> **Rule:** Local = Source of Truth. Always push to GitHub.

## Repository

- **GitHub:** `github.com/EISLAW/EISLAWManagerWebApp`
- **Main branch:** `main` (protected - only merge via Jacob approval)

---

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature/Task | `feature/{TASK-ID}` | `feature/CLI-009` |
| Research | `research/{topic}-{date}` | `research/model-optimization-2025-12-11` |
| Hotfix | `hotfix/{issue}` | `hotfix/api-crash` |

---

## Workflow by Role

### Agent (Alex, Sarah, David, Noa)

1. **Start task:**
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/{TASK-ID}
   ```

2. **Work:** Make changes, but **DO NOT commit**

3. **Report completion:** Post to TEAM_INBOX "Messages TO Joe"

4. **Wait for Jacob review**

> **Rule:** Agents do NOT commit. Jacob handles all commits after review.

---

### Jacob (CTO - Code Review)

#### Review Checklist
1. Code quality matches PRD/spec
2. Tests pass (if applicable)
3. Docs updated (see CLAUDE.md section 8 mapping)
4. Security - no vulnerabilities
5. VM tested - works on `20.217.86.4`

#### Verdict Types

| Verdict | Meaning | Action |
|---------|---------|--------|
| `APPROVED` | This part is good, keep going | Commit + Push |
| `APPROVED - TASK COMPLETE` | Entire task is done | Commit + Push + **Merge to main** |
| `NEEDS_FIXES: {reason}` | Issues found | Return to agent (no commit) |

#### On APPROVED (incremental)
```bash
git add -A
git commit -m "{TASK-ID}: {description}"
git push -u origin feature/{TASK-ID}
```
Then post verdict to TEAM_INBOX.

#### On APPROVED - TASK COMPLETE (final)
```bash
# Commit and push
git add -A
git commit -m "{TASK-ID}: {description}"
git push -u origin feature/{TASK-ID}

# Merge to main
git checkout main && git pull origin main
git merge feature/{TASK-ID} --no-ff -m "Merge {TASK-ID}: {description}"
git push origin main

# Cleanup
git branch -d feature/{TASK-ID}
git push origin --delete feature/{TASK-ID}  # Optional: delete remote branch
```
Then post verdict to TEAM_INBOX.

---

### Joe (Task Master)

1. **Create tasks** in TEAM_INBOX with task IDs
2. **Spawn agents** with branch assignments
3. **Monitor progress** via TEAM_INBOX
4. **Verify merges** are complete after Jacob's TASK COMPLETE verdicts

---

## Quick Reference

```bash
# See current branch
git branch --show-current

# See status
git status

# See recent commits
git log --oneline -10

# See unpushed commits
git log origin/main..HEAD --oneline

# See all branches
git branch -a

# Fetch latest from remote
git fetch origin
```

---

## Rules

1. **Never work directly on main** - always use feature branches
2. **Never force push** - especially not to main
3. **Always pull before merge** - `git pull origin main` first
4. **Commit messages:** `{TASK-ID}: {description}`
5. **Push after every approval** - no approval is complete until pushed
6. **Merge only on TASK COMPLETE** - not on incremental approvals
