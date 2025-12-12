# Local Development Workflow

**Purpose:** Guide local-first development with auto-sync to Azure VM.

**When to use:** Starting work on a new task, setting up local environment, or understanding the dev→VM sync flow.

## Quick Start

### 1. Set Up Local Environment
```bash
cd "C:\Coding Projects\EISLAW System Clean"
git checkout dev-main-2025-12-11
git pull origin dev-main-2025-12-11
```

### 2. Create Feature Branch
```bash
git checkout -b feature/TASK-ID
```

### 3. Install Dependencies (if needed)
```bash
# Frontend
cd frontend
npm install

# Backend (if adding Python packages)
cd ..
pip install -r requirements.txt
```

### 4. Make Changes Locally
- Edit code in your local working copy
- Test locally if possible
- Do NOT SSH to VM to edit code

### 5. Commit and Push
```bash
git add .
git commit -m "TASK-ID: Brief description"
git push origin feature/TASK-ID
```

**This triggers automatic sync to VM:**
- GitHub Action runs on push
- VM pulls latest code via SSH
- Docker containers rebuild if needed (hot-reload for most changes)

### 6. Verify on VM
Check your changes at:
- Frontend (dev): http://20.217.86.4:5173
- Frontend (prod): http://20.217.86.4:8080
- API: http://20.217.86.4:8799

## When to SSH to VM

**Only SSH for verification, NOT for editing code:**
- View logs: `ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4`
- Check container status: `/usr/local/bin/docker-compose-v2 ps`
- Tail logs: `/usr/local/bin/docker-compose-v2 logs -f api`
- Restart service: `/usr/local/bin/docker-compose-v2 restart api`
- Smoke test after deployment

## Hot Reload

Most changes don't require rebuild:
- Frontend: Vite HMR (instant)
- API: uvicorn --reload (instant)
- Orchestrator: uvicorn --reload (instant)

**When rebuild IS needed:**
- `requirements.txt` changed: `/usr/local/bin/docker-compose-v2 up -d --build api`
- `Dockerfile` changed: rebuild required
- `package.json` changed: rebuild frontend

## References

- Full workflow diagram: `docs/DEV_WORKFLOW_DIAGRAM.md`
- ENV plan: `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md`
- VM details: `CLAUDE.md` §1D
- TEAM_INBOX: "Development Workflow (UPDATED 2025-12-11)" section

## Common Issues

**Push doesn't trigger sync:**
- Check GitHub Actions tab for errors
- Verify branch name matches pattern (dev-main-2025-12-11 or feature/*)

**Changes not appearing on VM:**
- Wait 2-3 minutes for sync to complete
- Check VM logs: `ssh azureuser@20.217.86.4 "cd ~/EISLAWManagerWebApp && git log -1"`

**Hot reload not working:**
- Restart container: `/usr/local/bin/docker-compose-v2 restart {service}`
- Check logs for errors: `/usr/local/bin/docker-compose-v2 logs {service}`
