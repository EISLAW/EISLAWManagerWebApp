# Local Development Workflow

**Category:** core
**Created:** 2025-12-12
**Author:** Alex

---

## Description

Guide for local-first development with automatic sync to Azure VM. Work locally in `C:\Coding Projects\EISLAW System Clean\`, push to GitHub, and auto-deploy to VM via GitHub Actions. This replaces the old VM-first workflow (deprecated 2025-12-11).

---

## When to Use

- Starting a new feature or bug fix
- Any code development task
- Setting up development environment
- Resuming work after a break
- Onboarding new team members

---

## Prerequisites

- Local working copy: `C:\Coding Projects\EISLAW System Clean\`
- Git configured with GitHub access
- Node.js and Python installed locally
- SSH access to VM (for verification only, not for editing)

---

## Steps

### Step 1: Switch to Base Branch

```bash
cd "C:\Coding Projects\EISLAW System Clean"
git checkout main
git pull origin main
```

**Note:** `main` is the default branch. If working from `dev-main-2025-12-11`, use that instead.

### Step 2: Create Feature Branch

```bash
git checkout -b feature/TASK-ID
```

**Example:**
```bash
git checkout -b feature/CLI-009
```

### Step 3: Develop Locally

Make your changes in the local working copy:
- Frontend: `frontend/src/`
- Backend: `backend/`
- Docs: `docs/`

**Hot Reload (if running locally):**
```bash
# Frontend dev server
cd frontend && npm run dev

# Backend dev server
cd backend && uvicorn main:app --reload
```

### Step 4: Commit Changes

```bash
git add .
git commit -m "TASK-ID: Brief description of changes"
```

**Example:**
```bash
git add .
git commit -m "CLI-009: Add GET /clients endpoint with sort=name"
```

### Step 5: Push to GitHub

```bash
git push origin feature/TASK-ID
```

**First push:**
```bash
git push -u origin feature/TASK-ID
```

### Step 6: Auto-Sync to VM

GitHub Actions will automatically:
1. Detect push to `feature/**` or `main` branch
2. SSH to Azure VM (20.217.86.4)
3. Pull latest code
4. Rebuild affected Docker containers
5. Restart services

**Monitor sync:** Check GitHub Actions tab in repository.

### Step 7: Verify on VM

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Check services
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 ps

# View logs
/usr/local/bin/docker-compose-v2 logs api -f
```

**Test in browser:**
- Frontend dev: http://20.217.86.4:5173
- Frontend prod: http://20.217.86.4:8080
- API: http://20.217.86.4:8799/docs

---

## Success Criteria

- [ ] Feature branch created from latest `main`
- [ ] Changes committed with clear message
- [ ] Pushed to GitHub successfully
- [ ] GitHub Actions workflow completed (green check)
- [ ] Services running on VM
- [ ] Changes visible at VM URLs
- [ ] No errors in Docker logs

---

## Examples

### Example 1: Simple Bug Fix

```bash
# Start
cd "C:\Coding Projects\EISLAW System Clean"
git checkout main && git pull
git checkout -b feature/BUG-042

# Fix bug in backend/api/clients.py
# (Edit locally)

# Commit and push
git add backend/api/clients.py
git commit -m "BUG-042: Fix client archive filter"
git push -u origin feature/BUG-042

# Verify on VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 logs api --tail=50
```

### Example 2: New Feature with Frontend + Backend

```bash
# Start
cd "C:\Coding Projects\EISLAW System Clean"
git checkout main && git pull
git checkout -b feature/CLI-012

# Develop locally
# (Edit backend/api/clients.py)
# (Edit frontend/src/pages/ClientDetail.jsx)

# Test locally (optional)
cd backend && uvicorn main:app --reload &
cd ../frontend && npm run dev &

# Commit and push
git add .
git commit -m "CLI-012: Add client notes section"
git push -u origin feature/CLI-012

# Verify on VM
# Open http://20.217.86.4:5173/clients/123
```

### Example 3: Documentation Update

```bash
# Start
cd "C:\Coding Projects\EISLAW System Clean"
git checkout main && git pull
git checkout -b feature/DOC-007

# Update docs
# (Edit docs/API_ENDPOINTS_INVENTORY.md)

# Commit and push
git add docs/
git commit -m "DOC-007: Update API endpoints inventory"
git push -u origin feature/DOC-007

# No VM verification needed (docs only)
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Git push rejected | Run `git pull origin feature/TASK-ID` first, resolve conflicts |
| GitHub Actions failing | Check Actions tab, review logs, fix errors locally and push again |
| Changes not on VM | Verify GitHub Actions completed, SSH to VM and manually pull if needed |
| Hot reload not working | Restart local dev servers, check for syntax errors |
| Cannot SSH to VM | Check `~/.ssh/eislaw-dev-vm.pem` exists, verify VM IP (20.217.86.4) |
| Docker containers not rebuilding | Check `docker-compose-v2 logs`, manually rebuild: `docker-compose-v2 up -d --build api` |

---

## Quick Reference Commands

```bash
# Standard workflow
cd "C:\Coding Projects\EISLAW System Clean"
git checkout main && git pull
git checkout -b feature/TASK-ID
# ... make changes ...
git add . && git commit -m "TASK-ID: description"
git push -u origin feature/TASK-ID

# SSH to VM (verification only)
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# View logs on VM
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 logs api -f

# Manual sync (if GitHub Actions failed)
cd ~/EISLAWManagerWebApp
git fetch origin
git checkout feature/TASK-ID
git pull origin feature/TASK-ID
/usr/local/bin/docker-compose-v2 up -d --build api
```

---

## References

- Full workflow diagram: `docs/DEV_WORKFLOW_DIAGRAM.md`
- ENV implementation plan: `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md`
- GitHub Actions workflow: `.github/workflows/sync_to_vm.yml`
- Sync script: `tools/remote_sync.sh`
- CLAUDE.md workflow section: CLAUDE.md §1D
- VM details: `docs/DEV_PORTS.md`
