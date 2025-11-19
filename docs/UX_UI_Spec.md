<!-- Project: SystemCore | Full Context: docs/System_Definition.md -->
# UX/UI Specifications — Dashboard, Search, Tasks & Owners

Goals
- Make the Dashboard the “what needs my attention now” home.
- Standardize cross‑module navigation, KPIs, and quick actions.
- Define Tasks with Owners, attachments, and a simple local lifecycle.
- Document screenshot/version practices so the UI is auditable and teachable.

Scope (MVP)
- Dashboard header, KPIs, queues, shortcuts, recent activity, and health.
- Universal Search across Clients, Contacts, Emails, and SharePoint actions.
- Active Clients signals (Unread, Unanswered, Open Tasks) with drill‑downs.
- Tasks with Owners (delegation), subtasks, attachments, templates, archive.
- Filter chips: Time, Client, Owner, Mode — Dashboard‑only, persisted locally.

Header & Badge
- Left: Today + Environment badge + versions
  - Format: `<ENV> • FE v<feVersion> (<feSha>) • BE <beVersion> (<beSha>)`.
  - ENV from API base detection; FE/BE from `docs/VERSION.md` policy.
- Right: Global filter chips and universal search.

Filter Chips (Dashboard‑only)
- Time: 7 / 30 days; default 7; stored in `localStorage`.
  - Applies to KPIs, queues, recent activity, and signals.
- Client: single‑select (picker/search); scopes Dashboard data to that client.
- Owner: All / Me / Delegated; default All.
  - “Me” derived from `/api/auth/me` email; fallback to local setting.
- Mode: Local / Cloud; selects API base only (does not hide UI).
- Persistence keys (suggested):
  - `eislaw.ui.dashboard.filters.v1 = { timeWindow, client, ownerScope, mode }`.

KPIs (tap to drill)
- Active Clients: unique clients with any activity within Time window:
  - Activity: inbound/outbound email; SharePoint folder/file write; privacy submission; registry write.
  - Drill: open Clients list filtered to Active.
- Pending Reviews: privacy submissions with no saved review or `status != 'approved'` in `PRIVACY_REVIEWS`.
  - Drill: open Privacy filtered to Needs Review.
- Ready To Send: approved+published submissions without `emailSentAt` in `PRIVACY_REVIEWS`.
  - Drill: open Privacy filtered to Ready To Send.
- Open Projects: project items where status ∉ {done, completed}.
  - Drill: open Projects with Doing/Hold highlighted.
- Integrations Health: count of failing checks (Airtable, Graph, SP, Fillout).
  - Drill: open Admin with health panel.

Queues & Sections
- Needs Review (Privacy): newest first; quick actions: Review, Preview Email, Approve & Publish.
- Ready To Send: recipient + channel; actions: Send Email, Copy WhatsApp Link.
- Clients — Recently Active: actions: Open Card, Files, Outlook, SharePoint.
- Tasks — Latest 5: My Tasks (top), Delegated grouped by Owner (top 5 each).
- Recent Activity: cross‑module timeline with icons; click opens target.
- Shortcuts: Add Client, Start Privacy Assessment, Airtable Search, Open Outlook, Open SharePoint.

Universal Search
- Sources
  - Clients/Contacts: Airtable (canonical).
  - Emails: metadata + deep link; open in Outlook.
  - SharePoint: folders/files; open in SP or via desktop helper.
- Behavior
  - Ranked: exact client matches → contacts → files/emails.
  - Selecting a client with card/folder: actions → Open Card, Open Files, Add Task.
  - Selecting a client without card/folder: show “Create client” (+) flow.
  - Rename prompt on Airtable ↔ folder name mismatch (offer Airtable rename, folder rename, or Skip).
  - Trigger: debounced live for client/contact; Enter triggers remote searches.

Active Clients — Signals & Drill‑downs
- Unread inbound: count of inbound emails not marked read within Time window.
- Unanswered: inbound without an outbound reply from us for > 24h (configurable).
- Tasks: open (non‑done) tasks count (by client) and due‑soon badge.
- Clicking a signal opens the Client view focused on Emails (for mail) or Tasks.
- Layout: default List (dense) with a Card toggle.

Tasks & Owners (Local Storage)
- Owners registry (local): `{ id, name, email, active }` with UI to add/edit; “me” from `/api/auth/me`.
- Task fields (v1):
  ```json
  {
    "id": "uuid",
    "title": "string",
    "desc": "string?",
    "status": "new|doing|blocked|done|deleted",
    "dueAt": "ISO?",
    "priority": "low|med|high?",
    "clientName": "string?",
    "clientFolderPath": "string?",
    "ownerId": "string?",
    "parentId": "string?", // subtask link
    "attachments": [
      { "type": "folder|file|email|link|doc", "label": "string", "path": "string?", "url": "string?", "messageId": "string?", "openUrl": "string?" }
    ],
    "templateRef": "string?",
    "source": "manual|email",
    "createdAt": "ISO",
    "updatedAt": "ISO",
    "doneAt": "ISO?",
    "deletedAt": "ISO?"
  }
  ```
- Storage keys
  - `eislaw.tasks.v1`, `eislaw.taskArchive.v1`, `eislaw.owners.v1`.
- Behavior
  - Subtasks: single level via `parentId`; parent shows child count; Delegated view shows `Parent → Subtask` label.
  - Attachments: add folder/file/email/link/doc; each item renders with icon and quick “Open”.
  - Template button: opens picker (`/word/templates`), then `/word/generate` and attaches output as `doc`.
  - Mark done: strike‑through; remain visible for 24h then auto‑archive; Archive allows restore.
  - Delegated section: any task/subtask with `ownerId != me` grouped by owner; show parent label for subtasks.

Sync & Freshness
- Clients/registry: cached locally; user “Sync” button; periodic refresh (e.g., 30m). New clients created via UI appear immediately.
- Emails: poll frequently (e.g., 2m) when email views are open; show last sync time and “Sync now”.
- KPI timestamps: show subtle “as of <time>”.

Design Artifacts & Screenshot Management
- Location: `docs/ux/screenshots/` (PNG, 1x/2x as needed).
- Naming: `<page>__<section>__<state>__<lang>__<yyyymmdd>.png` (e.g., `dashboard__kpis__default__he__20251107.png`).
- Index: maintain `docs/ux/screenshots/index.json` mapping `{ page, section, state, lang, file, updatedAt }`.
- Update policy: any UI change affecting a documented state updates the screenshot and `updatedAt`.
- Optional automation: capture via Playwright (see `docs/MCP_BRIDGE.md`) or manual with consistent viewport (1440×900).
- Button catalogue: for each page, list primary actions with labels, intent, and target route/endpoints next to screenshots.

Accessibility & Labels
- Primary actions use verbs (הפעל/פתח/שמור/שלח) or English equivalents consistently.
- Hebrew and English labels should not mix in the same control unless required; prefer a single language per view.
- Keyboard: Enter confirms primary; `/` focuses search; focus order matches visual order.

Open Items (tracked for future)
- Owner multi‑select filters and per‑role scoping.
- Full Projects data model alignment.
- Aggregated endpoint `/api/dashboard/summary` with caching.

References
- Index: `docs/INDEX.md`
- System Definition: `docs/System_Definition.md`
- Technical Overview: `docs/TECHNICAL_OVERVIEW.md`

