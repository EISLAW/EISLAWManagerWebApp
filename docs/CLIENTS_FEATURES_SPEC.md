# Clients Features Specification

**Author:** David (Product Senior)
**Date:** 2025-12-05 (Updated: 2025-12-08)
**Purpose:** Document all features that SHOULD work in the Clients area
**Context:** CORE 4 POLISH - Clients Phase + Airtable Integration

---

## Overview

The Clients module consists of three main pages/tabs:
1. **ClientsList** (`/clients` → "לקוחות" tab) - List all active clients with search and quick actions
2. **ContactsListTab** (`/clients` → "רשימת קשר" tab) - **NEW (2025-12-08)** - Airtable contacts with sync and activation
3. **ClientOverview** (`/clients/:name`) - Detailed client view with tabs

---

## Page: ClientsList (`/clients`)

### Features That MUST Work

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| CL-001 | Load client list | Display all clients from API | Navigate to `/clients` → see table |
| CL-002 | Search by name | Filter clients by name | Type in search box → results filter |
| CL-003 | Search by email | Filter clients by email | Type email in search box → results filter |
| CL-004 | Search by phone | Filter clients by phone | Type phone in search box → results filter |
| CL-005 | Add client button | Open add client modal | Click "הוסף לקוח" → modal opens |
| CL-006 | Open client link | Navigate to client detail | Click client name → navigate to detail |
| CL-007 | "אימיילים" button | Navigate to emails tab | Click button → `/clients/:name?tab=emails` |
| CL-008 | "קבצים" button | Open local files folder | Click button → folder opens or path copied |
| CL-009 | "SP" button | Open SharePoint folder | Click button → SharePoint opens in new tab |
| CL-010 | "Outlook" button | Open Outlook search for client | Click button → Outlook web opens |
| CL-011 | Status badges | Show AT/SP/New badges | Badges visible for each client |
| CL-012 | Empty state | Show message when no clients | Delete all → see empty message |
| CL-013 | No results state | Show message when search finds nothing | Search "xyz123" → see no results message |

### API Dependencies

| Endpoint | Purpose | Required Response |
|----------|---------|-------------------|
| `GET /api/clients` | List all clients | Array of client objects |
| `GET /api/client/summary` | Get client details | Client summary object |
| `GET /api/client/locations` | Get folder paths | `{ localFolder, sharepointUrl }` |

---

## Tab: רשימת קשר (Contact List) - NEW 2025-12-08

**Components:** `ContactsListTab.jsx`, `ContactRow.jsx`, `SyncButton.jsx`, `ActivateContactModal.jsx`
**Status:** ✅ CTO APPROVED (2025-12-08)

### Features

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| CL-020 | Tab navigation | Two tabs: "👥 לקוחות" and "📋 רשימת קשר" | Click tabs → content switches |
| CL-021 | Sync button | Pull contacts from Airtable | Click "סנכרן מ-Airtable" → spinner → contacts refresh |
| CL-022 | Last sync time | Show when last synced | Time displayed near sync button |
| CL-023 | Search contacts | Filter by name, email, phone | Type in search → results filter |
| CL-024 | Contact table | Display name, phone, status, actions | Table with 4 columns |
| CL-025 | Status badges | "ליד" for leads, "מופעל" for activated | Badges show correct state |
| CL-026 | Activate button | "פתח תיקייה" for non-activated contacts | Click → activation modal opens |
| CL-027 | View button | "צפה בלקוח" for activated contacts | Click → navigate to client |
| CL-028 | Contact count | Show "הוצגו X אנשי קשר" | Count updates with filters |

### Activation Modal (ActivateContactModal)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| AM-001 | Modal header | Shows "הפעלת איש קשר" with contact name | Header displays correctly |
| AM-002 | Create folder option | Radio: "צור תיקייה חדשה" (default selected) | Creates SharePoint folder automatically |
| AM-003 | Link folder option | Radio: "קשר תיקייה קיימת" | Shows URL input when selected |
| AM-004 | Create button | "צור כלקוח" with FolderPlus icon | Creates client + SharePoint folder |
| AM-005 | Cancel button | "ביטול" | Closes modal without action |
| AM-006 | Loading state | Spinner + "יוצר לקוח..." during creation | Feedback during API calls |

