# PRD: Client Management with Airtable Sync

**Version:** 1.0
**Date:** 2025-12-01
**Status:** Implemented (Backend) / Pending (Frontend UI)

---

## 1. Overview

### 1.1 Goal
Enable users to create, update, and manage clients directly from the EISLAW Dashboard web application, with automatic bidirectional synchronization to Airtable.

### 1.2 Background
- Airtable serves as the contact/CRM database
- The Dashboard app maintains a local registry (`clients.json`) for active clients
- Only clients actively imported into the system should appear in the Dashboard
- Changes made in the Dashboard should reflect in Airtable

### 1.3 User Story
> As a law firm staff member, I want to create and manage client records in the Dashboard so that client information is automatically synced to Airtable without manual data entry in multiple systems.

---

## 2. Architecture

### 2.1 Data Flow
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Dashboard UI  │ ──API──▶│  Backend (FastAPI)│ ──HTTP──▶│  Airtable   │
└─────────────────┘         └──────────────────┘         └─────────────┘
                                    │
                                    ▼
                            ┌──────────────────┐
                            │  clients.json    │
                            │  (local registry)│
                            └──────────────────┘
```

### 2.2 Key Files
| File | Location | Purpose |
|------|----------|---------|
| `backend/main.py` | `/app/backend/main.py` | API endpoints |
| `backend/airtable_sync.py` | `/app/backend/airtable_sync.py` | Airtable API integration |
| `clients.json` | `/home/azureuser/.eislaw/store/clients.json` | Local client registry |
| `secrets.local.json` | `/app/secrets.local.json` | API credentials |

---

## 3. Airtable Configuration

### 3.1 Credentials (from `secrets.local.json`)
```json
{
  "airtable": {
    "token": "pat0g8TPbwjuned7w.xxxxx",
    "base_id": "appv3nlRQTtsk97Y5",
    "clients_table": "tbloKUYGtEEdM76Nm",
    "contacts_table": "tblWVZn9VjoGjdWrX",
    "view_clients": "viw34b0ytkGoQd1n3"
  }
}
```

### 3.2 Clients Table Schema (לקוחות)
| Airtable Field | Field Type | App Field | Required | Notes |
|----------------|------------|-----------|----------|-------|
| לקוחות | singleLineText | `display_name` | Yes | Client name |
| מספר טלפון | phoneNumber | `phone` | No | Format: +972-XX-XXX-XXXX |
| אימייל | email | `email[0]` | No | Primary email |
| סוג לקוח | multipleSelects | `client_type` | No | Options: בטיפול, ריטיינר, ליטיגציה, etc. |
| בטיפול | singleSelect | `stage` | No | Current status |
| הערות | multilineText | `notes` | No | Free text notes |
| אנשי קשר נוספים | multipleRecordLinks | `contacts` | No | Links to contacts table |
| Created | createdTime | `created_at` | Auto | Airtable auto-generated |

### 3.3 Contacts Table Schema (אנשי קשר נוספים)
| Airtable Field | Field Type | App Field | Required | Notes |
|----------------|------------|-----------|----------|-------|
| שם איש קשר | singleLineText | `contact.name` | Yes | Contact name |
| מייל | singleLineText | `contact.email` | No | |
| טלפון | phoneNumber | `contact.phone` | No | |
| לקוח | multipleRecordLinks | (auto-linked) | Yes | Link to parent client |
| תפקיד איש קשר | singleLineText | `contact.role_desc` | No | Job title/role |
| כתובת | singleLineText | `contact.address` | No | |
| מספר זיהוי | singleLineText | `contact.id_number` | No | ID/passport number |

---

## 4. API Endpoints

### 4.1 Create Client
**Endpoint:** `POST /api/clients`

**Request:**
```json
{
  "display_name": "שם הלקוח",
  "email": ["email@example.com"],
  "phone": "+972-52-1234567",
  "client_type": ["בטיפול"],
  "stage": "",
  "notes": "",
  "contacts": []
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-local-id",
  "display_name": "שם הלקוח",
  "slug": "שם-הלקוח",
  "email": ["email@example.com"],
  "phone": "+972-52-1234567",
  "client_type": ["בטיפול"],
  "stage": "",
  "notes": "",
  "contacts": [],
  "folder": "",
  "airtable_id": "recXXXXXXXX",
  "airtable_url": "https://airtable.com/appv3nlRQTtsk97Y5/tbloKUYGtEEdM76Nm/recXXXXXXXX",
  "created_at": "2025-12-01T09:00:00.000000"
}
```

**Validation:**
- `display_name` is required
- Returns 409 if client with same name exists

### 4.2 Update Client
**Endpoint:** `PUT /api/clients/{client_id}`

**Request:**
```json
{
  "display_name": "שם חדש",
  "phone": "+972-52-9999999",
  "notes": "הערות חדשות"
}
```

**Notes:**
- `client_id` can be local UUID or Airtable record ID
- Only provided fields are updated
- Automatically syncs changes to Airtable if `airtable_id` exists

### 4.3 Get All Clients
**Endpoint:** `GET /api/clients`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "שם הלקוח",
    "email": "primary@email.com",
    "phone": "+972-52-1234567",
    "folder": "/path/to/folder",
    "airtable_id": "recXXX",
    "contacts": [...],
    "client_type": ["בטיפול"],
    "stage": ""
  }
]
```

