# Task: File Upload to SharePoint

**Assigned To:** Alex (Backend) + Maya (Frontend)
**Priority:** P2 (After Clients phase complete)
**Status:** PENDING
**Created:** 2025-12-06

---

## Problem

The "קובץ" (File) button in Task Assets exists in the UI but does nothing. The backend endpoint is missing.

**Current State:**
- Frontend calls `POST /tasks/{id}/files/upload`
- Backend returns 404 (endpoint doesn't exist)
- Files should be uploaded to SharePoint (client folder)

---

## Requirements

### Backend (Alex)

Create endpoint: `POST /tasks/{task_id}/files/upload`

**Input:**
- `task_id` - Task to attach file to
- `file` - Multipart file upload
- `client_name` (optional) - For determining SharePoint folder

**Process:**
1. Get client's SharePoint folder (from `sharepoint_url` in client record)
2. Upload file to SharePoint via Graph API
3. Store reference in task's `attachments[]` array

**Output:**
```json
{
  "success": true,
  "attachment": {
    "kind": "file",
    "drive_id": "sharepoint-item-id",
    "source_name": "original-filename.pdf",
    "user_title": "original-filename.pdf",
    "web_url": "https://sharepoint.com/...",
    "uploaded_at": "2025-12-06T14:00:00Z"
  }
}
```

**Reference:** SharePoint upload via Graph API already exists in `main.py` (see `/api/sharepoint/*` endpoints)

### Frontend (Maya)

File: `frontend/src/features/tasksNew/TaskFiles.jsx`

Current code at line ~61:
```javascript
const r = await fetch(`${API}/tasks/${encodeURIComponent(task.id)}/files/upload`, {
  method: 'POST',
  body: fd
});
```

**Tasks:**
1. Add loading state feedback during upload
2. Show error toast if upload fails
3. Ensure `refresh()` is called after successful upload

---

## Data Storage

Per DATA_STORES.md:

| What | Where |
|------|-------|
| Actual file | SharePoint (client folder) |
| File reference | `tasks.json` → task → `attachments[]` |

**Attachment schema:**
```json
{
  "kind": "file",
  "drive_id": "sharepoint-item-id",
  "source_name": "contract.pdf",
  "user_title": "הסכם שירות",
  "web_url": "https://...",
  "uploaded_at": "..."
}
```

---

## Testing

1. Open any task with a client assigned
2. Click "קובץ" button
3. Select a file
4. Verify:
   - [ ] Loading indicator shows during upload
   - [ ] File appears in SharePoint client folder
   - [ ] File appears in task assets list
   - [ ] Clicking file opens SharePoint preview

---

## Completion Report

*To be filled by Alex/Maya*

| Item | Status | Notes |
|------|--------|-------|
| Backend endpoint created | | |
| SharePoint upload works | | |
| Frontend shows loading | | |
| File appears in assets | | |
| E2E tested | | |

---

**Dependencies:** None (can start anytime after Clients phase)