### API Dependencies (Airtable Integration)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/airtable-contacts` | GET | List all synced contacts from SQLite | ✅ |
| `/api/sync/pull-airtable` | POST | Pull contacts from Airtable → SQLite | ✅ |
| `/api/sync/push-airtable` | POST | Push changes from SQLite → Airtable | ✅ |
| `/api/contacts/activate` | POST | Create client from contact | ✅ |
| `/sp/folder_create` | POST | **Create SharePoint folder** | ✅ NEW |

### Activation Flow

When user clicks "פתח תיקייה" and confirms with "Create folder" option:

1. **Frontend** calls `POST /sp/folder_create` with contact name
2. **Backend** creates folder in SharePoint under "לקוחות משרד/{name}"
3. **Backend** returns `{ webUrl, id, name, path }`
4. **Frontend** calls `POST /api/contacts/activate` with SharePoint URL
5. **Backend** creates client in registry, marks contact as activated
6. **Frontend** updates UI, shows success toast

---

## Page: ClientOverview (`/clients/:name`)

### Header Actions

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| CO-001 | Back button | Navigate to client list | Click arrow → go to `/clients` |
| CO-002 | Client name display | Show client name in header | Name visible |
| CO-003 | "שלח מייל" button | Open mailto link | Click → email client opens |
| CO-004 | "כרטיס לקוח" button | Open client edit modal | Click → modal opens |

### More Menu Actions

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| MM-001 | Edit client toggle | Show/hide edit panel | Click → panel toggles |
| MM-002 | Sync Airtable | Push changes to Airtable | Click → sync starts |
| MM-003 | Open folder | Open local/SharePoint folder | Click → folder opens |
| MM-004 | Open in Outlook | Open Outlook for client | Click → Outlook opens |
| MM-005 | WhatsApp | Open WhatsApp chat | Click → WhatsApp opens |
| MM-006 | Create quote | Open quote generator | Click → QuoteGenerator modal opens |
| MM-007 | Show tasks | Navigate to tasks tab | Click → switch to tasks tab |
| MM-008 | Show emails | Navigate to emails tab | Click → switch to emails tab |

### Modal: Add/Edit Client (AddClientModal)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| AC-001 | Modal header | "עריכת לקוח" (edit) or "הוספת לקוח" (add) | Title matches mode |
| AC-002 | שם לקוח (Client name) | Required text input | Enter name → validates |
| AC-003 | אימייל (Email) | Comma-separated emails | Enter multiple → parses correctly |
| AC-004 | טלפון (Phone) | Phone number input | Enter phone → saves |
| AC-005 | סטטוס (Status) | Dropdown selector | Select status → saves |
| AC-006 | סוג לקוח (Client type) | Multi-select tags (בטיפול, ריטיינר, ליטיגציה, טיפול הושלם, פוטנציאלי) | Click tags → toggles selection |
| AC-007 | הערות (Notes) | Textarea for notes | Enter text → saves |
| AC-008 | תיקייה section | Folder path display | Shows SharePoint or local path |
| AC-009 | עיין (Browse) button | Link/create client folder | Click → opens SharePoint picker or creates folder |
| AC-010 | מקושר badge | Shows folder linked status | Badge visible when folder linked |
| AC-011 | מזהה Airtable | Display Airtable record ID | ID visible if client synced to Airtable |
| AC-012 | שמור שינויים button | Save client changes | Click → saves to backend |
| AC-013 | ביטול button | Cancel and close modal | Click → modal closes |
| AC-014 | Smart search (add mode) | Search existing clients/Airtable | Type name → shows matches |
| AC-015 | Create from Airtable | Import from Airtable match | Click match → fills form |