### 4.4 Get Single Client
**Endpoint:** `GET /api/clients/{client_id}`

Returns full client object including all contacts.

### 4.5 Import from Airtable
**Endpoint:** `POST /api/clients/import-from-airtable`

**Request:**
```json
{
  "airtable_id": "recXXXXXXXX"
}
```

**Purpose:** Import an existing Airtable contact into the active clients registry.

**Response:** Full client object with data fetched from Airtable.

### 4.6 Add Contact to Client
**Endpoint:** `POST /api/clients/{client_id}/contacts`

**Request:**
```json
{
  "name": "איש קשר",
  "email": "contact@example.com",
  "phone": "+972-50-1111111",
  "role_desc": "מנהל כספים",
  "address": "תל אביב",
  "id_number": "123456789"
}
```

**Notes:**
- Creates contact in Airtable's contacts table
- Links contact to parent client via `לקוח` field
- Returns contact object with `airtable_id`

---

## 5. Local Registry Structure

### 5.1 File Location
```
Host: /home/azureuser/.eislaw/store/clients.json
Container: /home/azureuser/.eislaw/store/clients.json (volume mounted)
```

### 5.2 Full Schema
```json
{
  "clients": [
    {
      "id": "1a21f1ac-a3e8-4d46-bee0-b2d374854e60",
      "display_name": "סיון בנימיני",
      "slug": "סיון-בנימיני",
      "email": ["sivan@thepowerskill.com", "sisivani@gmail.com"],
      "phone": "+972549482920",
      "client_type": ["בטיפול"],
      "stage": "טיפול הושלם",
      "notes": "לקוח VIP",
      "contacts": [
        {
          "id": "contact-uuid-123",
          "name": "יוסי כהן",
          "email": "yossi@company.com",
          "phone": "+972-50-1234567",
          "role_desc": "מנכ״ל",
          "address": "רחוב הרצל 1, תל אביב",
          "id_number": "123456789",
          "airtable_id": "recCONTACT123"
        }
      ],
      "folder": "C:\\Users\\USER\\...\\לקוחות משרד\\סיון בנימיני",
      "airtable_id": "recxQ7jWauNY7fr5c",
      "airtable_url": "https://airtable.com/appv3nlRQTtsk97Y5/tbloKUYGtEEdM76Nm/recxQ7jWauNY7fr5c",
      "created_at": "2025-10-25T22:43:00",
      "updated_at": "2025-12-01T09:00:00"
    }
  ]
}
```

---

## 6. Frontend Implementation Requirements

### 6.1 Components Needed
| Component | Purpose | Priority |
|-----------|---------|----------|
| `ClientCreateModal` | Modal form for creating new client | High |
| `ClientEditForm` | Form for editing client details | High |
| `ContactAddForm` | Sub-form for adding contacts | Medium |
| `AirtableImportModal` | Search and import from Airtable | Medium |
| `ClientTypeSelect` | Multi-select for client types | High |

### 6.2 Form Specifications

#### Create/Edit Client Form
| Field | Input Type | Validation | Label (Hebrew) |
|-------|------------|------------|----------------|
| display_name | text | required, min 2 chars | שם לקוח |
| email | email (repeater) | valid email format | אימייל |
| phone | tel | Israeli phone regex | טלפון |
| client_type | multi-select | from CLIENT_TYPES | סוג לקוח |
| stage | select | from STAGES | סטטוס |
| notes | textarea | max 5000 chars | הערות |

#### Contact Form
| Field | Input Type | Validation | Label (Hebrew) |
|-------|------------|------------|----------------|
| name | text | required | שם איש קשר |
| email | email | valid format | אימייל |
| phone | tel | Israeli format | טלפון |
| role_desc | text | - | תפקיד |
| address | text | - | כתובת |
| id_number | text | 9 digits | ת.ז. |

