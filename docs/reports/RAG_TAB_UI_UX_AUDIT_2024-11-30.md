# RAG Tab UI/UX Audit Report

**Date:** 2024-11-30
**Auditor:** EISLAW Autonomous Developer Agent
**Scope:** `/rag` route — `frontend/src/pages/RAG/index.jsx`
**Reference Documents:**
- `docs/DesignSystem/README.md`
- `docs/DesignSystem/DESIGN_TOKENS.md`
- `docs/DesignSystem/TASKS_TEMPLATE.md`
- `docs/DesignSystem/COMPONENT_LIBRARY.md`
- `docs/Frontend_Dashboard_Plan.md`
- `docs/INSIGHTS_RAG_PRD.md`
- `docs/UX_UI_Spec.md`

---

## Executive Summary

The RAG tab implementation is **functional** and covers most of the core features defined in the PRD. However, there are **17 issues** identified across design token compliance, UX flow, accessibility, and missing features. Priority breakdown: **4 Critical**, **6 Major**, **7 Minor**.

---

## 1. Design Token Compliance

### 1.1 Colors

| Token | Expected | Actual | Status |
|-------|----------|--------|--------|
| `--petrol` | `#0B3B5A` | `bg-petrol`, `text-petrol` | **PASS** |
| `--copper` | `#D07655` | Not used in RAG tab | **INFO** (acceptable) |
| `--card` | `#F7F8FA` | `card` class used | **PASS** |
| `--line` | `#F3F4F6` | `border-slate-200` used | **MINOR ISSUE** |
| Priority tokens | High/Med/Low colors | Not implemented | **N/A** (not needed) |

**Issue #1 (Minor):** Border colors use `slate-200` instead of design token `--line` (`#F3F4F6`). Inconsistent with design system.

### 1.2 Typography

| Token | Expected | Actual | Status |
|-------|----------|--------|--------|
| `--font-hebrew` | Noto Sans Hebrew | Set in `styles.css` body | **PASS** |
| `--fs-heading` | 20pt | `text-lg` (18px) used | **MINOR ISSUE** |
| `--fs-body` | 15pt | `text-sm` (14px) used | **MINOR ISSUE** |

**Issue #2 (Minor):** Font sizes don't match design tokens exactly. `text-lg` is 18px vs 20pt heading; `text-sm` is 14px vs 15pt body.

### 1.3 Spacing & Radius

| Token | Expected | Actual | Status |
|-------|----------|--------|--------|
| `--radius-md` | 12px | `rounded-xl` (12px), `rounded-lg` (8px) | **PASS** |
| `--space-4` | 16px | `p-4`, `gap-4` used | **PASS** |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | `shadow-md` | **PASS** |

---

## 2. Component Library Compliance

### 2.1 data-testid Conventions

**Issue #3 (Critical):** The RAG tab has **zero** `data-testid` attributes. Per COMPONENT_LIBRARY.md, all interactive elements must have:
- `data-testid=tm.<section>.<control>`
- `data-action=<domain>.<verb>`

Missing testids include:
- Tab navigation buttons
- File upload drop zone
- Inbox item actions (Open Reviewer, Quick Edit, Publish, Delete)
- Assistant form inputs
- Reviewer segment controls

### 2.2 Reusable Components

| Component | Expected | Actual | Status |
|-----------|----------|--------|--------|
| SectionCard | Internal to RAG | Not reusable | **MINOR ISSUE** |
| StatusPill | Internal to RAG | Not shared | **MINOR ISSUE** |
| LabeledField | Internal to RAG | Not shared | **MINOR ISSUE** |

**Issue #4 (Minor):** Three utility components (`SectionCard`, `StatusPill`, `LabeledField`) are defined locally in the RAG file. These should be extracted to `src/components/` for reuse across the app.

---

## 3. PRD Feature Compliance (INSIGHTS_RAG_PRD.md)

### 3.1 Ingest Pipeline