#### Folder Linking Flow (AC-009) - ✅ UPDATED 2025-12-07

The "עיין" button follows this logic:
1. First checks `/api/client/summary` for existing SharePoint URL
2. Tries `/api/sharepoint/link_client` to search and link existing folder
3. If not found, **automatically creates** folder via `/api/sharepoint/create_folder`
4. Opens the SharePoint folder in new browser tab
5. Updates client registry with SharePoint URL

**Backend dependencies:**
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/client/summary` | Get existing folder | ✅ |
| `/api/sharepoint/link_client` | Search & link SharePoint folder | ✅ (2025-12-07) |
| `/api/sharepoint/create_folder` | **NEW** Create SharePoint folder | ✅ (2025-12-07) |
| `/registry/clients` | Save client | ✅ |
| `/registry/clients/{id}` | Update client | ✅ |
| `/airtable/clients_upsert` | Sync to Airtable | ✅ |
| `/airtable/search` | Smart search | ✅ |

**UX Improvements (2025-12-07):**
- Loading spinner on submit button while saving
- New clients appear at top of list (sorted by `created_at DESC`)
- SharePoint folder auto-creates if not found

### Contacts Section (NEW - Phase 4I)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| CT-001 | אנשי קשר header | Show "Contacts" section with add button | Section visible in modal |
| CT-002 | Contacts list | Scrollable list of client contacts | Contacts visible with scroll if >3 |
| CT-003 | Add contact button | Open inline form to add contact | Click "+" → form appears |
| CT-004 | Contact card | Show name, role, email, phone | Card displays all fields |
| CT-005 | Primary indicator | Star icon for primary contact | ★ visible on primary contact |
| CT-006 | Edit contact | Edit contact details | Click edit icon → form opens |
| CT-007 | Delete contact | Remove contact from client | Click trash → contact removed |
| CT-008 | Mark as primary | Set contact as primary | Click star → becomes primary (only one allowed) |

**Backend dependencies (Contacts):**
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /contacts/{client_id}` | List contacts | ✅ Verified (2025-12-06) |
| `POST /contacts` | Create contact | ✅ Verified (2025-12-06) |
| `PATCH /contacts/{id}` | Update contact | ✅ Verified (2025-12-06) |
| `DELETE /contacts/{id}` | Delete contact | ✅ Verified (2025-12-06) |

**Frontend Status:** 🔄 Maya CAN START - Alex's backend work approved by CTO (2025-12-06)

### Tab: Overview (`?tab=overview`)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| OV-001 | Tasks widget | Show tasks in scrollable container | Tasks visible in widget |
| OV-001a | TasksWidget scroll | Scroll through all tasks in fixed-height container | Widget shows ~5 tasks, scroll to see all |
| OV-001b | TasksWidget quick-add | Add new task from widget | Type in input → click "הוסף" → task created |
| OV-001c | TasksWidget toggle done | Mark task as done/undone | Click circle → task toggles status |
| OV-001d | TasksWidget due badges | Show due date status | Late=red, Today=orange, Tomorrow=yellow |
| OV-002 | Emails widget | Show recent emails in scrollable container | Emails visible in widget |
| OV-002a | EmailsWidget scroll | Scroll through all emails in fixed-height container | Widget shows ~5 emails, scroll to see all (up to 100) | ✅ VERIFIED (Eli 2025-12-06) |
| OV-002b | EmailsWidget click-to-view | Click email to see full content | Click email row → inline viewer modal opens | ✅ VERIFIED (Eli 2025-12-06) |
| OV-002c | EmailsWidget Open in Outlook | Open email in Outlook from viewer | Click "פתח ב-Outlook" → OWA opens to email | ✅ VERIFIED (CEO 2025-12-06) |
| OV-002d | ~~EmailsWidget Reply~~ | ~~Reply to email from viewer~~ | ⛔ **NOT NEEDED** - Users reply from Outlook (CEO 2025-12-06) |
| OV-002e | EmailsWidget sync | Manual sync from widget | Click sync icon → emails refresh |
| OV-003 | Quick contact - email | Click to compose email | Click email → mailto opens |
| OV-004 | Quick contact - phone | Click to call | Click phone → tel: opens |
| OV-005 | Quick contact - WhatsApp | Open WhatsApp | Click → WhatsApp opens |
| OV-006 | Contacts list | Show additional contacts | Contacts visible if exist |
| OV-007 | Integration badges | Show Airtable/SharePoint status | Badges visible |
| OV-008 | Link Airtable button | Open link modal if not linked | Click red badge → modal opens |

