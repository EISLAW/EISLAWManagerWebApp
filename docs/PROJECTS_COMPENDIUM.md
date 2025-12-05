# Projects Compendium

**Last Updated:** 2025-12-05

> **Working copy:** Use the Azure VM at `20.217.86.4` for development (see section below).
> Local reference: `/mnt/c/Coding Projects/EISLAW System Clean` (origin `github.com/EISLAW/EISLAWManagerWebApp`).
> The older `EISLAW System` folder is archive/reference only.

## Purpose
One place to navigate all active projects and their key documents, grouped by project/module.

---

## Development Environment (Azure VM)

| Parameter | Value |
|-----------|-------|
| **IP Address** | `20.217.86.4` |
| **Username** | `azureuser` |
| **SSH Key (WSL)** | `~/.ssh/eislaw-dev-vm.pem` |
| **Project Path** | `~/EISLAWManagerWebApp` |

### Running Services
| Service | Port | URL |
|---------|------|-----|
| Frontend (prod) | 8080 | `http://20.217.86.4:8080` |
| Frontend (dev) | 5173 | `http://20.217.86.4:5173` |
| API | 8799 | `http://20.217.86.4:8799` |
| Meilisearch | 7700 | `http://20.217.86.4:7700` |
| Grafana | 3000 | Via SSH tunnel |

### Quick Connect
```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 up -d api web-dev meili
```

---

## EISLAW System (Web Interface + Services)

### Core Documentation
| Document | Path | Purpose |
|----------|------|---------|
| Index | docs/INDEX.md | Master navigation |
| Changelog | docs/CHANGELOG.md | Dated release notes |
| Next Actions | docs/NEXT_ACTIONS.md | Prioritized task queue |
| Working Memory | docs/WORKING_MEMORY.md | Current state |
| Episodic Log | docs/Testing_Episodic_Log.md | Lessons learned |

### Setup & Operations
| Document | Path | Purpose |
|----------|------|---------|
| Agent Boot | docs/AGENT_BOOT.md | Session start |
| Dev Setup | docs/DEV_SETUP.md | Local running |
| Docker Setup | docs/DOCKER_SETUP.md | Container deployment |
| Deploy Runbook | docs/DEPLOY_RUNBOOK.md | Azure deployment |
| Session Readiness | docs/SESSION_READINESS.md | Preflight checks |

### Integrations
| Document | Path | Purpose |
|----------|------|---------|
| Integrations | docs/Integrations.md | Fillout, Airtable, Graph, LLMs |
| MCP Bridge | docs/MCP_BRIDGE.md | MCP server setup |
| MCP Sources | docs/MCP_SOURCES.md | Available MCP tools |
| SharePoint | docs/SHAREPOINT_CONNECTION.md | SP integration |

---

## Clients Module (Active)

**Status:** Production Ready

### Features (December 2025)
- Client list with search and filters
- Active/Archived client management
- Email sync via Microsoft Graph
- SharePoint folder linking
- Tasks backend (CRUD, due dates, priorities)
- Quote templates management UI

### Key Files
| Component | Path |
|-----------|------|
| Client List | frontend/src/pages/Clients/ClientsList.jsx |
| Client Overview | frontend/src/pages/Clients/ClientCard/ClientOverview.jsx |
| Tasks Board | frontend/src/features/tasksNew/TaskBoard.jsx |
| API Routes | backend/main.py |

### Documentation
| Document | Path |
|----------|------|
| Workplan | docs/WORKPLAN_CLIENTS_AND_DASHBOARD.md |
| UX Audit | docs/reports/CLIENTS_SECTION_COMPREHENSIVE_AUDIT_2025-12-03.md |
| Airtable Sync PRD | docs/PRD_Client_Airtable_Sync.md |

---

## PrivacyExpress Module (Active)

**Status:** Pilot Ready

### Features
- Fillout questionnaire integration
- Automated scoring algorithm
- Review UI with override capability
- Report generation (HTML/PDF)
- Email sending via Microsoft Graph
- Accuracy metrics tracking

