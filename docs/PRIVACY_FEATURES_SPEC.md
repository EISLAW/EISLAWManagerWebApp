# Privacy Features Specification

**Author:** David (Product Senior)
**Date:** 2025-12-06
**Purpose:** Document all features that SHOULD work in the Privacy area
**Context:** CORE 4 POLISH - Privacy Phase (Preparation)

---

## Overview

The Privacy module ("PrivacyExpress") is an automated privacy assessment system that:
1. Fetches questionnaire submissions from Fillout
2. Scores them using codified rules
3. Presents a review UI for approval/override
4. Generates branded reports and emails
5. Tracks accuracy metrics

**Location:** `/privacy` tab in main navigation
**Component:** `frontend/src/pages/Privacy/index.jsx` (429 lines)

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Privacy - Assessments                             [Refresh]     │
├─────────────────────────────────────────────────────────────────┤
│ Privacy Dashboard                                               │
│ Live assessments summary · X items                              │
│ [Overall XX%] [Last 10: XX%]                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│ │ Submissions     │  │ Submission Detail                    │  │
│ │ List (Left)     │  │ (Right Panel)                        │  │
│ │                 │  │                                      │  │
│ │ [Card 1]        │  │ Contact info                         │  │
│ │ [Card 2]        │  │ Badge: Level                         │  │
│ │ [Card 3]        │  │ Questionnaire Answers                │  │
│ │ ...             │  │ Security Level Selection             │  │
│ │                 │  │ Component Checkboxes                 │  │
│ │                 │  │ Override Notes                       │  │
│ │                 │  │ Action Buttons                       │  │
│ │                 │  │ Email Preview                        │  │
│ │                 │  │ Published Links                      │  │
│ └─────────────────┘  └──────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Inventory

### Header Section

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-001 | Page title | "Privacy - Assessments" | ✅ Works | Page loads |
| PV-002 | Refresh button | Reload all submissions | ❌ **BROKEN** | Click "Refresh" → should reload |

### Dashboard/Metrics Section

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-003 | Items count | Shows total submissions loaded | ⚠️ Partial | Check count matches list |
| PV-004 | Overall accuracy | Shows overall accuracy % | ❓ Unverified | Check calculation |
| PV-005 | Last N accuracy | Shows rolling accuracy | ❓ Unverified | Check calculation |
| PV-006 | Date calculation | "היום" (today) count | ❌ **BROKEN** | Stats show wrong day |

### Submissions List (Left Panel)

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-007 | List display | Show all submissions | ✅ Works | Submissions visible |
| PV-008 | Card info | Name, email, phone | ✅ Works | Info visible on cards |
| PV-009 | Level badge | Show security level | ✅ Works | Badge shows (יחיד/בסיסית/etc) |
| PV-010 | Timestamp | Submitted date/time | ✅ Works | Date visible |
| PV-011 | Card click | Expand detail view | ✅ Works | Click → details load |
| PV-012 | Auto-select | First item auto-selected | ✅ Works | Page load → first opens |

### Detail Panel - Header

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-013 | Contact info | Name, business, email, phone | ✅ Works | Info displays |
| PV-014 | Level badge | Current security level | ✅ Works | Badge shows |
| PV-015 | Submission ID | Show ID | ✅ Works | ID visible |
| PV-016 | Submitted date | Full timestamp | ✅ Works | Date displays |

### Detail Panel - Questionnaire Answers

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-017 | Left column | owners, access, ethics, ppl, sensitive | ✅ Works | Values display |
| PV-018 | Right column | biometric, transfer, directmail, etc | ✅ Works | Values display |
| PV-019 | Hebrew labels | Labels from /privacy/labels | ✅ Works | Hebrew shows |
| PV-020 | Value formatting | Boolean → כן/לא, arrays joined | ✅ Works | Formatting correct |

---

## WordPress Public Report Page (NEW - PRI-006)

