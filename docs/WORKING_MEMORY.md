# Working Memory (Current State)

**Last Updated:** 2025-12-05

> **Development Environment:** Azure VM at `20.217.86.4`
> SSH: `ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4`

---

## Context Snapshot

### Infrastructure
- **VM**: Ubuntu 22.04, Israel Central (20.217.86.4)
- **Containers**: docker-compose-v2 with hot-reload
- **Services Running**:
  - Frontend prod (8080), dev (5173)
  - API (8799)
  - Meilisearch (7700)
  - Monitoring stack (Grafana/Prometheus/Loki)

### Recent Session Activity (2025-12-04)
1. **Zoom Cloud Recordings** - Full integration complete
   - Sync from Zoom API, audio/video filters
   - Transcript editing with speaker names
   - Bulk download with queue status

2. **Quote Templates UI** - Complete at /settings/quotes
   - CRUD for categories and templates
   - Preview modal, duplication, keyboard shortcuts

3. **Archive Feature** - Production ready
   - Status filters, archive/restore
   - Open tasks warning, toast notifications
   - E2E tests passing (16/16)

4. **Email Integration** - Working
   - Graph sync per client
   - "Open in Outlook" fixed
   - Increased limit from 5 to 100

---

## Active Development

### Priority 1: Clients UX Sprint
**PRD:** docs/reports/CLIENTS_SECTION_COMPREHENSIVE_AUDIT_2025-12-03.md

Tasks:
- [ ] Hebrew labels in TaskBoard (replace English)
- [ ] Unify TaskBoard/TasksWidget styling
- [ ] Hide placeholder tabs (RAG, Privacy)
- [ ] Add ARIA roles to TabNav
- [ ] Add empty state to Files tab
- [ ] Replace alert() with toast

### Priority 2: Privacy QA Redesign
**PRD:** docs/PRD_PRIVACY_QA_REDESIGN.md

Tasks:
- [ ] RTL layout fix
- [ ] "נכון" one-click validation button
- [ ] Status icons in list (○/✓/✗)
- [ ] Collapsible override section
- [ ] Auto-advance after validation

### Priority 3: Privacy Purchase Flow
**PRD:** docs/PRD_PRIVACY_PURCHASE_FLOW.md

Tasks:
- [ ] WooCommerce product creation
- [ ] WordPress results page
- [ ] Fillout redirect configuration
- [ ] Payment webhook handler
- [ ] PDF report generation

---

## Key Paths

### Configuration
| Item | Path |
|------|------|
| Secrets | secrets.local.json (NOT committed) |
| Scoring Rules | config/security_scoring_rules.json |
| Field Mapping | docs/fillout_field_mapping.json |
| Email Sync Config | config/email_sync.json |

### Frontend
| Component | Path |
|-----------|------|
| App Entry | frontend/src/App.jsx |
| Clients List | frontend/src/pages/Clients/ClientsList.jsx |
| Client Overview | frontend/src/pages/Clients/ClientCard/ClientOverview.jsx |
| Privacy Page | frontend/src/pages/Privacy/index.jsx |
| RAG Page | frontend/src/pages/RAG/index.jsx |
| TaskBoard | frontend/src/features/tasksNew/TaskBoard.jsx |

### Backend
| Endpoint Group | Location |
|----------------|----------|
| Main API | backend/main.py |
| Health | GET /health |
| Clients | /api/clients, /registry/clients |
| Email | /email/sync_client, /email/by_client |
| Privacy | /privacy/*, /r/{token} |
| RAG | /api/rag/* |
| Zoom | /api/zoom/* |
| Templates | /api/templates/quotes |

---

## Decisions Made

### Architecture
- **SQLite for Privacy** - Replace Airtable for reliability at 3-4 submissions/min
- **Local Registry** - Clients stored in ~/.eislaw/store/clients.json
- **Hot-Reload** - Both frontend (Vite) and backend (uvicorn) support instant changes

### UX
- **Toast over Alert** - All notifications use toast pattern
- **Hebrew Labels** - All UI text in Hebrew
- **RTL Layout** - Privacy tab needs fix

### Operations
- **VM Development** - Preferred over local
- **docker-compose-v2** - Required (old version has bugs)
- **VS Code Remote SSH** - Best editing experience

---

## Open Items / Blockers

1. **TaskBoard English Labels** - Need Hebrew translation (6+ strings)
2. **Privacy RTL** - Layout broken, needs swap
3. **SQLite Migration** - Not started, blocks stress test
4. **WooCommerce Setup** - Waiting for product creation

---

## Quick Resume Commands

### Connect to VM
```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
```

### Start Dev Services
```bash
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 up -d api web-dev meili
```

### View Logs
```bash
/usr/local/bin/docker-compose-v2 logs -f api      # Backend
/usr/local/bin/docker-compose-v2 logs -f web-dev  # Frontend
```

### Rebuild After Changes
```bash
# Only needed for new dependencies or Dockerfile changes
/usr/local/bin/docker-compose-v2 up -d --build api
```

### Access Monitoring
```bash
# From WSL - creates SSH tunnel for Grafana
ssh -i ~/.ssh/eislaw-dev-vm.pem -L 3000:localhost:3000 -N azureuser@20.217.86.4
# Then open http://localhost:3000 (admin/eislaw2024)
```

---

## What We Paused On

- PDF export for privacy reports
- Outlook COM sender script
- Per-change audit table (Review_Audit)
- Mobile responsiveness
- SFU/Stage workflow
