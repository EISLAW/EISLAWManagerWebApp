<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Next Actions (Short Queue)

Working copy: use the clean clone at `/mnt/c/Coding Projects/EISLAW System Clean` (origin `github.com/EISLAW/EISLAWManagerWebApp`). Older `EISLAW System` tree is archive/reference only.

## Current Focus (2025-11-20)
- **State**: CI deploy workflow now builds/pushes the backend image, deploys to a staging slot, runs /health + smoke tests, and can swap into production. App Insights connection string is applied when present and a heartbeat is emitted during deploy. Frontend still ships to Azure Storage static site.
- **Next fixes**:
  1. Validate App Insights ingestion in Azure (traces/logs) and add alerts for health failures/container restarts.
  2. Tune smoke test cadence (count/timeout) and ensure Fillout/Airtable quotas are respected; add a dry-run toggle if secrets are missing.
  3. Containerized frontend path added (Dockerfile.web + optional Web App input) — decide target Web App/slot and cut over from static if desired.
  4. Enforce tagging discipline: every deploy should set `release_tag` in the workflow and update `docs/CHANGELOG.md` with the tag/image references.
- **Notes**: Kudu credentials stored under `azure_kudu` in `secrets.local.json`. Deployment history lives in `docs/DEPLOY_RUNBOOK.md`.

Owner: You
Last updated: 2025-11-04

- Clients module parity and UX fixes (done)
  - Named Outlook window (EISLAW-OWA) for all opens.
  - “Open Files” now uses server helper first; protocol removed to avoid prompts.
  - “Word Templates…” modal and DOCX generation wired.
  - SharePoint link resolves exact client folder from registry.

- New: Airtable buttons (added)
  - “Airtable Search” opens the matching record or Clients view in Airtable.
  - “Sync Airtable” upserts the client (name/email) via API.

- Owner workflow (in progress)
  - Await Figma delivery for owner pill + popover + modal (prompt issued 2025-11-15).
  - Implement shared owners store (backend + Airtable Clients view) and refactor TaskCard/TaskModal to use the new UX.
  - Extend Playwright coverage: assign owner, verify chip updates across Dashboard, Clients tab, and Task Modal.

- Azure platform hardening (in progress)
  - Backend now runs as custom container. Next up: wire automated builds (GitHub Action) that runs `az acr build` + deploy, so we don’t copy contexts manually.
  - Re-enable reliable log streaming (Kudu log tail intermittently 502s) so we can trace startup errors in the container.
  - Once CI is live, run Fillout→Airtable E2E against Azure and switch the Fillout webhook URL to the production endpoint.
  - Keep using `python tools/azure_log_stream.py --site eislaw-api-01 --channel application --output build/kudu-app.log` (pass Kudu creds via env or flags) to monitor containers during each deploy.

- Create Airtable table `Security_Submissions` per `docs/airtable_schema.json` (manual UI or enable Metadata API for script).
- Add Outlook COM sender script (`tools/send_outlook.ps1`) for AutomailerBridge (optional).
- Optional: add PDF export in the Word compose step and attach.
- Author final production texts in `docs/security_texts.he-IL.json`.
- Update `docs/Testing_Episodic_Log.md` after each test round.

---

## UX/UI Fix Sprint: Clients Section (2025-12-03)

**Audit Report:** `docs/reports/CLIENTS_SECTION_COMPREHENSIVE_AUDIT_2025-12-03.md`
**Priority:** CRITICAL - Visual inconsistencies and language mixing break user experience

### Background (Read This First)
The Clients section has two different task display components that look completely different:
1. **TasksWidget** (file: `frontend/src/components/TasksWidget.jsx`) - Shows on Overview tab, clean card design
2. **TaskBoard** (file: `frontend/src/features/tasksNew/TaskBoard.jsx`) - Shows on Tasks tab, different styling + ENGLISH labels

Users see TasksWidget on Overview, click "הצג הכל", and get a completely different UI with English text.

---

### Task 1: Fix Hebrew Labels in TaskBoard (CRITICAL)
**File:** `frontend/src/features/tasksNew/TaskBoard.jsx`
**Time estimate:** 15-30 minutes

**What to change:**

