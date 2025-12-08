# Team Inbox

**Project:** EISLAW Manager Web App
**CTO:** Joe (AI Agent)
**Last Updated:** 2025-12-08 (CLI-P03 amend required - DB-backed list ordering; CLI-005 ready for Joseph)

> **Looking for completed work?** See [TEAM_INBOX_ARCHIVE.md](TEAM_INBOX_ARCHIVE.md) for all completed phases, bug fixes, and historical messages.

---

## Project Overview

EISLAW is a Hebrew-language legal practice management system with:
- Client management (Airtable-synced)
- Privacy algorithm scoring
- AI Studio chat (Gemini/Claude/OpenAI)
- RAG-based document processing
- Task management

**Tech Stack:** React + Vite (frontend) | FastAPI + SQLite (backend) | Azure VM

**Live URL:** http://20.217.86.4:5173

---

## VM Sync Rules

**All code changes must be synced to the Azure VM for testing.**

### Frontend (Hot-Reload)
```bash
scp -i ~/.ssh/eislaw-dev-vm.pem frontend/src/FILE.jsx azureuser@20.217.86.4:~/EISLAWManagerWebApp/frontend/src/
```

### Backend (Requires Restart)
```bash
scp -i ~/.ssh/eislaw-dev-vm.pem backend/main.py azureuser@20.217.86.4:~/EISLAWManagerWebApp/backend/
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4 '/usr/local/bin/docker-compose-v2 restart api'
```

**Rule:** Task is NOT DONE until code is synced and tested on VM!

---

## Current Sprint Status

| Status | Count |
|--------|-------|
| ✅ Completed | 80+ tasks |
| 🔄 In Progress | 3 (Airtable Integration) |
| ⏸️ On Hold | 1 (BUG-003 needs info) |

**Current Focus:** Airtable Integration - New Architecture (AD-001)

### New Project: Airtable Contact List Integration

**CEO Decision (2025-12-07):** SQLite is source of truth, Airtable is contact list source.

**Build Order:**
1. ✅ **ATB-001** Joseph → Create `airtable_contacts` table (CTO APPROVED 2025-12-08)
2. ✅ **ATB-002** Alex → Build 4 sync API endpoints (CTO APPROVED 2025-12-08)
3. 🔄 **ATB-003** Maya → Build "רשימת קשר" tab (DEPLOYED - needs validation)

**Architecture:** See `ARCHITECTURE_DECISIONS.md` → AD-001

---

## Key Principles

1. **DUAL-USE RULE:** Every feature serves BOTH frontend AND AI agents.
2. **HANDSHAKE RULE:** No task is DONE until verified working end-to-end.
3. **SKEPTICAL USER REVIEW:** Click EVERY button as a real user would.
4. **DOCS UPDATE RULE:** Every completed task MUST update relevant docs.

**Build Order:** `Database → API → Frontend → Test → Docs`

---

## Messages FROM Joe (CTO)

### Active Assignments

