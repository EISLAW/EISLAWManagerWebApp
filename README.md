# EISLAW System

**Last Updated:** 2025-12-05

Legal practice management system with privacy assessments, client management, and RAG-powered insights.

---

## Quick Start (Azure VM)

```bash
# Connect to development VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Start services
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 up -d api web-dev meili
```

**Access URLs:**
- Frontend (dev): http://20.217.86.4:5173
- Frontend (prod): http://20.217.86.4:8080
- API: http://20.217.86.4:8799
- API Docs: http://20.217.86.4:8799/docs

---

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| **Clients** | Production | Client registry, files, emails, tasks |
| **PrivacyExpress** | Pilot Ready | Questionnaire -> scoring -> report |
| **RAG** | Development | Transcripts, search, insights |
| **Dashboard** | Planned | Unified task/email view |

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/README.md](docs/README.md) | Project index |
| [docs/AGENT_BOOT.md](docs/AGENT_BOOT.md) | Session start |
| [docs/WORKING_MEMORY.md](docs/WORKING_MEMORY.md) | Current state |
| [docs/NEXT_ACTIONS.md](docs/NEXT_ACTIONS.md) | Task queue |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Release notes |
| [docs/TECHNICAL_OVERVIEW.md](docs/TECHNICAL_OVERVIEW.md) | Technical details |

---

## Development

### Requirements
- Docker + docker-compose-v2
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Local Development
```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8799
```

### Hot Reload
Both frontend (Vite) and backend (uvicorn) support hot-reload on the VM.
Changes apply instantly without rebuild.

### When Rebuild IS Needed
- New Python dependencies in requirements.txt
- Dockerfile changes

```bash
/usr/local/bin/docker-compose-v2 up -d --build api
```

---

## Infrastructure

### Azure VM
| Parameter | Value |
|-----------|-------|
| IP | 20.217.86.4 |
| User | azureuser |
| SSH Key | ~/.ssh/eislaw-dev-vm.pem |
| OS | Ubuntu 22.04 |
| Location | Israel Central |

### Services
| Service | Port |
|---------|------|
| Frontend (prod) | 8080 |
| Frontend (dev) | 5173 |
| API | 8799 |
| Meilisearch | 7700 |
| Grafana | 3000 (tunnel) |
| Prometheus | 9090 (tunnel) |

---

## Key Files

| Item | Path |
|------|------|
| Backend Entry | backend/main.py |
| Frontend Entry | frontend/src/App.jsx |
| Secrets | secrets.local.json (NOT committed) |
| Scoring Rules | config/security_scoring_rules.json |
| Docker Compose | docker-compose.yml |

---

## GitHub Repository

- **Remote**: https://github.com/EISLAW/EISLAWManagerWebApp
- **Branch**: main

```bash
git status
git add .
git commit -m "Description"
git pull --rebase origin main
git push origin main
```