| Feature | PRD Requirement | Implementation | Status |
|---------|-----------------|----------------|--------|
| Drop & Go upload | MD5 first 1MB | `md5FirstMb()` implemented | **PASS** |
| Duplicate detection | Reject if hash exists | Implemented | **PASS** |
| Status indicators | Uploading/Transcribing/Ready/Error | `StatusBadge` component | **PASS** |
| Bulk date/domain | Apply to all uploads | Inputs present but partial | **ISSUE** |

**Issue #5 (Major):** Bulk controls for "Apply Date to All" and "Apply Domain to All" are present as inputs but lack the actual "Apply to All" button action. Users can only set defaults for new uploads, not retroactively apply to existing inbox items.

### 3.2 Inbox UI

| Feature | PRD Requirement | Implementation | Status |
|---------|-----------------|----------------|--------|
| Select All checkbox | Bulk selection | Missing | **ISSUE** |
| Bulk Actions dropdown | Multi-item operations | Missing | **ISSUE** |
| Tag safety (client-scoped) | Filter by client | Missing | **ISSUE** |

**Issue #6 (Major):** "Select All" and bulk action controls are specified in PRD but not implemented. Individual checkboxes exist on inbox items but have no handler.

**Issue #7 (Major):** Tag safety (when Client is selected, filter tags to Global + This Client) is not implemented. Tags field is a plain text input.

### 3.3 Transcript Reviewer

| Feature | PRD Requirement | Implementation | Status |
|---------|-----------------|----------------|--------|
| Chat-style bubbles | WhatsApp view | Not implemented | **ISSUE** |
| Audio sync (click to play) | Timestamp playback | Missing | **ISSUE** |
| Global speaker rename | Right-click menu | Input-based (partial) | **PARTIAL** |
| Inline text editing | Edit segment text | Implemented | **PASS** |

**Issue #8 (Critical):** Transcript reviewer uses table-like segment cards instead of the PRD-specified "chat-style bubbles" layout. This significantly impacts UX for transcript review.

**Issue #9 (Critical):** Audio sync (clicking text bubble plays that timestamp range) is not implemented. Audio player exists but segments don't trigger playback at their timestamps.

**Issue #10 (Major):** Speaker rename is via text inputs instead of the specified right-click context menu. Functional but not per spec.

### 3.4 Assistant Interface

| Feature | PRD Requirement | Implementation | Status |
|---------|-----------------|----------------|--------|
| Chat interface | Thread-based memory | Single Q&A only | **ISSUE** |
| Sidebar filters | Client/Tags/Sources | Inline filters | **PARTIAL** |
| Insight cards | Search result display | Not implemented | **ISSUE** |

**Issue #11 (Major):** The assistant is a single-question interface, not a conversational chat with persistent thread memory as specified in the PRD.

**Issue #12 (Minor):** Insight cards with contextual excerpts are not implemented; results show as plain text blocks.

---

## 4. UX Flow Analysis

### 4.1 Navigation

**Current:** Two-tab sidebar (קליטה ואישור / AI עוזר)
**Issue #13 (Minor):** Tab labels mix Hebrew and English ("AI / עוזר"). Should be consistent per UX_UI_Spec (prefer single language per view).

### 4.2 Error Handling

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| API unavailable | Clear error message | "השרת לא זמין (בדוק /health)" | **PASS** |
| Upload failure | Item shows error status | `status: 'error', note: 'Upload failed'` | **PASS** |
| Duplicate file | Rejection with link | Shows "Duplicate" pill | **PASS** |

### 4.3 Loading States

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| Inbox loading | Loading indicator | "Loading…" text | **PASS** |
| Assistant query | Loading state | "מחפש..." button text | **PASS** |
| File upload | Progress indicator | "Uploading…" text | **PARTIAL** |

**Issue #14 (Minor):** Upload progress shows only "Uploading…" text. PRD specifies percentage progress (e.g., "Uploading X%").

---

## 5. Accessibility Audit

