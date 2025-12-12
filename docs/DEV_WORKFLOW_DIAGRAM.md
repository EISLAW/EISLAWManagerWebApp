# Development Workflow Diagram (As of 2025-12-11)

## Local → GitHub → VM Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Developer (Local Windows)                                        │
│ Location: C:\Coding Projects\EISLAW System Clean\               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 1. git push origin feature/TASK-ID
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Repository                                                │
│ Default Branch: dev-main-2025-12-11                             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 2. GitHub Action triggers on push
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ VM Webhook / SSH Pull                                           │
│ Script: invoked by ENV-002 (location: VM service, pull + restart)│
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 3. Pull latest code
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Azure VM (20.217.86.4)                                          │
│ Location: ~/EISLAWManagerWebApp                                 │
│ Services: api, web-dev, meili (hot-reload enabled)              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 4. Auto-restart services
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Live URLs                                                        │
│ - Frontend (dev): http://20.217.86.4:5173                       │
│ - API: http://20.217.86.4:8799                                  │
└─────────────────────────────────────────────────────────────────┘
```

## When to Use What

| Scenario | Tool | Command |
|----------|------|---------|
| Normal development | Local + git push | `git push origin feature/TASK-ID` |
| View logs | SSH to VM | `ssh azureuser@20.217.86.4` then `/usr/local/bin/docker-compose-v2 logs api -f` |
| Smoke test after push | Browser | `http://20.217.86.4:5173` |
| Debug container | SSH to VM | `/usr/local/bin/docker-compose-v2 ps` |
| Hot-reload not working | SSH to VM | `/usr/local/bin/docker-compose-v2 restart api` |

## Developer Experience

**Before (VM-first):**
1. SSH to VM
2. Edit files on VM
3. Test on VM
4. Git commit/push from VM

**After (Local-first):**
1. Edit files locally (VS Code, etc.)
2. Test locally (optional: `npm run dev`)
3. Git commit/push from local
4. Auto-syncs to VM via GitHub Action + VM pull
5. Verify on VM URLs