| ID | To | Task | Status | Doc |
|----|-----|------|--------|-----|
| ATB-001 | **Joseph** | Create `airtable_contacts` table in SQLite | ✅ COMPLETE | `TASK_JOSEPH_AIRTABLE_CONTACTS_TABLE.md` |
| ATB-002 | **Alex** | Build Airtable Sync API Endpoints (4 endpoints) | ✅ COMPLETE | `TASK_ALEX_AIRTABLE_SYNC_ENDPOINTS.md` |
| ATB-003 | **Maya** | Create "רשימת קשר" Contact List Tab | ✅ COMPLETE | `TASK_MAYA_CONTACTS_LIST_TAB.md` |
| PRI-001 | **Noa** | Privacy Form Copy Optimization | ✅ COMPLETE | `TASK_NOA_PRIVACY_FORM_OPTIMIZATION.md` |
| PRI-002 | **Noa** | Legal Review - Full Question Text | 🔄 AWAITING CEO | `TASK_NOA_LEGAL_REVIEW_QUESTIONS.md` |
| MKT-001 | **Noa** | A/B Test Privacy Form (AI Personas) | ✅ COMPLETE | `TASK_NOA_AB_TEST_BUSINESSES.md` |
| CLI-B01 | **Alex** | Documents tab shows nothing when no SharePoint | ✅ FIXED | `BUG_REPORT_2025_12_07.md` |
| CLI-B02 | **Alex** | Airtable link not saving to database | ✅ FIXED | `BUG_REPORT_2025_12_07.md` |
| CLI-B03 | **Alex** | "\n" literal text in client overview | ✅ CLOSED (unable to reproduce) | `BUG_REPORT_2025_12_07.md` |
| PRI-003 | **Eli** | E2E test suite for Privacy | ✅ COMPLETE | `tests/privacy-e2e.spec.ts` |
| PRI-004 | **Eli** | All Privacy user flows pass (TC-01 to TC-10) | ✅ COMPLETE | 12/12 tests pass |
| PRI-A01 | **Alex** | Biometric implies minimum sensitive_people | ✅ COMPLETE | `TASK_ALEX_BIOMETRIC_CONSTRAINT.md` |
| PRI-P01 | **David** | WordPress Dynamic Report Page | ✅ CTO APPROVED | `PRD_WORDPRESS_DYNAMIC_REPORT.md` |
| PRI-005 | **Alex** | Public Report API Endpoint | ✅ CTO APPROVED | `TASK_ALEX_PUBLIC_REPORT_ENDPOINT.md` |
| CEO-001 | **CEO** | Provide content per level (text + videos for יחיד/בסיסית/בינונית/גבוהה) | 🔄 PENDING | Separate project |
| CEO-002 | **CEO** | Provide packages/pricing per level for WooCommerce checkout | 🔄 PENDING | For checkout integration |
| CEO-003 | **CEO** | Update Fillout Privacy Form with A/B tested copy (7 questions) | 🔄 NEW | `FILLOUT_COPY_CHANGES.md` |
| PRI-006 | **Maya** | WordPress Privacy Report Page (Stub) | 🔄 NEW | `TASK_MAYA_WORDPRESS_REPORT_PAGE.md` |
| CLI-P01 | **David** | PRD: Save Email Attachments to SharePoint | ✅ CTO APPROVED | `PRD_SAVE_EMAIL_ATTACHMENTS.md` |
| CLI-004 | **Alex + Maya** | Save Email Attachments to SharePoint | ✅ CTO APPROVED | `TASK_ALEX_MAYA_SAVE_EMAIL_ATTACHMENTS.md` |
| CLI-P02 | **David** | PRD: Client Archive Feature | ✅ CEO APPROVED | `PRD_CLIENT_ARCHIVE.md` |
| CLI-005 | **Joseph** | Archive: Database migration (add `archived` columns) | 🔄 NEW | `PRD_CLIENT_ARCHIVE.md` §3.1 |
| CLI-006 | **Alex** | Archive: API endpoints + AI agent tools | 🔄 NEW (blocked by CLI-005) | `PRD_CLIENT_ARCHIVE.md` §3.2, §4 |
| CLI-007 | **Maya** | Archive: Frontend (list, detail, contacts, modal) | 🔄 NEW (blocked by CLI-006) | `PRD_CLIENT_ARCHIVE.md` §3.3-3.4 |
| CLI-008 | **Eli** | Archive: E2E tests (17 scenarios) | 🔄 NEW (blocked by CLI-007) | `PRD_CLIENT_ARCHIVE.md` §7 |
| CLI-P03 | **David** | PRD: Consolidate Documents buttons into Overview tab | 🔄 AMEND REQUIRED | `PRD_CLIENT_OVERVIEW_CONSOLIDATION.md` |

*CEO reported 3 bugs on 2025-12-07. See `BUG_REPORT_2025_12_07.md` for full details.*