### 5.1 Touch Targets

**Issue #15 (Major):** Several buttons do not meet the 44x44px minimum touch target:
- Inbox action buttons (`px-2 py-1` = ~24px height)
- Reviewer segment controls
- Quick Edit/Delete links

### 5.2 RTL Support

| Check | Status |
|-------|--------|
| `dir="rtl"` on container | **PASS** (`<div dir="rtl">`) |
| `dir="auto"` on mixed text | **PASS** (textarea, inputs) |
| Form alignment | **PASS** (`text-right` on labels) |

### 5.3 Keyboard Navigation

**Issue #16 (Minor):** No keyboard shortcuts implemented (PRD specifies `/` to focus search, Enter to confirm primary actions).

### 5.4 ARIA Labels

**Issue #17 (Minor):** Missing ARIA labels on:
- Tab navigation buttons
- File drop zone
- Action buttons (use icons/emoji without text alternatives)

---

## 6. Missing Playwright Tests

No Playwright tests exist for the RAG tab. Required coverage:

1. **Navigation:** `/rag` route loads correctly
2. **Tab switching:** Ingest and Assistant tabs toggle
3. **File upload:** Drop zone accepts files, MD5 hash computed
4. **Duplicate rejection:** Same file rejected on second upload
5. **Inbox display:** Items render with correct status badges
6. **Reviewer:** Opens, displays segments, allows edits
7. **Assistant:** Form submission, response display

---

## 7. Summary Table

| ID | Severity | Category | Description |
|----|----------|----------|-------------|
| #1 | Minor | Design Tokens | Border colors inconsistent with `--line` |
| #2 | Minor | Design Tokens | Font sizes don't match tokens exactly |
| #3 | Critical | Testability | Zero `data-testid` attributes |
| #4 | Minor | Architecture | Local components should be shared |
| #5 | Major | PRD Compliance | Bulk actions UI incomplete |
| #6 | Major | PRD Compliance | Select All and bulk operations missing |
| #7 | Major | PRD Compliance | Tag safety (client-scoped) not implemented |
| #8 | Critical | PRD Compliance | Reviewer not chat-style bubbles |
| #9 | Critical | PRD Compliance | Audio sync (timestamp playback) missing |
| #10 | Major | PRD Compliance | Speaker rename not via context menu |
| #11 | Major | PRD Compliance | Assistant not conversational |
| #12 | Minor | PRD Compliance | Insight cards not implemented |
| #13 | Minor | UX | Mixed language in tab labels |
| #14 | Minor | UX | No upload percentage progress |
| #15 | Major | Accessibility | Touch targets below 44px |
| #16 | Minor | Accessibility | No keyboard shortcuts |
| #17 | Minor | Accessibility | Missing ARIA labels |

---

## 8. Recommendations

### Immediate (Critical)

1. **Add data-testid attributes** to all interactive elements per COMPONENT_LIBRARY.md
2. **Implement chat-style bubble layout** for transcript reviewer
3. **Add audio timestamp sync** (click segment → play from timestamp)

### Short-term (Major)

4. Implement Select All checkbox and bulk action dropdown
5. Add client-scoped tag filtering
6. Increase button touch targets to 44px minimum
7. Implement conversational memory for assistant
8. Add right-click context menu for speaker rename

### Long-term (Minor)

9. Extract shared components to `src/components/`
10. Align font sizes with design tokens
11. Add upload progress percentage
12. Implement keyboard shortcuts
13. Add ARIA labels throughout

---

## 9. Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/pages/RAG/index.jsx` | 873 | Main RAG page component |
| `frontend/src/lib/md5.js` | 167 | MD5 hash utility |
| `frontend/src/utils/apiBase.js` | 62 | API detection utility |
| `frontend/src/styles.css` | 12 | Global styles |
| `frontend/tailwind.config.js` | 24 | Tailwind theme config |
| `backend/main.py` | 581 | API endpoints |

---

**End of Audit Report**
