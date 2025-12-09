# WordPress Code Deployment

This folder contains WordPress customizations for the EISLAW privacy report system.

## Important: Version Control Limitation

**The code in this folder is a BACKUP/REFERENCE COPY only.**

The actual LIVE code runs from WordPress's database via the **Code Snippets** plugin (Snippet ID #5).

### Why This Approach?

WordPress Code Snippets plugin stores code in the database, not in filesystem files. This creates a version control blind spot, which is why we maintain this reference copy in git.

## Files

### `eislaw-privacy-report-snippet.php`

**Purpose:** Server-side privacy report page generator
**Live Location:** WordPress Admin > Snippets > Snippet #5 "EISLAW Privacy Report Shortcode"
**Shortcode:** `[eislaw_privacy_report]`
**Page URL:** https://eislaw.org/privacy-report/?token={submission_id}

**Features:**
- Fetches privacy assessment data from API: `http://20.217.86.4:8799/api/public/report/{token}`
- Renders level badge with color coding (lone/basic/mid/high)
- Displays requirements grid (9 items: 4 main + 5 additional)
- Handles errors (missing token, invalid token, expired token, rate limiting)
- RTL Hebrew layout
- No CORS issues (server-side fetch via `wp_remote_get()`)

## Deployment Process

### Initial Setup (Already Completed)

1. Login to WordPress: https://eislaw.org/wp-admin
2. Navigate to: Snippets > Add New
3. Name: "EISLAW Privacy Report Shortcode"
4. Copy code from `eislaw-privacy-report-snippet.php`
5. Settings:
   - Run: "Only run in frontend"
   - Scope: "Global"
6. Save and Activate

### Updating the Code

**CRITICAL:** When modifying the privacy report page, you MUST update BOTH locations:

1. **Update this git file:**
   ```bash
   # Edit wordpress/eislaw-privacy-report-snippet.php
   git add wordpress/eislaw-privacy-report-snippet.php
   git commit -m "PRI-006: Update privacy report page - [description]"
   git push
   ```

2. **Update WordPress database:**
   - Login to https://eislaw.org/wp-admin
   - Navigate to: Snippets > All Snippets
   - Find: "EISLAW Privacy Report Shortcode" (ID #5)
   - Click: Edit
   - Paste updated code
   - Click: Update

### Testing

Test with valid tokens:
```
# Lone level (green badge, no requirements)
https://eislaw.org/privacy-report/?token=b61a2179-47ac-421b-96a9-4b4f3e82c487

# High level (red badge, all requirements)
https://eislaw.org/privacy-report/?token=6daac0b0-203c-4d06-901b-faf433ab9993

# Invalid token (error message)
https://eislaw.org/privacy-report/?token=invalid-xyz

# Missing token (error message)
https://eislaw.org/privacy-report/
```

### Caching Issues

WordPress may cache page content. To bypass cache during testing:
```
https://eislaw.org/privacy-report/?token={ID}&nocache={timestamp}
```

## WordPress Credentials

**Location:** `~/EISLAWManagerWebApp/secrets.local.json` → `wordpress` section

| Field | Value |
|-------|-------|
| Site URL | https://eislaw.org |
| Admin URL | https://eislaw.org/wp-admin |
| Username | eislaw |

(App password stored in secrets.local.json)

## Security

- Token validation enforced by API (UUID format, 90-day expiry)
- XSS prevention via `esc_html()`, `esc_attr()` throughout
- Input sanitization via `sanitize_text_field()`
- Rate limiting handled (429 errors)
- Server-side fetch (no CORS vulnerabilities)

## Related Files

- **API Endpoint:** `backend/main.py` → `get_public_privacy_report()`
- **Frontend UI (internal):** `frontend/src/pages/Privacy/index.jsx` (lines 300-363)
- **PRD:** `docs/PRD_WORDPRESS_DYNAMIC_REPORT.md`
- **Task Doc:** `docs/TASK_MAYA_WORDPRESS_REPORT_PAGE.md`
- **Review:** `docs/JACOB_REVIEW_PRI-006.md`

## Maintenance Notes

- **Last Updated:** 2025-12-09 (Maya)
- **WordPress Version:** 6.x
- **Plugin Version:** Code Snippets 3.x
- **PHP Version:** 8.x

## Future Improvements

1. **Content per level:** CEO will provide level-specific text + videos (CEO-001)
2. **WooCommerce integration:** Checkout flow with level-specific packages (CEO-002)
3. **Caching optimization:** Configure WordPress cache to exclude `/privacy-report/`
4. **Elementor polish:** Designer will improve styling with Elementor
