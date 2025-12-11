# EISLAW System - Technical Overview

**Last Updated:** 2025-12-05

Purpose: Engineer-facing overview of the current system, core modules, data flows, tools, and operational procedures.

---

## Architecture Snapshot

### Development Environment
- **Primary**: Azure VM at `20.217.86.4` (Ubuntu 22.04)
- **Deployment**: Docker containers via docker-compose-v2
- **Hot-Reload**: Enabled for both frontend and backend

### Services
| Service | Port | Technology |
|---------|------|------------|
| Frontend (prod) | 8080 | React + Vite + Tailwind |
| Frontend (dev) | 5173 | Vite dev server |
| API | 8799 | FastAPI + Uvicorn |
| Meilisearch | 7700 | Search engine |
| Grafana | 3000 | Monitoring dashboard |
| Prometheus | 9090 | Metrics collection |
| Loki | 3100 | Log aggregation |

### Key Paths
| Item | Path |
|------|------|
| Backend Code | backend/ |
| Frontend Code | frontend/src/ |
| Configuration | config/ |
| Documentation | docs/ |
| Secrets | secrets.local.json (NOT committed) |
| Client Registry | ~/.eislaw/store/clients.json |
| Tasks Store | ~/.eislaw/store/tasks.json |

---

## Modules

### 1. Clients Module

**Purpose**: Client registry, file management, email integration, task tracking.

**Features (December 2025)**:
- Client list with search and status filters (active/archived/all)
- Client overview with tabs (Overview, Files, Emails, Tasks)
- Email sync via Microsoft Graph (per-client)
- SharePoint folder linking
- Tasks backend with CRUD, due dates, priorities
- Archive/restore with open tasks warning
- Quote templates management

**API Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/clients | List clients (status filter) |
| POST | /registry/clients | Create new client |
| GET | /api/client/summary | Client with all data |
| PATCH | /api/clients/{name}/archive | Archive client |
| PATCH | /api/clients/{name}/restore | Restore client |
| GET | /api/tasks | List all tasks |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/{id} | Update task |
| DELETE | /api/tasks/{id} | Delete task |

**Frontend Components**:
| Component | Path |
|-----------|------|
| ClientsList | frontend/src/pages/Clients/ClientsList.jsx |
| ClientOverview | frontend/src/pages/Clients/ClientCard/ClientOverview.jsx |
| TaskBoard | frontend/src/features/tasksNew/TaskBoard.jsx |
| TasksWidget | frontend/src/components/TasksWidget.jsx |
| EmailsWidget | frontend/src/components/EmailsWidget.jsx |

---

### 2. PrivacyExpress Module

**Purpose**: Questionnaire -> Scoring -> Review -> Report -> Send

**Features**:
- Fillout form integration (fetch submissions)
- Automated scoring algorithm (level, obligations, requirements)
- Review UI with checklist overrides
- Report generation (unified HTML template)
- Email preview and send via Microsoft Graph
- Tokenized short links (/r/{token})
- Accuracy metrics tracking

**API Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /privacy/submissions | List all submissions |
| GET | /privacy/submissions/{id} | Single submission with score |
| POST | /privacy/save_review | Save review to Airtable |
| POST | /privacy/approve_and_publish | Generate token, return links |
| GET | /privacy/report/{token} | Render HTML report |
| GET | /r/{token} | Short redirect to report |
| POST | /privacy/preview_email | Preview email content |
| POST | /privacy/send_email | Send via Microsoft Graph |
| GET | /privacy/metrics | Accuracy metrics |

**Scoring Logic**:
- Rules defined in `config/security_scoring_rules.json`
- Levels: lone, basic, mid, high (mutually exclusive by precedence)
- Obligations: reg (registration), report, dpo
- Requirements: worker_security_agreement, cameras_policy, consultation_call, outsourcing_text, direct_marketing_rules

