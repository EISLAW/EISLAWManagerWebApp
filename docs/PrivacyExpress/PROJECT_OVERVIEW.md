<!-- Project: EISLAW Web App | Full Context: ../System_Definition.md -->
# EISLAW Web App — Project Overview (Canonical System Overview)

last_reviewed: 2025-12-12
change_summary: Rebranded from "PrivacyExpress" partner brief into a canonical EISLAW Web App overview; updated doc references and added module links.
related_to: DOC-007

Audience: stakeholders, operators, and new engineers.

Start here:
- Docs index: [INDEX.md](../INDEX.md)
- System definition: [System_Definition.md](../System_Definition.md)
- Dev ports (VM): [DEV_PORTS.md](../DEV_PORTS.md)
- API inventory (canonical): [API_ENDPOINTS_INVENTORY.md](../API_ENDPOINTS_INVENTORY.md)
- Data stores (canonical): [DATA_STORES.md](../DATA_STORES.md)
- UI controls + test IDs: [UX_UI/Controls_Map.md](../UX_UI/Controls_Map.md)

Note: This file currently lives under `docs/PrivacyExpress/` for historical reasons; DOC-008 moves it to the top-level MkDocs entrypoint.

---

## 1) Executive Summary

The **EISLAW Web App** is EISLAW’s internal operations platform: client registry, work/task management, knowledge ingestion (RAG), AI-assisted workflows, and the Privacy deliverable pipeline.

**Goals**
- One place to manage clients, tasks, email, and knowledge
- Ship safely on a single VM with reproducible Docker deploys
- Keep auditability: actions and state changes are trackable
- Support RTL Hebrew UI and client-facing outputs

---

## 2) Modules (Product Areas)

| Module | What it covers | Key docs |
|---|---|---|
| Clients | Client registry, detail view, archive/restore, SharePoint linking | [Clients Spec](../CLIENTS_FEATURES_SPEC.md), [Client Detail PRD](../PRD_CLIENT_DETAIL_ENHANCEMENT.md) |
| Tasks | Task board/widgets, due dates, priorities, dashboard work view | [Dashboard Redesign PRD](../PRD_DASHBOARD_REDESIGN.md), [TaskManagement Figma Sync](../TaskManagement/FIGMA_SYNC.md) |
| Privacy (formerly “PrivacyExpress”) | Questionnaire → review → report/email deliverables | [Privacy Project Index](README.md), [Privacy MVP PRD](../PRD_PRIVACY_MVP.md), [QA Tab Redesign PRD](../PRD_PRIVACY_QA_REDESIGN.md), [Purchase Flow PRD](../PRD_PRIVACY_PURCHASE_FLOW.md) |
| RAG / Insights | Inbox ingestion, transcripts, publishing, search/insights | [RAG Spec](../RAG_FEATURES_SPEC.md), [Insights RAG PRD](../INSIGHTS_RAG_PRD.md) |
| AI Studio | Command center for AI tools/agents and workflows | [Agent Orchestration Status](../AGENT_ORCHESTRATION_STATUS.md), [AI Studio Tools Task](../TASK_ALEX_AI_STUDIO_TOOLS.md) |
| Marketing | Content ops, voice, prompt library, form optimization | [MarketingOps](../MarketingOps/README.md), [Voice of Brand](../MarketingOps/VOICE_OF_BRAND.md) |

---

## 3) Current Development Status (December 2025)

### 3.1 Infrastructure (Azure VM)
- **Production VM**: `20.217.86.4` (Ubuntu 22.04, Israel Central)
- **Services Running**:
  - Frontend (prod): port 8080
  - Frontend (dev): port 5173 (hot-reload)
  - API: port 8799
  - Meilisearch: port 7700
  - Docs (MkDocs site via nginx): port 8000
- **Deployment**: Docker containers with docker-compose-v2
- **Hot-Reload**: backend (uvicorn --reload) and frontend (Vite) support instant changes

### 3.2 Recent Completions
| Area | Status | Notes |
|------|--------|-------|
| Zoom Cloud Recordings | Done | Full sync, audio/video filters, bulk download, transcript editing |
| Quote Templates UI | Done | Full CRUD at /settings/quotes, preview modal, categories |
| Client Archive | Done | Active/archived clients + related UX/test coverage |
| Email Sync | Done | Microsoft Graph integration, per-client sync |
| SharePoint Integration | Done | Client folder linking via Graph API |
| Tasks Backend | Done | CRUD endpoints, due dates, priorities |

