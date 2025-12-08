# API Endpoints Inventory

**Author:** Alex (Full-Stack)
**Date:** 2025-12-08
**Purpose:** Complete list of all API endpoints for UI and AI Agent use
**Status:** Living Document - Update when adding new endpoints

---

## Overview

This document lists ALL available API endpoints in the EISLAW system. Each endpoint is marked with:
- **UI**: Used by frontend
- **Agent**: Has corresponding AI Agent tool
- **Candidate**: Could be an AI Agent tool (not yet implemented)

### Backend Implementation Status Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented in backend (`main.py`) |
| ❌ | Missing - Frontend calls but backend doesn't have |
| 🔄 | VM Only - Exists on VM but not synced to local repo |

> ⚠️ **HANDSHAKE RULE:** Every frontend `fetch()` call MUST have a corresponding backend endpoint. See `Testing_Episodic_Log.md` for verification commands.

### Implementation Summary (2025-12-08 - AI Studio endpoints documented)

| Category | Total | ✅ Implemented | ⚠️ Known Issues | ❌ Missing | 🔄 VM Only | ⏳ Planned |
|----------|-------|----------------|-----------------|------------|------------|------------|
| Client | 17 | 14 | 1 | 3 | 0 | 0 |
| Contacts | 4 | 4 | 0 | 0 | 0 | 0 |
| Task | 18 | 9 | 0 | 9 | 0 | 0 |
| Email | 7 | 4 | 0 | 1 | 2 | 0 |
| RAG | 12 | 12 | 0 | 0 | 0 | 0 |
| SharePoint | 4 | 3 | 0 | 1 | 0 | 0 |
| **Word/Docs** | **6** | **6** | **0** | **0** | **0** | **0** |
| Privacy | 3 | 3 | 0 | 0 | 0 | 0 |
| System | 4 | 4 | 0 | 0 | 0 | 0 |
| Dev | 4 | 0 | 0 | 4 | 0 | 0 |
| AI Studio | 6 | 6 | 0 | 0 | 0 | 0 |
| **TOTAL** | **83** | **65** | **1** | **18** | **2** | **0** |

**AI Agent Tools:** 16 implemented in `ai_studio_tools.py`:
- Clients: 4 (search_clients, get_client_details, archive_client, restore_client)
- Contacts: 2 (get_client_contacts, add_contact)
- Tasks: 3 (search_tasks, create_task, update_task_status)
- Documents: 2 (list_templates, generate_document)
- Privacy: 4 (score_privacy_submission, send_privacy_email, get_privacy_metrics, search_privacy_submissions)
- System: 1 (get_system_summary)

**Known Issue:** Airtable upsert has field type config issue (not code bug).

---

