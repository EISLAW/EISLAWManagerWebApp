# Work Plan: Clients Module + Dashboard Redesign

**Created:** 2025-12-01
**Priority Order:** Clients first → Dashboard second
**Rationale:** Dashboard surfaces data from Clients. Fix the data source before fixing the display.

---

## Phase 0: Architecture Prerequisites (CRITICAL)

These must be done BEFORE any UX work, as they affect all subsequent features.

### 0.1 Tasks Backend Migration
**Current:** Tasks stored in localStorage (browser-only)
**Problem:** No sync, no collaboration, lost if browser cleared, Dashboard can't aggregate
**Solution:** Move tasks to backend storage

| Task | Details | Effort |
|------|---------|--------|
| Create tasks API endpoints | `POST/GET/PATCH/DELETE /api/tasks` | 1 day |
| Add tasks table/collection | Airtable "Tasks" table or local JSON store | 0.5 day |
| Migrate TaskAdapter.js | Replace localStorage with API calls | 1 day |
| Add client_id linkage | Each task linked to client | 0.5 day |
| Add due_date field | Required for urgency sorting | 0.5 day |
| Add priority field | High/Medium/Low | 0.5 day |
| Data migration script | Move existing localStorage tasks to backend | 0.5 day |

**Total: ~5 days**

**API Design:**
```
POST   /api/tasks           - Create task
GET    /api/tasks           - List all tasks (with filters)
GET    /api/tasks?client=X  - List tasks for client X
GET    /api/tasks/overdue   - List overdue tasks
GET    /api/tasks/today     - List tasks due today
PATCH  /api/tasks/:id       - Update task
DELETE /api/tasks/:id       - Delete task
```

