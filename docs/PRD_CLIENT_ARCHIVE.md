# PRD: Client Archive Feature

**ID:** CLI-P02
**Author:** David (Product Senior)
**Requested By:** CEO
**Date:** 2025-12-08
**Status:** ✅ CEO APPROVED - Ready for Implementation (2025-12-08)

---

## 1. Problem Statement

As the law firm accumulates clients over time, the client list becomes cluttered with inactive clients who no longer require active management. This makes it harder to find active clients and clutters the UI.

**Pain Points:**
- Long client lists slow down finding active clients
- No way to hide completed/inactive clients without deleting them
- Deleted clients lose all history and cannot be recovered

---

## 2. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Lawyer | Archive completed clients | My active client list stays manageable |
| US-02 | Lawyer | Access archived clients when needed | I can review historical data |
| US-03 | Lawyer | Quickly archive from the client list | I don't have to open each client |
| US-04 | Lawyer | Archive from inside a client's page | I can archive after reviewing details |
| US-05 | Lawyer | See a clear indicator when viewing archived clients | I know the client is not active |
| US-06 | Lawyer | Restore archived clients easily | I can reactivate if work resumes |
| US-07 | Lawyer | Have old inactive clients auto-archived | I don't have to manually clean up |

---

## 3. Functional Requirements

### 3.0 Scope, Constraints, and UX Baseline

- Scope: Applies to Clients module (list + detail) and client-related AI tools. Does not change Tasks/Emails logic beyond visibility filters described here.
- RTL-first UI; follow `docs/DesignSystem/README.md` and `DESIGN_TOKENS.md` for colors/typography (reuse alert/banner styles and 44px minimum controls from TASKS_TEMPLATE).
- No data deletion; archive is reversible and keeps all history.
- Performance: Filter/toggle operations should remain sub-300ms on 5k clients in SQLite; pagination behavior unchanged.
- Backward compatibility: Existing API consumers without `archived` filter see active-only results (default).

### 3.1 Database Changes

**New columns in `clients` table:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `archived` | INTEGER | 0 | 0 = visible, 1 = archived |
| `archived_at` | TEXT | NULL | ISO timestamp when archived |
| `archived_reason` | TEXT | NULL | 'manual' or 'auto-inactive-6mo' |

**Migration SQL:**
```sql
ALTER TABLE clients ADD COLUMN archived INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN archived_at TEXT;
ALTER TABLE clients ADD COLUMN archived_reason TEXT;
CREATE INDEX idx_clients_archived ON clients(archived);
```

**Backfill/Migration Steps:**
- Existing rows default to `archived=0`; `archived_at` and `archived_reason` stay NULL.
- Migration must be idempotent (guard with `IF NOT EXISTS` where available; otherwise safely ignore duplicate column errors).
- Update schema docs (`docs/DATA_STORES.md`) and regenerate any ORM/Pydantic models.

### 3.2 API Endpoints

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `GET /api/clients` | GET | List clients | `?archived=0` (default), `?archived=1`, `?archived=all` | Array of clients |
| `POST /api/clients/{id}/archive` | POST | Archive client | `{}` | `{ success: true, archived_at: "..." }` |
| `POST /api/clients/{id}/restore` | POST | Restore client | `{}` | `{ success: true }` |

**Alternative:** Use existing `PATCH /registry/clients/{id}` with `{ archived: 1 }` or `{ archived: 0 }`.

**Recommended:** Dedicated endpoints for clearer audit trail and semantics.

**API Details:**
- Auth: Same permission as editing a client.
- Request validation: `id` must exist; return 404 if not found, 409 if already in target state.
- Responses include `archived`, `archived_at`, `archived_reason`, and `updated_at`.
- Error handling: standard JSON error envelope with `reason` codes (`not_found`, `already_archived`, `already_active`, `validation_error`, `server_error`).
- Rate limiting: reuse existing client mutation rate limits (no new limits needed).

### 3.3 Frontend Touchpoints

