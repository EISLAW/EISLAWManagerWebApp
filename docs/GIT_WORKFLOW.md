# Git Workflow for Parallel Agents

**Created:** 2025-12-08
**Purpose:** Prevent conflicts when multiple agents (3 Alexes, 4 Joes, etc.) work in parallel

---

## Remote Repository

| Item | Value |
|------|-------|
| **GitHub Repo** | `github.com/EISLAW/EISLAWManagerWebApp` |
| **Main Branch** | `main` |
| **VM Path** | `~/EISLAWManagerWebApp` |

---

## Golden Rules

1. **NEVER work directly on `main`** - always create a feature branch
2. **ALWAYS pull latest before starting** - `git checkout main && git pull`
3. **ONE task = ONE branch** - branch name = `feature/{TASK-ID}`
4. **Merge only after CTO approval** - no exceptions
5. **Delete branch after merge** - keep repo clean
6. **Check branch dependencies before branching** - run the pre-branch checklist in `PRD_GIT_BRANCH_DEPENDENCY.md` and branch from the dependency branch (or merge it) if your task requires files not yet in `main`.

---

## Workflow for Implementation Tasks (Alex, Maya, Joseph, Eli)

### Starting a New Task

```bash
# 1. SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp

# 2. Get latest main
git checkout main
git pull origin main

# 3. Create feature branch
git checkout -b feature/CLI-009  # Use your task ID
```

### While Working

```bash
# Save progress frequently
git add -A
git commit -m "CLI-009: WIP - added list ordering"

# Push to remote (creates backup + visibility)
git push -u origin feature/CLI-009
```

### When Task is Complete

```bash
# 1. Final commit
git add -A
git commit -m "CLI-009: Complete - clients list ordering by last_activity_at"

# 2. Push
git push origin feature/CLI-009

# 3. Update TEAM_INBOX.md with COMPLETE status
# 4. Wait for CTO approval
```

### After CTO Approval (Joe Does the Merge)

```bash
# 1. Get latest main
git checkout main
git pull origin main

# 2. Merge feature branch
git merge feature/CLI-009

# 3. Push to main
git push origin main

# 4. Delete feature branch
git branch -d feature/CLI-009
git push origin --delete feature/CLI-009
```

---

## Workflow for Reviewers (Joe)

### Reviewing a Task

```bash
# 1. Fetch all branches
git fetch origin

# 2. Check out the feature branch
git checkout feature/CLI-009

# 3. Review code, test on VM
# 4. If approved: merge to main (see above)
# 5. If changes needed: leave branch, update TEAM_INBOX
```

### Quick Review (Read-Only)

```bash
# View changes without switching branches
git diff main..feature/CLI-009
git log main..feature/CLI-009 --oneline
```

---

## Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature/Task | `feature/{TASK-ID}` | `feature/CLI-009` |
| Bug Fix | `fix/{BUG-ID}` | `fix/CLI-B04` |
| PRD Work | `docs/{PRD-ID}` | `docs/CLI-P03` |
| Hotfix | `hotfix/{description}` | `hotfix/api-crash` |

---

## Handling Conflicts

If `git merge` or `git pull` shows conflicts:

```bash
# 1. See which files conflict
git status

# 2. Open conflicting files, look for markers:
#    <<<<<<< HEAD
#    (your changes)
#    =======
#    (their changes)
#    >>>>>>> feature/xxx

# 3. Edit to keep correct code, remove markers

# 4. Mark resolved
git add <resolved-file>
git commit -m "Resolved merge conflict in <file>"
```

**If unsure:** Ask Joe (CTO) before resolving.

---

## Current Branch Status Check

```bash
# See all branches
git branch -a

# See which branch you're on
git branch --show-current

# See commits ahead/behind main
git log main..HEAD --oneline   # Your commits not in main
git log HEAD..main --oneline   # Main commits not in your branch
```

---

## Emergency: Undo Last Commit (Not Pushed)

```bash
# Undo commit, keep changes staged
git reset --soft HEAD~1

# Undo commit, unstage changes
git reset HEAD~1

# Undo commit AND discard changes (DANGEROUS)
git reset --hard HEAD~1
```

---

## Daily Checklist

- [ ] `git pull origin main` before starting
- [ ] Create/switch to correct feature branch
- [ ] Commit frequently with task ID in message
- [ ] Push to remote before ending session
- [ ] Update TEAM_INBOX.md with status

---

## Restricted Actions (Joe Only)

- Merging to `main`
- Force push (`git push --force`)
- Deleting branches on remote
- Resolving complex conflicts

---

## Quick Reference Card

```
START TASK:     git checkout main && git pull && git checkout -b feature/XXX
SAVE WORK:      git add -A && git commit -m "XXX: description"
PUSH:           git push -u origin feature/XXX
SWITCH BRANCH:  git checkout feature/XXX
SEE CHANGES:    git diff
SEE STATUS:     git status
SEE BRANCHES:   git branch -a
```
