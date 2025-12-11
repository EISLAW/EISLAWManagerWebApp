# Task: Create "רשימת קשר" (Contact List) Tab

**Assigned To:** Maya (Frontend Senior)
**Priority:** P1 - High
**Status:** Pending
**Created:** 2025-12-07
**Dependencies:**
- TASK_JOSEPH_AIRTABLE_CONTACTS_TABLE
- TASK_ALEX_AIRTABLE_SYNC_ENDPOINTS

---

## Objective

Create a new tab in the Clients module called "רשימת קשר" that displays all contacts synced from Airtable. Users can search, filter, and activate contacts (move them to active clients).

---

## Context

**Architecture Decision:** AD-001 (see `ARCHITECTURE_DECISIONS.md`)

**UI Structure:**
- **Tab 1:** לקוחות (Active Clients) - existing functionality
- **Tab 2:** רשימת קשר (Contact List) - NEW - all Airtable contacts

---

## Design Requirements

### Tab Structure

```
┌─────────────────────────────────────────────────────────────┐
│  👥 לקוחות  |  📋 רשימת קשר                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [🔄 סנכרן מ-Airtable]              [🔍 חיפוש...]          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ שם              │ טלפון      │ סטטוס    │ פעולות   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ לקוח לדוגמה     │ 050-123... │ פעיל     │ [פתח]   │   │
│  │ לקוח נוסף       │ 052-456... │ לידים    │ [פתח]   │   │
│  │ ✅ לקוח מופעל   │ 054-789... │ פעיל     │ [צפה]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  הוצגו 150 אנשי קשר | עודכן לאחרונה: 07/12/2025 10:00     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visual States

| State | Indicator | Action Button |
|-------|-----------|---------------|
| Not activated | Normal row | "פתח תיקייה" button |
| Activated | ✅ checkmark, muted row | "צפה בלקוח" link |
| Syncing | Spinner | Disabled |

---

## Components to Build

### 1. ContactsListTab.tsx

Main tab component:

```tsx
// frontend/src/components/clients/ContactsListTab.tsx

interface AirtableContact {
  id: string;
  airtable_id: string;
  name: string;
  email: string;
  phone: string;
  types: string[];
  stage: string;
  activated: boolean;
  client_id?: string;
  last_synced_at: string;
}

interface ContactsListTabProps {
  onActivateContact: (contact: AirtableContact) => void;
  onViewClient: (clientId: string) => void;
}
```

### 2. ContactRow.tsx

Single contact row:

```tsx
// frontend/src/components/clients/ContactRow.tsx

interface ContactRowProps {
  contact: AirtableContact;
  onActivate: () => void;
  onView: () => void;
}
```

### 3. SyncButton.tsx

Sync from Airtable button:

```tsx
// frontend/src/components/clients/SyncButton.tsx

interface SyncButtonProps {
  onSync: () => Promise<void>;
  lastSyncTime: string;
}
```

### 4. ActivateContactModal.tsx

Modal for activating contact (optional folder setup):

```tsx
// frontend/src/components/clients/ActivateContactModal.tsx

interface ActivateContactModalProps {
  contact: AirtableContact;
  onConfirm: (folderPath?: string) => void;
  onCancel: () => void;
}
```

---

## API Integration

### Fetch Contacts
```typescript
const fetchContacts = async () => {
  const response = await fetch('/api/airtable-contacts');
  const data = await response.json();
  return data.contacts;
};
```

### Sync from Airtable
```typescript
const syncFromAirtable = async () => {
  const response = await fetch('/api/sync/pull-airtable', { method: 'POST' });
  const data = await response.json();
  return data.stats;
};
```

### Activate Contact
```typescript
const activateContact = async (contactId: string, folder?: string) => {
  const response = await fetch('/api/contacts/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      airtable_contact_id: contactId,
      sharepoint_folder: folder
    })
  });
  return await response.json();
};
```

---

## Tab Navigation Update

Update `ClientsPage.tsx` to add the new tab:

```tsx
const [activeTab, setActiveTab] = useState<'clients' | 'contacts'>('clients');

<div className="flex border-b">
  <button
    className={`px-4 py-2 ${activeTab === 'clients' ? 'border-b-2 border-blue-500' : ''}`}
    onClick={() => setActiveTab('clients')}
  >
    👥 לקוחות
  </button>
  <button
    className={`px-4 py-2 ${activeTab === 'contacts' ? 'border-b-2 border-blue-500' : ''}`}
    onClick={() => setActiveTab('contacts')}
  >
    📋 רשימת קשר
  </button>
</div>

{activeTab === 'clients' ? (
  <ClientsList ... />
) : (
  <ContactsListTab ... />
)}
```

---

## RTL & Hebrew Requirements

- All text right-to-left
- Table headers aligned right
- Search input with RTL placeholder
- Buttons with Hebrew labels:
  - "סנכרן מ-Airtable" (Sync from Airtable)
  - "פתח תיקייה" (Open Folder)
  - "צפה בלקוח" (View Client)

---

## Success Criteria

- [ ] New "רשימת קשר" tab visible in Clients page
- [ ] Contacts list loads from API
- [ ] Search by name works
- [ ] "סנכרן מ-Airtable" button triggers sync
- [ ] Sync shows loading state and success toast
- [ ] "פתח תיקייה" opens activation modal
- [ ] After activation, contact shows ✅ and links to client
- [ ] Mobile responsive (44px touch targets)
- [ ] RTL layout correct

---

## Completion Report

*Fill this in when done:*

| Item | Status |
|------|--------|
| ContactsListTab component | |
| Tab navigation added | |
| API integration | |
| Sync button works | |
| Activate flow works | |
| RTL & Hebrew | |
| Mobile responsive | |
| Tested on VM | |

**Completed By:**
**Date:**
**Notes:**

---

## Related Documents

- `ARCHITECTURE_DECISIONS.md` → AD-001
- `DesignSystem/README.md` → Visual standards
- `TASK_ALEX_AIRTABLE_SYNC_ENDPOINTS.md` (API dependency)
- `TASK_JOSEPH_AIRTABLE_CONTACTS_TABLE.md` (DB dependency)