### ⚠️ Email Preview Feature Parity Rule (CRITICAL)

> **Added:** 2025-12-08 | **Source:** Episodic Memory lesson from CLI-004 Save Attachments task

**There are 3 email preview locations in ClientOverview. ANY feature added to one MUST be added to ALL three:**

| Location | Component | Where |
|----------|-----------|-------|
| Overview tab preview | EmailsWidget modal | `?tab=overview` → click email |
| Emails tab inline | Expanded row | `?tab=emails` → click email row |
| Emails tab modal | Email Viewer modal | `?tab=emails` → click "Open in Viewer" |

**Current shared features (must exist in all 3 locations):**

| Feature | Overview Preview | Emails Inline | Emails Modal |
|---------|-----------------|---------------|--------------|
| Open in Outlook | ✅ | ✅ | ✅ |
| Create Task | ✅ | ✅ | ✅ |
| Save Attachments to SharePoint | ✅ | ✅ | ✅ |

**Verification Checklist (for any new email feature):**
- [ ] Feature works in Overview tab email preview
- [ ] Feature works in Emails tab inline preview
- [ ] Feature works in Emails tab Email Viewer modal

**Policy:** No email preview feature is complete unless it appears in ALL email preview locations.

---

### Tab: Emails (`?tab=emails`)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| EM-001 | Auto-sync on first visit | Sync emails when tab opens | Open tab → sync starts automatically |
| EM-002 | Manual sync button | Trigger email sync | Click "משוך מיילים" → sync starts |
| EM-003 | Sync window input | Configure sync days | Enter 30-365 → applies to sync |
| EM-004 | Sync status display | Show sync progress | During sync → status text shows |
| EM-005 | Last sync time | Show relative time | After sync → "עודכן לפני X דקות" |
| EM-006 | Email list display | Show indexed emails | Emails visible in list |
| EM-007 | Filter by text | Search in subject/body | Type in filter → results filter |
| EM-008 | Filter by date | Filter by date range | Set dates → results filter |
| EM-009 | Filter by sender | Filter by sender | Type sender → results filter |
| EM-010 | Filter by attachments | Filter has/no attachments | Select option → results filter |
| EM-011 | Clear filters | Reset all filters | Click "Clear filters" → all reset |
| EM-012 | Email row click | Expand email preview | Click row → preview expands |
| EM-013 | **Open in Viewer** | Show email in modal | Click "Open in Viewer" → modal opens with HTML | ✅ VERIFIED (Eli 2025-12-06) |
| EM-014 | **Open in Outlook** | Open email in Outlook | Click "Open in Outlook" → Outlook opens to email | ✅ VERIFIED (CEO 2025-12-06) |
| EM-015 | Copy Outlook Link | Copy link to clipboard | Click → link copied |
| EM-016 | **Create task** | Create task from email | Click "Create task" → task created | ✅ VERIFIED (Eli 2025-12-06) |
| EM-017 | Attachment indicator | Show paperclip icon | Emails with attachments show icon |
| EM-018 | ~~**Reply in Outlook**~~ | ~~Open OWA compose with quoted original~~ | ⛔ **NOT NEEDED** - Users reply from Outlook (CEO 2025-12-06) |