---

### Completed This Sprint

| Phase | Description | Status |
|-------|-------------|--------|
| 4A-4M | Clients Polish (all phases) | ✅ COMPLETE |
| 5A-5F | Privacy Data Infrastructure | ✅ COMPLETE |

**Details:** See [TEAM_INBOX_ARCHIVE.md](TEAM_INBOX_ARCHIVE.md)

---

## Messages TO Joe (CTO)

*Team members: Update your row when task is complete or if you have questions.*

| From | Status | Message |
|------|--------|---------|
| **Joseph** | ✅ **COMPLETE** | **CLI-005 Client Archive Migration (2025-12-08):** Added archive columns (`archived`, `archived_at`, `archived_reason`, `idx_clients_archived`) and **last_activity_at** to `clients` in SQLite. Migration is idempotent and already applied on the Azure VM (`data/eislaw.db`), API container restarted. `db_api_helpers.py` updated to persist/expose archive + last_activity_at; `DATA_STORES.md` updated. Alex is unblocked to build archive/restore endpoints (CLI-006) and CLI-P03 list ordering can use `last_activity_at`. |
| **David** | ✅ **COMPLETE** | **CLI-P03 Client Overview Documents Consolidation PRD (2025-12-08):** Amended per CTO feedback (`docs/PRD_CLIENT_OVERVIEW_CONSOLIDATION.md`). Added DB-backed ordering (`last_activity_at` column + index) and API updates to set `last_activity_at` on document generation/open/email preview; clients list should order by `last_activity_at DESC` then `created_at DESC`. Scope: single "מסמכים" block consolidating SharePoint/local/doc actions, RTL + 44px controls, missing-SharePoint warning + CTA, badges for connected/missing/local, optional doc generation button, telemetry events, and removal of duplicate doc buttons in Overview. |
| **Joe (CTO)** | ⚠️ **AMEND REQUIRED** | **CTO SKEPTICAL REVIEW - CLI-P03 Overview Consolidation PRD (2025-12-08):** Good PRD overall. **Documents Block:** ✅ Clear design with badges, states, Hebrew copy. **Acceptance Tests:** ✅ 11 scenarios. **RTL/44px:** ✅ Referenced design system. **ISSUE:** Section 3.1 says "No backend changes" but list ordering (CL-014, CL-015) needs DB persistence. **CEO DECISION:** DB-backed persistence approved. **REQUIRED AMENDMENTS:** (1) Add `last_activity_at TEXT` column to clients table in §3.1 or new §3.1a. (2) Update §3.4 to note API must update `last_activity_at` on document/email actions. (3) Remove "No backend changes" statement. (4) Add migration SQL. After David amends, will give final approval. **VERDICT: ⏳ CONDITIONAL - David to amend PRD.** |
| **David** | ✅ **COMPLETE** | **CLI-P02 Client Archive PRD (2025-12-08):** PRD finalized (`docs/PRD_CLIENT_ARCHIVE.md`) and features spec updated. Highlights: dedicated archive/restore endpoints + `?archived` filter (active default), RTL/44px UI per design system with confirmation dialog + banner, audit logging + telemetry events, performance target <300ms on 5k clients, auto-archive after 6 months inactivity (02:00 UTC daily) with optional dry-run preview, archive is reversible and does not pause email/task sync. Needs CEO sign-off; requesting CTO review. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - CLI-P02 Client Archive PRD (2025-12-08):** Comprehensive PRD covering all requirements. **Schema:** ✅ 3 columns (`archived`, `archived_at`, `archived_reason`) + index. **API:** ✅ 3 endpoints with full error handling (404/409), rate limiting. **Frontend:** ✅ 4 touchpoints (list row, detail banner, more menu, contacts tab). **UI:** ✅ 5 mockups with Hebrew copy. **Security:** ✅ Audit logging, permission model. **Telemetry:** ✅ Event tracking + KPIs. **Edge Cases:** ✅ Idempotent ops, direct URL handling. **Auto-Archive:** ✅ 6-month inactivity, 02:00 UTC daily, dry-run option. **Tests:** ✅ 17 scenarios (AR-001 to AR-017). **VERDICT: ✅ DAVID APPROVED.** PRD ready for CEO sign-off. After CEO approval, will create implementation tasks for Joseph→Alex→Maya→Eli pipeline. |
| **Alex** | ✅ **COMPLETE** | **CLI-004 Save Email Attachments to SharePoint (2025-12-08):** Implemented backend endpoint `POST /api/email/attachments/save-to-sharepoint` and frontend button in `EmailsWidget.jsx` with loading/disabled/toast states. CTO found and fixed 2 bugs during review. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - CLI-004 Save Email Attachments (2025-12-08):** Alex correctly marked BLOCKED - he found a real issue (no test client with emails). I investigated and found: (1) Alex used wrong endpoint `/api/clients/{cid}/emails` (mock data) instead of `/email/by_client` (real Graph API). (2) Two bugs in Alex's code: `$top=5` too small (eitan@eislaw.co.il is user #5+, now `$top=20`), malformed `$select` query caused 400 errors (removed). **LIVE TEST:** ✅ Gal Zar client → email "נוסח הסכם שכירות גל זר בקרית יבנה.docx" (433KB) → saved to SharePoint `לקוחות משרד/גל זר/`. **Frontend synced** to VM. **VERDICT: ✅ CLI-004 APPROVED.** Maya is UNBLOCKED for frontend testing. |
| **Joseph** | ✅ **COMPLETE** | **Airtable Contacts table ready (2025-12-08):** Added migration `backend/migrations/add_airtable_contacts.py`, ran on VM (after chown to allow writes). Table + indexes verified via PRAGMA. Insert/select test record on VM succeeded (cleaned up). Docs updated in `docs/DATA_STORES.md`; task doc marked complete. Ready for Alex to build sync endpoints. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - Airtable Contacts Table (2025-12-08):** Verified on VM via API container Python. **Schema:** ✅ Table `airtable_contacts` exists with all 18 columns per spec. **Constraints:** ✅ PK on `id`, NOT NULL on `airtable_id` + `name`, UNIQUE on `airtable_id`. **Indexes:** ✅ 4 custom indexes (airtable_id, name, activated, client) + 2 auto-indexes for UNIQUE. **Defaults:** ✅ `activated=0`, `first_synced_at`/`last_synced_at` auto-populate with datetime. **Test:** ✅ INSERT Hebrew text (בדיקת ג׳ו) → SELECT by name → SELECT by airtable_id → DELETE cleanup all passed. **Docs:** ✅ `DATA_STORES.md` updated with table schema. **VERDICT: ✅ JOSEPH APPROVED.** Table ready - Alex is UNBLOCKED to start sync endpoints. |
| **Noa** | ✅ **COMPLETE** | **Privacy Form Copy Optimization COMPLETE (2025-12-07):** All 5 phases done. ✅ 7/7 questions rewritten (removed "כפופים", "פילוח", "מיקור חוץ" jargon). ✅ New checkbox order (financial first, sensitive last). ✅ Help text shortened 50%+ (example-first format). ✅ UX additions: progress indicators, 2-3 min time estimate, button copy improvements. ✅ 13 tooltips written. **Next:** Legal review of rewrites before Fillout implementation. Ready for CTO review! |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO REVIEW - Privacy Form Copy Optimization (2025-12-07):** Excellent conversion copywriting. **Rewrites:** ✅ All 7 questions clear, example-driven ("כפופים" → "מחויבים", "פילוח" → "ממוקדים לפי מידע") ✅ Legal meaning preserved. **Checkbox Reorder:** ✅ Business → Professional → Healthcare → Sensitive. "Sexual orientation" moved #1 → #10 (critical fix!). **Help Text:** ✅ All start with "למשל:" ✅ 50%+ shorter. **UX:** ✅ Progress, time estimate, button copy. **Tooltips:** ✅ 13 tooltips <15 words. **VERDICT: ✅ NOA APPROVED.** Ready for legal review → CEO approval → Fillout implementation. |
| **Alex** | ✅ **COMPLETE** | **Airtable sync endpoints updated (2025-12-08):** Fixed activate endpoint to set stage=`active` (no Hebrew value). Push endpoint now skips unchanged records (uses sync_hash) to avoid bulk push timeouts. Ready for VM re-test with Airtable token + hot reload. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - Airtable Sync Endpoints (2025-12-08):** **RE-TEST AFTER FIXES:** ✅ **ALL 4 ENDPOINTS NOW WORK!** **GET /api/airtable-contacts:** ✅ 135 contacts, filters work. **POST /api/sync/pull-airtable:** ✅ 135 contacts pulled from Airtable. **POST /api/sync/push-airtable:** ✅ FIXED - now skips unchanged (135 skipped, instant response). **POST /api/contacts/activate:** ✅ FIXED - stage="active" works, client created successfully (id: 3813edeb-bcbb-4142-8837-695097bfa3f6), airtable_url auto-generated. **Code Verified:** Line 475 `stage: "active"`, Lines 429-432 skip unchanged contacts. **VERDICT: ✅ ALEX APPROVED.** All 4 Airtable sync endpoints working. Maya is UNBLOCKED to start frontend tab. |
| **Alex** | ✅ **COMPLETE** | **ALG-001 FIXED (2025-12-07):** ✅ Biometric minimum floor logic added to `compute_derived_fields()` in `backend/privacy_fillout_sync.py`. **Root Cause:** Function set `sensitive=True` when biometric_100k=Yes but did NOT enforce 100K minimum for `sensitive_people` and `ppl`. **Fix:** Added floor enforcement (BIOMETRIC_MIN=100000). **Test Results:** Submission 20 (biometric_100k=כן): sensitive_people 76786→**100000** ✅. Submission 21 (biometric_100k=לא): sensitive_people=0 (unaffected) ✅. API restarted, live on VM. See `TASK_ALEX_BIOMETRIC_CONSTRAINT.md`. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - ALG-001 Biometric Constraint (2025-12-07):** Verified on VM. **Code Review:** ✅ `compute_derived_fields()` in privacy_fillout_sync.py updated ✅ Floor enforcement: `if biometric_100k: ppl = max(ppl, 100000); sensitive_people = max(sensitive_people, 100000)`. **Test Results:** ✅ Submission 20 (biometric כן): 76786 → 100000 (enforced) ✅ Submission 21 (biometric לא): unchanged ✅ API restarted, live. **VERDICT: ✅ ALEX APPROVED.** ALG-001 FIXED - biometric checkbox now correctly enforces 100K minimum. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - BUG-001 & BUG-002 (2025-12-07):** Verified on VM. **BUG-001 (Documents Tab):** ✅ `sharepointLinked` check at line 61 (checks `sharepoint_url` OR `folder`). ✅ Toast error for "SharePoint Folder" button (line 933): "לא הוגדרה תיקיית SharePoint ללקוח זה". ✅ Toast error for "Create Documents" button (line 964): extended message about configuring folder first. ✅ `showToast` function defined (lines 69-70). **BUG-002 (Airtable Persistence):** ✅ `ClientUpdate` model has `airtable_id` + `airtable_url` fields (lines 3103-3104, 3108-3109). ✅ PATCH handler passes fields to `update_data` (lines 3211-3214). ✅ API test: `PATCH /registry/clients/{id}` with `airtable_id` returns `{"success": true}` and persists. ✅ Fresh GET confirms persistence. **Services:** API ✅, web-dev ✅, Vite hot-reload confirmed. **VERDICT: ✅ ALEX APPROVED.** BUG-001 ✅ BUG-002 ✅. BUG-003 on hold (needs CEO repro steps). |
| **Maya** | ✅ **COMPLETE** | Phase 5E Privacy Frontend Wiring COMPLETE. All API endpoints wired. P-003 and P-004 fixed. |
| **Eli** | ✅ **COMPLETE** | **Phase 5F: Privacy E2E Test Suite COMPLETE (2025-12-07):** ✅ **ALL 12 TESTS PASS!** Created `privacy-e2e.spec.ts` with comprehensive coverage. **Test Results:** TC-01 Navigation ✅, TC-02 Submissions list ✅, TC-03 Detail panel ✅, TC-04 Correct button (44px+) ✅, TC-05 Preview email ✅, TC-06 Approve/Publish ✅, TC-07 Send email (86px height) ✅, TC-08 Pagination ✅, TC-09 Refresh button ✅, TC-10 All buttons ≥44px (13 buttons, 0 undersized) ✅, API submissions (50 records) ✅, API metrics (100 submissions, 100 scored) ✅. **Execution Time:** 32.9s. **Test File:** `tests/privacy-e2e.spec.ts` on VM. **VERDICT:** Privacy module fully functional. Ready for CTO final review! |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO FINAL REVIEW - Privacy E2E Test Suite (2025-12-07):** Comprehensive test coverage verified. **Test Results:** ✅ ALL 12 TESTS PASS (100% pass rate) ✅ Execution time: 32.9s. **Coverage:** TC-01 Navigation, TC-02 Submissions list, TC-03 Detail panel, TC-04 Correct button (44px+), TC-05 Preview email, TC-06 Approve/Publish, TC-07 Send email (86px), TC-08 Pagination, TC-09 Refresh button, TC-10 Button accessibility (13 buttons, 0 undersized). **API Tests:** ✅ 50 submissions ✅ 100 scored ✅ Metrics endpoint working. **VERDICT: ✅ ELI APPROVED.** Privacy module E2E testing COMPLETE. Privacy is production-ready! |
| **Maya** | ✅ **COMPLETE** | **Contacts List Tab ready (2025-12-08):** Added "רשימת קשר" tab on Clients page with Airtable contacts table, search/filter, sync button, and activation modal (creates client + optional SharePoint folder). Wired to `/api/airtable-contacts`, `/api/sync/pull-airtable`, `/api/contacts/activate`. RTL + 44px controls. Synced to VM (`frontend/src/...` + web-dev restarted). |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - Contacts List Tab (2025-12-08):** Tested via Playwright on VM. **Tab Navigation:** ✅ "👥 לקוחות" and "רשימת קשר" tabs visible and functional. **Contacts List:** ✅ 135 contacts displayed from Airtable sync. **Sync Button:** ✅ Shows spinner, updates timestamp, displays "סנכרון הושלם בהצלחה" toast. **Search:** ✅ Hebrew placeholder, filters contacts. **Table:** ✅ Hebrew headers (שם, טלפון, סטטוס, פעולות), status badges ("ליד"/"מופעל"). **Buttons:** ✅ "פתח תיקייה" for leads, "צפה בלקוח" for activated. **Activation Modal:** ✅ Opens with contact name, SharePoint folder input, ביטול/צור כלקוח buttons. **RTL:** ✅ `dir="rtl"` applied. **44px Touch Targets:** ✅ Sync button height: 44px. **VERDICT: ✅ MAYA APPROVED.** Contacts List Tab production-ready. Airtable integration feature COMPLETE (Joseph→Alex→Maya pipeline). |
| **Noa** | 🔄 **PHASE 1 COMPLETE** | **A/B Test Phase 1 Design COMPLETE (2025-12-08):** ✅ Test methodology defined: **Hybrid approach** (6 businesses sequential for qualitative + 14 businesses split for quantitative). ✅ Feedback forms designed: Comparison form (Phase A) + post-completion survey (Phase B). ✅ Abandonment measurement criteria defined: Started-but-not-submitted formula, per-question tracking, success thresholds (<15% abandonment, ≥4.0 clarity). ✅ Business briefing templates ready: Email/WhatsApp invitation + instructions for both phases. **AWAITING CEO DECISIONS:** (1) Approve Hybrid methodology? (2) Provide pilot business list or Noa recruits? (3) Timeline confirmation (est. 2.5 weeks). (4) Legal review parallel or sequential? **See full deliverables:** `TASK_NOA_AB_TEST_BUSINESSES.md` → "Noa's Phase 1 Deliverables" section. |
| **David** | ✅ **COMPLETE** | **WordPress Dynamic Report PRD deliverables posted (2025-12-08):** Filled in the PRD with finalized API spec (`GET /api/public/report/{token}`), response schemas, security (90-day expiry, rate limits, CORS to eislaw.co.il), WordPress flow, WooCommerce integration plan, and CEO-dependent content matrix. Waiting on CEO for per-level text, videos, SKUs/pricing, and optional CTA copy. See `docs/PRD_WORDPRESS_DYNAMIC_REPORT.md`. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - PRI-P01 WordPress PRD (2025-12-08):** ✅ Flow diagram matches CEO requirements. ✅ API endpoint spec complete with all response schemas. ✅ Error states well-documented. ✅ Security considerations comprehensive. **Clarifications added:** Rate limit storage = in-memory (CEO approved), Expiry = submitted_at + 90 days UTC. **VERDICT: ✅ DAVID APPROVED.** PRD ready for implementation. Created **PRI-005** for Alex to build API endpoint. |
| **Alex** | ✅ **COMPLETE** | **PRI-005 Public Report API Endpoint COMPLETE (2025-12-08):** Implemented `GET /api/public/report/{token}` endpoint in `backend/main.py` with in-memory rate limiting (20 req/5 min per IP), 90-day expiry enforcement, strict CORS (`https://eislaw.co.il`), and SQLite read (prefers privacy.db, falls back to eislaw.db). Response includes level, level_hebrew, business_name, requirements object, timestamps. See `TASK_ALEX_PUBLIC_REPORT_ENDPOINT.md`. |
| **Joe (CTO)** | ✅ **APPROVED** | **CTO SKEPTICAL REVIEW - PRI-005 Public Report API (2025-12-08):** Tested on VM after syncing code and restarting API. **Valid Token Test:** ✅ Returns 200 with correct JSON schema (level, level_hebrew, business_name, requirements, submitted_at, expires_at). **Invalid Token Test:** ✅ Returns 404 `{"valid": false, "reason": "invalid_token"}`. **CORS Header:** ✅ `access-control-allow-origin: https://eislaw.co.il`. **Rate Limiting:** ✅ After ~17 rapid requests returns 429 `{"error": "rate_limited"}`. **Hebrew Level Mapping:** ✅ lone→יחיד, basic→בסיסית, mid→בינונית, high→גבוהה. **VERDICT: ✅ ALEX APPROVED.** Endpoint production-ready. WordPress can now integrate! |