**Task Schema:**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "client_id": "string",
  "client_name": "string",
  "status": "open|done",
  "priority": "high|medium|low",
  "due_date": "ISO date",
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime",
  "created_by": "string",
  "source": "manual|email",
  "email_ref": { "id": "...", "subject": "..." },
  "subtasks": [{ "id": "...", "title": "...", "done": false }]
}
```

### 0.2 Email Auto-Sync
**Current:** Manual "משוך מיילים" button required
**Problem:** Users forget to sync, data is stale
**Solution:** Auto-sync on client page load

| Task | Details | Effort |
|------|---------|--------|
| Add auto-sync trigger | Sync when client page opens (if last sync > 1hr) | 0.5 day |
| Store last_sync timestamp | Per client in registry | 0.5 day |
| Show sync status | "עודכן לפני X דקות" instead of manual button | 0.5 day |
| Background sync option | Optional: sync all clients periodically | 1 day |

**Total: ~2.5 days**

---

## Phase 1: Client Page - Core Data Display

Focus: Make tasks and emails visible and actionable WITHOUT clicking tabs.

### 1.1 Unified Client Overview (No Tabs for Primary Data)
**Current:** Separate tabs for Overview, Emails, Tasks, Files
**Problem:** Information hidden behind clicks
**Solution:** Dashboard-style single view with everything visible

| Task | Details | Effort |
|------|---------|--------|
| Redesign Overview layout | Two-column: Tasks+Emails left, Details right | 1 day |
| Tasks summary widget | Show 5 recent tasks with due dates inline | 1 day |
| Emails summary widget | Show 5 recent emails with unread indicator | 1 day |
| "הצג הכל" links | Expand to full list (replaces tab navigation) | 0.5 day |
| Activity timeline | "פעילות אחרונה" showing recent events | 1 day |

**Total: ~4.5 days**

**New Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ← לקוחות   Client Name                         [שלח מייל ▾] [⋮]│
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┬─────────────────┐ │
│ │ משימות (3)                      [+ חדש]   │ פרטים          │ │
│ │ ☐ Task 1                   🔴 באיחור 2d   │ 📧 email@...   │ │
│ │ ☐ Task 2                   📅 היום        │ 📱 052-XXX     │ │
│ │ ☐ Task 3                   📅 מחר         │ 📁 תיקייה ✓    │ │
│ │ [הצג את כל המשימות]                       │ [עריכה]        │ │
│ ├───────────────────────────────────────────┼─────────────────┤ │
│ │ מיילים (12)                    [סנכרון ✓] │ אנשי קשר (2)   │ │
│ │ ● Sender 1          לפני 3 שעות      📎 2 │ • Contact 1    │ │
│ │   Sender 2          אתמול                 │ • Contact 2    │ │
│ │   Sender 3          לפני 3 ימים           │ [+ הוסף]       │ │
│ │ [הצג את כל המיילים]                       │                │ │
│ └───────────────────────────────────────────┴─────────────────┘ │
│ פעילות אחרונה                                                   │
│ • לפני 3 שעות: מייל התקבל מ-X                                   │
│ • אתמול: משימה "Y" הושלמה                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Task Card Improvements
**Current:** No due date, no priority, no urgency indicator
**Problem:** Can't see what's urgent at a glance
**Solution:** Rich task cards with all metadata

| Task | Details | Effort |
|------|---------|--------|
| Add due date badge | 🔴 באיחור / 📅 היום / 📅 מחר | 0.5 day |
| Add priority indicator | Color-coded or icon | 0.5 day |
| Add source indicator | 📧 if created from email | 0.5 day |
| Inline checkbox | Mark done without opening modal | 0.5 day |
| Show subtasks count | "3/5 תתי-משימות" | 0.5 day |

**Total: ~2.5 days**

### 1.3 Email List Improvements
**Current:** Dense list, no read/unread, absolute timestamps
**Problem:** Can't scan quickly, don't know what's new
**Solution:** Clear visual hierarchy with status indicators

| Task | Details | Effort |
|------|---------|--------|
| Unread indicator | ● dot for new emails | 0.5 day |
| Relative timestamps | "לפני 3 שעות" instead of "2025-12-01 09:45" | 0.5 day |
| Attachment count | "📎 3" not just icon | 0.25 day |
| Sender name extraction | Show name, not full email address | 0.5 day |
| Collapse preview by default | Show on hover/click | 0.5 day |

**Total: ~2.25 days**

---

## Phase 2: Client Page - Actions & UX

### 2.1 Header Simplification
**Current:** 9 buttons in header
**Problem:** Overwhelming, no hierarchy
**Solution:** 2-3 primary actions + overflow menu

| Task | Details | Effort |
|------|---------|--------|
| Primary action: שלח מייל | Dropdown: Reply / New / To all contacts | 0.5 day |
| Secondary: WhatsApp | Only if phone exists | 0.25 day |
| Overflow menu (⋮) | Edit, Client Card, Sync, Word Templates | 0.5 day |
| Move status badges | To sidebar "פרטים" section | 0.5 day |
| Add back navigation | "← לקוחות" to return to list | 0.25 day |

**Total: ~2 days**

### 2.2 Contacts Form Simplification
**Current:** 6 fields always visible
**Problem:** Overwhelming for simple use case
**Solution:** Progressive disclosure

| Task | Details | Effort |
|------|---------|--------|
| Collapse form by default | Show [+ הוסף איש קשר] button | 0.25 day |
| Required fields only | שם + אימייל inline | 0.5 day |
| Optional fields collapsed | "שדות נוספים" expander | 0.5 day |

**Total: ~1.25 days**

### 2.3 Hebrew Localization
**Current:** Mixed Hebrew/English
**Problem:** Inconsistent, confusing
**Solution:** Full Hebrew UI

| Task | Details | Effort |
|------|---------|--------|
| Tab names | Overview→סקירה, Emails→מיילים, Tasks→משימות, Files→קבצים | 0.5 day |
| Button labels | Edit→עריכה, Client Card→כרטיס לקוח, etc. | 0.5 day |
| Filter labels | Sender→שולח, Receiver→נמען, etc. | 0.5 day |
| Empty states | Hebrew text with guidance | 0.5 day |

**Total: ~2 days**

### 2.4 Empty States with Guidance
**Current:** "No emails yet." (no guidance)
**Problem:** User doesn't know what to do
**Solution:** Helpful empty states with actions

| Task | Details | Effort |
|------|---------|--------|
| Emails empty state | Icon + text + [משוך מיילים] button | 0.5 day |
| Tasks empty state | Icon + text + [הוסף משימה] button | 0.5 day |
| Files empty state | Icon + text + [פתח תיקייה] button | 0.5 day |

**Total: ~1.5 days**

---

## Phase 3: Clients List Page

### 3.1 Search & Filter
**Current:** No search, must scroll to find client
**Problem:** Slow to find clients
**Solution:** Type-to-filter search

| Task | Details | Effort |
|------|---------|--------|
| Search input | Filter by name or email as you type | 1 day |
| Highlight matches | Show which part matched | 0.5 day |

**Total: ~1.5 days**

### 3.2 Status Badges per Client
**Current:** Just name + email + action buttons
**Problem:** Can't see client status at a glance
**Solution:** Status indicators on each row

| Task | Details | Effort |
|------|---------|--------|
| Overdue tasks badge | 🔴 X באיחור | 0.5 day |
| New emails badge | 📧 X חדשים | 0.5 day |
| Missing data warning | ⚠️ if no email/folder linked | 0.5 day |

**Total: ~1.5 days**

### 3.3 Action Button Consolidation
**Current:** 5-6 buttons per row (Open, Emails, Files, SP, Emails)
**Problem:** Too many, confusing duplicates
**Solution:** Single "פתח" + overflow

| Task | Details | Effort |
|------|---------|--------|
| Keep only "פתח" as primary | Goes to client page | 0.25 day |
| Overflow menu per row | Files, SharePoint, Outlook | 0.5 day |
| Remove duplicate "Emails" button | Keep only "Emails (Indexed)" | 0.25 day |

**Total: ~1 day**

---

## Phase 4: Email Tab Deep Improvements

### 4.1 Create Task from Email - Full Loop
**Current:** Task created but no link back to email
**Problem:** Can't trace task origin
**Solution:** Bi-directional linking

| Task | Details | Effort |
|------|---------|--------|
| Task shows email source | "📧 מקור: מייל מ-X" on task card | 0.5 day |
| Click to open email | Link from task → email viewer | 0.5 day |
| Email shows task badge | "✅ משימה נוצרה" if task exists | 0.5 day |

**Total: ~1.5 days**

### 4.2 Filter Bar Improvements
**Current:** Always visible, takes space
**Problem:** Clutters UI when not filtering
**Solution:** Collapsible by default

| Task | Details | Effort |
|------|---------|--------|
| Collapse by default | [🔍 חיפוש מתקדם ▾] | 0.5 day |
| Hebrew labels | All filter labels in Hebrew | 0.5 day |
| Clear all button | Reset all filters at once | 0.25 day |

**Total: ~1.25 days**

---

## Phase 5: Dashboard (AFTER Clients)

### 5.1 Dashboard - Data Integration
**Prerequisite:** Tasks in backend (Phase 0.1)

| Task | Details | Effort |
|------|---------|--------|
| Fetch overdue tasks | `GET /api/tasks/overdue` | 0.5 day |
| Fetch today's tasks | `GET /api/tasks/today` | 0.5 day |
| Aggregate email counts | Per client from existing API | 0.5 day |
| Combine into Dashboard state | Single data fetch on load | 0.5 day |

**Total: ~2 days**

### 5.2 Dashboard - Dynamic Focus Card
| Task | Details | Effort |
|------|---------|--------|
| Urgency state logic | If overdue>0 show red, else if today>0 show orange, etc. | 0.5 day |
| Focus card component | Styled card with count + title + color | 1 day |
| Task list below card | Filtered list matching focus state | 1 day |

**Total: ~2.5 days**

### 5.3 Dashboard - Client Activity Section
| Task | Details | Effort |
|------|---------|--------|
| Clients with activity list | Show clients with new emails or tasks | 1 day |
| Activity badges | 📧 X / ⚠️ X per client | 0.5 day |
| Click to navigate | Go to client page | 0.25 day |

**Total: ~1.75 days**

### 5.4 Dashboard - Quick Actions
| Task | Details | Effort |
|------|---------|--------|
| Inline task completion | Checkbox marks done via API | 0.5 day |
| Quick add task input | Create task from Dashboard | 1 day |
| All-clear celebration | 🎉 state when no urgent items | 0.5 day |

**Total: ~2 days**

---

## Summary: Total Effort Estimate

| Phase | Description | Days |
|-------|-------------|------|
| **Phase 0** | Architecture Prerequisites | 7.5 |
| **Phase 1** | Client Page - Core Data Display | 9.25 |
| **Phase 2** | Client Page - Actions & UX | 6.75 |
| **Phase 3** | Clients List Page | 4 |
| **Phase 4** | Email Tab Deep Improvements | 2.75 |
| **Phase 5** | Dashboard | 8.25 |
| **Total** | | **~38.5 days** |

---

## Recommended Execution Order

### Sprint 1: Foundation (2 weeks)
- [ ] **0.1** Tasks Backend Migration (5 days)
- [ ] **0.2** Email Auto-Sync (2.5 days)
- [ ] **1.2** Task Card Improvements (2.5 days)

### Sprint 2: Client Page Core (2 weeks)
- [ ] **1.1** Unified Client Overview (4.5 days)
- [ ] **1.3** Email List Improvements (2.25 days)
- [ ] **2.1** Header Simplification (2 days)

### Sprint 3: Polish & List (1.5 weeks)
- [ ] **2.3** Hebrew Localization (2 days)
- [ ] **2.2** Contacts Form Simplification (1.25 days)
- [ ] **2.4** Empty States with Guidance (1.5 days)
- [ ] **3.1** Search & Filter (1.5 days)
- [ ] **3.2** Status Badges per Client (1.5 days)

### Sprint 4: Email & Dashboard (2 weeks)
- [ ] **3.3** Action Button Consolidation (1 day)
- [ ] **4.1** Create Task from Email - Full Loop (1.5 days)
- [ ] **4.2** Filter Bar Improvements (1.25 days)
- [ ] **5.1** Dashboard - Data Integration (2 days)
- [ ] **5.2** Dashboard - Dynamic Focus Card (2.5 days)

### Sprint 5: Dashboard Complete (1 week)
- [ ] **5.3** Dashboard - Client Activity Section (1.75 days)
- [ ] **5.4** Dashboard - Quick Actions (2 days)
- [ ] Final testing and polish

---

## Files to Modify

### Backend (new/modified):
- `backend/main.py` - Add tasks API endpoints
- `backend/tasks.py` - New: Task CRUD operations
- `config/registry.json` - Add last_sync_at per client

### Frontend (modified):
- `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx` - Major redesign
- `frontend/src/pages/Clients/ClientsList.jsx` - Search, badges, button consolidation
- `frontend/src/features/tasksNew/TaskBoard.jsx` - Due date badges, priority
- `frontend/src/features/tasksNew/TaskCard.jsx` - Rich card design
- `frontend/src/features/tasksNew/TaskAdapter.js` - Replace localStorage with API
- `frontend/src/pages/Dashboard/index.jsx` - Complete redesign
- `frontend/src/components/DashboardEmails.jsx` - Remove or integrate

### Frontend (new):
- `frontend/src/components/ClientSummary.jsx` - Unified overview widget
- `frontend/src/components/TaskSummaryWidget.jsx` - Tasks with due dates
- `frontend/src/components/EmailSummaryWidget.jsx` - Emails with unread
- `frontend/src/components/ActivityTimeline.jsx` - Recent activity
- `frontend/src/components/DynamicFocusCard.jsx` - Dashboard urgency card
- `frontend/src/components/OverflowMenu.jsx` - Reusable ⋮ menu

---

## Success Criteria

### Phase 0 Complete When:
- [ ] Tasks persist after browser clear
- [ ] Tasks sync across devices/browsers
- [ ] Tasks have due_date and priority fields
- [ ] Emails auto-sync when client page opens

### Clients Module Complete When:
- [ ] All primary data visible on single screen (no tab-clicking needed)
- [ ] Tasks show urgency (overdue/today/tomorrow)
- [ ] Emails show read/unread status
- [ ] Hebrew UI throughout
- [ ] Client list searchable
- [ ] Client list shows activity badges

### Dashboard Complete When:
- [ ] Shows overdue tasks count prominently
- [ ] Shows today's tasks
- [ ] Shows clients with recent activity
- [ ] Can mark task done from Dashboard
- [ ] Can create task from Dashboard
- [ ] Updates in real-time (or on refresh)

---

## Out of Scope (Deferred)

- Mobile responsiveness
- SFU/Stage workflow
- Matter/Case hierarchy (future architectural decision)
- Reply to email from within app (requires Graph send permission)
- File browser improvements
- RAG tab implementation
- Privacy tab implementation
