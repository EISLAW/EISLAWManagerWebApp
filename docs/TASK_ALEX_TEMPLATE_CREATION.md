# Task: Template Creation Feature (Documents Tab)

**Assigned To:** Alex (Full-Stack)
**From:** Joe (CTO)
**Date:** 2025-12-06
**Priority:** P1
**Status:** 🔄 In Progress

---

## Objective

Replace the unused "Files" tab with a "Documents" tab (מסמכים) that generates Word documents from templates stored in SharePoint.

---

## SharePoint Configuration (FROM FEATURE BIBLE)

| Item | Path |
|------|------|
| **Site URL** |  |
| **Templates Folder** |  |
| **Client Folders** |  |

---

## Checklist

### Backend (main.py)
- [ ]  - List .dotx files from SharePoint templates folder
- [ ]  - Generate .docx, save to client folder, return URLs

### Frontend
- [ ] Update  - Add checkbox multi-select
- [ ] Update  - Rename "קבצים" → "מסמכים"
- [ ] Add "Open SharePoint Folder" button
- [ ] Add "Generate Documents" button → opens TemplatePicker modal
- [ ] After generation → auto-open SharePoint folder in new tab

### Agent Tools (ai_studio_tools.py)
- [ ] Add  tool definition + execute function
- [ ] Add  tool definition + execute function

### After Completion
- [ ] Update Feature Bible in CLAUDE.md:
  - Add Documents feature to Clients module count
  - Update Clients status if needed
- [ ] Test all flows on VM

---

## Technical Specs

### GET /word/templates Response:


### POST /word/generate Request:


### POST /word/generate Response:


### Template Processing Logic:
1. Get Graph API token (use existing )
2. List .dotx files from templates folder via Graph API
3. For generation:
   - Download .dotx from SharePoint
   - Replace first word with client name:
     - Hebrew:  → 
     - English:  → 
   - Change extension to .docx
   - Upload to client folder in SharePoint
4. Return URLs of created files + folder URL

---

## Agent Tool Definitions

### list_templates


### generate_document


---

## Files to Modify

| File | Changes |
|------|---------|
|  | Add ,  endpoints |
|  | Add ,  tools |
|  | Add multi-select checkboxes |
|  | Rename tab, add buttons |

---

## Testing

1. Go to http://20.217.86.4:5173
2. Navigate to any client → Documents tab (מסמכים)
3. Verify templates load from SharePoint
4. Select multiple templates
5. Click Generate → Confirm
6. Verify documents appear in client SharePoint folder
7. Verify folder opens automatically

---

## Completion Report Template

| Item | Status | Notes |
|------|--------|-------|
| GET /word/templates | | |
| POST /word/generate | | |
| TemplatePicker multi-select | | |
| ClientOverview tab rename | | |
| list_templates tool | | |
| generate_document tool | | |
| Feature Bible updated | | |

---

*Task created by Joe (CTO) - 2025-12-06*
