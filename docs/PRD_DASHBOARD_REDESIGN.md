# PRD: Dashboard Redesign v1.0

**Document Owner:** EISLAW Development Team
**Created:** 2025-12-01
**Status:** Draft
**Related:** `docs/NEXT_ACTIONS.md`, `frontend/src/pages/Dashboard/index.jsx`

---

## 1. Problem Statement

The current Dashboard is a structural placeholder that fails to answer the core question: **"What needs my attention right now?"**

### Current Issues:
- KPIs show "-" for most metrics (Pending Reviews, Ready To Send, Open Projects)
- "Recent Activity" is a placeholder with no real data
- "Recent Emails" requires selecting a client first (empty by default)
- Tasks are shown without urgency context (no overdue indicators, no deadlines)
- Filters dominate the UI but don't visibly affect content
- No temporal context (today vs overdue vs upcoming)

### Business Impact:
- Users skip the Dashboard tab entirely
- Morning "catch-up" workflow is not supported
- Overdue items go unnoticed
- Context switching between clients is inefficient

---

## 2. Goals & Success Criteria

### Primary Goal:
Transform the Dashboard from an empty shell into a **daily command center** that surfaces urgent work and enables quick action.

### Success Metrics:
| Metric | Current | Target |
|--------|---------|--------|
| Time to find overdue task | Unknown (manual search) | < 3 seconds |
| Dashboard bounce rate | High (users skip to Clients) | < 30% |
| Tasks completed from Dashboard | 0 (view-only) | > 5/day |
| Daily active Dashboard users | Unknown | 80% of app users |

---

## 3. User Personas

### Primary: Managing Attorney (איתן)
- Opens app in morning to see "what needs attention"
- Manages multiple clients simultaneously
- Wants to clear quick tasks before diving into deep work
- Needs to know what's overdue before client calls

### Secondary: Associate/Paralegal
- Assigned tasks by others
- Needs clear visibility of their personal queue
- Wants to mark items done quickly

---

## 4. Proposed Solution

### 4.1 Layout Architecture

**Two-Zone Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 חיפוש מהיר...]                           [🔔 2] [⚙️]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────┐ ┌───────────────────────┐  │
│  │ ACTION ZONE                     │ │ CONTEXT ZONE          │  │
│  │ ─────────────                   │ │ ────────────          │  │
│  │ [Dynamic Focus Card]            │ │ לקוחות עם פעילות      │  │
│  │                                 │ │ ┌─────┐ ┌─────┐       │  │
│  │ ☐ Task A (Cohen) - 2d late  [✓] │ │ │Cohen│ │Levi │       │  │
│  │ ☐ Task B (Levi) - today     [✓] │ │ │3 📧 │ │1 ⚠️ │       │  │
│  │ ☐ Task C (Ben) - tomorrow   [✓] │ │ └─────┘ └─────┘       │  │
│  │                                 │ │                       │  │
│  │ [הצג עוד...]                    │ │ [כל הלקוחות]          │  │
│  └─────────────────────────────────┘ └───────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ All caught up? Add a task: [________________] [+]        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Dynamic Focus Card

The top card changes based on urgency state:

| State | Card Title | Color | Content |
|-------|------------|-------|---------|
| Overdue > 0 | `🔴 X משימות באיחור` | Red | List overdue tasks |
| Today > 0 | `🟠 X משימות להיום` | Orange | List today's tasks |
| This week > 0 | `📅 X משימות השבוע` | Blue | List upcoming |
| All clear | `✅ הכל מעודכן!` | Green | Celebration + "Add task" |

### 4.3 Task Items with Inline Actions

Each task item includes:
```
☐ [Client Badge] Task title                    [Due badge] [✓]
```

- **Checkbox:** Mark done without opening
- **Client badge:** Click to go to client
- **Due badge:** Visual urgency (red/orange/gray)
- **Quick complete [✓]:** One-click done

### 4.4 Context Zone: Clients with Activity

Shows clients that need attention:
- New unread emails (📧 badge with count)
- Overdue tasks (⚠️ badge)
- Upcoming deadlines (📅 badge)

Click client card → navigates to client page.

### 4.5 Quick Add Task

Always-visible input at bottom:
```
[Client dropdown ▾] [Task title input____________] [+ Add]
```

---

## 5. Data Requirements

### 5.1 Using Existing APIs

| Need | Existing Endpoint | Notes |
|------|-------------------|-------|
| Client list | `GET /api/clients` | ✅ Works |
| Client emails | `GET /email/by_client` | ✅ Works |
| Tasks | Local storage (`TaskAdapter.js`) | ✅ Works |
| Health status | `GET /graph/check`, `GET /sp/check` | ✅ Works |

