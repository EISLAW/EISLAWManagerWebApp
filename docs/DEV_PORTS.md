# Port Bible

**Owner:** Jane (DevOps)
**Last Updated:** 2025-12-09
**VM IP:** `20.217.86.4`

> **Single source of truth for all service ports on the Azure VM.**

---

## Active Services

| Port | Service | Container | URL | Hot Reload | NSG Open | Notes |
|------|---------|-----------|-----|------------|----------|-------|
| **5173** | Frontend (dev) | `web-dev` | http://20.217.86.4:5173 | ✅ Vite HMR | ✅ | Dev server |
| **8080** | Frontend (prod) | `web-prod` | http://20.217.86.4:8080 | ❌ N/A | ✅ | Static build |
| **8799** | API (FastAPI) | `api` | http://20.217.86.4:8799 | ✅ uvicorn | ✅ | Main backend |
| **8000** | MkDocs Wiki | `docs` | http://20.217.86.4:8000 | ❌ N/A | ✅ | nginx serving site/ · **Auto-rebuilds** on push to main/feature/** |
| **8801** | Orchestrator | `orchestrator` | http://20.217.86.4:8801 | ❌ **INF-001** | ✅ | Agent framework POC |
| **7700** | Meilisearch | `meili` | http://20.217.86.4:7700 | ❌ N/A | ✅ | Search engine |
| **3001** | Langfuse | `langfuse` | http://20.217.86.4:3001 | ❌ N/A | ✅ | LLM observability |
| **3000** | Grafana | `grafana` | SSH tunnel only | ❌ N/A | ❌ | Metrics (internal) |

---

## Reserved Ports (Future)

| Port | Service | Status |
|------|---------|--------|
| **8800** | VM Host Exec | Planned (AOS-012) |
| **9090** | Prometheus | Reserved |
| **9190** | Minio (Langfuse) | Internal |

---

## Port Families

| Range | Purpose |
|-------|---------|
| 3000-3999 | Dashboards & observability (Grafana, Langfuse) |
| 5000-5999 | Development servers (Vite) |
| 7000-7999 | Search & indexing (Meilisearch) |
| 8000-8099 | Documentation & static sites |
| 8700-8899 | Application services (API, orchestrator) |
| 9000-9199 | Infrastructure (Prometheus, Minio) |

---

## Quick Access

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Check what's running
docker ps --format "table {{.Names}}\t{{.Ports}}"

# Check specific port
lsof -i :8799

# Grafana tunnel (local access)
ssh -i ~/.ssh/eislaw-dev-vm.pem -L 3000:localhost:3000 -N azureuser@20.217.86.4
```

---

## Docker Compose Services

| Service Name | Internal Port | External Port | Health Check |
|--------------|---------------|---------------|--------------|
| `api` | 8799 | 8799 | `/api/health` |
| `web-dev` | 5173 | 5173 | HTTP 200 |
| `web-prod` | 8080 | 8080 | HTTP 200 |
| `docs` | 80 | 8000 | HTTP 200 |
| `orchestrator` | 8801 | 8801 | `/health` |
| `meili` | 7700 | 7700 | `/health` |

---

## Rules

1. **No port conflicts** - Check before adding new service
2. **Fixed ports** - Don't auto-bump; resolve conflicts explicitly
3. **Document new ports** - Update this file when adding services
4. **Internal vs External** - Some services (Grafana) are SSH tunnel only for security

---

*Update this file when adding/changing ports. See CLAUDE.md §8 for doc update rules.*