*For completed messages history, see [TEAM_INBOX_ARCHIVE.md](TEAM_INBOX_ARCHIVE.md)*

---

## Backlog (After Core 4 Complete)

| ID | To | Task | Priority | Doc |
|----|-----|------|----------|-----|
| CLI-001 | **Alex** | Add Missing Agent Tools (Clients) | P1 | `AUDIT_ACTION_INVENTORY_CLIENTS.md` |
| CLI-002 | **Alex + Maya** | File Upload to SharePoint | P2 | `TASK_ALEX_MAYA_FILE_UPLOAD.md` |
| CLI-003 | **Alex** | DOCX Template Generation Backend | P3 | `PRD_QUOTE_TEMPLATES.md` |

---

## Open Questions for CEO

1. ~~**Report hosting:** Azure Blob? SharePoint? Custom domain?~~ → **DOCUMENTED** - See `PRIVACY_FEATURES_SPEC.md` → "Report Delivery Options" (3 options: WordPress / Email-Only / Azure Blob). CEO to decide.
2. **Short URLs:** Use bit.ly or custom domain (e.g., `eis.law/r/xxx`)?

---

## Quick Links

### Bibles (Authoritative Sources of Truth)
| Resource | Path | Purpose |
|----------|------|---------|
| **Data Bible** | `docs/DATA_STORES.md` | Where ALL data is stored |
| **API Bible** | `docs/API_ENDPOINTS_INVENTORY.md` | All API endpoints + AI Agent tools |
| **Marketing Bible** | `docs/MARKETING_BIBLE.md` | Landing pages, forms, A/B testing, conversion |

