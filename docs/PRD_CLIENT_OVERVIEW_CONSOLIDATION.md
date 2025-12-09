# PRD: Client Overview Consolidation (Documents & Buttons)

**ID:** CLI-P03
**Author:** David (Product Senior)
**Requested By:** CEO
**Date:** 2025-12-08
**Status:** ✅ CTO APPROVED - Awaiting CEO Sign-off

---

## 1) Problem Statement

The Client Overview tab mixes many quick actions (SharePoint, Outlook search, local folder, tasks, emails, documents) in multiple places, causing clutter and duplicate buttons. Users need a single, consistent "Documents" area inside the Overview tab that consolidates these actions, clarifies availability (SharePoint vs. local), and surfaces status (connected/missing, last opened, errors).

Pain points:
- Buttons are scattered; users miss critical actions.
- No clear state when SharePoint folder is missing or local folder is unavailable.
- Documents-related actions live outside the Overview tab, breaking the flow.

---

## 2) Objectives & Success Criteria

**Objectives**
- Consolidate all documents-related actions into a single "Documents" block within the Overview tab.
- Make SharePoint vs. local folder state obvious and actionable (connect/create or open).
- Reduce button clutter while keeping 44px targets and RTL compliance (per `docs/DesignSystem/README.md` and `DESIGN_TOKENS.md`).

**Success Criteria**
- Users can open SharePoint or local folder from the Overview tab without searching other tabs.
- When SharePoint is not configured, the UI clearly shows a warning and provides a one-click fix.
- No duplicate document buttons elsewhere in the Overview tab; controls are organized into the new block.
- Touch targets meet ≥44px height; RTL alignment correct; error/empty states localized in Hebrew.

---

## 3) Functional Requirements

### 3.0 Scope & Constraints
- Scope: Client Overview tab only (`/clients/:name` main tab). Does not change Tasks/Emails/Contacts logic beyond button placement.
- RTL-first; reuse existing alert/banner styles and spacing tokens; 44px min control height.
- Keep existing behaviors: opening SharePoint, copying/opening local folder, generating documents (if present).
- APIs must persist ordering fields to support list ordering (see 3.1/3.4); surface the same data already available otherwise.

### 3.1 List Ordering Rules (Clients tab) — Requires DB & API support
- New clients must appear first in the Clients tab immediately after creation (sort by `created_at DESC`).
- Any client with a document-related interaction (generate document, open document, open email preview) should move to the top of the Clients tab list, reflecting most recent activity.
- Sorting change must not break existing pagination/search; applies to the default active view.
- **Data model:** Add `last_activity_at TEXT` to `clients` table to store the latest doc/email interaction.

**Migration SQL:**
```sql
ALTER TABLE clients ADD COLUMN last_activity_at TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_last_activity ON clients(last_activity_at);
```

### 3.2 Documents Block (New)

**Location:** Client Overview tab, near top section (beneath header bar, before other cards).

**Contents (Hebrew labels, RTL):**
- Title: "מסמכים"
- Status line: shows SharePoint + local folder availability.
- Buttons (44px, pill/primary per design system):
  - "פתח SharePoint" (primary) if `sharepoint_url` exists → opens SP.
  - "קשר/צור SharePoint" (primary with warning icon) if missing → opens existing flow to connect/create.
  - "פתח תיקייה מקומית" (secondary) if `local_folder` available → opens path/copies path.
  - Disabled state with tooltip/message when folder missing.
  - (Optional) "צור מסמכים" if the existing generate documents action is available.

**Badges/States:**
- SharePoint connected: green badge "מחובר".
- SharePoint missing: yellow badge "חסר".
- Local folder available: blue/neutral badge "מקומי".
- Error state: red badge with short message.

**Empty/Warning Copy (Hebrew):**
- Missing SP: "לא הוגדרה תיקיית SharePoint ללקוח זה" with CTA button.
- Missing local: "תיקייה מקומית לא נמצאה" (no CTA, info only).

### 3.3 Remove Duplicated Buttons
- Eliminate scattered SharePoint/local/doc buttons elsewhere in the Overview tab; actions live only in the Documents block.
- Keep Tasks/Emails buttons where they belong; do not remove those.

### 3.4 Data & API
- Reuse existing API responses that include `sharepoint_url`, `folder`/`local_folder`, and any document generation endpoint already present.
- No new endpoints; only UI/state handling.
- API must set/update `last_activity_at` on document/email interactions:
  - Document generation
  - Document open (if tracked)
  - Email preview/open in viewer
- Clients list endpoint should support ordering by `last_activity_at DESC`, falling back to `created_at DESC` when null.