## Client Endpoints

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/api/clients` | GET | List all clients | UI | ✅ |
| `/api/clients/{cid}` | GET | Get client by ID | UI | ✅ |
| `/api/client/summary` | GET | Get client details + emails + files | UI, **Candidate** | ✅ |
| `/api/client/summary_online` | GET | Get client details from live Graph API | UI | ❌ |
| `/api/client/locations` | GET | Get client folder paths (local + SharePoint) | UI | ❌ |
| `/api/clients/{cid}/files` | GET | Get client files | UI | ✅ |
| `/api/clients/{cid}/emails` | GET | Get client emails | UI | ✅ |
| `/api/clients/{cid}/privacy/scores` | GET | Get privacy scores | UI | ✅ |
| `/api/clients/{cid}/privacy/deliver` | POST | Deliver privacy report | UI, **Candidate** | ✅ |
| `/api/outlook/latest_link` | GET | Get latest Outlook deeplink for email | UI | ❌ |
| `/registry/clients` | POST | Create new client | UI, Agent | ✅ (expects `display_name`, `email` as array) |
| `/registry/clients/{id}` | GET | Get client with contacts | UI | ✅ (Added 2025-12-06) |
| `/registry/clients/{id}` | PATCH | Update client details | UI | ✅ (Added 2025-12-06) |
| `/airtable/clients_upsert` | POST | Sync client to Airtable | UI | ⚠️ Bug: Email field format error |
| `/airtable/search` | GET | Search Airtable clients | UI | ✅ (Added 2025-12-06) |
| `/api/clients/{id}/archive` | POST | Archive client | UI, Agent | ✅ |
| `/api/clients/{id}/restore` | POST | Restore archived client | UI, Agent | ✅ |

### Archive Feature (CLI-006 - Implemented)

> **Status:** Implemented per `PRD_CLIENT_ARCHIVE.md` (CLI-006)

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `GET /api/clients?archived=` | GET | Filter clients | `?archived=0` (default), `1`, `all` | Array of clients |
| `POST /api/clients/{id}/archive` | POST | Archive client | `{}` | `{ success, archived_at }` |
| `POST /api/clients/{id}/restore` | POST | Restore client | `{}` | `{ success }` |

**Error Codes:** 404 (not found), 409 (already in target state)

### Client Endpoint Notes

| Endpoint | Status | Note |
|----------|--------|------|
| `POST /registry/clients` | ✅ Working | Expects `display_name` (by design), `email` as array |
| `POST /airtable/clients_upsert` | ⚠️ Known Issue | Airtable field "אימייל" type mismatch - needs Airtable config fix, not code bug |

### AI Agent Tools (Clients) - 9 Implemented
| Tool | Status | Endpoint |
|------|--------|----------|
| `search_clients` | ✅ Implemented | API `/api/clients` (supports `include_archived`) |
| `get_client_details` | ✅ Implemented | GET `/registry/clients/{id}` |
| `update_client` | ✅ Implemented | PATCH `/registry/clients/{id}` |
| `create_client` | ✅ Implemented | POST `/registry/clients` |
| `get_client_contacts` | ✅ Implemented | GET `/contacts/{client_id}` |
| `add_contact` | ✅ Implemented | POST `/contacts` |
| `sync_client_to_airtable` | ✅ Implemented | POST `/airtable/clients_upsert` |
| `archive_client` | ✅ Implemented | POST `/api/clients/{id}/archive` |
| `restore_client` | ✅ Implemented | POST `/api/clients/{id}/restore` |

### Missing Agent Tools (Clients)
- `get_client_emails` - Get client's emails
- `get_client_files` - Get client's files

---

## Contacts Endpoints (NEW - 2025-12-06)

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/contacts/{client_id}` | GET | List contacts for client | UI, Agent | ✅ Verified |
| `/contacts` | POST | Create new contact | UI, Agent | ✅ Verified |
| `/contacts/{id}` | PATCH | Update contact | UI, Agent | ✅ Verified |
| `/contacts/{id}` | DELETE | Delete contact | UI, Agent | ✅ Verified |

### Contact Object Schema
```json
{
  "id": "uuid",
  "client_id": "uuid",
  "name": "string",
  "email": "string (optional)",
  "phone": "string (optional)",
  "role": "string (optional)",
  "notes": "string (optional)",
  "is_primary": 0 | 1,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### AI Agent Tools (Contacts) - All Implemented
All contact tools are implemented and verified working:
- ✅ `get_client_contacts` - Get all contacts for a client
- ✅ `add_contact` - Add contact to client
- ✅ `sync_client_to_airtable` - Sync client to Airtable

---

## Task Endpoints

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/api/tasks` | GET | List all tasks | UI, Agent | ✅ |
| `/api/tasks` | POST | Create task | UI, Agent | ✅ |
| `/api/tasks/summary` | GET | Get task counts by status | UI | ✅ |
| `/api/tasks/{task_id}` | GET | Get task by ID | UI | ✅ |
| `/api/tasks/{task_id}` | PATCH | Update task | UI | ✅ |
| `/api/tasks/{task_id}` | DELETE | Delete task | UI | ✅ |
| `/api/tasks/{task_id}/done` | POST | Mark task done | UI, Agent | ✅ |
| `/api/tasks/{task_id}/subtask` | POST | Add subtask | UI | ✅ |
| `/tasks/{task_id}/files` | GET | Get task files/attachments | UI | ❌ |
| `/tasks/{task_id}/files/upload` | POST | Upload file to task | UI | ❌ |
| `/tasks/{task_id}/files/{driveId}/title` | PATCH | Rename file | UI | ❌ |
| `/tasks/{task_id}/links/add` | POST | Add link to task | UI | ❌ |
| `/tasks/{task_id}/links/update` | PATCH | Update link | UI | ❌ |
| `/tasks/{task_id}/assets/remove` | POST | Remove asset from task | UI | ❌ |
| `/tasks/{task_id}/folder_link_add` | POST | Add folder link to task | UI | ❌ |
| `/tasks/{task_id}/emails/attach` | POST | Attach email to task | UI | ❌ |
| `/api/tasks/import` | POST | Import tasks | UI | ✅ |
| `/tasks/create_or_get_folder` | POST | Create task folder | UI | ❌ |

### AI Agent Tools (Tasks)
| Tool | Status | Endpoint |
|------|--------|----------|
| `search_tasks` | Implemented | Direct JSON access |
| `create_task` | Implemented | Direct JSON access |
| `update_task_status` | Implemented | Direct JSON access |
| `get_system_summary` | Implemented | Direct JSON access |

