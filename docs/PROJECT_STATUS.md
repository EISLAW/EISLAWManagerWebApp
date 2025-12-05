# EISLAW - Project Status & Scope

**Last Updated:** 2025-12-05

## Purpose
Single, always-current snapshot of scope, what's done vs. in progress, and where to find deeper docs.

---

## Scope (What We're Building)

| Module | Description | Status |
|--------|-------------|--------|
| **Clients** | Client registry, folders (local/SharePoint), email view, Airtable sync, tasks, archive | Production |
| **PrivacyExpress** | Questionnaire -> scoring -> review -> report -> send | Pilot Ready |
| **RAG/Insights** | Transcript review -> semantic search -> insight cards | In Development |
| **AI Studio** | Conversational AI with agent capabilities (search, create, update) | Phase 2 Live |
| **Dashboard** | Unified view of tasks, emails, client activity | Planned |

## Non-Goals (For Now)
- Full mailbox migration or replacement of Outlook UX
- Mobile-first responsive design
- Multi-tenant SaaS architecture

---

## Status - 2025-12-05

### Clients Module

**Done**
- Client list with search and status filters (active/archived/all)
- Client overview with tabs (Overview, Files, Emails, Tasks)
- Email sync via Microsoft Graph (per-client)
- SharePoint folder linking and badge display
- Tasks backend (CRUD, due dates, priorities, client linking)
- Archive/restore with open tasks warning
- Quote templates management UI (/settings/quotes)
- Toast notifications (replaced alerts)
- Airtable search and sync buttons

**In Progress**
- Hebrew labels in TaskBoard (UX Sprint)
- TaskBoard/TasksWidget visual unification
- Hide placeholder tabs (RAG, Privacy)

**Upcoming**
- Dashboard redesign with unified task/email view
- Email auto-sync on page load
- Due date badges (overdue, today, tomorrow)

### PrivacyExpress Module

**Done**
- Fillout integration (fetch submissions)
- Scoring algorithm (level, obligations, requirements)
- Review UI with checklist overrides
- Report generation (unified HTML template)
- Email preview and send via Graph
- Tokenized short links (/r/{token})
- Accuracy metrics tracking

**In Progress**
- QA Redesign (RTL layout, one-click validation)
- Hebrew label fixes

**Upcoming**
- Purchase flow (WooCommerce integration)
- SQLite migration (replace Airtable)
- Stress testing pipeline

### RAG Module

**Done**
- Zoom Cloud Recordings sync (32+ recordings)
- Audio/Video filter buttons
- Bulk download with queue status
- Transcript preview and editing
- Speaker name editing (chat-bubble format)
- Meilisearch integration
- Inbox/Published workflow

**In Progress**
- Conversational memory for assistant
- Client-scoped tag filtering

**Upcoming**
- Whisper fallback for transcription
- PDF/document ingestion

### AI Studio Module

**Done (Phase 2 - December 5, 2025)**
- Conversational AI interface at `/#/ai-studio`
- Agent Mode with 6 tools:
  - `get_system_summary` - System statistics
  - `search_clients` - Find clients by name/email
  - `get_client_details` - Full client information
  - `search_tasks` - Find tasks with filters
  - `create_task` - Create new tasks
  - `update_task` - Update task status
- Agent Mode / Chat Mode toggle
- Tool execution display in chat

**Upcoming**
- File upload capability
- Export conversations
- Prompt library with injection
- Additional tools: search emails, search RAG, create documents

---

## Infrastructure Status

### Azure VM (Production)
| Service | Status | URL |
|---------|--------|-----|
| Frontend (prod) | Running | http://20.217.86.4:8080 |
| Frontend (dev) | Running | http://20.217.86.4:5173 |
| API | Running | http://20.217.86.4:8799 |
| Meilisearch | Running | http://20.217.86.4:7700 |

### Monitoring Stack
| Service | Status | Access |
|---------|--------|--------|
| Grafana | Running | SSH tunnel port 3000 |
| Prometheus | Running | SSH tunnel port 9090 |
| Loki | Running | Internal |
| Alertmanager | Running | SSH tunnel port 9093 |

### Deployment
- Docker containers via docker-compose-v2
- Hot-reload enabled (backend + frontend)
- VS Code Remote SSH recommended for editing

---

## Where to Read Next

| Topic | Document |
|-------|----------|
| Feature Overview | docs/EISLAW_System_Feature_Spec.md |
| Technical Overview | docs/TECHNICAL_OVERVIEW.md |
| Changelog | docs/CHANGELOG.md |
| Next Actions | docs/NEXT_ACTIONS.md |
| Privacy PRDs | docs/PRD_PRIVACY_QA_REDESIGN.md, docs/PRD_PRIVACY_PURCHASE_FLOW.md |
| Clients Workplan | docs/WORKPLAN_CLIENTS_AND_DASHBOARD.md |
| Dev Setup | docs/DEV_SETUP.md, docs/DOCKER_SETUP.md |
