# PRD: Client Detail Page Enhancement

**Author:** David (Product Senior)
**Date:** 2025-12-05
**Status:** Ready for Implementation
**Priority:** P1

---

## Executive Summary

The Client Detail Page already exists with 4 functional tabs. This PRD covers:
1. **Quote Templates Location Decision** (answered)
2. **Enabling RAG Tab** (commented out in code)
3. **Enabling Privacy Tab** (commented out in code)

---

## Part 1: Quote Templates Location Decision

### Decision: **Keep Current Architecture**

| Function | Location | Status |
|----------|----------|--------|
| Template MANAGEMENT (create/edit/delete) | Settings Page | Coming Soon ("בקרוב") |
| Template SELECTION (use for client) | Client Detail → QuickActions | ✅ Working |

### Rationale

1. **Separation of Concerns**: Admin functions (template management) belong in Settings; user actions (selecting template for client) belong in client context
2. **User Mental Model**: Legal secretary thinks "I need a quote for this client" → goes to client → clicks "הצעת מחיר"
3. **Existing Pattern**: This matches how other systems work (e.g., email templates in settings, use in compose)

### No Changes Required

The current architecture is correct. Proceed with implementing template management in Settings when ready.

---

## Part 2: Enable RAG Tab

### Current State

```javascript
// In ClientOverview.jsx, line ~902:
// {key:'rag', label:'RAG'}, // Hidden until implemented
```

### Recommendation: **Enable with Client-Filtered View**

The RAG tab should show recordings/transcripts related to THIS client.

### Tab Design

```
┌─────────────────────────────────────────────────────────────┐
│ RAG - סיון בנימיני                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  הקלטות קשורות ללקוח (0)                                    │
│  ─────────────────────────                                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  אין הקלטות משויכות ללקוח זה.                         │ │
│  │                                                       │ │
│  │  [+ שייך הקלטה קיימת]    [↗ פתח RAG מלא]             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  תמלולים שמזכירים את הלקוח                                 │
│  ─────────────────────────────                              │
│                                                             │
│  🔍 חיפוש אוטומטי לפי שם לקוח...                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### API Requirements

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rag/by_client?name={name}` | GET | Get recordings linked to client |
| `/api/rag/search?q={client_name}` | GET | Search transcripts mentioning client |
| `/api/rag/{id}/link_client` | POST | Associate recording with client |

### Implementation Steps

1. Uncomment RAG tab in `TabNav` array
2. Create `ClientRagTab.jsx` component
3. Add API endpoint for client-filtered RAG
4. Show "Link recording" action if RAG items exist in system

### Priority: P2

RAG module is currently empty system-wide. Enable tab but show empty state with link to main RAG page.

---

## Part 3: Enable Privacy Tab

### Current State

```javascript
// In ClientOverview.jsx, line ~903:
// {key:'privacy', label:'פרטיות (בקרוב)'} // Hidden until implemented
```

### Recommendation: **Enable with Client-Filtered Submissions**

The Privacy tab should show privacy submissions from THIS client.

### Tab Design

```
┌─────────────────────────────────────────────────────────────┐
│ פרטיות - סיון בנימיני                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  הגשות פרטיות (2)                     [+ הגשה חדשה]        │
│  ───────────────                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 הגשה #1764947769                                 │   │
│  │    תאריך: 5.12.2025                                 │   │
│  │    רמה: בינונית 🟡                                  │   │
│  │    סטטוס: נבדק ✓                                    │   │
│  │                                          [פתח →]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 הגשה #1764123456                                 │   │
│  │    תאריך: 1.11.2025                                 │   │
│  │    רמה: גבוהה 🔴                                    │   │
│  │    סטטוס: ממתין לבדיקה                              │   │
│  │                                          [פתח →]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  סיכום                                                      │
│  ─────                                                      │
│  סה"כ הגשות: 2  |  נבדקו: 1  |  ממתינות: 1                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### API Requirements

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/privacy/submissions?client={name}` | GET | Get submissions for client |
| `/api/privacy/submissions` | POST | Create new submission for client |

### Implementation Steps

1. Uncomment Privacy tab in `TabNav` array (remove "בקרוב")
2. Create `ClientPrivacyTab.jsx` component
3. Filter existing submissions API by client email/name
4. Link "פתח" to full Privacy page with submission pre-selected

### Priority: P1

Privacy module is fully functional. Enabling filtered view per client adds significant value.

---

## Implementation Order

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1 | Enable Privacy tab | P1 | 2 days |
| 2 | Enable RAG tab (empty state) | P2 | 1 day |
| 3 | Template management in Settings | P2 | 3 days |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Privacy tab usage | 50% of client views include privacy tab |
| Time to find client submissions | < 5 seconds (vs. searching in Privacy page) |
| User satisfaction | No complaints about missing tabs |

---

## Appendix: Current Tab Implementation

**File:** `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`

**Line ~900-907:**
```javascript
<TabNav base={base} current={tab} tabs={[
  {key:'overview', label:'סקירה'},
  {key:'files', label:'קבצים'},
  {key:'emails', label:'אימיילים'},
  {key:'tasks', label:'משימות'},
  // {key:'rag', label:'RAG'}, // Hidden until implemented
  // {key:'privacy', label:'פרטיות (בקרוב)'} // Hidden until implemented
]}/>
```

**To enable tabs, simply uncomment and implement corresponding tab content sections.**

---

## Approval

- [ ] CTO Review
- [ ] Implementation Assigned
- [ ] QA Plan Created
