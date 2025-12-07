# Task: Fix Email Bugs C-006, C-007, C-008

**Assigned To:** Alex (Full-Stack)
**From:** Joe (CTO)
**Date:** 2025-12-06
**Priority:** P1 (C-006, C-007), P2 (C-008)
**Status:** ✅ Complete

> **Note:** Reassigned from Maya to Alex for full-stack end-to-end ownership. Alex will handle both backend (if needed) and frontend, then self-verify via handshake protocol.

---

## Overview

Three email-related bugs need fixing in the Clients module. All are frontend issues.

---

## Bug C-006: "Open in Outlook" doesn't navigate to email

**Symptom:** Clicking "Open in Outlook" opens Outlook web app but doesn't navigate to the specific email.

**File:** `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`

**Current Code (approx line 1290):**
```javascript
function openEmailInOutlook(item){
  if(!item?.id) return
  const url = `https://outlook.office365.com/mail/deeplink/...`
  window.open(url, '_blank')
}
```

**Investigation:**
1. Check what URL format is being generated
2. Compare with the OWA deeplink documentation
3. The email ID may need different encoding or the URL path may be wrong

**OWA Deeplink Formats:**
- View email: `https://outlook.office365.com/mail/inbox/id/{encodedId}`
- Alternative: `https://outlook.office365.com/owa/?ItemID={encodedId}&exvsurl=1&viewmodel=ReadMessageItem`

**Fix Approach:**
1. Log the current URL being opened
2. Test different OWA URL formats
3. Ensure email ID is properly encoded (may need base64 or URL encoding)

---

## Bug C-007: "Reply" opens empty compose

**Symptom:** Clicking "Reply" opens OWA compose window but without the original email quoted.

**File:** `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`

**Current Code (approx line 1295):**
```javascript
function replyInOutlook(item){
  if(!item?.id) return
  const replyUrl = `https://outlook.office365.com/mail/deeplink/compose?itemId=${encodeURIComponent(item.id)}&action=reply`
  window.open(replyUrl, '_blank')
}
```

**Investigation:**
1. The `action=reply` parameter may not work with `/deeplink/compose`
2. May need a different URL path entirely

**OWA Reply Formats to Try:**
- `https://outlook.office365.com/mail/deeplink/reply?itemId={id}`
- `https://outlook.office365.com/owa/?ItemID={id}&action=Reply`

**Fix Approach:**
1. Research correct OWA reply deeplink format
2. Test on VM with real email ID
3. Verify quoted content appears

---

## Bug C-008: EmailsWidget missing scroll + click-to-view

**Symptom:** In the Overview tab, the EmailsWidget shows only 5 emails. Cannot scroll to see more. Cannot click to view email content.

**File:** `frontend/src/components/EmailsWidget.jsx`

**Current Behavior:**
- Shows max 5 emails with "+X more" link
- Link navigates to emails tab (good)
- No way to view more inline
- No way to click email to see content

**Required Changes:**

1. **Add Expand/Collapse:**
   ```jsx
   const [expanded, setExpanded] = useState(false)
   ```

2. **Add Scroll Container:**
   ```jsx
   <div className={expanded ? "max-h-[400px] overflow-y-auto" : ""}>
   ```

3. **Fetch More When Expanded:**
   - When expanded=true, fetch with higher limit (e.g., 50)
   - Or remove limit entirely

4. **Add Click-to-View:**
   - Add onClick handler to each email row
   - Open inline viewer modal (similar to emails tab)
   - Include "Open in Outlook" and "Reply" buttons

**Reference:** Look at how ClientOverview.jsx emails tab handles the viewer:
- `viewer` state with `{ open, loading, error, html, meta }`
- `openViewer(email)` function
- Viewer modal component

---

## Testing

**On VM (http://20.217.86.4:5173):**

1. **C-006 Test:**
   - Go to Clients → Pick a client → Emails tab
   - Click "Open in Outlook" on any email
   - Verify: Outlook opens AND shows that specific email

2. **C-007 Test:**
   - Click "Reply" on any email
   - Verify: OWA compose opens with original email quoted

3. **C-008 Test:**
   - Go to Clients → Pick a client → Overview tab
   - Verify: Can expand to see more than 5 emails
   - Verify: Can scroll through emails
   - Verify: Can click email to view content inline

---

## Sync Commands

```bash
# Sync ClientOverview.jsx (C-006, C-007)
scp -i ~/.ssh/eislaw-dev-vm.pem frontend/src/pages/Clients/ClientCard/ClientOverview.jsx azureuser@20.217.86.4:~/EISLAWManagerWebApp/frontend/src/pages/Clients/ClientCard/

# Sync EmailsWidget.jsx (C-008)
scp -i ~/.ssh/eislaw-dev-vm.pem frontend/src/components/EmailsWidget.jsx azureuser@20.217.86.4:~/EISLAWManagerWebApp/frontend/src/components/
```

Frontend uses hot-reload - no restart needed.

---

## Completion Report

**Completed by Alex - 2025-12-06**

| Bug | Status | Notes |
|-----|--------|-------|
| C-006 | ✅ FIXED | Backend: Updated `/email/open` to use `https://outlook.office365.com/owa/?ItemID={encoded_id}&exvsurl=1&viewmodel=ReadMessageItem` format. URL-encodes the Graph email ID for proper ItemID parameter. |
| C-007 | ✅ FIXED | Backend: Added `/email/reply` endpoint returning `https://outlook.office365.com/owa/?ItemID={encoded_id}&action=Reply&exvsurl=1`. Frontend: Updated `replyInOutlook` in ClientOverview.jsx to call new API endpoint. |
| C-008 | ✅ FIXED | Frontend: Updated `EmailsWidget.jsx` with simplified always-scrollable design: 1) Fixed height `max-h-[280px]` with `overflow-y-auto` - always scrollable 2) No expand/collapse button (per user request) 3) Fetches up to 100 emails 4) Click handler on email rows opens inline viewer 5) Viewer modal with Open in Outlook and Reply buttons (min-h-[44px]) |

**Files Modified:**
- `backend/main.py` - Updated `/email/open`, added `/email/reply`
- `frontend/src/components/EmailsWidget.jsx` - Simplified always-scrollable design (no expand button, fixed height with scroll)

**All files synced to VM.** Frontend hot-reload active.

---

*Task created by Joe (CTO) - 2025-12-06*
*Completed by Alex - 2025-12-06*
