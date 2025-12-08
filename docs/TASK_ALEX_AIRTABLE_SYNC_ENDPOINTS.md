# Task: Build Airtable Sync API Endpoints

**Assigned To:** Alex (Backend Senior)
**Priority:** P1 - High
**Status:** Pending
**Created:** 2025-12-07
**Dependencies:** TASK_JOSEPH_AIRTABLE_CONTACTS_TABLE (table must exist first)

---

## Objective

Build 4 API endpoints for bidirectional batch sync between Airtable and local SQLite database.

---

## Context

**Architecture Decision:** AD-001 (see `ARCHITECTURE_DECISIONS.md`)

- **SQLite = Source of Truth** (not Airtable)
- **Batch sync** (not real-time)
- **Bidirectional:** Pull contacts from Airtable, Push local changes back
- **Conflict resolution:** SQLite wins

---

## Endpoints to Build

### 1. `GET /api/airtable-contacts`

List all contacts synced from Airtable.

**Response:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "airtable_id": "rec0CKdM2lTytvxHY",
      "name": "לקוח לדוגמה",
      "email": "client@example.com",
      "phone": "050-1234567",
      "types": ["עסקי", "פרטיות"],
      "stage": "פעיל",
      "activated": false,
      "last_synced_at": "2025-12-07T10:00:00Z"
    }
  ],
  "total": 150,
  "last_sync": "2025-12-07T10:00:00Z"
}
```

**Query Params:**
- `?activated=true|false` - Filter by activation status
- `?search=name` - Search by name

---

### 2. `POST /api/sync/pull-airtable`

Pull all contacts from Airtable and upsert into `airtable_contacts` table.

**Request:** No body needed (or optional filters)

**Process:**
1. Get Airtable API token from `secrets.local.json`
2. Fetch all records from לקוחות table
3. For each record:
   - Normalize field names (see mapping below)
   - Calculate sync_hash
   - Upsert into `airtable_contacts` (INSERT OR REPLACE by airtable_id)
4. Update `sync_state` table with last sync time

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_fetched": 150,
    "new_contacts": 5,
    "updated_contacts": 10,
    "unchanged": 135,
    "errors": 0
  },
  "synced_at": "2025-12-07T10:00:00Z"
}
```

**Airtable API:**
```
GET https://api.airtable.com/v0/{base_id}/לקוחות
Headers: Authorization: Bearer {token}
```

---

### 3. `POST /api/sync/push-airtable`

Push local changes back to Airtable.

**What to push:**
- New contacts created locally (sync_source = 'manual')
- Updated links/URLs
- New contacts linked to clients

**Request:** No body needed

**Process:**
1. Find records where local changes exist
2. For each:
   - If has `airtable_id`: PATCH existing record
   - If no `airtable_id`: POST new record, save returned ID
3. Update `last_synced_at`

**Response:**
```json
{
  "success": true,
  "stats": {
    "pushed": 3,
    "created_in_airtable": 1,
    "updated_in_airtable": 2,
    "errors": 0
  }
}
```

---

### 4. `POST /api/contacts/activate`

Activate a contact (copy from `airtable_contacts` to `clients` table).

**Request:**
```json
{
  "airtable_contact_id": "uuid-of-contact",
  "sharepoint_folder": "לקוחות משרד/ClientName/",  // optional
  "local_folder": "C:\\Clients\\ClientName\\"       // optional
}
```

**Process:**
1. Get contact from `airtable_contacts`
2. Create new record in `clients` table with folder paths
3. Update `airtable_contacts.activated = 1`, `client_id = new_client_id`
4. Return new client

**Response:**
```json
{
  "success": true,
  "client": {
    "id": "new-client-uuid",
    "name": "לקוח לדוגמה",
    "sharepoint_url": "...",
    "local_folder": "..."
  }
}
```

---

## Field Mapping (Airtable → SQLite)

```python
def normalize_airtable_record(record):
    fields = record.get('fields', {})
    return {
        'airtable_id': record['id'],
        'name': fields.get('לקוחות') or fields.get('Name', ''),
        'email': (fields.get('אימייל') or [''])[0],  # Extract from array
        'phone': fields.get('מספר טלפון', ''),
        'types': json.dumps(fields.get('סוג לקוח', [])),
        'stage': fields.get('בטיפול', ''),
        'notes': fields.get('הערות', ''),
        'whatsapp_url': (fields.get('ווצאפ') or {}).get('url', ''),
        'meeting_email_url': (fields.get('מייל תיאום פגישה') or {}).get('url', ''),
        'airtable_created_at': fields.get('Created', ''),
        'airtable_modified_at': fields.get('Last Modified', ''),
    }
```

---

## Airtable API Reference

**Base ID:** `appv3nlRQTtsk97Y5`
**Table:** `לקוחות`
**View:** `viw34b0ytkGoQd1n3`

**Secrets Location:** `secrets.local.json` → `airtable.token`

**List Records:**
```bash
curl "https://api.airtable.com/v0/appv3nlRQTtsk97Y5/לקוחות?view=viw34b0ytkGoQd1n3" \
  -H "Authorization: Bearer {token}"
```

**Update Record:**
```bash
curl -X PATCH "https://api.airtable.com/v0/appv3nlRQTtsk97Y5/לקוחות/{record_id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"fields": {"הערות": "Updated note"}}'
```

---

## Implementation Notes

1. **Pagination:** Airtable returns max 100 records per request. Handle `offset` for pagination.
2. **Rate Limiting:** Airtable has 5 requests/second limit. Add delay if needed.
3. **Error Handling:** Log errors but continue sync for other records.
4. **Sync State:** Use `sync_state` table to track last successful sync.

---

## Success Criteria

- [ ] `GET /api/airtable-contacts` returns contacts list
- [ ] `POST /api/sync/pull-airtable` fetches and stores all Airtable records
- [ ] `POST /api/sync/push-airtable` pushes local changes
- [ ] `POST /api/contacts/activate` creates client from contact
- [ ] Pagination handled for 100+ records
- [ ] Error handling doesn't break entire sync

---

## Completion Report

*Fill this in when done:*

| Item | Status |
|------|--------|
| GET /api/airtable-contacts | |
| POST /api/sync/pull-airtable | |
| POST /api/sync/push-airtable | |
| POST /api/contacts/activate | |
| Tested on VM | |
| Docs updated | |

**Completed By:**
**Date:**
**Notes:**

---

## Related Documents

- `ARCHITECTURE_DECISIONS.md` → AD-001
- `DATA_STORES.md` → Airtable Integration section
- `TASK_JOSEPH_AIRTABLE_CONTACTS_TABLE.md` (dependency)
- `TASK_MAYA_CONTACTS_LIST_TAB.md` (frontend)