#### A. ClientsList Page (`/clients`)

| Location | Feature | UI Element |
|----------|---------|------------|
| Header | Filter toggle | Dropdown: "לקוחות פעילים" / "ארכיון" / "הכל" |
| Client row | Archive button | Icon button in actions column |
| Archived row | Restore button | Icon button (when viewing archived) |
| Archived row | Visual indicator | Gray badge "ארכיון" |

#### B. ClientOverview Page (`/clients/:name`)

| Location | Feature | UI Element |
|----------|---------|------------|
| Top of page | Archived banner | Yellow banner with "שחזר" button |
| More menu (⋮) | Archive action | "העבר לארכיון" menu item |

#### C. ContactsListTab (רשימת קשר)

| Location | Feature | UI Element |
|----------|---------|------------|
| "צפה בלקוח" button | Show archived status | "(ארכיון)" label if client archived |

#### D. AddClientModal (Client Card)

| Location | Feature | UI Element |
|----------|---------|------------|
| Bottom of modal | Archive button | Secondary button (edit mode only) |

### 3.4 Confirmation Dialog

**Required for:** Archive action only (not restore)

**Dialog Content (Hebrew):**
```
Title: העברה לארכיון

Body:
האם להעביר את "{client_name}" לארכיון?

לקוח בארכיון לא יופיע ברשימת הלקוחות הראשית,
אך ניתן לשחזר אותו בכל עת.

מיילים ומשימות ימשיכו להתעדכן כרגיל.

Buttons: [ביטול] [העבר לארכיון]
```

### 3.5 Auto-Archive (6 Months Inactivity)

**Trigger:** Background job or manual endpoint

**Criteria for "inactive":**
- `updated_at` > 6 months ago
- No tasks updated in 6 months
- No emails synced in 6 months (optional)

**Auto-archive sets:**
- `archived = 1`
- `archived_at = NOW()`
- `archived_reason = 'auto-inactive-6mo'`

**Notification:** Show count in system notifications (optional)

### 3.6 Default Behaviors

| Scenario | Behavior |
|----------|----------|
| New client created | `archived = 0` (active by default) |
| Client list default view | Show only active (`archived = 0`) |
| Search default scope | Active clients only |
| Archived client direct URL | Accessible, shows archived banner |
| Email/task sync for archived | **Continues normally** (CEO decision) |

### 3.7 Permissions & Security

- Archive/restore allowed for roles that can edit clients (match existing client edit permission).
- Audit log entry per action: user id, client id, action (`archive`/`restore`), reason (`manual`/`auto-inactive-6mo`), timestamp.
- No public/unauthenticated exposure; filters only affect authenticated client list APIs.

### 3.8 Telemetry & Analytics

- Events: `client_archived`, `client_restored`, `client_archive_auto`.
- Properties: `client_id`, `reason`, `source` (`list_row`, `detail_banner`, `more_menu`, `auto_job`), `user_role`.
- Dashboard KPI: count of archived clients, restores per week, auto-archive executions.

### 3.9 Edge Cases

- Archiving an already archived client returns 409 with no mutation.
- Restoring an active client returns 409 with no mutation.
- Direct URL to archived client must render with banner even if filter default is active.
- Auto-archive must skip clients already archived (idempotent) and log skipped count.

### 3.10 Operational Notes

- Auto-archive job: daily at 02:00 UTC; configuration flag to disable in non-prod.
- Job output logged with counts: scanned, archived, skipped, failures.
- Provide manual endpoint `/api/clients/auto-archive-preview` (dry-run) that returns candidate ids without mutating (optional but recommended for QA).

### 3.11 Out of Scope

- Deleting clients or purging related tasks/emails.
- Changing SharePoint/Airtable schemas for archive state.
- UI redesign beyond adding archive controls and banners aligned to current design system.

---

## 4. AI Agent Tools

### New Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `archive_client` | Archive a client | `client_id` |
| `restore_client` | Restore archived client | `client_id` |