**Key Files**:
| Item | Path |
|------|------|
| Frontend | frontend/src/pages/Privacy/index.jsx |
| Scoring Rules | config/security_scoring_rules.json |
| Field Mapping | docs/fillout_field_mapping.json |
| Report Template | docs/PrivacyExpress/privacy_unified_template.html |
| Result Texts | docs/PrivacyExpress/ResultTexts/*.md |

---

### 3. RAG Module

**Purpose**: Transcript ingestion, semantic search, insight generation.

**Features (December 2025)**:
- Zoom Cloud Recordings sync (32+ recordings)
- Audio/Video filter buttons
- Bulk download with queue status
- Transcript editing with speaker names (chat-bubble format)
- Meilisearch integration
- Inbox/Published workflow

**API Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rag/inbox | List inbox items |
| POST | /api/rag/ingest | Upload and transcribe |
| GET | /api/rag/reviewer/{id} | Get transcript for editing |
| PATCH | /api/rag/reviewer/{id} | Save transcript edits |
| POST | /api/rag/publish/{id} | Publish to library |
| DELETE | /api/rag/file/{id} | Hard delete |
| GET | /api/zoom/transcripts/{id} | Get Zoom transcript |
| PUT | /api/zoom/transcripts/{id} | Update Zoom transcript |
| DELETE | /api/zoom/transcripts/{id} | Delete Zoom transcript |

**Transcription**:
- Primary: Gemini API (gemini-2.0-flash)
- Fallback: Whisper (planned)

---

### 4. Email Integration

**Purpose**: Sync and display emails from Microsoft 365.

**Features**:
- Per-client email sync via Microsoft Graph
- Full email body fetch on demand
- "Open in Outlook" web link
- Search across mailboxes

**API Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /email/sync_client | Sync emails for client |
| GET | /email/by_client | Get client emails |
| GET | /email/content | Full email HTML body |
| POST | /email/open | Get Outlook web link |
| GET | /email/search | Search emails |

**Authentication**:
- MSAL app-only authentication
- Application permission: Mail.Read, Mail.Send
- Tenant/Client ID/Secret in secrets.local.json

---

### 5. SharePoint Integration

**Purpose**: Link client folders in SharePoint.

**API Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sharepoint/sites | List SharePoint sites |
| GET | /api/sharepoint/search | Search for client folder |
| POST | /api/sharepoint/link_client | Link folder to registry |

**Configuration**:
- Target site: "EISLAW OFFICE" (EISLAWTEAM)
- Folder URL stored in client registry as `sharepoint_url`

---

### 6. AI Studio Module

**Purpose**: Conversational AI assistant with agent capabilities for system interaction.

**Features (Phase 2 - December 2025)**:
- Natural language interface for system queries
- Agent Mode with tool execution
- Chat Mode for general questions
- Tool execution visibility in UI

**API Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ai-studio/tools | List available tools |
| POST | /api/ai-studio/chat | Send message (chat mode) |
| POST | /api/ai-studio/agent | Send message (agent mode) |

**Available Tools**:
| Tool | Description | Example Query |
|------|-------------|---------------|
| `get_system_summary` | System statistics | "System overview" |
| `search_clients` | Find clients | "Find client Sivan" |
| `get_client_details` | Full client info | "Show me details for that client" |
| `search_tasks` | Find tasks | "What tasks are pending?" |
| `create_task` | Create new task | "Create a reminder to call David" |
| `update_task` | Update task status | "Mark that task as done" |

**Frontend**:
| Component | Path |
|-----------|------|
| AI Studio Page | frontend/src/pages/AIStudio/index.jsx |

**Dependencies**:
- Uses current JSON data storage
- Will automatically benefit from SQLite migration

---

## Configuration & Secrets

### secrets.local.json Structure
```json
{
  "airtable": {
    "token": "pat...",
    "base_id": "app...",
    "table_id": "tbl...",
    "contacts_table": "tbl..."
  },
  "graph": {
    "tenant_id": "...",
    "client_id": "...",
    "client_secret": "..."
  },
  "fillout": {
    "api_key": "..."
  },
  "gemini": {
    "api_key": "..."
  },
  "zoom": {
    "account_id": "...",
    "client_id": "...",
    "client_secret": "..."
  },
  "azure_kudu": {
    "username": "...",
    "password": "..."
  },
  "grafana": {
    "username": "admin",
    "password": "..."
  }
}
```

---

## Operational Playbook

### Start Development
```bash
# Connect to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Start services
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 up -d api web-dev meili

# View logs
/usr/local/bin/docker-compose-v2 logs -f api
```

### Rebuild After Changes
```bash
# Only needed for new dependencies or Dockerfile changes
/usr/local/bin/docker-compose-v2 up -d --build api
```

### Access Monitoring
```bash
# Create SSH tunnel (from WSL)
ssh -i ~/.ssh/eislaw-dev-vm.pem -L 3000:localhost:3000 -N azureuser@20.217.86.4

# Open Grafana
# http://localhost:3000 (admin / eislaw2024)
```

### Test Privacy Flow
```bash
# Fetch and score submissions
python tools/fillout_fetch_and_score.py --form-id t9nJNoMdBgus --limit 5

# Smoke test
python tools/privacy_flow_smoke_test.py --count 2
```

---

## Testing

### E2E Tests (Playwright)
```bash
cd frontend
npx playwright test
```

### Test Files
| Test | Path |
|------|------|
| UX Audit | tests/ux-audit.spec.cjs |
| Adversarial | tests/adversarial-audit.spec.cjs |
| Add Client Modal | tests/add-client-modal.spec.cjs |

---

## Known Limitations

1. **TaskBoard has English labels** - Need Hebrew translation
2. **Privacy tab RTL broken** - Layout needs swap
3. **No mobile responsiveness** - Desktop-first design
4. **Airtable rate limits** - Consider SQLite for Privacy

---

## References

| Document | Path |
|----------|------|
| Project Status | docs/PROJECT_STATUS.md |
| Changelog | docs/CHANGELOG.md |
| Next Actions | docs/NEXT_ACTIONS.md |
| Working Memory | docs/WORKING_MEMORY.md |
| Integrations | docs/Integrations.md |
| Docker Setup | docs/DOCKER_SETUP.md |
| Deploy Runbook | docs/DEPLOY_RUNBOOK.md |