### 5.2 New Computed Data (Frontend)

No new backend endpoints needed for MVP. Compute on frontend:

1. **Overdue tasks:** Filter tasks where `dueDate < today && status !== 'done'`
2. **Today's tasks:** Filter tasks where `dueDate === today`
3. **Upcoming tasks:** Filter tasks where `dueDate > today && dueDate <= today + 7`
4. **Clients with activity:** Cross-reference clients with recent emails or open tasks

### 5.3 Future Backend Enhancements (Post-MVP)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /dashboard/summary` | Aggregated counts | P2 |
| `GET /activity/recent` | Activity feed | P3 |
| WebSocket `/dashboard/updates` | Real-time refresh | P3 |

---

## 6. UI/UX Specifications

### 6.1 Responsive Breakpoints

| Screen | Layout |
|--------|--------|
| Mobile (<768px) | Single column, stacked zones |
| Tablet (768-1024px) | Two columns (60/40 split) |
| Desktop (>1024px) | Two columns (65/35 split) |

### 6.2 Colors & Visual Language

| Element | Color | Token |
|---------|-------|-------|
| Overdue badge | `#DC2626` | `text-red-600` |
| Today badge | `#EA580C` | `text-orange-600` |
| Upcoming badge | `#2563EB` | `text-blue-600` |
| Done/Clear | `#16A34A` | `text-green-600` |
| Client card hover | `#F1F5F9` | `bg-slate-100` |

### 6.3 Typography

- **Focus card title:** `text-xl font-semibold`
- **Task item:** `text-sm`
- **Client badge:** `text-xs font-medium`
- **Due badge:** `text-xs`

### 6.4 Accessibility

- All interactive elements: min 44x44px touch target
- Color + icon for urgency (not color alone)
- Keyboard navigation: `J/K` for tasks, `Enter` to open
- ARIA labels on all buttons and badges

### 6.5 Hebrew/RTL

- All labels in Hebrew
- Layout: RTL direction
- Dates: `he-IL` locale formatting

---

## 7. Implementation Plan

### Phase 1: MVP (Week 1)
1. Remove current KPI cards (they show nothing useful)
2. Implement Dynamic Focus Card with task filtering
3. Add inline task checkboxes (mark done without opening)
4. Show 5-7 tasks max, sorted by urgency
5. Keep existing "My Tasks" section as fallback

### Phase 2: Context Zone (Week 2)
6. Add "Clients with Activity" section
7. Show client cards with activity badges
8. Link clients to their respective pages

### Phase 3: Quick Actions (Week 3)
9. Add quick task creation input
10. Add celebration state when all clear
11. Polish mobile responsiveness

### Phase 4: Enhancements (Future)
12. Real-time updates (polling every 60s)
13. Activity feed (requires backend)
14. Notification bell integration

---

## 8. Out of Scope (v1.0)

- Role-based views (all users see same dashboard)
- Dashboard customization/widgets
- Calendar integration
- Billable time tracking
- Activity feed (placeholder remains)
- Real-time WebSocket updates

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tasks have no due dates | Focus card shows empty | Default to "all open tasks" if no dates |
| Too many overdue items | User overwhelmed | Cap at 10 items, show count badge |
| Mobile scrolling issues | Poor UX | Single-column layout, collapsible sections |
| Hebrew text overflow | Broken layout | Test with long Hebrew strings |

---

## 10. Success Validation

### Before Launch:
- [ ] Manual test: 5+ tasks with various due dates
- [ ] Manual test: 0 tasks (empty state)
- [ ] Manual test: Mobile viewport
- [ ] Hebrew strings: No overflow

### After Launch:
- [ ] User feedback: "Is this useful?"
- [ ] Track: Dashboard tab usage vs Clients tab
- [ ] Track: Tasks marked done from Dashboard

---

## 11. Appendix: Current vs Proposed

### Current Dashboard Components:
```
- KpiCard x4 (Active Clients, Pending Reviews, Ready To Send, Open Projects)
- DashboardSearch
- TaskBoard (full board, not filtered)
- DashboardEmails (requires client filter)
- WorkQueue (placeholder)
```

### Proposed Dashboard Components:
```
- DynamicFocusCard (new)
- UrgentTaskList (new, filtered by due date)
- ClientActivityCards (new)
- QuickTaskInput (new)
- StatusBar (simplified health indicators)
```

---

## 12. References

- Design tokens: `docs/DesignSystem/DESIGN_TOKENS.md`
- Component library: `docs/DesignSystem/COMPONENT_LIBRARY.md`
- Current Dashboard: `frontend/src/pages/Dashboard/index.jsx`
- Task system: `frontend/src/features/tasksNew/`
