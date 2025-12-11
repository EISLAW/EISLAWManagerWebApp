# Architecture Decisions

This document records significant architecture decisions for the EISLAW system.

---

## AD-001: Client Data Architecture (2025-12-07)

**Decision:** SQLite is Source of Truth, Airtable is Contact List

**Context:** CEO decided on data architecture for clients/Airtable integration.

### Architecture

```
AIRTABLE (CRM)  <──  Batch Sync  ──>  SQLITE (Source of Truth)
```

### Two Data Sets

| Data | Table | Purpose |
|------|-------|---------|
| **Contact List** | `airtable_contacts` | All contacts from Airtable (synced) |
| **Active Clients** | `clients` | Clients with folders, tasks, emails |

### Sync Rules

| Direction | Data | Trigger |
|-----------|------|---------|
| Airtable → SQLite | New contacts | Batch (manual/scheduled) |
| SQLite → Airtable | New contacts created locally, links/URLs | Batch (manual/scheduled) |

### Conflict Resolution

**SQLite wins.** Local changes overwrite Airtable.

### UI Tabs

1. **רשימת קשר** - All Airtable contacts (potential clients)
2. **לקוחות** - Active clients with folders

### Activation Flow

1. User sees contact in "רשימת קשר"
2. Clicks "פתח תיקייה" (Open Folder)
3. Contact copied to `clients` table
4. Now appears in "לקוחות" with full features

### Endpoints Needed

| Endpoint | Purpose |
|----------|---------|
| `POST /api/sync/pull-airtable` | Pull contacts from Airtable |
| `POST /api/sync/push-airtable` | Push local changes to Airtable |
| `POST /api/contacts/activate` | Move contact to active clients |
| `GET /api/airtable-contacts` | List all Airtable contacts |

**Approved by:** CEO
**Date:** 2025-12-07