### 3.5 Telemetry (optional but recommended)
- Events: `client_documents_open_sp`, `client_documents_connect_sp`, `client_documents_open_local`, `client_documents_generate`.
- Properties: `client_id`, `has_sp`, `has_local`, `source: overview`.

---

## 4) UX / Content

Follow `docs/DesignSystem/README.md` and `DESIGN_TOKENS.md`; keep RTL and 44px controls.

**Microcopy (Hebrew):**
- Block title: "מסמכים"
- SharePoint connected badge: "מחובר"
- SharePoint missing badge: "חסר"
- Local badge: "מקומי"
- Warning text: "לא הוגדרה תיקיית SharePoint ללקוח זה"
- CTA (connect/create): "קשר/צור SharePoint"
- Open SharePoint: "פתח SharePoint"
- Open local: "פתח תיקייה מקומית"
- Generate docs (if shown): "צור מסמכים"

**Visual Notes:**
- Use an alert/banner style for the missing SharePoint state with warning icon.
- Maintain consistent padding, spacing, and border radius from TASKS_TEMPLATE.
- Buttons grouped horizontally with responsive wrap on mobile.

---

## 5) Non-Functional Requirements
- Performance: Rendering block must be instant; no new network calls beyond existing client load.
- Accessibility: Keyboard focusable buttons, ARIA labels mirroring Hebrew text, 44px minimum height.
- RTL: Ensure dir="rtl" on container; align badges and buttons accordingly.

---

## 6) Acceptance Tests (Happy Path & Edge)

| ID | Scenario | Expected |
|----|----------|----------|
| OV-01 | Client with SharePoint URL | Shows green "מחובר" badge + "פתח SharePoint" enabled |
| OV-02 | Client without SharePoint URL | Shows yellow "חסר" badge + warning + "קשר/צור SharePoint" CTA |
| OV-03 | Local folder available | "פתח תיקייה מקומית" enabled and opens/copies path |
| OV-04 | Local folder missing | Button disabled, tooltip/message explains missing folder |
| OV-05 | Duplicate buttons removed | No other SharePoint/local/doc buttons elsewhere in Overview tab |
| OV-06 | RTL + 44px | Buttons meet 44px height and align RTL per design tokens |
| OV-07 | Error state (if API fails to open) | Red badge/message; buttons show toast/error |
| OV-08 | Mobile layout | Buttons wrap gracefully; text remains readable |
| OV-09 | Telemetry (if enabled) | Events fire with client_id and state flags |
| OV-10 | New client ordering | Newly created client appears first in Clients tab |
| OV-11 | Recent activity bump | After document/email preview action, client moves to top of Clients tab |

---

## 7) Dependencies & Sequence
- Depends on existing APIs returning `sharepoint_url` and local folder path.
- **Backend changes required:** See §3.1 (DB migration) and §3.4 (API ordering + `last_activity_at` updates).
- Frontend changes in Overview tab; ensure removal of duplicate controls does not regress tasks/emails flows.

Implementation order:
1) Add Documents block to Overview tab using design system styles.
2) Wire states (connected/missing/local) and buttons to existing actions.
3) Remove duplicate document buttons elsewhere in Overview tab.
4) Add telemetry hooks (optional).
5) QA against acceptance tests; ensure Hebrew copy and RTL/44px compliance.

---

## 8) Risks / Mitigations
- Risk: Removing buttons could hide functionality. Mitigation: confirm all document actions exist in the new block before removal.
- Risk: Missing data fields cause empty UI. Mitigation: default to warning copy and disable buttons safely.
- Risk: Mobile crowding. Mitigation: allow button wrap and test on small widths.

---

## 9) Open Questions for CEO/CTO
- Should "צור מסמכים" be shown by default or hidden if feature is not configured?
- Confirm final badge colors (default to design tokens: warning for missing SP, success for connected).
- Do we need a tooltip or secondary text to show the current SharePoint URL?

---

## 10) Completion Checklist (For David)
- [x] CEO/CTO review and approval
- [x] Hebrew copy validated
- [ ] Telemetry decision (on/off) clarified
- [ ] Update `docs/CLIENTS_FEATURES_SPEC.md` once approved
- [ ] Post completion note to TEAM_INBOX.md and request CTO review

---

## 11) CTO AMENDMENT REQUEST (2025-12-08)

**Reviewer:** Joe (CTO)
**CEO Decision:** DB-backed persistence for list ordering (not frontend-only)

### Required Changes

David must update the PRD with the following:

*(Prior amendment request resolved in main sections; this note kept for traceability)*
