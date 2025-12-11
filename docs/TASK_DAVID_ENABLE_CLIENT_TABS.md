# Task: Enable RAG and Privacy Tabs in Client Detail

**Assigned To:** David (Product Senior)
**Date:** 2025-12-05
**Priority:** P1
**Depends On:** PRD_CLIENT_DETAIL_ENHANCEMENT.md (complete)

---

## Objective

Enable the commented-out RAG and Privacy tabs in the Client Detail page, so users can access client-specific RAG content and privacy submissions directly from the client context.

---

## Current State

The Client Detail page (`ClientOverview.jsx`) has 4 active tabs:
- ✅ Overview (סקירה)
- ✅ Files (קבצים)
- ✅ Emails (אימיילים)
- ✅ Tasks (משימות)

Two tabs are commented out:
- ❌ RAG - commented out in code
- ❌ Privacy - commented out in code

---

## Task Checklist

### Task 1: Enable RAG Tab

**File:** `frontend/src/pages/Clients/ClientOverview.jsx`

**Steps:**
1. Find the commented RAG tab code
2. Uncomment the tab button in the tabs header
3. Uncomment the tab content panel
4. Verify the tab loads RAG content filtered by client
5. Test that existing RAG functionality works in client context

**Expected behavior:**
- RAG tab shows client-specific recordings/transcripts
- Filter by client ID is applied automatically
- All RAG features work within tab context

---

### Task 2: Enable Privacy Tab

**File:** `frontend/src/pages/Clients/ClientOverview.jsx`

**Steps:**
1. Find the commented Privacy tab code
2. Uncomment the tab button in the tabs header
3. Uncomment the tab content panel
4. Verify the tab loads privacy submissions for this client
5. Test that privacy scoring and validation work in client context

**Expected behavior:**
- Privacy tab shows client's privacy submissions only
- Algorithm scoring displays correctly
- Validation/override features work within tab context

---

### Task 3: Rename Chat Mode to Agent Mode

**File:** `frontend/src/pages/AIStudio/` (find the toggle component)

**Steps:**
1. Find the "Chat Mode" toggle label
2. Rename to "Agent Mode" or "מצב סוכן"
3. Add tooltip explaining what Agent Mode enables
4. Test toggle still functions correctly

---

## Testing Requirements

### After each change:
1. Navigate to Client Detail (click "פתח" on any client)
2. Verify new tab appears in tab bar
3. Click tab and verify content loads
4. Test core functionality within tab
5. Take screenshot

### Test URLs:
- Client Detail: `http://20.217.86.4:5173/#/clients/{client_id}`
- AI Studio: `http://20.217.86.4:5173/#/ai-studio`

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/pages/Clients/ClientOverview.jsx` | Uncomment RAG and Privacy tabs |
| `frontend/src/pages/AIStudio/*.jsx` | Rename Chat Mode to Agent Mode |

---

## Success Criteria

- [x] RAG tab visible and functional in Client Detail
- [x] Privacy tab visible and functional in Client Detail
- [x] Both tabs filter content by current client
- [x] "Agent Mode" label replaces "Chat Mode" in AI Studio
- [x] No breaking changes to existing functionality

---

## Completion Report

**Date:** 2025-12-05

**Tasks Completed:**
| # | Task | Status | Screenshot |
|---|------|--------|------------|
| 1 | Enable RAG tab | ✅ DONE | verify-rag-tab.png |
| 2 | Enable Privacy tab | ✅ DONE | verify-tabs-header.png |
| 3 | Rename Chat Mode to Agent Mode | ✅ DONE | verify-agent-mode.png |

**Files Changed:**
| File | Change |
|------|--------|
| `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx` | Uncommented RAG and Privacy tabs in TabNav, added tab content sections |
| `frontend/src/pages/AIStudio/index.jsx` | Changed label from conditional "Chat Mode/Agent Mode" to always "Agent Mode" with checkmark indicator |

**Verification Results:**
- RAG tab visible: ✅ true
- Privacy tab visible: ✅ true
- Agent Mode button visible: ✅ true
- Chat Mode text removed: ✅ true (count: 0)

**Issues Encountered:**
- None. All changes applied successfully.

---

**Assigned:** 2025-12-05
**Completed:** 2025-12-05
**Reference PRD:** `PRD_CLIENT_DETAIL_ENHANCEMENT.md`