### Updated Tools

| Tool | Change |
|------|--------|
| `search_clients` | Add `include_archived` parameter (default: false) |

---

## 5. UI Mockups

### 5.1 ClientsList - Filter Dropdown

```
┌──────────────────────────────────────────────────────────────┐
│  👥 לקוחות                                    [הוסף לקוח]   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 🔍 חיפוש לקוח...                                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────┐                                     │
│  │ ▾ לקוחות פעילים    │                                     │
│  ├─────────────────────┤                                     │
│  │   לקוחות פעילים    │ ← Default                           │
│  │   ארכיון           │                                     │
│  │   הכל              │                                     │
│  └─────────────────────┘                                     │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 ClientsList - Row with Archive Button

```
┌────────────────────────────────────────────────────────────────┐
│ שם                                              פעולות        │
├────────────────────────────────────────────────────────────────┤
│ גליל פתרונות אחסון  [AT] [SP]         [📧] [📁] [📄] [🗄️]   │
│ מוסך אבי           [AT]               [📧] [📁] [📄] [🗄️]   │
│ דני הנדסה          [חדש]              [📧] [📁] [📄] [🗄️]   │
└────────────────────────────────────────────────────────────────┘
                                                     ↑
                                              Archive button
```

### 5.3 ClientOverview - Archived Banner

```
┌────────────────────────────────────────────────────────────────┐
│  ← לקוחות                                                      │
├────────────────────────────────────────────────────────────────┤
│  ⚠️  לקוח זה בארכיון                           [שחזר לקוח]   │
├────────────────────────────────────────────────────────────────┤
│  גליל פתרונות אחסון                                           │
│                                                                │
│  [סקירה] [מסמכים] [אימיילים] [משימות]                         │
└────────────────────────────────────────────────────────────────┘
```

### 5.4 More Menu with Archive Option

```
┌─────────────────────────┐
│ 📝 ערוך לקוח           │
│ 🔄 סנכרן Airtable      │
│ 📁 פתח תיקייה          │
│ 🔗 פתח ב-Outlook       │
│ 💬 WhatsApp            │
│ 📋 צור הצעת מחיר       │
│ 🗄️ העבר לארכיון       │ ← NEW (red text)
├─────────────────────────┤
│ הצג משימות             │
│ הצג אימיילים           │
└─────────────────────────┘
```

### 5.5 Confirmation Dialog

```
┌────────────────────────────────────────────────────────────────┐
│                       העברה לארכיון                            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│    האם להעביר את "גליל פתרונות אחסון" לארכיון?                │
│                                                                │
│    לקוח בארכיון לא יופיע ברשימת הלקוחות הראשית,               │
│    אך ניתן לשחזר אותו בכל עת.                                  │
│                                                                │
│    מיילים ומשימות ימשיכו להתעדכן כרגיל.                       │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                    [ביטול]  [העבר לארכיון]    │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Airtable Sync Consideration

| Decision | Value | Rationale |
|----------|-------|-----------|
| Sync `archived` to Airtable? | **No** | Archive is a local UI preference, not a business state. Airtable has no archive concept. |

---

## 7. Success Criteria / Test Scenarios

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| AR-001 | Archive from ClientsList row | Client disappears from list, confirmation shown |
| AR-002 | Archive from ClientOverview More menu | Confirmation → archive → redirect to list |
| AR-003 | View archived client directly | Yellow banner shown, all data visible |
| AR-004 | Restore from archived banner | Client returns to active list |
| AR-005 | Restore from archived list view | Click restore → client moves to active |
| AR-006 | Filter toggle: Active | Only non-archived clients shown |
| AR-007 | Filter toggle: Archived | Only archived clients shown |
| AR-008 | Filter toggle: All | All clients shown, archived have badge |
| AR-009 | Search in active view | Only searches active clients |
| AR-010 | New client default | Created with `archived = 0` |
| AR-011 | Archived client email sync | Emails continue to sync normally |
| AR-012 | Auto-archive 6mo inactive | Clients with no activity for 6 months auto-archived |
| AR-013 | ContactsListTab archived indicator | "צפה בלקוח" shows "(ארכיון)" for archived clients |
| AR-014 | Audit logging | Archive/restore actions recorded with user id and reason |
| AR-015 | Banner/accessibility | Archived banner meets contrast, RTL, and 44px control height |
| AR-016 | Performance | Toggling filters returns within 300ms on 5k clients in SQLite |
| AR-017 | Dry-run (if implemented) | `/auto-archive-preview` returns candidates without mutating |

