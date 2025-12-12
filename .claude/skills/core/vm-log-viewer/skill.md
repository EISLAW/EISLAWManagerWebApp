# VM Log Viewer

**Purpose:** Quick SSH access to Azure VM logs for debugging and verification.

**When to use:** Debugging container issues, checking deployment success, monitoring errors, or smoke testing after push.

## VM Connection Details

| Parameter | Value |
|-----------|-------|
| **IP Address** | `20.217.86.4` |
| **Username** | `azureuser` |
| **SSH Key (WSL)** | `~/.ssh/eislaw-dev-vm.pem` |
| **SSH Key (Windows)** | `C:\Coding Projects\eislaw-dev-vm_key.pem` |
| **Project Path** | `~/EISLAWManagerWebApp` |
| **Default Branch** | `dev-main-2025-12-11` |

## Quick Commands

### Connect to VM
```bash
# From WSL (recommended)
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Navigate to project
cd ~/EISLAWManagerWebApp
```

### View Logs

**Tail logs (live updates):**
```bash
/usr/local/bin/docker-compose-v2 logs -f api
/usr/local/bin/docker-compose-v2 logs -f web-dev
/usr/local/bin/docker-compose-v2 logs -f orchestrator
```

**Last N lines:**
```bash
/usr/local/bin/docker-compose-v2 logs --tail=50 api
/usr/local/bin/docker-compose-v2 logs --tail=100 api
```

**Search logs for errors:**
```bash
/usr/local/bin/docker-compose-v2 logs api | grep -i error
/usr/local/bin/docker-compose-v2 logs api | grep -i exception
/usr/local/bin/docker-compose-v2 logs api | grep "500"
```

**All services:**
```bash
/usr/local/bin/docker-compose-v2 logs --tail=20
```

### Container Status

**List running containers:**
```bash
/usr/local/bin/docker-compose-v2 ps
docker ps
```

**Check container health:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Restart Services

**Restart specific service:**
```bash
/usr/local/bin/docker-compose-v2 restart api
/usr/local/bin/docker-compose-v2 restart web-dev
/usr/local/bin/docker-compose-v2 restart orchestrator
```

**Restart all services:**
```bash
/usr/local/bin/docker-compose-v2 restart
```

**Rebuild and restart (after requirements.txt or Dockerfile change):**
```bash
/usr/local/bin/docker-compose-v2 up -d --build api
/usr/local/bin/docker-compose-v2 up -d --build web-dev
```

### Verify Sync

**Check latest commit on VM:**
```bash
cd ~/EISLAWManagerWebApp
git log --oneline -1
git status
git branch --show-current
```

**Verify branch matches local:**
```bash
git log --oneline -5
```

### Smoke Tests

**API health check:**
```bash
curl http://localhost:8799/health
```

**Check if services are listening:**
```bash
netstat -tulpn | grep 8799   # API
netstat -tulpn | grep 5173   # Frontend dev
netstat -tulpn | grep 7700   # Meilisearch
```

## Running Services (Port Reference)

| Service | Port | URL |
|---------|------|-----|
| Frontend (dev) | 5173 | `http://20.217.86.4:5173` |
| Frontend (prod) | 8080 | `http://20.217.86.4:8080` |
| API | 8799 | `http://20.217.86.4:8799` |
| Meilisearch | 7700 | `http://20.217.86.4:7700` |
| Orchestrator | 8801 | `http://20.217.86.4:8801` (internal) |
| Grafana | 3000 | Tunnel only |
| Prometheus | 9090 | Tunnel only |

## Common Issues

**SSH permission denied:**
```bash
# Fix key permissions (WSL)
chmod 400 ~/.ssh/eislaw-dev-vm.pem
```

**Container not running:**
```bash
# Check status
/usr/local/bin/docker-compose-v2 ps

# Start service
/usr/local/bin/docker-compose-v2 up -d api
```

**Logs show "Permission denied":**
- May need rebuild: `/usr/local/bin/docker-compose-v2 up -d --build api`

**Port not listening:**
- Check container logs for startup errors
- Verify docker-compose.yml port mapping

## Monitoring Tunnel Access

For Grafana/Prometheus (requires SSH tunnel):
```bash
# From WSL
wsl -e bash -c "ssh -i ~/.ssh/eislaw-dev-vm.pem -L 3000:localhost:3000 -L 9090:localhost:9090 -N -f azureuser@20.217.86.4"

# Then access locally:
# Grafana: http://localhost:3000 (admin/eislaw2024)
# Prometheus: http://localhost:9090
```

## References

- Full port list: `docs/DEV_PORTS.md`
- VM setup details: `CLAUDE.md` §1D, §1E
- Monitoring stack: `CLAUDE.md` §1E