### Reference
| Resource | Path |
|----------|------|
| Team roster | `docs/TEAM.md` |
| All tasks | `docs/TASK_*.md` |
| Audit results | `docs/AUDIT_RESULTS_*.md` |
| PRDs | `docs/PRD_*.md` |
| **Completed work** | `docs/TEAM_INBOX_ARCHIVE.md` |

---

## Troubleshooting & Logs

### How to View Logs

**SSH to VM first:**
```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
```

**API (Backend) Logs:**
```bash
/usr/local/bin/docker-compose-v2 logs api --tail=50        # Last 50 lines
/usr/local/bin/docker-compose-v2 logs api -f               # Follow live
/usr/local/bin/docker-compose-v2 logs api | grep -i error  # Errors only
```

**Frontend (Vite) Logs:**
```bash
/usr/local/bin/docker-compose-v2 logs web-dev --tail=20
/usr/local/bin/docker-compose-v2 logs web-dev -f
```

---

## How to Use This Document

**Team Members:**
1. Check "Messages FROM Joe" for your current task
2. Open your task document for full instructions
3. Update "Messages TO Joe" when done or if blocked
4. Fill in Completion Report in your task document

**Joe (CTO) - Review Requirements:**
Before performing a skeptical review, Joe must verify:
1. Team member has posted message with **✅ COMPLETE** status (not 🔄 IN PROGRESS)
2. Task doc Completion Report checklist is filled in
3. Code is synced to VM and tested (per HANDSHAKE RULE)
4. If any of the above are missing → send back to team member, do not review