> **Added:** 2025-12-09 | **Status:** ✅ LIVE
> **URL:** https://eislaw.org/privacy-report/?token={submission_id}
> **Implementation:** WordPress Code Snippets plugin (Snippet #5)

### Overview

External-facing privacy report page for clients to view their assessment results. Fetches data from API and displays in Hebrew RTL layout with level-specific branding.

### Features Inventory

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-WP-001 | Page load | WordPress page at `/privacy-report/` | ✅ Works | Visit https://eislaw.org/privacy-report/ |
| PV-WP-002 | Token parameter | Accepts `?token={UUID}` query param | ✅ Works | Add ?token=xxx to URL |
| PV-WP-003 | Level badge | Color-coded badge (lone=green, basic=blue, mid=orange, high=red) | ✅ Works | Check badge color matches level |
| PV-WP-004 | Level text | Hebrew level text (יחיד/בסיסית/בינונית/גבוהה) | ✅ Works | Verify Hebrew text |
| PV-WP-005 | Business name | Shows business name if available | ✅ Works | Check business name displays |
| PV-WP-006 | Requirements grid | 9 requirements (4 main + 5 additional) with checkmarks | ✅ Works | Verify all 9 items present |
| PV-WP-007 | Main requirements | DPO, Registration, Report, Data Map | ✅ Works | Check 4 main items |
| PV-WP-008 | Additional requirements | worker_security_agreement, cameras_policy, consultation_call, outsourcing_text, direct_marketing_rules | ✅ Works | Check 5 additional items |
| PV-WP-009 | Checkmark styling | Green checkmark (✓) for active, gray dash (−) for inactive | ✅ Works | Verify visual styling |
| PV-WP-010 | Sensitive people count | Shows count if > 0 | ✅ Works | Check number displays |
| PV-WP-011 | Storage locations | Shows locations if available | ✅ Works | Check locations display |
| PV-WP-012 | Dates display | Creation date + expiry date | ✅ Works | Verify dates show correctly |
| PV-WP-013 | RTL layout | Right-to-left Hebrew layout | ✅ Works | Check alignment |
| PV-WP-014 | Error - missing token | Shows "חסר מזהה דוח" if no token | ✅ Works | Visit without ?token= |
| PV-WP-015 | Error - invalid token | Shows "דוח לא נמצא" if invalid | ✅ Works | Use invalid token |
| PV-WP-016 | Error - expired token | Shows "תוקף הדוח פג" if >90 days | ✅ Works | Use expired token |
| PV-WP-017 | Error - rate limited | Shows "יותר מדי בקשות" if 429 | ✅ Works | Multiple rapid requests |
| PV-WP-018 | Footer | Contact info (eislaw.co.il, info@eislaw.co.il) | ✅ Works | Check footer displays |

### Test URLs

```bash
# Valid token (lone level - green badge, no requirements)
https://eislaw.org/privacy-report/?token=b61a2179-47ac-421b-96a9-4b4f3e82c487

# Valid token (high level - red badge, all requirements)
https://eislaw.org/privacy-report/?token=6daac0b0-203c-4d06-901b-faf433ab9993

# Invalid token
https://eislaw.org/privacy-report/?token=invalid-xyz

# Missing token
https://eislaw.org/privacy-report/
```

### Implementation Details

| Aspect | Details |
|--------|---------|
| **Approach** | WordPress Code Snippets plugin (Snippet #5) |
| **Shortcode** | `[eislaw_privacy_report]` |
| **Server-side fetch** | `wp_remote_get()` - no CORS issues |
| **API endpoint** | `http://20.217.86.4:8799/api/public/report/{token}` |
| **PHP file** | `wordpress/eislaw-privacy-report-snippet.php` (git backup) |
| **Database** | `data/privacy.db` → `privacy_submissions` table |
| **Styling** | Inline CSS (basic), ready for Elementor polish |
| **Security** | XSS prevention via `esc_html()`, `esc_attr()`, input sanitization |

### Known Issues

| Issue | Impact | Workaround |
|-------|--------|------------|
| WordPress caching | May serve stale content | Add `?nocache=timestamp` to URL |

### Dependencies

- API endpoint: `/api/public/report/{token}` (documented in `API_ENDPOINTS_INVENTORY.md`)
- WordPress Code Snippets plugin v3.x
- PHP 8.x

### Future Enhancements (CEO-001)

CEO will provide level-specific content:
- **Per-level text:** Custom text blocks for each level (lone/basic/mid/high)
- **Per-level videos:** Embedded videos explaining requirements
- **WooCommerce integration:** Checkout flow with level-specific packages (CEO-002)

### Related Documents

- **PRD:** `docs/PRD_WORDPRESS_DYNAMIC_REPORT.md`
- **Task Doc:** `docs/TASK_MAYA_WORDPRESS_REPORT_PAGE.md`
- **Review:** `docs/JACOB_REVIEW_PRI-006.md`
- **API Docs:** `docs/API_ENDPOINTS_INVENTORY.md` (line ~357)

---

### Detail Panel - Security Level Selection

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-021 | Level radios | יחיד, בסיסית, בינונית, גבוהה | ✅ Works | Radios clickable |
| PV-022 | Pre-selected | Algorithm suggestion selected | ✅ Works | Correct level pre-selected |
| PV-023 | Override level | Can select different level | ✅ Works | Change selection |

### Detail Panel - Components Checklist

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-024 | DPO checkbox | DPO requirement | ✅ Works | Toggle works |
| PV-025 | Registration checkbox | רישום | ✅ Works | Toggle works |
| PV-026 | Report checkbox | דו"ח/PIA | ✅ Works | Toggle works |
| PV-027 | Worker security | התחייבות/מדיניות אבטחת עובדים | ✅ Works | Toggle works |
| PV-028 | Cameras policy | מדיניות מצלמות | ✅ Works | Toggle works |
| PV-029 | Consultation call | שיחת ייעוץ/אימות | ✅ Works | Toggle works |
| PV-030 | Outsourcing text | הנחיות מיקור חוץ | ✅ Works | Toggle works |
| PV-031 | Direct marketing | כללי דיוור ישיר | ✅ Works | Toggle works |

### Detail Panel - Override Notes

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-032 | Override textarea | "הערת שינוי (אופציונלי)" | ✅ Works | Text input works |

### Detail Panel - Action Buttons

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-033 | Preview Email | Generate email preview | ⚠️ Partial | Click → preview shows |
| PV-034 | Send Email | Send via Microsoft Graph | ❓ Unverified | Click → email sends |
| PV-035 | Approve & Publish | Generate report links | ❓ Unverified | Click → links generated |
| PV-036 | Save Review | Save to Airtable | ❓ Unverified | Click → saved |
| PV-037 | Close button | Close detail panel | ✅ Works | Click → panel closes |

### Detail Panel - Email Preview

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-038 | Preview display | Shows after Preview Email | ✅ Works | Preview visible |
| PV-039 | Subject line | "נושא:" with subject | ✅ Works | Subject shows |
| PV-040 | Body preview | Full email body | ✅ Works | Body shows |

### Detail Panel - Published Links

| ID | Feature | Description | Status | Test Action |
|----|---------|-------------|--------|-------------|
| PV-041 | Report URL | Full report link | ❓ Unverified | Link clickable |
| PV-042 | Short URL | Shortened share link | ❓ Unverified | Link clickable |
| PV-043 | Copy Report | Copy report URL | ❓ Unverified | Click → copied |
| PV-044 | Copy Short | Copy short URL | ❓ Unverified | Click → copied |
| PV-045 | Copy WhatsApp | Generate WhatsApp share | ❓ Unverified | Click → WA link copied |

---

## Known Bugs (from BUGS_PRIVACY_PAGE.md)

| ID | Bug | Description | Priority | Status |
|----|-----|-------------|----------|--------|
| P-001 | Activity Log Empty | "יומן פעילות" shows "אין פעילות אחרונה" always | P1 | Open |
| P-002 | Algorithm Decisions Missing | Cannot see/select algorithm decisions | P1 | Open |
| P-003 | Date Calculation Wrong | "היום" (today) shows yesterday's count | P1 | Open |
| P-004 | Refresh Does Nothing | Click "רענן" has no visible effect | P1 | Open |

### Additional Bugs Found During Review

| ID | Bug | Description | Priority | Status |
|----|-----|-------------|----------|--------|
| P-005 | Button Sizing | Action buttons may be <44px height | P2 | Needs audit |
| P-006 | Error Handling | Errors show in red box but may not clear | P2 | Needs verification |
| P-007 | Loading State | "Loading…" text basic, no spinner | P3 | UX improvement |
| P-008 | RTL Issues | Some elements may not align correctly RTL | P2 | Needs audit |

---

## API Endpoints Required

### Data Fetching

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/privacy/labels` | GET | Hebrew labels for fields | ✅ Working |
| `/privacy/submissions` | GET | List all submissions | ✅ Working |
| `/privacy/submissions/{id}` | GET | Single submission detail | ✅ Working |
| `/privacy/metrics` | GET | Accuracy metrics | ❓ Unverified |

### Actions

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/privacy/preview_email` | POST | Generate email preview | ❓ Unverified |
| `/privacy/send_email` | POST | Send via Microsoft Graph | ❓ Unverified |
| `/privacy/save_review` | POST | Save review to Airtable | ❓ Unverified |
| `/privacy/approve_and_publish` | POST | Generate report links | ❓ Unverified |

### Reports

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/privacy/report/{token}` | GET | Render HTML report | ❓ Unverified |
| `/r/{token}` | GET | Short URL redirect | ❓ Unverified |

---

## User Flows

### Flow 1: Review and Approve Submission

```
1. Navigate to /privacy
   ↓
2. Page loads submissions list
   ↓
3. First submission auto-selected (or click to select)
   ↓
4. Review questionnaire answers
   ↓
5. Verify/override security level
   ↓
6. Check/uncheck required components
   ↓
7. (Optional) Add override notes
   ↓
8. Click "Approve & Publish"
   ↓
9. Report links appear
   ↓
10. Preview email → Send Email
```

### Flow 2: Quick Send Without Override

```
1. Navigate to /privacy
   ↓
2. Select submission
   ↓
3. Accept algorithm defaults
   ↓
4. Click "Send Email" (auto-publishes if needed)
   ↓
5. Email sent to client
```

### Flow 3: Share via WhatsApp

```
1. Navigate to /privacy
   ↓
2. Select submission
   ↓
3. Click "Approve & Publish"
   ↓
4. Click "Copy WhatsApp"
   ↓
5. Paste in WhatsApp
```

---

## Button Audit (Accessibility)

| Button | Current Size | Min Required | Status |
|--------|--------------|--------------|--------|
| Refresh | ~px x ~px | 44x44 | Needs measurement |
| Preview Email | ~px x ~px | 44x44 | Needs measurement |
| Send Email | ~px x ~px | 44x44 | Needs measurement |
| Approve & Publish | ~px x ~px | 44x44 | Needs measurement |
| Save Review | ~px x ~px | 44x44 | Needs measurement |
| Close | ~px x ~px | 44x44 | Needs measurement |
| Copy Report | ~px x ~px | 44x44 | Needs measurement |
| Copy Short | ~px x ~px | 44x44 | Needs measurement |
| Copy WhatsApp | ~px x ~px | 44x44 | Needs measurement |
| Level radios | ~px x ~px | 44x44 | Needs measurement |
| Checkboxes | ~px x ~px | 44x44 | Needs measurement |

**Note:** Sarah should perform button size audit when Privacy phase starts.

---

## Data Model

### Submission Object

```javascript
{
  submission_id: string,
  form_id: string,
  submitted_at: datetime,
  contact_name: string,
  contact_email: string,
  contact_phone: string,
  business_name: string,
  level: 'lone' | 'basic' | 'mid' | 'high',
  answers: {
    owners: any,
    access: any,
    ethics: any,
    ppl: any,
    sensitive_people: any,
    sensitive_types: any,
    biometric_100k: boolean,
    transfer: any,
    directmail_biz: boolean,
    directmail_self: boolean,
    monitor_1000: boolean,
    processor: boolean,
    processor_large_org: boolean,
    employees_exposed: boolean,
    cameras: boolean
  },
  score: {
    level: string,
    dpo: boolean,
    reg: boolean,
    report: boolean,
    requirements: string[]
  }
}
```

### Metrics Object

```javascript
{
  accuracy_overall: number,  // 0-1
  accuracy_lastN: number,    // 0-1
  window: number             // default 10
}
```

---

## Report Delivery Options (CEO Decision Pending)

**Status:** 3 options under consideration. CEO to decide which to implement.

### Option 1: WordPress Dynamic Page

| Aspect | Details |
|--------|---------|
| **How it works** | Client visits WordPress site with token in URL. Page queries API and renders results dynamically. |
| **URL example** | `https://eislaw.co.il/privacy-report/?token=abc123` |
| **Pros** | Full branding control, SEO-friendly, easy to update design |
| **Cons** | Requires WordPress plugin development, depends on WP uptime |
| **Storage** | No file storage needed - rendered on demand from `privacy_submissions` table |
| **Expiry** | Token-based, can expire after X days |

### Option 2: Email-Only (No Hosted Report)

| Aspect | Details |
|--------|---------|
| **How it works** | Full report content sent directly in email body (HTML). No external link. |
| **URL example** | N/A - no link, content is inline |
| **Pros** | Simplest to implement, no hosting needed, works offline |
| **Cons** | Long emails, can't update after sent, harder to share |
| **Storage** | Email stored in Outlook, copy in `privacy_submissions` |
| **Expiry** | N/A - lives in client's inbox |

### Option 3: Azure Blob + PDF/HTML

| Aspect | Details |
|--------|---------|
| **How it works** | Generate HTML/PDF file, upload to Azure Blob Storage, send shareable link. |
| **URL example** | `https://eislawstorage.blob.core.windows.net/reports/abc123.html` or custom domain |
| **Pros** | Professional, downloadable PDF, can add custom domain (`reports.eislaw.co.il`) |
| **Cons** | Storage costs (minimal), need to manage blob lifecycle |
| **Storage** | Azure Blob Storage container `reports` |
| **Expiry** | Configurable (30/60/90 days) via blob lifecycle policy |

### Comparison Matrix

| Criteria | WordPress | Email-Only | Azure Blob |
|----------|-----------|------------|------------|
| Implementation effort | High | Low | Medium |
| Hosting cost | WP hosting | $0 | ~$0.02/report |
| Branding | Full control | Email template | Full control |
| Shareability | Link | Forward email | Link + Download |
| Updateable | Yes | No | Generate new |
| Offline access | No | Yes (inbox) | PDF download |
| Analytics | WP stats | Email tracking | Blob access logs |

### CEO Decision Required

1. **Which option to implement?** (can do multiple)
2. **If Azure Blob:** Custom domain (`reports.eislaw.co.il`) or Azure URL?
3. **Report expiry:** How long should links remain valid? (30/60/90 days?)

---

## External Dependencies

| System | Purpose | Integration Point |
|--------|---------|-------------------|
| Fillout | Form submissions | `/privacy/submissions` fetches from Fillout API |
| Airtable | Review state storage | `PRIVACY_REVIEWS` table |
| Microsoft Graph | Email sending | Mail.Send permission |
| Azure AD | Authentication | App registration |
| Azure Blob Storage | Report hosting (Option 3) | Container `reports` (if chosen) |
| WordPress | Dynamic report pages (Option 1) | Custom plugin (if chosen) |

---

## Success Criteria (from CORE_4_POLISH_PLAN)

When Privacy phase starts, these must pass:

- [ ] All submissions load correctly
- [ ] Click any submission → Details show
- [ ] Level selection works
- [ ] Component checkboxes work
- [ ] Approve & Publish → Links generated
- [ ] Send Email → Email delivered
- [ ] Refresh button works (P-004)
- [ ] Date calculation correct (P-003)
- [ ] Activity log shows data (P-001)
- [ ] All buttons ≥44px height
- [ ] E2E test passes
- [ ] CTO skeptical review passes

---

## Priority for Fixing

### P0 - Blocking (Must fix first)

1. **P-004** Refresh button does nothing
2. **P-003** Date calculation wrong (timezone issue)
3. **P-001** Activity log always empty

### P1 - Important

4. **P-002** Algorithm decisions not visible
5. Verify all action buttons work end-to-end
6. Button height audit

### P2 - Nice to have

7. Better loading states
8. RTL alignment improvements
9. Error handling improvements

---

## Comparison with Clients (Benchmark)

| Aspect | Clients | Privacy | Gap |
|--------|---------|---------|-----|
| Features documented | 50+ | 45 | Similar scope |
| Known bugs | 5 (C-001 to C-005) | 4+ (P-001 to P-008) | Similar |
| API endpoints | 10+ | 10+ | Similar |
| User flows | 5+ | 3 | Privacy simpler |
| Button audit | Done | Pending | Need Sarah |

---

**Document Created By:** David (Product Senior)
**For Use In:** CORE 4 POLISH - Privacy Phase (starting after Clients complete)
**Status:** Ready for Privacy sprint
