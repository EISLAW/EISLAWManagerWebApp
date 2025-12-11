# Task: Recent Activity - Remove or Implement

**Assigned To:** David (Product Senior)
**Date:** 2025-12-05
**Priority:** P2
**Reference:** AUDIT_RESULTS_DAVID_PRODUCT.md (Issue #7)

---

## Objective

The "Recent Activity" section on the Dashboard is currently a placeholder that sets wrong expectations. Decide whether to remove it or implement a basic version.

---

## Background

From Product Audit:
> "Recent Activity" is placeholder | Sets wrong expectations | Remove or implement | P2

---

## Task Checklist

### 1. Investigate Current State

**File to check:** `frontend/src/pages/Dashboard/` or similar

Questions to answer:
- Where is "Recent Activity" displayed?
- Is it hardcoded placeholder text or dynamic?
- What data would it show if implemented?

### 2. Make Product Decision

| Option | Pros | Cons |
|--------|------|------|
| **Remove** | Quick, no misleading UI | Less feature-rich dashboard |
| **Implement (basic)** | Useful feature | More work |
| **Hide with toggle** | Can enable later | Adds complexity |

**Recommendation:** Remove for now. Can add back when ready.

### 3. Execute Decision

**If removing:**
1. Find the Recent Activity component/section
2. Comment out or remove from Dashboard
3. Verify Dashboard still looks good
4. Take before/after screenshots

**If implementing (basic):**
1. Define what "activity" means (task updates? client changes?)
2. Create API endpoint: `GET /api/activity`
3. Display last 5-10 activities
4. Show timestamp and description

---

## Testing

```javascript
// Verify Recent Activity is removed/implemented
await page.goto('http://20.217.86.4:5173/#/');
await page.waitForTimeout(2000);

const recentActivity = await page.locator('text=Recent Activity').count();
console.log('Recent Activity visible:', recentActivity > 0);

await page.screenshot({ path: 'dashboard-after-change.png' });
```

---

## Success Criteria

- [x] Decision made (remove or implement)
- [x] Change implemented
- [x] Dashboard looks correct
- [x] No console errors introduced

---

## Completion Report

**Date:** 2025-12-05

**Decision:** ✅ **REMOVE**

**Reason:**
1. Always showed empty placeholder with misleading developer text ("hook to telemetry backlog")
2. No backend API exists for activity data
3. Sets wrong user expectations
4. Clean removal - DashboardEmails remains in column
5. Can be re-added when telemetry is actually implemented

**Files Changed:**
| File | Change |
|------|--------|
| `frontend/src/pages/Dashboard/index.jsx` | Removed WorkQueue component with title="Recent Activity" (line 150) |

**Verification Results:**
- Before: Recent Activity visible: true, Placeholder text visible: true
- After: Recent Activity visible: **false**, Placeholder text visible: **false**

**Screenshots:**
- `dashboard-current.png` - Before removal
- `dashboard-after-removal.png` - After removal

**Issues Encountered:**
- None. Clean removal with no side effects.

---

**Assigned:** 2025-12-05
**Completed:** 2025-12-05

