# API Endpoints Inventory

**Author:** Alex (Full-Stack)
**Date:** 2025-12-06
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

### Implementation Summary (2025-12-07 - Updated with Phase 4G)

| Category | Total | ✅ Implemented | ⚠️ Known Issues | ❌ Missing | 🔄 VM Only |
|----------|-------|----------------|-----------------|------------|------------|
| Client | 13 | 12 | 1 | 3 | 0 |
| Contacts | 4 | 4 | 0 | 0 | 0 |
| Task | 18 | 9 | 0 | 9 | 0 |
| Email | 7 | 4 | 0 | 1 | 2 |
| RAG | 12 | 12 | 0 | 0 | 0 |
| SharePoint | 4 | 3 | 0 | 1 | 0 |
| **Word/Docs** | **6** | **6** | **0** | **0** | **0** |
| Privacy | 3 | 3 | 0 | 0 | 0 |
| System | 4 | 4 | 0 | 0 | 0 |
| Dev | 4 | 0 | 0 | 4 | 0 |
| AI Studio | 2 | 2 | 0 | 0 | 0 |
| **TOTAL** | **77** | **59** | **1** | **18** | **2** |

**AI Agent Tools:** 14 tools implemented (7 Clients + 4 Tasks + 3 Documents). See sections below.
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

### Client Endpoint Notes

| Endpoint | Status | Note |
|----------|--------|------|
| `POST /registry/clients` | ✅ Working | Expects `display_name` (by design), `email` as array |
| `POST /airtable/clients_upsert` | ⚠️ Known Issue | Airtable field "אימייל" type mismatch - needs Airtable config fix, not code bug |

### AI Agent Tools (Clients) - 7 Implemented
| Tool | Status | Endpoint |
|------|--------|----------|
| `search_clients` | ✅ Implemented | SQLite via `clients_db.list()` |
| `get_client_details` | ✅ Implemented | GET `/registry/clients/{id}` |
| `update_client` | ✅ Implemented | PATCH `/registry/clients/{id}` |
| `create_client` | ✅ Implemented | POST `/registry/clients` |
| `get_client_contacts` | ✅ Implemented | GET `/contacts/{client_id}` |
| `add_contact` | ✅ Implemented | POST `/contacts` |
| `sync_client_to_airtable` | ✅ Implemented | POST `/airtable/clients_upsert` |

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

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/api/privacy/submissions` | GET | List privacy submissions | UI | ✅ |
| `/api/clients/{cid}/privacy/scores` | GET | Get privacy scores | UI | ✅ |
| `/api/clients/{cid}/privacy/deliver` | POST | Deliver privacy report | UI | ✅ |

### Missing Agent Tools (Privacy)
- `get_privacy_score` - Get client's privacy score
- `run_privacy_check` - Run privacy algorithm

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

| Endpoint | Method | Purpose | Status | Backend |
|----------|--------|---------|--------|---------|
| `/ai/chat` | POST | Send message to AI | UI | ✅ |
| `/ai/tools` | GET | List available tools | UI | ✅ |

### Currently Implemented AI Tools
| Tool Name | Description |
|-----------|-------------|
| `search_clients` | Search clients by name/email/phone |
| `get_client_details` | Get client details by ID |
| `search_tasks` | Search tasks with filters |
| `create_task` | Create new task |
| `update_task_status` | Update task status |
| `get_system_summary` | Get system statistics |

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
