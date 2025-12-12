# VM Log Viewer

**Category:** core
**Created:** 2025-12-12
**Author:** Alex

---

## Description

Quick commands to SSH to Azure VM and view Docker container logs. Essential for debugging production issues, monitoring deployments, and verifying feature behavior on VM.

---

## When to Use

- Debugging errors on VM
- Verifying deployment succeeded
- Monitoring real-time application behavior
- Investigating user-reported issues
- Checking startup/shutdown logs
- Reviewing API request/response logs

---

## Prerequisites

- SSH key: `~/.ssh/eislaw-dev-vm.pem` (WSL path)
- VM IP: `20.217.86.4`
- VM username: `azureuser`
- VM project path: `~/EISLAWManagerWebApp`

---

## Steps

### Step 1: SSH to VM

```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
```

**From Windows (using WSL):**
```bash
wsl -e bash -c "ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4"
```

### Step 2: Navigate to Project

```bash
cd ~/EISLAWManagerWebApp
```

### Step 3: View Logs

**List running containers:**
```bash
/usr/local/bin/docker-compose-v2 ps
```

**View specific container logs:**
```bash
# API logs (most common)
/usr/local/bin/docker-compose-v2 logs api

# Frontend dev logs
/usr/local/bin/docker-compose-v2 logs web-dev

# Frontend prod logs
/usr/local/bin/docker-compose-v2 logs web

# Meilisearch logs
/usr/local/bin/docker-compose-v2 logs meili

# All logs
/usr/local/bin/docker-compose-v2 logs
```

**Tail logs (follow mode):**
```bash
# Follow API logs in real-time
/usr/local/bin/docker-compose-v2 logs api -f

# Last 100 lines + follow
/usr/local/bin/docker-compose-v2 logs api --tail=100 -f
```

**Filter logs:**
```bash
# Show only errors
/usr/local/bin/docker-compose-v2 logs api | grep -i error

# Show last 50 lines with errors
/usr/local/bin/docker-compose-v2 logs api --tail=50 | grep -i error

# Search for specific term
/usr/local/bin/docker-compose-v2 logs api | grep "client_id"
```

### Step 4: Exit SSH

```bash
exit
# or Ctrl+D
```

---

## Success Criteria

- [ ] Successfully connected to VM via SSH
- [ ] Navigated to project directory
- [ ] Viewed logs for target container
- [ ] Identified relevant log entries
- [ ] Exited SSH session cleanly

---

## Examples

### Example 1: Check API Errors After Deployment

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Navigate to project
cd ~/EISLAWManagerWebApp

# Check last 100 API logs for errors
/usr/local/bin/docker-compose-v2 logs api --tail=100 | grep -i error

# If errors found, view full context
/usr/local/bin/docker-compose-v2 logs api --tail=200

# Exit
exit
```

### Example 2: Monitor Real-Time API Requests

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Navigate to project
cd ~/EISLAWManagerWebApp

# Follow API logs in real-time
/usr/local/bin/docker-compose-v2 logs api -f

# Press Ctrl+C to stop following, then exit
exit
```

### Example 3: Debug Frontend Build Issues

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Navigate to project
cd ~/EISLAWManagerWebApp

# Check frontend dev logs
/usr/local/bin/docker-compose-v2 logs web-dev --tail=200

# Check if container is running
/usr/local/bin/docker-compose-v2 ps | grep web-dev

# Exit
exit
```

### Example 4: One-Liner from Local Machine

```bash
# View last 50 API logs without staying in SSH session
wsl -e bash -c "ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4 'cd ~/EISLAWManagerWebApp && /usr/local/bin/docker-compose-v2 logs api --tail=50'"
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SSH connection refused | Verify VM is running, check IP (20.217.86.4), verify SSH key path |
| Permission denied (SSH key) | Check key permissions: `chmod 600 ~/.ssh/eislaw-dev-vm.pem` |
| docker-compose-v2 not found | Use full path: `/usr/local/bin/docker-compose-v2` (NOT `docker-compose`) |
| Container not running | Check status: `docker-compose-v2 ps`, start if needed: `docker-compose-v2 up -d api` |
| Logs too large | Use `--tail=N` to limit output (e.g., `--tail=100`) |
| Can't find specific error | Use grep with context: `grep -C 5 "error_term"` (5 lines before/after) |
| Logs truncated | Check Docker log size limit, may need to clear old logs |

---

## Quick Reference Commands

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# After SSH, navigate to project
cd ~/EISLAWManagerWebApp

# Common log commands
/usr/local/bin/docker-compose-v2 logs api --tail=50              # Last 50 lines
/usr/local/bin/docker-compose-v2 logs api -f                    # Follow (real-time)
/usr/local/bin/docker-compose-v2 logs api | grep -i error       # Filter errors
/usr/local/bin/docker-compose-v2 logs api | grep "client_id"   # Search term
/usr/local/bin/docker-compose-v2 ps                              # Running containers

# Container management
/usr/local/bin/docker-compose-v2 restart api                    # Restart API
/usr/local/bin/docker-compose-v2 up -d --build api              # Rebuild & restart
/usr/local/bin/docker-compose-v2 down                           # Stop all
/usr/local/bin/docker-compose-v2 up -d                          # Start all
```

---

## Service Ports (Quick Reference)

| Service | Port | URL |
|---------|------|-----|
| Frontend (dev) | 5173 | http://20.217.86.4:5173 |
| Frontend (prod) | 8080 | http://20.217.86.4:8080 |
| API | 8799 | http://20.217.86.4:8799/docs |
| Meilisearch | 7700 | http://20.217.86.4:7700 |
| Grafana | 3000 | SSH tunnel only |
| Langfuse | 3001 | http://20.217.86.4:3001 |

---

## References

- VM details: CLAUDE.md §3
- Port reference: `docs/DEV_PORTS.md`
- Docker compose file: `docker-compose.yml` (in project root)
- Local dev workflow: `.claude/skills/core/local-dev-workflow/SKILL.md`