| Line | Current (English) | Change to (Hebrew) |
|------|-------------------|-------------------|
| 69 | `New task` | `משימה חדשה` |
| 70 | `placeholder="Do X for ${clientName}"` | `placeholder="תאר את המשימה..."` |
| 73 | `Client` | `לקוח` |
| 75 | `Unlinked` | `ללא לקוח` |
| 81 | `Create task` | `צור משימה` |
| 86 | `Select a client to add new tasks. Dashboard view is read-only.` | `בחר לקוח כדי להוסיף משימות. תצוגת הדשבורד היא לקריאה בלבד.` |
| 90 | `No tasks yet.` | `אין משימות עדיין.` |
| 59 | `Finished tasks pool` | Keep Hebrew part only: `משימות שבוצעו` |

**How to verify:**
1. Open `http://20.217.86.4:5173/#/clients/סיון%20בנימיני?tab=tasks`
2. All labels should be in Hebrew
3. RTL layout should not break

---

### Task 2: Unify TaskBoard Visual Style with TasksWidget (HIGH)
**Files:**
- `frontend/src/features/tasksNew/TaskBoard.jsx`
- `frontend/src/components/TasksWidget.jsx` (reference only)

**Current problem:** TaskBoard has no container styling, TasksWidget has clean card.

**TasksWidget styling (reference - DO NOT CHANGE THIS FILE):**
```jsx
// Line 94 - Container
<div className="rounded-xl border border-slate-200 bg-white shadow-sm">
// Line 95 - Header
<div className="flex items-center justify-between border-b px-4 py-3">
// Line 119 - Task row
<div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
```

**Changes to TaskBoard:**

**Step 1:** Wrap the main content in a card container (around line 61-62):
```jsx
// BEFORE:
return (
  <div className="space-y-3">

// AFTER:
return (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
```

**Step 2:** Style the task creation form section (around line 67-88):
```jsx
// BEFORE:
{allowCreate ? (
  <div className="flex flex-wrap gap-2 items-end">

// AFTER:
{allowCreate ? (
  <div className="border-b px-4 py-3">
    <div className="flex flex-wrap gap-2 items-end">
    ...
    </div>
  </div>
```

**Step 3:** Style the tasks list container (around line 89):
```jsx
// BEFORE:
<div className="border rounded divide-y">

// AFTER:
<div className="divide-y">
```

**Step 4:** Remove outer card from completed section (around line 112):
```jsx
// BEFORE:
<div className="mt-1 border rounded">

// AFTER:
<div className="border-t">
```

**How to verify:**
1. Compare TasksWidget on Overview with TaskBoard on Tasks tab
2. Both should have same white card background, same border radius
3. Both should have similar padding and spacing

---

### Task 3: Add ARIA Roles to Tab Navigation (MEDIUM)
**File:** `frontend/src/components/TabNav.jsx`

**Current problem:** No accessibility roles on tabs.

**Find the component and add these attributes:**

```jsx
// On the container element, add:
role="tablist"

// On each tab link/button, add:
role="tab"
aria-selected={current === tab.key}
data-testid={`tab-${tab.key}`}
```

**Example structure:**
```jsx
<nav role="tablist" className="...">
  {tabs.map(tab => (
    <Link
      key={tab.key}
      role="tab"
      aria-selected={current === tab.key}
      data-testid={`tab-${tab.key}`}
      to={`${base}?tab=${tab.key}`}
      className={...}
    >
      {tab.label}
    </Link>
  ))}
</nav>
```

**How to verify:**
1. Open browser DevTools > Elements
2. Find the tab navigation
3. Confirm `role="tablist"` on container
4. Confirm `role="tab"` and `aria-selected` on each tab

---

### Task 4: Hide Placeholder Tabs (MEDIUM)
**File:** `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`

**Current problem:** RAG and Privacy tabs are clickable but show empty content.

**Find line ~780-787 and comment out placeholder tabs:**
```jsx
// BEFORE:
<TabNav base={base} current={tab} tabs={[
  {key:'overview', label:'סקירה'},
  {key:'files', label:'קבצים'},
  {key:'emails', label:'אימיילים'},
  {key:'tasks', label:'משימות'},
  {key:'rag', label:'RAG'},
  {key:'privacy', label:'פרטיות (בקרוב)'}
]}/>

// AFTER:
<TabNav base={base} current={tab} tabs={[
  {key:'overview', label:'סקירה'},
  {key:'files', label:'קבצים'},
  {key:'emails', label:'אימיילים'},
  {key:'tasks', label:'משימות'},
  // Hidden until implemented:
  // {key:'rag', label:'RAG'},
  // {key:'privacy', label:'פרטיות (בקרוב)'}
]}/>
```