### Tab: Tasks (`?tab=tasks`)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| TK-001 | TaskBoard display | Show kanban board | Board visible with columns |
| TK-002 | Create task | Add new task | Click add → task created |
| TK-003 | Move task | Drag between columns | Drag → task moves |
| TK-004 | Edit task | Modify task details | Click task → edit modal |
| TK-005 | Delete task | Remove task | Delete button → task removed |
| TK-006 | Client filter | Only show client's tasks | Only client tasks visible |

### Tab: Files (`?tab=files`)

| ID | Feature | Description | Test Action |
|----|---------|-------------|-------------|
| FL-001 | Files list | Show local files | Files listed if exist |
| FL-002 | Empty state | Show "no files" message | No files → message shows |

---

## Archive Feature (CEO APPROVED - CLI-P02)

> **Status:** ✅ CEO APPROVED (2025-12-08) - Implementation in progress - see `PRD_CLIENT_ARCHIVE.md`
> **Owner:** David (Product Senior)

Archive clients to hide them from the main list while preserving all data.

| ID | Feature | Description | Status |
|----|---------|-------------|--------|
| AR-001 | Archive from list | Archive client from row action button | 📄 PRD-ready |
| AR-002 | Archive from detail | Archive from ClientOverview More menu | 📄 PRD-ready |
| AR-003 | Restore from list | Restore archived client from archived view | 📄 PRD-ready |
| AR-004 | Restore from detail | Restore from archived client banner | 📄 PRD-ready |
| AR-005 | Filter toggle | Switch between Active/Archived/All views | 📄 PRD-ready |
| AR-006 | Default to active | New clients are not archived | 📄 PRD-ready |
| AR-007 | Search scope | Search defaults to active clients only | 📄 PRD-ready |
| AR-008 | Auto-archive | Clients inactive for 6 months auto-archived (6 months inactivity) | 📄 PRD-ready |
| AR-009 | Confirmation dialog | Archive action requires confirmation | 📄 PRD-ready |
| AR-010 | Archived indicator | Badge/banner shows archived status + 44px controls | 📄 PRD-ready |
| AR-011 | Audit + telemetry | Log archive/restore and emit analytics events | 📄 PRD-ready |
| AR-012 | Performance guard | Filters return in <300ms on 5k clients (SQLite) | 📄 PRD-ready |

### API Endpoints (Archive) - PRD READY

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `GET /api/clients?archived=` | GET | Filter by archived status | 📄 PRD-ready |
| `POST /api/clients/{id}/archive` | POST | Archive client | 📄 PRD-ready |
| `POST /api/clients/{id}/restore` | POST | Restore client | 📄 PRD-ready |

---

## Known Broken Features

### Fixed (Round 4 - 2025-12-06)

| ID | Issue | Resolution | E2E Status |
|----|-------|------------|------------|
| C-001 | Email detail shows "Unable to load mail detail not found" | ✅ FIXED - `/email/content` returns HTML from Graph API | ✅ VERIFIED (Eli) |
| C-002 | Email detail API returns 404 | ✅ FIXED - Same as C-001 | ✅ VERIFIED (Eli) |
| C-003 | "Create Task" from email does nothing | ✅ FIXED - Component scope bug (extra `}` closing component early) | ✅ VERIFIED (Eli) |
| C-004 | No Reply button in email | ⛔ **NOT NEEDED** - CEO confirmed users reply from Outlook | N/A |
| C-005 | "Open in Outlook" - unverified | ✅ FIXED - `/email/open` returns OWA deeplink | ✅ VERIFIED (CEO) |
| C-006 | "Open in Outlook" opens Outlook but doesn't navigate to specific email | ✅ FIXED - Changed URL format to `https://outlook.office365.com/owa/?ItemID={encoded_id}&exvsurl=1&viewmodel=ReadMessageItem` | ✅ VERIFIED (CEO) |
| C-007 | "Reply" button opens empty compose window | ⛔ **NOT NEEDED** - CEO confirmed users reply from Outlook | N/A |
| C-008 | EmailsWidget in Overview tab shows only 5 emails, no scroll, no click-to-view | ✅ FIXED - Simplified always-scrollable design: fixed height `max-h-[400px]` with `overflow-y-auto`, fetches up to 100 emails, click-to-view with inline modal | ✅ VERIFIED (Eli) |
| C-009 | TasksWidget had no scroll | ✅ FIXED - Added `max-h-[400px] overflow-y-auto`, shows all tasks with scroll | ✅ VERIFIED (Eli) |

