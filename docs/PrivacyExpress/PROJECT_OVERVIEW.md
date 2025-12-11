<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# EISLAW PrivacyExpress — Project Overview (Partner Brief)

**Last Updated:** 2025-12-05
**Status:** Active Development | Pilot Ready

Audience: Business partners, project stakeholders, and internal team.

Links: see docs/PrivacyExpress/README.md and docs/INDEX.md
Controls map: see `docs/UX_UI/Controls_Map.md` for button actions and test IDs.

---

## 1) Executive Summary

PrivacyExpress converts a short online questionnaire into an actionable privacy deliverable. The system fetches submissions, scores them using codified rules, presents a lightweight review UI, and composes a branded report and client email. Reviewers can override suggested outputs; the system tracks overrides and accuracy over time.

**Goals**
- Faster, consistent privacy diagnostics for small/medium businesses
- Clear reviewer control with transparent overrides
- Branded, RTL Hebrew deliverables ready for email/PDF
- Measurable accuracy that improves with feedback

**Outcomes**
- Client-facing report (HTML/PDF), email preview, and optional Word path
- Review queue + status trail (waiting_review -> in_review -> approved -> sent)
- Metrics for overall accuracy and rolling last-N accuracy
- 2025 Pilot: launching with a large SaaS partner who will route tens of privacy test takers through the system each week.

**Pilot Readiness Principles**
- Document every deploy/incident so a fresh operator (or new LLM session) can catch up within minutes.
- Keep the UI/API ship-ready: no long-running migrations; every change must be shippable.
- Automate packaging/deploys to avoid manual zip drift; target containerized hosting.

---

## 2) Current Development Status (December 2025)

### 2.1 Infrastructure (Azure VM)
- **Production VM**: `20.217.86.4` (Ubuntu 22.04, Israel Central)
- **Services Running**:
  - Frontend (prod): port 8080
  - Frontend (dev): port 5173 (hot-reload)
  - API: port 8799
  - Meilisearch: port 7700
- **Deployment**: Docker containers with docker-compose-v2
- **Hot-Reload**: Both backend (uvicorn --reload) and frontend (Vite) support instant changes

### 2.2 Recent Completions (2025-12-04)
| Feature | Status | Notes |
|---------|--------|-------|
| Zoom Cloud Recordings | Done | Full sync, audio/video filters, bulk download, transcript editing |
| Quote Templates UI | Done | Full CRUD at /settings/quotes, preview modal, categories |
| Archive Feature | Done | Active/archived clients, E2E tests passing |
| Email Sync | Done | Microsoft Graph integration, per-client sync |
| SharePoint Integration | Done | Client folder linking via Graph API |
| Tasks Backend | Done | CRUD endpoints, due dates, priorities |

### 2.3 Active Development (In Progress)
| Task | Priority | PRD |
|------|----------|-----|
| Privacy QA Redesign | HIGH | docs/PRD_PRIVACY_QA_REDESIGN.md |
| Privacy Purchase Flow | HIGH | docs/PRD_PRIVACY_PURCHASE_FLOW.md |
| Clients UX Sprint | CRITICAL | docs/reports/CLIENTS_SECTION_COMPREHENSIVE_AUDIT_2025-12-03.md |
| SQLite Migration | HIGH | Replace Airtable for privacy data |

---

## 3) System Components

- **Frontend (React)**: Privacy page with list + expandable card details and checklists
- **Backend (FastAPI)**: scoring webhook, Fillout fetch, Airtable upserts, tokenized reports, Microsoft Graph email send
- **Fillout**: live form and submissions API (also provides contact metadata used in report/email)
- **Airtable**: review state, selections, status, metrics (PRIVACY_REVIEWS table)
- **Microsoft Graph**: send client email (Application permission Mail.Send)
- **Templates & texts**: modular Markdown templates and a unified HTML/CSS wrapper

**Key Paths**
- Tools: `tools/fillout_fetch_and_score.py`, `tools/compose_report_from_md.py`, `tools/airtable_utils.py`
- Rules: `config/security_scoring_rules.json`
- Mapping: `docs/fillout_field_mapping.json`
- Texts: `docs/PrivacyExpress/ResultTexts/*`
- Unified HTML: `docs/PrivacyExpress/privacy_unified_template.html`

---

## 4) Data Model (inputs -> results)

**Identity & Metadata**
- contact_name, business_name, contact_email, contact_phone, submitted_at, submission_id, form_id

**Inputs (scoring)**
- owners, access, ethics, ppl, sensitive_people, sensitive_types, biometric_100k, transfer, directmail_biz, directmail_self, monitor_1000, processor, processor_large_org, employees_exposed, cameras
- Derived: sensitive (from sensitive_people/sensitive_types) and small normalizations

