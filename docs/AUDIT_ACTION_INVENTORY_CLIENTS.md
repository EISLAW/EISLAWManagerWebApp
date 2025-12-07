# Action Inventory Audit: Clients Tab

**Created:** 2025-12-06
**Purpose:** Map all user actions to APIs and Agent tools
**Methodology:** Every data action needs API + Agent tool (Dual-Use Rule)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Exists and working |
| ❌ | Missing - needs implementation |
| 🔶 | Exists but needs agent tool |
| ➖ | UI-only, no backend needed |

---

## 1. Clients List Page (`ClientsList.jsx`)

| Action | Button Text | Type | API Exists? | Agent Tool? | Priority |
|--------|-------------|------|-------------|-------------|----------|
| Search clients | (input field) | Read | ✅ `/api/clients` | ✅ `search_clients` | - |
| Clear search | ✕ | UI-only | ➖ | ➖ | - |
| Add client | הוסף לקוח | Write | ✅ `/api/clients` POST | ❌ Missing | P2 |
| Click client row | (row click) | Navigate | ➖ | ➖ | - |
| View emails | אימיילים | Navigate | ➖ | ➖ | - |
| Open files | קבצים | External | ✅ Opens folder | ❌ Missing | P3 |
| Open SharePoint | SP | External | ✅ Opens URL | ❌ Missing | P3 |
| Open Outlook | Outlook | External | ✅ Opens Outlook | ❌ Missing | P3 |

---

## 2. Client Detail Page (`ClientOverview.jsx`)

### 2.1 Header Actions

| Action | Button Text | Type | API Exists? | Agent Tool? | Priority |
|--------|-------------|------|-------------|-------------|----------|
| Back to list | → | Navigate | ➖ | ➖ | - |
| Edit client | עריכה | UI-only | ➖ | ➖ | - |
| Save edits | שמור | Write | ✅ `/api/clients/{id}` PATCH | ❌ `update_client` | P2 |
| Open Airtable | Airtable | External | ✅ Opens URL | ➖ N/A | - |
| Open folder (KPI) | קבצים | External | ✅ Opens folder | ❌ `open_client_folder` | P3 |
| Open Outlook | Outlook | External | ✅ `/email/open` | ❌ `compose_email` | P2 |
| Generate quote | הצעת מחיר | Write | ✅ Quote API | ❌ `generate_quote` | P2 |
| View tasks | משימות | Navigate | ➖ | ➖ | - |
| View indexed emails | מיילים מאונדקסים | Navigate | ➖ | ➖ | - |

### 2.2 Email Section Actions

| Action | Button Text | Type | API Exists? | Agent Tool? | Priority |
|--------|-------------|------|-------------|-------------|----------|
| Sync emails | סנכרון | Write | ✅ `/email/sync_client` | ❌ `sync_client_emails` | P2 |
| Clear filters | נקה | UI-only | ➖ | ➖ | - |
| Select email | (row click) | UI-only | ➖ | ➖ | - |
| View email content | צפייה מהירה | Read | ✅ `/email/content` | ❌ `get_email_content` | P1 |
| Open in Outlook | פתיחה ב-Outlook | External | ✅ `/email/open` | 🔶 Exists but needs tool | P1 |
| Copy Outlook link | העתק קישור | UI-only | ➖ | ➖ | - |
| Create task from email | יצירת משימה | Write | ✅ `/api/tasks` POST | ✅ `create_task` | - |
| Close viewer | סגור | UI-only | ➖ | ➖ | - |
| Forward email | (missing) | External | ❌ Missing | ❌ Missing | P2 |

### 2.3 Links Section (Add Link Modal)

| Action | Button Text | Type | API Exists? | Agent Tool? | Priority |
|--------|-------------|------|-------------|-------------|----------|
| Add link | + | Write | ✅ Updates client | ❌ `add_client_link` | P3 |

---

## 3. Gap Analysis Summary

### Missing Agent Tools (Priority Order)

| Priority | Tool Name | Description | API Ready? |
|----------|-----------|-------------|------------|
| **P1** | `get_email_content` | Fetch full email HTML | ✅ Yes |
| **P1** | `open_email_outlook` | Get Outlook deeplink | ✅ Yes |
| **P2** | `update_client` | Update client details | ✅ Yes |
| **P2** | `sync_client_emails` | Trigger email sync | ✅ Yes |
| **P2** | `compose_email` | Open compose in Outlook | ❌ Need API |
| **P2** | `generate_quote` | Create quote for client | ✅ Yes |
| **P2** | `add_client` | Create new client | ✅ Yes |
| **P3** | `open_client_folder` | Get folder path | ✅ Yes |
| **P3** | `add_client_link` | Add link to client | ✅ Yes |

### Missing APIs

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `POST /email/compose` | Generate compose URL for Outlook | P2 |
| `POST /email/reply` | Generate reply URL | P2 |
| `POST /email/forward` | Generate forward URL | P2 |

---

## 4. Implementation Tasks

### Task 1: Add Email Tools to Agent (P1)
**Assigned:** Alex
**File:** `backend/ai_studio_tools.py`

Add these tool definitions:
```python
{
    "name": "get_email_content",
    "description": "Get the full HTML content of an email by its ID",
    "parameters": {
        "email_id": {"type": "string", "description": "Microsoft Graph email ID"}
    }
},
{
    "name": "get_client_emails",
    "description": "Get list of emails for a client",
    "parameters": {
        "client_name": {"type": "string"},
        "limit": {"type": "integer", "default": 20}
    }
}
```

### Task 2: Add Client Management Tools (P2)
**Assigned:** Alex

Add:
- `update_client` - Update client details
- `add_client` - Create new client
- `sync_client_emails` - Trigger email sync

### Task 3: Add Email Compose APIs (P2)
**Assigned:** Alex + Maya

Create:
- `POST /email/compose` - Returns Outlook compose URL
- `POST /email/reply` - Returns reply URL with quoted content
- Add corresponding agent tools

---

## 5. Audit Checklist

Before marking Clients phase DONE:

- [ ] All P1 agent tools implemented
- [ ] All P2 agent tools implemented
- [ ] Each API has corresponding tool in `ai_studio_tools.py`
- [ ] Each tool tested via AI Studio chat
- [ ] Documentation updated

---

## 6. Template for Other Tabs

Use this same format for:
- [ ] Privacy tab
- [ ] RAG/Recordings tab
- [ ] AI Studio tab
- [ ] Tasks tab
- [ ] Settings

---

*This audit follows the Dual-Use Rule: Every feature serves both frontend AND AI agents.*