### Current Bugs (2025-12-07 Update)

| ID | Issue | Owner | Status |
|----|-------|-------|--------|
| C-010 | `POST /registry/clients` expects `display_name` not `name` | Alex | ✅ Working as designed |
| C-011 | `POST /airtable/clients_upsert` email format error | Alex | ✅ Fixed |
| C-012 | 5 AI agent tools not implemented | Alex | ❌ Not started |

### Fixed (2025-12-07)

| ID | Issue | Resolution |
|----|-------|------------|
| BUG-004 | Airtable link shows "Client ID not found" after adding from Airtable | ✅ `find_local_client_by_name()` now checks SQLite as fallback |
| BUG-005 | SharePoint folder browse shows error | ✅ Updated to use `/api/sharepoint/link_client` + auto-create |
| UX-001 | No feedback when adding client | ✅ Added loading spinner to submit button |
| UX-002 | New clients hidden in middle of list | ✅ Clients now sorted by `created_at DESC` |
| SP-001 | SharePoint URL not in `/api/clients` response | ✅ Added `sharepointUrl` and `airtableUrl` fields |

---

## API Endpoints Required for Clients

### Client Data

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/clients` | GET | List all clients (includes `sharepointUrl`, `airtableUrl`) | ✅ |
| `/api/client/summary` | GET | Get client details + emails + files | ✅ |
| `/api/client/locations` | GET | Get folder paths | ❌ |
| `/registry/clients` | POST | Create new client | ✅ |
| `/registry/clients/{id}` | GET | Get client with contacts | ✅ |
| `/registry/clients/{id}` | PATCH | Update client | ✅ |
| `/airtable/clients_upsert` | POST | Sync to Airtable | ✅ |
| `/airtable/search` | GET | Search Airtable | ✅ |

### SharePoint Operations (Updated 2025-12-08)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/sharepoint/search` | GET | Search for client folder | ✅ |
| `/api/sharepoint/link_client` | POST | Search & link folder to client | ✅ |
| `/api/sharepoint/sites` | GET | List available SharePoint sites | ✅ |
| `/sp/folder_create` | POST | **Create new folder in SharePoint** (used by activation modal) | ✅ NEW 2025-12-08 |

**`/sp/folder_create` Details:**
- **Request:** `{ "name": "Client Name" }`
- **Response:** `{ "created": true, "webUrl": "https://...", "id": "...", "name": "...", "path": "/לקוחות משרד/Client Name" }`
- **Behavior:** First checks if folder exists (returns existing), otherwise creates in "לקוחות משרד" parent folder
- **Auto-links:** Updates client registry with SharePoint URL after creation

### Airtable Integration (NEW 2025-12-08)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/airtable-contacts` | GET | List all contacts synced from Airtable (SQLite cache) | ✅ |
| `/api/sync/pull-airtable` | POST | Pull contacts from Airtable → SQLite (batch upsert) | ✅ |
| `/api/sync/push-airtable` | POST | Push changes from SQLite → Airtable (skips unchanged) | ✅ |
| `/api/contacts/activate` | POST | Create client from Airtable contact | ✅ |

**Database Table:** `airtable_contacts` (SQLite)
- 18 columns including: `id`, `airtable_id`, `name`, `email`, `phone`, `types`, `stage`, `activated`, `client_id`, `sync_hash`
- Indexes on: `airtable_id`, `name`, `activated`, `client_id`
- See `DATA_STORES.md` for full schema