**Results (summary)**
- level (label in UI: "מאגר מנוהל בידי יחיד" for lone; basic, mid, high)
- dpo, reg, report (booleans)
- requirements: [worker_security_agreement, cameras_policy, consultation_call, outsourcing_text, direct_marketing_rules]

---

## 5) API Endpoints (Backend - FastAPI)

### Privacy Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /privacy/labels | Hebrew labels for UI |
| GET | /privacy/submissions | List all submissions |
| GET | /privacy/submissions/{id} | Single submission with score |
| POST | /privacy/save_review | Save review to Airtable |
| POST | /privacy/approve_and_publish | Generate token, return links |
| GET | /privacy/report/{token} | Render HTML report |
| GET | /r/{token} | Short redirect to report |
| POST | /privacy/preview_email | Preview email content |
| POST | /privacy/send_email | Send via Microsoft Graph |
| GET | /privacy/metrics | Accuracy metrics |

### Clients Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/clients | List clients (status filter) |
| POST | /registry/clients | Create new client |
| PATCH | /api/clients/{name}/archive | Archive client |
| PATCH | /api/clients/{name}/restore | Restore client |
| GET | /api/client/summary | Client with all data |

### Email & SharePoint
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /email/sync_client | Sync emails via Graph |
| GET | /email/by_client | Get client emails |
| GET | /email/content | Full email body |
| GET | /api/sharepoint/search | Search client folder |
| POST | /api/sharepoint/link_client | Link folder to registry |

### RAG & Zoom
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/rag/inbox | List inbox items |
| POST | /api/rag/ingest | Upload and transcribe |
| POST | /api/rag/publish/{id} | Publish to library |
| GET | /api/zoom/transcripts/{id} | Get transcript |
| PUT | /api/zoom/transcripts/{id} | Update transcript |

---

## 6) Next Actions (Prioritized)

### Immediate (This Week)
1. **Privacy QA Redesign** - Transform Privacy tab into algorithm validation tool
   - RTL layout fix
   - One-click validation button
   - Status icons in list (pending, correct, override)
   - Target: >90% algorithm accuracy before automation

2. **Clients UX Sprint** - Fix critical visual inconsistencies
   - Hebrew labels in TaskBoard
   - Unify TaskBoard/TasksWidget styling
   - Hide placeholder RAG/Privacy tabs

### Short-term (Next 2 Weeks)
3. **Privacy Purchase Flow** - Full automation pipeline
   - WooCommerce product creation
   - WordPress results page
   - Payment to report delivery automation

4. **SQLite Migration** - Replace Airtable for privacy data
   - Faster, more reliable for 3-4/min load
   - Stress test: 99.9% success rate, <500ms response

### Medium-term
5. **Dashboard Redesign** - Unified task/email view
6. **RAG Improvements** - Conversational memory, client-scoped tags

---

## 7) Deliverables

**Report**
- Unified RTL template: `privacy_unified_template.html`
- Content modules linked to results: `ResultTexts/*.md`
- Composer fills placeholders and merges selected modules

**Email**
- Template: `ResultTexts/email_to_client.md`
- Subject line from first line with `[EMAIL_SUBJECT]: ...`
- Send via Microsoft Graph (requires Azure AD App Registration)

---

## 8) Security & Privacy

- Secrets in `secrets.local.json` (not committed)
- Avoid PII in URLs; URL parameters treated as untrusted
- CORS limited to configured origins
- Microsoft Graph requires Application permission Mail.Send (admin consent)

---

## 9) Operations

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
/usr/local/bin/docker-compose-v2 logs -f api      # Backend
/usr/local/bin/docker-compose-v2 logs -f web-dev  # Frontend
```

### Test URLs
- Frontend: http://20.217.86.4:5173
- API: http://20.217.86.4:8799

---

## 10) Success Criteria

- Reviewer can approve/override and send within minutes
- 90% or higher correctness auto-selection on last N assessments
- Consistent brand styling across all outputs (browser + PDF)
- Zero data loss: every change audited; statuses accurate

---

## 11) Documentation Index

| Document | Purpose |
|----------|---------|
| CHANGELOG.md | Dated release notes |
| NEXT_ACTIONS.md | Prioritized task queue |
| PRD_PRIVACY_QA_REDESIGN.md | QA workflow redesign |
| PRD_PRIVACY_PURCHASE_FLOW.md | Purchase automation |
| WORKPLAN_CLIENTS_AND_DASHBOARD.md | Clients/Dashboard sprint plan |
| DEPLOY_RUNBOOK.md | Deployment procedures |
| Testing_Episodic_Log.md | Lessons learned |

---

If any resource mentioned here is missing, respond in the session with: `Missing resource: <path>. Please add or re-link.`