---

## Email Endpoints

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/email/by_client` | GET | Get indexed emails for client | UI | ✅ |
| `/email/search` | GET | Search emails | UI | 🔄 |
| `/email/sync_client` | POST | Sync emails from Graph API | UI, **Candidate** | ✅ |
| `/email/content` | GET | Get email HTML content | UI | ✅ |
| `/email/viewer` | GET | Get email viewer URL (iframe-friendly) | UI | ❌ |
| `/email/open` | POST | Get OWA link to view email | UI | ✅ |
| `/email/reply` | POST | Get OWA link to reply to email | UI | 🔄 |

### OWA URL Formats
```
View Email:  https://outlook.office365.com/owa/?ItemID={encoded_id}&exvsurl=1&viewmodel=ReadMessageItem
Reply:       https://outlook.office365.com/owa/?ItemID={encoded_id}&action=Reply&exvsurl=1
```

### Missing Agent Tools (Email)
- `search_emails` - Search client emails
- `get_email_content` - Get email body
- `sync_client_emails` - Trigger email sync

---

## RAG/Documents Endpoints

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/api/rag/search` | GET | Search RAG documents | UI | ✅ |
| `/api/rag/inbox` | GET | Get RAG inbox items | UI | ✅ |
| `/api/rag/ingest` | POST | Ingest document to RAG | UI | ✅ |
| `/api/rag/transcribe_doc` | POST | Transcribe document | UI | ✅ |
| `/api/rag/publish/{item_id}` | POST | Publish RAG item | UI | ✅ |
| `/api/rag/reviewer/{item_id}` | GET | Get reviewer data | UI | ✅ |
| `/api/rag/reviewer/{item_id}` | PATCH | Update reviewer data | UI | ✅ |
| `/api/rag/models` | GET | List available AI models | UI | ✅ |
| `/api/rag/file/{item_id}` | PATCH | Update RAG file | UI | ✅ |
| `/api/rag/file/{item_id}` | DELETE | Delete RAG file | UI | ✅ |
| `/api/rag/audio/{item_id}` | GET | Get audio file | UI | ✅ |
| `/api/rag/assistant` | POST | Chat with RAG assistant | UI | ✅ |

### Missing Agent Tools (RAG)
- `search_documents` - Search knowledge base
- `get_document_content` - Get document text
- `ask_knowledge_base` - Query RAG assistant

---

## SharePoint Endpoints

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/api/sharepoint/search` | GET | Search SharePoint | UI | ✅ |
| `/api/sharepoint/link_client` | POST | Link client to SharePoint folder | UI | ✅ |
| `/api/sharepoint/sites` | GET | List SharePoint sites | UI | ✅ |
| `/sp/folder_create` | POST | Create SharePoint folder | UI | ❌ |

### Missing Agent Tools (SharePoint)
- `list_client_files` - List files in client folder
- `open_sharepoint_folder` - Get SharePoint URL

---

## Word/Document Generation Endpoints (NEW - 2025-12-07)

> **Phase 4G: Document Generation Feature** - Generate Word documents from SharePoint templates

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/word/templates` | GET | List .dotx templates from SharePoint | UI, Agent | ✅ |
| `/word/templates_root` | GET | Get templates folder URL | UI | ✅ |
| `/word/client_folder_url/{client_name}` | GET | Get client's SharePoint folder URL | UI, Agent | ✅ |
| `/word/generate` | POST | Generate single document from template | UI, Agent | ✅ |
| `/word/generate_multiple` | POST | Generate multiple documents at once | UI, Agent | ✅ |
| `/word/health` | GET | Health check for Word API | System | ✅ |

### Template Object Schema
```json
{
  "name": "template_פרטיות_הצהרה.dotx",
  "display_name": "פרטיות - הצהרה",
  "path": "לקוחות משרד/לקוחות משרד_טמפלייטים/פרטיות/template_פרטיות_הצהרה.dotx",
  "item_id": "01QFJOIS...",
  "folder": "פרטיות",
  "webUrl": "https://eislaw.sharepoint.com/...",
  "size": 42601,
  "modified": "2025-06-12T20:55:10Z"
}
```

### Generate Request Schema
```json
{
  "client_name": "גליל פתרונות אחסון",
  "template_paths": [
    "לקוחות משרד/לקוחות משרד_טמפלייטים/template_פרטיות_הצהרה.dotx",
    "לקוחות משרד/לקוחות משרד_טמפלייטים/template_הסכם_שירותים.dotx"
  ],
  "extra_data": {}  // Optional placeholder data
}
```