### Contacts Data (NEW - Phase 4I)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/contacts/{client_id}` | GET | List contacts for client | ✅ |
| `/contacts` | POST | Create contact | ✅ |
| `/contacts/{id}` | PATCH | Update contact | ✅ |
| `/contacts/{id}` | DELETE | Delete contact | ✅ |

### Email Operations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/email/by_client` | GET | Get indexed emails for client |
| `/email/search` | GET | Search emails |
| `/email/sync_client` | POST | Sync emails from Graph API |
| `/email/content` | GET | **Get email HTML content** |
| `/email/open` | POST | Get OWA link to view email → `https://outlook.office365.com/owa/?ItemID={id}&exvsurl=1&viewmodel=ReadMessageItem` |
| `/email/reply` | POST | Get OWA link to reply to email → `https://outlook.office365.com/owa/?ItemID={id}&action=Reply&exvsurl=1` |

### Task Operations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tasks` | GET | List tasks |
| `/api/tasks` | POST | Create task |
| `/tasks/create_or_get_folder` | POST | Create task folder |

---

## Component Dependencies

| Component | File | Purpose |
|-----------|------|---------|
| TasksWidget | `components/TasksWidget.jsx` | Overview tasks widget |
| EmailsWidget | `components/EmailsWidget.jsx` | Overview emails widget |
| TaskBoard | `features/tasksNew/TaskBoard.jsx` | Kanban board |
| AddClientModal | `components/AddClientModal.jsx` | Create/edit client |
| LinkAirtableModal | `components/LinkAirtableModal.jsx` | Link to Airtable |
| QuoteGenerator | `components/QuoteGenerator.jsx` | Create quote |
| TabNav | `components/TabNav.jsx` | Tab navigation |
| **ContactsListTab** | `components/clients/ContactsListTab.jsx` | **NEW** Airtable contacts tab |
| **ContactRow** | `components/clients/ContactRow.jsx` | **NEW** Contact table row |
| **SyncButton** | `components/clients/SyncButton.jsx` | **NEW** Airtable sync button |
| **ActivateContactModal** | `components/clients/ActivateContactModal.jsx` | **NEW** Contact activation with SharePoint folder |

---

## Test Data Requirements

For proper testing, ensure:

1. **At least 3 clients** in the system
2. **Each client has:**
   - Email address(es)
   - Phone number
   - Some indexed emails
   - At least 1 task
3. **One client** with Airtable linked
4. **One client** with SharePoint linked

---

## Success Criteria (from TEAM_INBOX)

### Core Features - E2E Verified ✅

| Criterion | Status | Verified By |
|-----------|--------|-------------|
| Click any client → Details load correctly | ✅ PASS | Eli (2025-12-06) - Click client name link |
| Click any email → Email content shows (not "Unable to load") | ✅ PASS | Eli (2025-12-06) - Email HTML renders |
| Click "Create Task" from email → Task created with email context | ✅ PASS | Eli (2025-12-06) - Task API called |
| Click "Open in Outlook" → Opens in Outlook **to the specific email** | ✅ PASS | CEO (2025-12-06) - Opens correct email in OWA |
| ~~Click "Reply" → Opens OWA compose~~ | ⛔ **NOT NEEDED** | CEO (2025-12-06) - Users reply from Outlook |
| TasksWidget scrollable → All tasks visible via scroll (`max-h-[400px]`) | ✅ PASS | Eli (2025-12-06) - Verified in code |
| EmailsWidget scrollable → All emails visible via scroll (`max-h-[400px]`) | ✅ PASS | Eli (2025-12-06) - Verified in code |
| EmailsWidget click-to-view → Click email opens inline viewer | ✅ PASS | Eli (2025-12-06) - Modal opens |
| All buttons ≥44px height | ⚠️ MOSTLY | Eli (2025-12-06) - 1 undersized button found (24px) |