### Key Files
| Component | Path |
|-----------|------|
| Privacy Page | frontend/src/pages/Privacy/index.jsx |
| Scoring Rules | config/security_scoring_rules.json |
| Field Mapping | docs/fillout_field_mapping.json |
| Report Template | docs/PrivacyExpress/privacy_unified_template.html |
| Result Texts | docs/PrivacyExpress/ResultTexts/* |

### Documentation
| Document | Path |
|----------|------|
| Project Overview | docs/PrivacyExpress/PROJECT_OVERVIEW.md |
| QA Redesign PRD | docs/PRD_PRIVACY_QA_REDESIGN.md |
| Purchase Flow PRD | docs/PRD_PRIVACY_PURCHASE_FLOW.md |
| Scoring Spec | docs/Security_Scoring_Spec.md |
| Fillout Mapping | docs/Fillout_Mapping.md |

---

## RAG Module (Active)

**Status:** In Development

### Features (December 2025)
- Zoom Cloud Recordings sync
- Audio/Video transcription (Gemini)
- Transcript editing with speaker names
- Inbox/Published workflow
- Meilisearch indexing

### Key Files
| Component | Path |
|-----------|------|
| RAG Page | frontend/src/pages/RAG/index.jsx |
| Ingest Endpoint | backend/main.py (/api/rag/*) |
| Zoom Endpoints | backend/main.py (/api/zoom/*) |

### Documentation
| Document | Path |
|----------|------|
| Insights PRD | docs/INSIGHTS_RAG_PRD.md |
| UX Audit | docs/reports/RAG_TAB_UI_UX_AUDIT_2024-11-30.md |
| Roadmap | docs/Implementation_Roadmap.md |

---

## MarketingOps

### Documentation
| Document | Path |
|----------|------|
| README | docs/MarketingOps/README.md |
| Voice of Brand | docs/MarketingOps/VOICE_OF_BRAND.md |
| Marketing Prompt | docs/MarketingOps/MARKETING_CONTENT_PROMPT_EITAN_SHAMIR.md |
| Hebrew Appendix | docs/MarketingOps/VOICE_OF_BRAND_APPENDIX_HE.md |

---

## Design System

### Documentation
| Document | Path |
|----------|------|
| README | docs/DesignSystem/README.md |
| Design Tokens | docs/DesignSystem/DESIGN_TOKENS.md |
| Component Library | docs/DesignSystem/COMPONENT_LIBRARY.md |
| Tasks Template | docs/DesignSystem/TASKS_TEMPLATE.md |
| Figma Handoff | docs/DesignSystem/FIGMA_HANDOFF_PROTOCOL.md |

---

## Infrastructure (Azure)

### Resources
| Resource | Details |
|----------|---------|
| VM | eislaw-dev-vm (20.217.86.4) |
| Resource Group | EISLAW-Dashboard |
| Web App | eislaw-api-01 |
| Storage | eislawstweb |
| Container Registry | eislawacr |

### Monitoring Stack
| Service | Port | Purpose |
|---------|------|---------|
| Grafana | 3000 | Dashboards |
| Prometheus | 9090 | Metrics |
| Loki | 3100 | Logs |
| Alertmanager | 9093 | Alerts |

### Documentation
| Document | Path |
|----------|------|
| Docker Setup | docs/DOCKER_SETUP.md |
| Deploy Runbook | docs/DEPLOY_RUNBOOK.md |
| Observability | docs/OBSERVABILITY.md |
| Dev Ports | docs/DEV_PORTS.md |

---

## Operational Logs & Memory

| Document | Path | Purpose |
|----------|------|---------|
| Working Memory | docs/WORKING_MEMORY.md | Current state |
| Episodic Log | docs/Testing_Episodic_Log.md | Lessons learned |
| Next Actions | docs/NEXT_ACTIONS.md | Task queue |
| Changelog | docs/CHANGELOG.md | Release notes |

---

## Notes
- This compendium is additive. If you add new modules or docs, append sections here.
- For MCP/server availability, see docs/SESSION_READINESS.md.
- For secrets schema, see docs/Integrations.md (do not commit secrets.local.json).