**Also remove the tab content blocks (around lines 1140-1148):**
```jsx
// Comment out or delete these blocks:
{tab==='rag' && (
  <Card title="תובנות RAG">
    <div className="text-sm text-slate-600">חיפוש וקטעים – בקרוב</div>
  </Card>
)}
{tab==='privacy' && (
  <Card title="פרטיות">
    <div className="text-sm text-slate-600">בקרוב – ישולב עם PrivacyExpress.</div>
  </Card>
)}
```

**How to verify:**
1. Open any client page
2. Only 4 tabs should be visible: סקירה, קבצים, אימיילים, משימות

---

### Task 5: Add Empty State to Files Tab (LOW)
**File:** `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`

**Find the files tab section (around line 913-922) and add empty state:**

```jsx
// BEFORE:
{tab==='files' && (
  <Card title="קבצים">
    <div className="text-sm text-slate-600 mb-2">קבצים מקומיים:</div>
    <ul className="list-disc pl-6 text-sm">
      {(summary.files||[]).map(f => (
        <li key={f.path}>{f.name}</li>
      ))}
    </ul>
  </Card>
)}

// AFTER:
{tab==='files' && (
  <Card title="קבצים">
    {(summary.files||[]).length === 0 ? (
      <div className="text-sm text-slate-500 text-center py-4">
        אין קבצים עדיין
      </div>
    ) : (
      <>
        <div className="text-sm text-slate-600 mb-2">קבצים מקומיים:</div>
        <ul className="list-disc pl-6 text-sm">
          {(summary.files||[]).map(f => (
            <li key={f.path}>{f.name}</li>
          ))}
        </ul>
      </>
    )}
  </Card>
)}
```

**How to verify:**
1. Open a client with no files
2. Should show "אין קבצים עדיין" instead of empty list

---

### Task 6: Replace alert() with Toast (LOW)
**File:** `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`

**Find usages of `alert()` and replace with a toast notification:**

Lines to change (search for `alert(`):
- Line ~806: `alert('נשמר')`
- Line ~811: `alert('שמירה נכשלה')`
- Line ~1229: `alert('פתיחה ישירה...')`
- Line ~1231: `alert('לא ניתן למצוא...')`
- Line ~1235: `alert('נכשל ביצירת קשר...')`
- Line ~1246: `alert(ok ? '...' : '...')`
- Line ~1248: `alert('עדיין אין קישור...')`

**Option A (Quick fix):** Add a toast state and component:
```jsx
// Add to state declarations (around line 33):
const [toast, setToast] = useState({ show: false, message: '', type: 'info' })

// Add toast component before the closing </div> of the main return:
{toast.show && (
  <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg ${
    toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
  } text-white`}>
    {toast.message}
  </div>
)}

// Replace alert() calls:
// BEFORE: alert('נשמר')
// AFTER: setToast({ show: true, message: 'נשמר', type: 'success' }); setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000)
```

**Option B (Better long-term):** Create a shared Toast component and context.

---

### Testing Checklist

After completing all tasks, verify:

- [ ] Open `http://20.217.86.4:5173/#/clients` - clients list loads
- [ ] Click on any client - Overview tab shows TasksWidget + EmailsWidget
- [ ] Click "הצג הכל" in TasksWidget - Tasks tab opens
- [ ] **Tasks tab has ALL HEBREW labels** (no English text)
- [ ] Tasks tab visual style matches Overview TasksWidget (white card, same borders)
- [ ] Only 4 tabs visible (סקירה, קבצים, אימיילים, משימות)
- [ ] Files tab shows "אין קבצים עדיין" when empty
- [ ] Tab navigation has `role="tablist"` in HTML
- [ ] Add a task from Tasks tab - works without errors

---

### Files Modified Summary
1. `frontend/src/features/tasksNew/TaskBoard.jsx` - Hebrew labels + styling
2. `frontend/src/components/TabNav.jsx` - ARIA roles
3. `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx` - Hide tabs + empty state + toasts

---

## Clients + Dashboard Work Plan (2025-12-01)
**Full Plan:** `docs/WORKPLAN_CLIENTS_AND_DASHBOARD.md`
**Audits:** `docs/reports/CLIENTS_TAB_UI_UX_AUDIT_2025-12-01.md`, `docs/PRD_DASHBOARD_REDESIGN.md`

**Priority:** Clients first → Dashboard second (Dashboard depends on Clients data)

### Sprint 1: Foundation (CRITICAL - do first)
- [ ] **Tasks Backend Migration** — Move tasks from localStorage to backend API
  - Create `/api/tasks` endpoints (CRUD)
  - Add due_date, priority, client_id fields
  - Migrate TaskAdapter.js to use API
