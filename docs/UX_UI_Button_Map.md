<!-- Project: SystemCore | Full Context: docs/System_Definition.md -->
# UI Action Map (Buttons & Actions)

Purpose
- Single source of truth for every actionable control: what it does, where it routes, which API it calls, and how to test it.
- Complements docs/UX_UI_Spec.md (flows, screens) with a clickable catalog.

Conventions
- Every actionable element must have a stable `data-testid` (or plan to add one) and an entry here.
- For each item list: Screen, Label (visual), TestID, Intent, Action (route/API), Notes, Screenshot, Last Verified.
- Screenshots live under `docs/ux/screenshots/` and are indexed in `docs/ux/screenshots/index.json`.

Schema (Markdown rows)
- Screen: Dashboard | Clients/Overview | Clients/Emails | Privacy | …
- Label: Visible text (or icon name)
- TestID: `data-testid` used by tests (or planned)
- Intent: short verb phrase (e.g., “Open client folder”)
- Action: route target and/or API endpoint
- Notes: edge cases, environment behavior

Initial Catalog (key updated items)

Clients / Overview (header and tiles)
- Label: Word Templates…
  - TestID: `word-templates`
  - Intent: Open template picker; generate DOCX to client folder
  - Action: GET `/word/templates`, POST `/word/generate`
  - Notes: “Open Templates Folder” opens OS folder; generation falls back when COM unavailable
- Label: Sync Airtable
  - TestID: `airtable-sync`
  - Intent: Upsert client in Airtable
  - Action: POST `/airtable/clients_upsert`
  - Notes: Requires Airtable secrets
- Label: Open Emails (Search)
  - TestID: `open-emails`
  - Intent: Open Outlook search for primary email (header button)
  - Action: Browser open (OWA) or `/api/outlook/latest_link` (when mode is latest)
- Label: Send Email
  - TestID: `send-email`
  - Intent: Compose new mail to primary email
  - Action: `mailto:` link
- Label: WhatsApp
  - TestID: `open-whatsapp`
  - Intent: Open WhatsApp chat to client phone
  - Action: `https://wa.me/<digits>`
- Label: Sync
  - TestID: `sync`
  - Intent: Refresh online/latest emails sample
  - Action: GET `/api/client/summary_online`
- Tile: Primary Email
  - TestID: `kpi-primary-email`
  - Intent: Compose new mail to primary email
  - Action: `mailto:` link
- Tile: Folder
  - TestID: `kpi-folder`
  - Intent: Open client folder (Explorer on PC; SharePoint link otherwise)
  - Action: POST `/dev/open_folder` (local) or open SharePoint URL from `/api/client/locations`
- Tile: Files (count)
  - TestID: `kpi-files`
  - Intent: Informational count (no action)
  - Action: —
- Tile: Recent Emails
  - TestID: `kpi-recent-emails`
  - Intent: Open client’s indexed emails view
  - Action: Route `/#/clients/:name?tab=emails`

Clients / Overview (contacts)
- Label: Add Contact (button)
  - TestID: `add-contact-submit`
  - Intent: Add contact to registry and Airtable
  - Action: POST `/registry/clients` + POST `/airtable/contacts_upsert`
  - Notes: Fields map Name/Email/Phone/תיאור/כתובת/מספר זיהוי

Clients / Tasks tab (TasksPanel + TaskRow)
- Label: New task (input + Add)
  - TestID: — (panel container; consider adding `tasks-new`)
  - Intent: Create a local task (linked to this client)
  - Action: localStorage `eislaw.tasks.v1`
- Label: Details (toggle)
  - TestID: — (row-level; consider `task-details-<id>`)
  - Intent: Expand inline controls
  - Action: local only
- Label: Add subtask (inline Add)
  - TestID: — (consider `task-sub-add-<id>`)
  - Intent: Create subtask with title
  - Action: local only
- Label group: Add → Link | Email | File | Folder
  - TestID: — (consider `task-attach-<type>-<id>`)
  - Intent: Attach related asset
  - Action:
    - Link: attach URL locally
    - Email: attach deep link or messageId locally
    - File: file picker → POST `/sp/task_upload` (SP store under `<client>/Tasks/<taskId>`)
    - Folder: POST `/sp/task_folder_ensure` then open SharePoint folder; attach folder link locally
- Label: Open (row)
  - TestID: — (consider `task-open-<id>`)
  - Intent: Open task card modal with subtasks
  - Action: local only
- Label: Choose Template (in Details)
  - TestID: — (within TaskRow)
  - Intent: Open template picker; attach generated doc
  - Action: GET `/word/templates`, POST `/word/generate`

Dashboard (high level)
- Filter chips: Time/Client/Owner/Mode
  - TestIDs (planned): `filter-time`, `filter-client`, `filter-owner`, `filter-mode`
  - Intent: Filter Dashboard metrics/queues
  - Action: local state + API fan-out
- Search
  - TestID: — (planned `dash-search`)
  - Intent: Find clients; create if missing
  - Action: GET `/api/clients`; route to `/clients/:name` or prefill creation
- Tasks panels (My / Delegated) rows
  - TestIDs: — (see TaskRow)
  - Intent: Same actions as client Tasks

Privacy (Assessments)
- Buttons: Preview Email, Send Email, Approve & Publish, Save Review, Close
  - TestIDs (planned): `privacy-preview`, `privacy-send`, `privacy-publish`, `privacy-save`, `privacy-close`
  - Actions: `/privacy/preview_email`, `/privacy/send_email`, `/privacy/approve_and_publish`, `/privacy/save_review`

Deprecated/Removed
- Toggle Outlook Mode (client header) — removed
- Airtable Search (client header) — removed
- SharePoint (client header) — removed
- Open Files (client header) — removed (use Folder tile)

Process & Ownership
- Any UI change: update this map + UX_UI_Spec.md and attach/update screenshot.
- Require a `data-testid` for every new actionable control.
- Add/adjust Playwright tests referencing these test IDs.
- Log test runs under `docs/Testing_Episodic_Log.md`.

To Do (near term)
- Add missing test IDs for TaskRow actions and Dashboard chips.
- Add Playwright specs:
  - KPI clicks (email/Folder/Recent Emails)
  - Task attach File → verifies SP webUrl is attached
  - “Add subtask” sets the provided title

\n\n## Task Modal / Files panel\n- Upload file -> POST /tasks/{task_id}/files/upload\n- Rename -> PATCH /tasks/{task_id}/files/{drive_id}/title\n- Set Current -> POST /tasks/{task_id}/deliverable/set_current\n- Add email -> POST /tasks/{task_id}/emails/attach\n