### 3.3 Active Development
| Focus | Priority | Doc |
|------|----------|-----|
| Dashboard Redesign | HIGH | [PRD_DASHBOARD_REDESIGN.md](../PRD_DASHBOARD_REDESIGN.md) |
| AI Studio | HIGH | [AGENT_ORCHESTRATION_STATUS.md](../AGENT_ORCHESTRATION_STATUS.md) / [TASK_ALEX_AI_STUDIO_TOOLS.md](../TASK_ALEX_AI_STUDIO_TOOLS.md) |
| Privacy QA Redesign | HIGH | [PRD_PRIVACY_QA_REDESIGN.md](../PRD_PRIVACY_QA_REDESIGN.md) |
| Privacy Purchase Flow | HIGH | [PRD_PRIVACY_PURCHASE_FLOW.md](../PRD_PRIVACY_PURCHASE_FLOW.md) |
| SQLite Migration | HIGH | [PRD_SQLITE_MIGRATION.md](../PRD_SQLITE_MIGRATION.md) |

---

## 4) High-Level Architecture

- **Frontend (React + Vite)**: primary UI (clients, tasks, privacy, RAG, marketing)
- **Backend (FastAPI)**: API surface for all modules
- **Search / Indexing**: Meilisearch
- **Data**: mixture of SQLite (target), Airtable (legacy), and external service data
- **Key integrations**:
  - Microsoft Graph (email + SharePoint)
  - Fillout (privacy questionnaire submissions)
  - Zoom (recordings/transcripts)
  - WordPress/WooCommerce (privacy purchase flow)

For authoritative references, use:
- API inventory: [API_ENDPOINTS_INVENTORY.md](../API_ENDPOINTS_INVENTORY.md)
- Data stores: [DATA_STORES.md](../DATA_STORES.md)

---

## 5) Operations

### VM Connection
```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
```

### Start Dev Services
```bash
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 up -d api web-dev meili
```

### Build Docs Site (writes to ./site)
```bash
cd ~/EISLAWManagerWebApp
~/.local/bin/mkdocs build
```

### View Logs
```bash
/usr/local/bin/docker-compose-v2 logs -f api      # Backend
/usr/local/bin/docker-compose-v2 logs -f web-dev  # Frontend
```

### Test URLs
- Frontend (dev): http://20.217.86.4:5173
- Frontend (prod): http://20.217.86.4:8080
- API: http://20.217.86.4:8799
- Docs: http://20.217.86.4:8000

---

## 6) Success Criteria

- Fast daily operations: client and task workflows feel instantaneous
- Reliable sync: email/SharePoint/RAG ingestion runs without silent failures
- Documentation stays usable: canonical inventories stay current (API + data stores)
- Privacy deliverable quality: reviewer can approve/override and send within minutes; accuracy improves over time
- Zero data loss: important state changes are recorded and recoverable

---

## 7) Documentation Index

| Document | Purpose |
|----------|---------|
| [INDEX.md](../INDEX.md) | Main docs index |
| [System_Definition.md](../System_Definition.md) | System boundaries and definitions |
| [DEV_PORTS.md](../DEV_PORTS.md) | Ports/services map for the VM |
| [API_ENDPOINTS_INVENTORY.md](../API_ENDPOINTS_INVENTORY.md) | Canonical API list |
| [DATA_STORES.md](../DATA_STORES.md) | Canonical data stores + schema links |
| [CLIENTS_FEATURES_SPEC.md](../CLIENTS_FEATURES_SPEC.md) | Clients module spec |
| [RAG_FEATURES_SPEC.md](../RAG_FEATURES_SPEC.md) | RAG module spec |
| [PRD_DASHBOARD_REDESIGN.md](../PRD_DASHBOARD_REDESIGN.md) | Tasks/Dashboard redesign plan |
| [AGENT_ORCHESTRATION_STATUS.md](../AGENT_ORCHESTRATION_STATUS.md) | AI Studio / agent orchestration status |
| [MarketingOps/README.md](../MarketingOps/README.md) | Marketing module docs |
| [DEPLOY_RUNBOOK.md](../DEPLOY_RUNBOOK.md) | Deployment procedures |
| [Testing_Episodic_Log.md](../Testing_Episodic_Log.md) | Lessons learned |

---

If any resource mentioned here is missing, respond in the session with: `Missing resource: <path>. Please add or re-link.`
