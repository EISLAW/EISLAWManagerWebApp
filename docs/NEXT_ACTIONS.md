<!-- Project: EISLAW | Full Context: docs/System_Definition.md -->
# Next Actions (Short Queue)

Working copy: use the clean clone at `/mnt/c/Coding Projects/EISLAW System Clean` (origin `github.com/EISLAW/EISLAWManagerWebApp`). Older `EISLAW System` tree is archive/reference only.

## Current Focus (2025-12-05)

### Active Sprint: SQLite Database Migration
**PRD:** `docs/PRD_SQLITE_MIGRATION.md`
**Status:** Phase 0 Complete (Privacy), Phase 1 Ready to Start

**Completed:**
- ✅ Privacy SQLite backend (`backend/privacy_db.py`) - Fully implemented
- ✅ Privacy API endpoints live: `/api/privacy/submissions`, `/api/privacy/stats`, `/api/privacy/webhook`
- ✅ 18 submissions synced from Fillout to SQLite
- ✅ PRD created with 5-week timeline

**Next Steps (Week 1):**
- [ ] Phase 0: Audit privacy_db.py (file size, growth rate, issues)
- [ ] Phase 1: Create unified `db.py` module for clients/tasks
- [ ] Phase 1: Add backup automation to Azure Blob

**Timeline:**
```
Week 1 (Dec 9-13): Foundation + Audit existing
Week 2 (Dec 16-20): Clients migration
Week 3 (Dec 23-27): Tasks migration
Week 4 (Dec 30-Jan 3): Airtable import
Week 5 (Jan 6-10): Meilisearch integration
Week 6+: Marketing module merge (optional)
```

---

## Clients Module

### UX Sprint (2025-12-03)
**Audit:** `docs/reports/CLIENTS_SECTION_COMPREHENSIVE_AUDIT_2025-12-03.md`
**Status:** Ready for implementation

| Task | Priority | Status |
|------|----------|--------|
| Hebrew labels in TaskBoard | CRITICAL | ☐ Pending |
| Unify TaskBoard/TasksWidget styling | HIGH | ☐ Pending |
| Hide placeholder tabs (RAG, Privacy) | MEDIUM | ☐ Pending |
| Add ARIA roles to TabNav | MEDIUM | ☐ Pending |
| Add empty state to Files tab | LOW | ☐ Pending |
| Replace alert() with toast | LOW | ☐ Pending |

**Files to modify:**
- `frontend/src/features/tasksNew/TaskBoard.jsx`
- `frontend/src/components/TabNav.jsx`
- `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`

### Archive Feature ✅ COMPLETE
- Status filters working (active/archived/all)
- Toast notifications instead of alerts
- Open tasks warning before archive
- E2E tests passing (16/16)

### Quote Templates ✅ COMPLETE
- Full CRUD at /settings/quotes
- Category management
- Template preview with client substitution

---

## Privacy Module

### SQLite Backend ✅ COMPLETE
**File:** `backend/privacy_db.py`

Endpoints live:
- GET `/api/privacy/submissions` - List with optional Fillout sync
- GET `/api/privacy/submissions/{id}` - Single submission details
- POST `/api/privacy/webhook` - Fillout webhook receiver
- POST `/api/privacy/review` - Save QA review status
- GET `/api/privacy/activity` - Activity log for monitoring
- GET `/api/privacy/stats` - Dashboard statistics
- GET `/api/privacy/public-results/{id}` - Public results for WordPress

### QA Redesign (Pending)
**PRD:** `docs/PRD_PRIVACY_QA_REDESIGN.md`

| Phase | Task | Status |
|-------|------|--------|
| 1 | RTL layout fix | ☐ Pending |
| 2 | Algorithm Decision Card | ☐ Pending |
| 3 | Key Inputs Display | ☐ Pending |
| 4 | Collapsible Override Section | ☐ Pending |
| 5 | List status icons (○/✓/✗) | ☐ Pending |
| 6 | Polish + data-testid | ☐ Pending |

### Purchase Flow (Blocked)
**PRD:** `docs/PRD_PRIVACY_PURCHASE_FLOW.md`
**Blocked by:** QA validation must confirm >90% accuracy first

---

## RAG Module

### Completed Features
- ✅ Zoom Cloud Recordings sync (32+ recordings)
- ✅ Audio/Video filter buttons
- ✅ Bulk download with queue status
- ✅ Transcript editing with speaker names (chat-bubble format)
- ✅ Meilisearch integration
- ✅ Inbox/Published workflow

### Pending
- [ ] Conversational memory for assistant
- [ ] Client-scoped tag filtering
- [ ] Whisper fallback for transcription

---

## Infrastructure

### Azure VM (20.217.86.4)
- ✅ Docker containers running (api, web-dev, meili)
- ✅ Hot-reload enabled (backend + frontend)
- ✅ Monitoring stack (Grafana/Prometheus/Loki)

### Pending
- [ ] Automated GitHub Actions deploy
- [ ] App Insights integration validation
- [ ] Reliable log streaming (Kudu 502 issues)

---

## Documentation Updates (2025-12-05)

**Updated today:**
- ✅ README.md - Quick start with VM details
- ✅ PROJECT_STATUS.md - December 2025 status
- ✅ WORKING_MEMORY.md - Current context
- ✅ TECHNICAL_OVERVIEW.md - Full technical docs
- ✅ PROJECTS_COMPENDIUM.md - Project index
- ✅ PRD_SQLITE_MIGRATION.md - NEW: Database migration plan

**Pending updates:**
- [ ] CHANGELOG.md - Add SQLite migration entry
- [ ] DEV_SETUP.md - Review for accuracy
- [ ] DEPLOY_RUNBOOK.md - Review for accuracy

---

## Deferred / Out of Scope

- Mobile responsiveness
- SFU/Stage workflow
- Matter/Case hierarchy
- Reply to email from app
- PDF export for privacy reports
- Outlook COM sender script

---

## Quick Reference

### VM Connection
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
/usr/local/bin/docker-compose-v2 logs -f api
```

### Access URLs
- Frontend dev: http://20.217.86.4:5173
- API: http://20.217.86.4:8799
- API docs: http://20.217.86.4:8799/docs