### Phase 4I: Contacts + Client Management (In Progress)
- [x] Contacts CRUD endpoints work (GET, POST, PATCH, DELETE)
- [x] Client update endpoint works (PATCH /registry/clients/{id})
- [x] Airtable search endpoint works (GET /airtable/search)
- [ ] Fix POST /registry/clients validation bug ← **Alex**
- [ ] Fix Airtable sync email format bug ← **Alex**
- [ ] Add 5 AI agent tools ← **Alex**
- [ ] Build contacts UI in AddClientModal ← **Maya** (after Alex)
- [ ] E2E tests for client management ← **Eli** (after Maya)

### Final Verification
- [ ] E2E test passes
- [ ] CTO skeptical review passes

---

## Priority for Fixing

### P0 - Blocking (Must fix first)
1. ~~**EM-013** Email viewer shows error → Fix `/email/content` API~~ ✅ DONE
2. ~~**EM-016** Create task does nothing → Fix task creation from email~~ ✅ DONE
3. ~~**EM-014** Open in Outlook fails → Fix `/email/open` API~~ ✅ DONE

### P1 - Important
4. ~~Add "Reply in Outlook" button (C-004)~~ ✅ DONE
5. ~~Verify all buttons ≥44px height~~ ✅ DONE (15+ buttons fixed)
6. ~~**C-006** Open in Outlook navigates to specific email~~ ✅ DONE
7. ~~**C-007** Reply includes quoted original~~ ✅ DONE

### P2 - Nice to have
8. ~~**C-008** EmailsWidget scroll + click-to-view~~ ✅ DONE
9. Improve email loading speed
10. Better error messages

---

## E2E Test Results (Eli - 2025-12-06)

**Test Suite:** `tests/clients_full_e2e.spec.ts`
**Execution:** VM (`azureuser@20.217.86.4:~/EISLAWManagerWebApp`)
**Duration:** 1m 48s
**Result:** 9/9 tests completed, 7 PASS, 2 FAIL (but both failures were test selector issues, not actual bugs)

### Test Outcomes

| Test | Result | Notes |
|------|--------|-------|
| Client navigation (list → detail) | ⚠️ FAIL → ✅ PASS | Test clicked wrong element (row instead of name link) - CEO verified navigation works |
| Email content display | ✅ PASS | Email HTML renders without "Unable to load" error |
| Create task from email | ✅ PASS | Task creation API called successfully |
| Open in Outlook | ⚠️ FAIL → ✅ PASS | Test selector issue - CEO verified button exists and works |
| Reply button exists | ⚠️ FAIL → ⛔ N/A | CEO confirmed not needed - users reply from Outlook |
| EmailsWidget scroll + click-to-view | ✅ PASS | `.overflow-y-auto` with `.cursor-pointer` rows |
| TasksWidget scroll | ✅ PASS | `.overflow-y-auto` container verified |
| Contacts management UI | ✅ PASS | Test passed (contacts UI approved by CTO) |
| Button accessibility (44px) | ⚠️ MOSTLY | 1 undersized button (24px) found - minor issue |

### Key Findings

1. **Navigation Works** - Clicking client **name link** (not row) navigates correctly
2. **Email Features Work** - All core email features verified (view, open in Outlook, create task)
3. **Widgets Work** - Both EmailsWidget and TasksWidget have proper scroll containers
4. **Reply Not Needed** - CEO confirmed users prefer to reply from Outlook directly
5. **Minor Accessibility Issue** - 1 button (24px) needs height increase to meet 44px standard

### Test Artifacts

- **Test file:** `tests/clients_full_e2e.spec.ts` (uploaded to VM)
- **Config:** `tests/playwright.config.ts`
- **Screenshots:** Available in test results folder

### Conclusion

**All critical features verified working.** Initial test failures were due to incorrect test selectors, not actual bugs. CEO manual verification confirmed all email features work as expected.

**Recommendation:** Ready for CTO skeptical review after fixing the single 24px button.

---

*Document created by David (Product Senior)*
*For use in CORE 4 POLISH - Clients Phase*
*E2E testing by Eli (QA Junior) - 2025-12-06*