---

## 8. Implementation Order

**Build Order:** `Database → API → Frontend → Test → Docs`

| Phase | Owner | Task | Depends On |
|-------|-------|------|------------|
| 1 | Joseph | Add `archived` columns to clients table | - |
| 2 | Alex | Build archive/restore API endpoints | Phase 1 |
| 3 | Alex | Update `GET /api/clients` with `?archived` filter | Phase 1 |
| 4 | Alex | Add AI agent tools (`archive_client`, `restore_client`) | Phase 2 |
| 5 | Maya | Add filter dropdown to ClientsList | Phase 3 |
| 6 | Maya | Add archive button to ClientsList rows | Phase 2 |
| 7 | Maya | Add archived banner to ClientOverview | Phase 2 |
| 8 | Maya | Add archive to More menu | Phase 2 |
| 9 | Maya | Add confirmation dialog component | Phase 6-8 |
| 10 | Eli | E2E tests for archive feature | Phase 9 |
| 11 | Alex | Auto-archive background job (optional) | Phase 2 |

---

## 9. Update to CLIENTS_FEATURES_SPEC.md

Add the following to `docs/CLIENTS_FEATURES_SPEC.md`:

```markdown
### Archive Feature (NEW)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| AR-001 | Archive from list | Archive client from row menu | Click 🗄️ → confirm → client hidden |
| AR-002 | Archive from detail | Archive from ClientOverview | Click More → "העבר לארכיון" → confirm |
| AR-003 | Restore from list | Restore archived client | Toggle to "ארכיון" → Click ↩️ → restored |
| AR-004 | Restore from detail | Restore from archived client page | See banner → Click "שחזר" |
| AR-005 | Filter toggle | Switch between Active/Archived/All | Dropdown in header |
| AR-006 | Default to active | New clients are not archived | Create client → appears in active list |
| AR-007 | Search scope | Search defaults to active only | Search archived client → no results |
| AR-008 | Auto-archive | Inactive clients archived after 6 months | Background job |

### API Dependencies (Archive)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `GET /api/clients` | GET | List clients with `?archived` filter | ⏳ TBD |
| `POST /api/clients/{id}/archive` | POST | Archive client | ⏳ TBD |
| `POST /api/clients/{id}/restore` | POST | Restore client | ⏳ TBD |
```

---

## 10. Open Questions (Resolved)

| Question | Answer | Decided By |
|----------|--------|------------|
| Freeze email/task sync for archived? | **No** - continue syncing | CEO |
| Confirmation dialog for archive? | **Yes** | CEO |
| Auto-archive timeout? | **6 months** | CEO |
| Sync to Airtable? | **No** - local only | CTO |

---

## 11. CEO Sign-off

- [x] CEO approves this PRD ✅ (2025-12-08)
- [x] CEO confirms auto-archive duration (6 months) ✅ (2025-12-08)
- [x] CEO confirms no freeze on email/task sync ✅ (2025-12-08)

---

## Completion Checklist (For David)

- [x] Review all sections above
- [x] Add any missing UI details
- [x] Confirm Hebrew copy for all UI elements
- [x] Add to CLIENTS_FEATURES_SPEC.md
- [x] Post completion message to TEAM_INBOX.md
- [x] Request CTO review

---

*PRD created by Joe (CTO) based on CEO requirements*
*David to complete and expand*