### Generate Response Schema
```json
{
  "success": true,
  "files_created": [
    {
      "name": "גליל פתרונות אחסון_פרטיות_הצהרה.docx",
      "url": "https://eislaw.sharepoint.com/...",
      "path": "לקוחות משרד/גליל פתרונות אחסון/גליל פתרונות אחסון_פרטיות_הצהרה.docx"
    }
  ],
  "folder_url": "https://eislaw.sharepoint.com/.../גליל פתרונות אחסון",
  "client": "גליל פתרונות אחסון",
  "total_created": 1,
  "total_errors": 0
}
```

### AI Agent Tools (Documents) - 3 Implemented
| Tool | Status | Endpoint |
|------|--------|----------|
| `list_templates` | ✅ Implemented | GET `/word/templates` |
| `generate_document` | ✅ Implemented | POST `/word/generate_multiple` |
| `get_client_folder_url` | ✅ Implemented | GET `/word/client_folder_url/{client_name}` |

---

## Privacy Endpoints

> **Database:** All privacy data stored in `data/privacy.db` (separate from eislaw.db)
> **Source:** Fillout form submissions via webhook

### Core Data Endpoints

| Endpoint | Method | Purpose | Params | Response |
|----------|--------|---------|--------|----------|
| `/api/privacy/submissions` | GET | List all submissions | `limit` (default 50), `status` | `{submissions: [...], total: N}` |
| `/api/privacy/submissions/{id}` | GET | Single submission detail | - | Full submission object |
| `/api/privacy/db-submissions` | GET | Alt list (same data) | `limit`, `status` | `{submissions: [...]}` |

### Monitoring & Stats

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/privacy/activity` | GET | Webhook event log | `{activities: [...]}` with timestamps, event_type, duration_ms |
| `/api/privacy/stats` | GET | Summary counts | `{total, by_level: {lone, basic, mid, high}, pending, approved}` |
| `/api/privacy/metrics` | GET | Dashboard KPIs | Aggregated metrics |

### Scoring & Review Workflow

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/privacy/score/{id}` | POST | Re-run scoring algorithm |
| `/api/privacy/score_all` | POST | Re-score all submissions |
| `/api/privacy/review/{id}` | GET | Get review status |
| `/api/privacy/save_review` | POST | Save review decision |
| `/api/privacy/approve_and_publish/{id}` | POST | Approve & generate report |

### Email & Reports

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/privacy/preview_email/{id}` | POST | Preview result email |
| `/api/privacy/send_email/{id}` | POST | Send results to client |
| `/api/privacy/report/{token}` | GET | Public report (JSON) |
| `/api/privacy/report/{token}/html` | GET | Public report (HTML) |
| `/api/privacy/public-results/{id}` | GET | Public-safe results |

### Webhook & Sync

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/privacy/webhook` | POST | Receive Fillout form submission |
| `/api/privacy/sync_fillout` | GET | Pull submissions from Fillout API |

### Client-Specific

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/clients/{cid}/privacy/scores` | GET | Get client's privacy scores |
| `/api/clients/{cid}/privacy/deliver` | POST | Deliver report to client |

### Example: AI Aggregation Query

```bash
# Get last N submissions with scoring results
curl "http://20.217.86.4:8799/api/privacy/submissions?limit=10"

# Response structure:
{
  "submissions": [
    {
      "submission_id": "uuid",
      "contact_name": "שם",
      "business_name": "עסק",
      "contact_email": "email@example.com",
      "submitted_at": "2025-12-07T10:46:04.883Z",
      "score_level": "high",      // lone, basic, mid, high
      "score_color": "red",       // yellow, orange, red
      "score_dpo": 1,             // 0/1 - DPO required
      "score_reg": 1,             // 0/1 - Registration required
      "score_report": 0,          // 0/1 - Annual report required
      "score_requirements": "[...]", // JSON array
      "review_status": "pending"  // pending, approved, rejected
    }
  ],
  "total": 21
}
```

---

## System Endpoints

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/health` | GET | Health check | System | ✅ |
| `/api/auth/me` | GET | Get current user | UI | ✅ |
| `/api/integrations/health` | GET | Integration health | UI | ✅ |
| `/api/projects` | GET | List projects | UI | ✅ |

---

## Dev Endpoints (Local Development Only)

> **Note:** These endpoints only work when running locally with desktop access. Not available on VM.