### 6.3 Select Options
```typescript
const CLIENT_TYPES = [
  { value: "בטיפול", label: "בטיפול" },
  { value: "ריטיינר", label: "ריטיינר" },
  { value: "ליטיגציה", label: "ליטיגציה" },
  { value: "טיפול הושלם", label: "טיפול הושלם" },
  { value: "פוטנציאלי", label: "פוטנציאלי" }
];

const STAGES = [
  { value: "", label: "לא נבחר" },
  { value: "חדש", label: "חדש" },
  { value: "בתהליך", label: "בתהליך" },
  { value: "ממתין", label: "ממתין" },
  { value: "הושלם", label: "הושלם" }
];
```

### 6.4 API Integration Example
```typescript
// Create client
const createClient = async (data: ClientInput) => {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (response.status === 409) {
    throw new Error('לקוח עם שם זה כבר קיים');
  }

  return response.json();
};

// Update client
const updateClient = async (id: string, data: Partial<ClientInput>) => {
  const response = await fetch(`/api/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return response.json();
};
```

---

## 7. Error Handling

### 7.1 HTTP Status Codes
| Code | Meaning | Frontend Action |
|------|---------|-----------------|
| 200 | Success | Show success toast |
| 201 | Created | Show success + redirect |
| 400 | Bad request (validation) | Show field errors |
| 404 | Client not found | Redirect to list |
| 409 | Duplicate client | Show warning modal |
| 500 | Server error | Show retry option |

### 7.2 Airtable Sync Behavior
- **Success:** Client saved locally + synced to Airtable, `airtable_id` populated
- **Failure:** Client saved locally only, `airtable_id` empty, error logged
- **Retry:** Future enhancement - queue failed syncs for retry

---

## 8. Testing

### 8.1 Manual API Tests
```bash
# Base URL
API_URL="http://20.217.86.4:8799"

# Create client
curl -X POST "$API_URL/api/clients" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "לקוח בדיקה", "email": ["test@eislaw.co.il"], "phone": "052-1234567"}'

# Get all clients
curl "$API_URL/api/clients"

# Get single client
curl "$API_URL/api/clients/{id}"

# Update client
curl -X PUT "$API_URL/api/clients/{id}" \
  -H "Content-Type: application/json" \
  -d '{"phone": "052-9999999"}'

# Add contact
curl -X POST "$API_URL/api/clients/{id}/contacts" \
  -H "Content-Type: application/json" \
  -d '{"name": "איש קשר חדש", "email": "contact@test.com"}'

# Import from Airtable
curl -X POST "$API_URL/api/clients/import-from-airtable" \
  -H "Content-Type: application/json" \
  -d '{"airtable_id": "recXXXXXXXX"}'
```

### 8.2 Verification Checklist
- [ ] Client appears in `/api/clients` response
- [ ] Client record created in Airtable (check via Airtable UI)
- [ ] `airtable_id` and `airtable_url` populated in response
- [ ] Update reflects in both local registry and Airtable
- [ ] Contact created and linked to client in Airtable

---

## 9. Deployment Notes

### 9.1 Environment
- **VM:** Azure VM at `20.217.86.4`
- **API Port:** 8799
- **Frontend Port:** 8080 (or 5173 for dev)

### 9.2 Docker Volume
```yaml
# docker-compose.yml
volumes:
  - /home/azureuser/.eislaw/store:/home/azureuser/.eislaw/store
```

### 9.3 Required Secrets
Ensure `secrets.local.json` contains:
- `airtable.token`
- `airtable.base_id`
- `airtable.clients_table`
- `airtable.contacts_table`
- `store_base` (path to registry directory)

---

## 10. Future Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| SharePoint folder | Auto-create client folder on SharePoint | High |
| Bulk import | Import multiple clients from Airtable | Medium |
| Sync indicator | Show sync status in UI | Medium |
| Delete sync | Sync deletions to Airtable | Low |
| Conflict resolution | Handle data conflicts | Low |
| Audit log | Track all changes | Low |

---

## 11. Appendix: Airtable API Reference

### Base URL
```
https://api.airtable.com/v0/{base_id}/{table_id}
```

### Authentication
```
Authorization: Bearer {token}
```

### Create Record
```http
POST /v0/{base_id}/{table_id}
Content-Type: application/json

{
  "fields": {
    "לקוחות": "שם הלקוח",
    "מספר טלפון": "+972-52-1234567"
  }
}
```

### Update Record
```http
PATCH /v0/{base_id}/{table_id}/{record_id}
Content-Type: application/json

{
  "fields": {
    "מספר טלפון": "+972-52-9999999"
  }
}
```

### Get Record
```http
GET /v0/{base_id}/{table_id}/{record_id}
```
