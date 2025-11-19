<!-- Project: SystemCore | Full Context: docs/System_Definition.md -->
# UX/UI Controls Map

Purpose
- Central, testable catalog of all controls: label, control ID (test id), action (route/API), and notes.
- Used by design review, implementation, and Playwright tests.

Columns
- Page/Route • Control ID (`data-testid`) • Label • Action (route/API) • Side effects • Status/Notes

Clients / Overview (header)
- page: clients/:name • id: word-templates • label: Word Templates… • action: desktop file picker → /dev/desktop/pick_file (filters *.dotx/*.docx; initialdir from env); fallback /dev/desktop/open_path; fallback GET /word/templates + POST /word/generate • notes: prefers native file picker; if picker/open fails, shows in-app list; generate opens created doc + client folder; SharePoint upload when available
- page: clients/:name • id: airtable-sync • label: Sync Airtable • action: POST /airtable/clients_upsert • notes: requires Airtable secrets
- page: clients/:name • id: open-emails • label: Open Emails (Search) • action: OWA window or /api/outlook/latest_link (when mode=latest) • notes: opens named OWA window
- page: clients/:name • id: send-email • label: Send Email • action: mailto:primaryEmail • notes: n/a
- page: clients/:name • id: open-whatsapp • label: WhatsApp • action: https://wa.me/<digits> • notes: digits stripped
- page: clients/:name • id: sync • label: Sync • action: GET /api/client/summary_online • notes: refreshes sample latest emails

Clients / Overview (tiles)
- page: clients/:name • id: kpi-primary-email • label: Primary Email • action: mailto:primaryEmail • notes: KPI tile clickable
- page: clients/:name • id: kpi-folder • label: Folder • action: POST /dev/open_folder (local) with SharePoint fallback via /client/sharepoint_link; last resort opens local folder path if present • notes: click “Available” to open client folder (local first, then SharePoint)
- page: clients/:name • id: kpi-files • label: Files • action: — • notes: informational
- page: clients/:name • id: kpi-recent-emails • label: Recent Emails • action: route /#/clients/:name?tab=emails • notes: opens indexed view

Clients / Contacts
- page: clients/:name • id: add-contact-submit • label: Add Contact • action: POST /registry/clients; POST /airtable/contacts_upsert • notes: maps Name/Email/Phone/תיאור/כתובת/מספר זיהוי

Clients / Tasks (TasksPanel, TaskRow)
- page: clients/:name?tab=tasks • id: (plan) task-open-<id> • label: Open • action: open task modal (local) • notes: shows parent + subtasks
- page: clients/:name?tab=tasks • id: (plan) task-sub-add-<id> • label: Add subtask • action: local create (titled) • notes: appears indented ↳
- page: clients/:name?tab=tasks • id: (plan) task-attach-link-<id> • label: Add → Link • action: local attach {type:link}
- page: clients/:name?tab=tasks • id: (plan) task-attach-email-<id> • label: Add → Email • action: local attach {type:email}
- page: clients/:name?tab=tasks • id: (plan) task-attach-file-<id> • label: Add → File • action: file picker → POST /sp/task_upload • notes: SP path <client>/Tasks/<taskId>
- page: clients/:name?tab=tasks • id: (plan) task-attach-folder-<id> • label: Add → Folder • action: POST /sp/task_folder_ensure; open webUrl; local attach folder link
- page: clients/:name?tab=tasks • id: (plan) task-template-<id> • label: Choose Template • action: GET /word/templates; POST /word/generate • notes: attaches generated doc

Dashboard
- page: / • id: (plan) filter-time • label: Time • action: local state; affects fan-out • notes: persisted in localStorage
- page: / • id: (plan) filter-client • label: Client • action: local state • notes: single-select picker
- page: / • id: (plan) filter-owner • label: Owner • action: local state • notes: All/Me/Delegated
- page: / • id: (plan) filter-mode • label: Mode • action: local state • notes: Local/Cloud API base

Privacy (Assessments)
- page: /privacy • id: (plan) privacy-preview • label: Preview Email • action: POST /privacy/preview_email
- page: /privacy • id: (plan) privacy-save • label: Save Review • action: POST /privacy/save_review
- page: /privacy • id: (plan) privacy-publish • label: Approve & Publish • action: POST /privacy/approve_and_publish
- page: /privacy • id: (plan) privacy-send • label: Send Email • action: POST /privacy/send_email

Deprecated/Removed
- Toggle Outlook Mode; Airtable Search; SharePoint; Open Files (client header)

Process
- Update this map alongside UI changes and screenshots.
- Require a stable `data-testid` for new controls; add Playwright coverage.
- Record verification in `docs/Testing_Episodic_Log.md`.