| Endpoint | Method | Purpose | Backend |
|----------|--------|---------|---------|
| `/dev/open_folder` | POST | Open client folder in Explorer | ❌ |
| `/dev/open_outlook_app` | POST | Open Outlook desktop app | ❌ |
| `/dev/desktop/open_path` | POST | Open any path in Explorer | ❌ |
| `/dev/desktop/pick_folder` | POST | Show folder picker dialog | ❌ |

---

## AI Studio Endpoints

> **Router:** `ai_studio.py` → prefix `/api/ai-studio`
> **Updated:** 2025-12-08

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/api/ai-studio/chat` | POST | Send message to AI (SSE streaming) | UI | ✅ |
| `/api/ai-studio/conversations` | GET | List all conversations | UI | ✅ |
| `/api/ai-studio/conversations/{id}` | GET | Get conversation with messages | UI | ✅ |
| `/api/ai-studio/conversations/{id}` | DELETE | Delete conversation | UI | ✅ |
| `/api/ai-studio/providers` | GET | List available LLM providers | UI | ✅ |
| `/api/ai-studio/tools` | GET | List available AI agent tools | UI | ✅ |

### Chat Request Schema
```json
{
  "conversation_id": "uuid or null for new",
  "message": "User message text",
  "provider": "gemini|claude|openai",
  "system_prompt": "optional custom prompt",
  "tools_enabled": true
}
```

### SSE Event Types
| Event | Data | Description |
|-------|------|-------------|
| `token` | `{"content": "..."}` | Streaming text token |
| `tool_call` | `{"tool": "...", "arguments": {...}}` | Agent invoking a tool |
| `tool_result` | `{"tool": "...", "result": {...}}` | Tool execution result |
| `conversation` | `{"conversation_id": "..."}` | Final conversation ID |
| `done` | `{"status": "complete"}` | Stream complete |
| `error` | `{"error": "..."}` | Error occurred |

### Currently Implemented AI Tools (16 Total)

| Category | Tool Name | Description |
|----------|-----------|-------------|
| **Clients** | `search_clients` | Search clients by name/email/phone (supports `include_archived`) |
| | `get_client_details` | Get client details by ID |
| | `archive_client` | Archive a client |
| | `restore_client` | Restore archived client |
| **Contacts** | `get_client_contacts` | Get contacts for a client |
| | `add_contact` | Add contact to client |
| **Tasks** | `search_tasks` | Search tasks with filters |
| | `create_task` | Create new task |
| | `update_task_status` | Update task status |
| **Documents** | `list_templates` | List SharePoint templates |
| | `generate_document` | Generate docs from templates |
| **Privacy** | `score_privacy_submission` | Score a privacy submission |
| | `send_privacy_email` | Send privacy results email |
| | `get_privacy_metrics` | Get privacy module stats |
| | `search_privacy_submissions` | Search privacy submissions |
| **System** | `get_system_summary` | Get system statistics |

---

## Agent Tools Roadmap (Priority)

### P1 - High Priority (Core Operations)
1. `get_client_summary` - Full client info with emails/files
2. `search_emails` - Search client emails
3. `send_email` - Send email via Graph API
4. ✅ `create_client` - Create new client (Implemented 2025-12-06)
5. ✅ `update_client` - Update client details (Implemented 2025-12-06)

### P2 - Medium Priority (Documents)
6. ✅ `list_templates` - List Word templates (Implemented 2025-12-07 - Phase 4G)
7. ✅ `generate_document` - Generate doc from template (Implemented 2025-12-07 - Phase 4G)
8. ✅ `get_client_folder_url` - Get client SharePoint folder URL (Implemented 2025-12-07 - Phase 4G)
9. `search_documents` - Search RAG knowledge base
10. `list_client_files` - List SharePoint files

### P3 - Nice to Have
11. `get_privacy_score` - Get privacy algorithm score
12. `schedule_meeting` - Create calendar event
13. `send_whatsapp` - Send WhatsApp message

---

## Adding New Agent Tools

When adding a new API endpoint:

1. **Add to main.py** with proper route
2. **Document here** in appropriate section
3. **If agent-callable**, add to `ai_studio_tools.py`:
   - Add tool definition to `AVAILABLE_TOOLS`
   - Add execution function `execute_{tool_name}`
   - Add case in `execute_tool()` switch

### Tool Definition Format
```python
{
    "type": "function",
    "function": {
        "name": "tool_name",
        "description": "Clear description for AI",
        "parameters": {
            "type": "object",
            "properties": {
                "param1": {"type": "string", "description": "..."},
            },
            "required": ["param1"]
        }
    }
}
```

---

*Document created by Alex - 2025-12-06*
*Updated 2025-12-07 - Phase 4G Document Generation endpoints added*
*Update this document when adding new endpoints or agent tools*