- [ ] **Email Auto-Sync** — Sync emails on client page load (not manual button)
  - Store last_sync_at per client
  - Show "עודכן לפני X דקות"
- [ ] **Task Card Due Dates** — Add 🔴 באיחור / 📅 היום / 📅 מחר badges

### Sprint 2: Client Page Redesign
- [ ] **Unified Overview** — Show Tasks + Emails on single screen (no tabs needed)
  - Tasks widget: 5 recent with due dates
  - Emails widget: 5 recent with unread indicator (●)
  - Activity timeline: "פעילות אחרונה"
- [ ] **Header Simplification** — 2-3 primary buttons + overflow menu (⋮)
- [ ] **Email List Improvements** — Relative time, unread dot, attachment count

### Sprint 3: Polish & List Page
- [ ] **Hebrew Localization** — All labels in Hebrew (tabs, buttons, filters, empty states)
- [ ] **Contacts Form** — Collapse by default, only שם+אימייל required
- [ ] **Client List Search** — Type-to-filter by name or email
- [ ] **Client List Badges** — 🔴 overdue tasks, 📧 new emails per row

### Sprint 4: Email Deep + Dashboard Start
- [ ] **Task↔Email Full Loop** — Task shows email source, email shows "משימה נוצרה"
- [ ] **Filter Bar** — Collapse by default, Hebrew labels
- [ ] **Dashboard Data** — Fetch overdue/today tasks from new API
- [ ] **Dynamic Focus Card** — Urgency-based card (red if overdue, orange if today, etc.)

### Sprint 5: Dashboard Complete
- [ ] **Client Activity Section** — Clients with new emails or tasks
- [ ] **Quick Actions** — Inline task completion, quick add task
- [ ] **All-Clear State** — 🎉 celebration when no urgent items

### Out of Scope (Deferred)
- Mobile responsiveness
- SFU/Stage workflow
- Matter/Case hierarchy
- Reply to email from app
- File browser improvements

---

Insights RAG — near‑term tasks (per PRD v2.0 "Inbox First")

**UI/UX Audit (2024-11-30)** — Full report: `docs/reports/RAG_TAB_UI_UX_AUDIT_2024-11-30.md`

Critical fixes (must do):
- [x] Add `data-testid` attributes to all interactive elements per COMPONENT_LIBRARY.md (30+ testids added)
- [x] Implement chat-style bubbles for transcript reviewer (ChatBubble component with WhatsApp-style layout)
- [x] Add audio timestamp sync — click segment to play from that timestamp (audioRef linked, parseTime helper)

Major fixes:
- [x] Implement "Select All" checkbox and bulk action dropdown for inbox items
- [x] Add "Apply to All" buttons for bulk date/domain/client application
- [ ] Implement client-scoped tag filtering (Global + This Client tags only)
- [x] Increase button touch targets to 44px minimum (min-h-[44px] on all buttons)
- [ ] Add right-click context menu for speaker rename (currently input-based)
- [ ] Implement conversational memory for assistant (currently single Q&A)

Minor fixes:
- [ ] Extract SectionCard, StatusPill, LabeledField to shared components
- [ ] Align font sizes with design tokens (text-lg→20pt, text-sm→15pt)
- [ ] Add upload progress percentage
- [ ] Implement keyboard shortcuts (/ to focus search)
- [x] Add ARIA labels to tab navigation, drop zone, action buttons

Backend tasks (unchanged):
- Backend ingest/reviewer: `/api/rag/ingest|inbox|publish|file/{id}|reviewer/{id}` — integrate Gemini (latest key) for transcription, Whisper fallback, real status transitions (transcribing→ready/error), Meilisearch index/reindex on publish/save, hard delete removes index.
- Secrets: replace Gemini key with the new "Gemini 3" key in `secrets.local.json`, then validate model list and content generation; pick target model (e.g., `gemini-2.0-flash-001` or Gemini 3 equivalent) for transcription.
- Auto-extraction: date from file creation/filename; client regex against registry; tag safety filtering to Global_Tags + Client_Tags.
- QA/logging: log deletions/transcription failures; add smoke path (sample audio/text) to verify Inbox → Reviewer → Library; add tests for duplicate hash rejection and publish/delete flows.

Local‑first parity tasks (up next)
- Clients list: multi‑address email search (done).
- UI tests: fix strict selector in `tests/client_update.spec.ts` per new chips.
- Optional: add Edge app‑window launcher endpoint for Outlook (local convenience).