**Status Codes:**
- 🔄 In Progress
- ✅ Complete
- ❌ Blocked
- ⏸️ On Hold

**Task ID System (Module-Based):**

| Module | Prefix | Description | Next |
|--------|--------|-------------|------|
| Clients | `CLI` | Client management, SharePoint, tasks | CLI-004 |
| Privacy | `PRI` | Privacy scoring, reports, forms | PRI-006 |
| RAG | `RAG` | Recordings, transcripts, search | RAG-001 |
| AI Studio | `AIS` | Chat, agents, LLM integration | AIS-001 |
| Airtable | `ATB` | Airtable sync, contacts | ATB-004 |
| Infrastructure | `INF` | DevOps, Docker, Azure | INF-001 |
| Marketing | `MKT` | Landing pages, A/B tests, conversion | MKT-002 |
| General | `GEN` | Cross-module tasks | GEN-001 |

**Type Suffixes:**
| Suffix | Type | Example |
|--------|------|---------|
| (none) | Task | `CLI-001` |
| `-B##` | Bug | `CLI-B01` |
| `-A##` | Algorithm | `PRI-A01` |
| `-P##` | PRD | `PRI-P01` |

**Special Prefixes:**
| Prefix | Type |
|--------|------|
| `AD-XXX` | Architecture decisions |
| `CEO-XXX` | CEO action items |

---

*This document is the primary communication channel. Check it daily.*
*For historical completed work, see [TEAM_INBOX_ARCHIVE.md](TEAM_INBOX_ARCHIVE.md)*
