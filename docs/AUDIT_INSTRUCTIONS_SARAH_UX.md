# Audit Instructions: Sarah (UX/UI Senior)

**Project:** EISLAW System Audit
**Role:** UX/UI Reviewer
**Date:** 2025-12-05
**Report To:** CTO

---

## Your Mission

You are conducting a **brutal, adversarial UX/UI review** of the EISLAW system. Assume nothing is correct. Test everything. Find every visual inconsistency, usability problem, and accessibility failure.

**Philosophy:** If it looks wrong, it IS wrong. If it's confusing, flag it. If it seems unnecessary, question it.

---

## System Access

| Resource | URL |
|----------|-----|
| Frontend (Dev) | http://20.217.86.4:5173 |
| API Docs | http://20.217.86.4:8799/docs |

**Test on:** Chrome (primary), Firefox (secondary)

---

## Scope

You are reviewing these pages:

| Page | URL | Priority |
|------|-----|----------|
| Clients List | `/#/clients` | CRITICAL |
| Client Overview | `/#/clients/{name}` | CRITICAL |
| Privacy | `/#/privacy` | HIGH |
| RAG | `/#/rag` | HIGH |
| AI Studio | `/#/ai-studio` | HIGH |
| Settings - Quotes | `/#/settings/quotes` | MEDIUM |
| Navigation/Shell | All pages | HIGH |

---

## Review Methodology

### Step 1: Visual Scan (30 min per page)
Open each page. Before interacting, just LOOK:
- Is the layout balanced?
- Are colors consistent?
- Is spacing uniform?
- Is text readable?
- Is RTL correct (Hebrew flows right-to-left)?

### Step 2: Interaction Test (45 min per page)
Click EVERY button. Fill EVERY form. Test:
- Hover states
- Focus states
- Active states
- Disabled states
- Error states
- Loading states
- Empty states

### Step 3: Playwright Automation
Run automated tests to catch what manual testing misses.

---

## Playwright Setup

```bash
# On your machine or VM
cd /path/to/frontend
npm install @playwright/test
npx playwright install chromium

# Create test file
mkdir -p audit-tests
```

### Test File: `audit-tests/ux-audit.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://20.217.86.4:5173';

test.describe('UX/UI Audit - Sarah', () => {

  // ============================================
  // CLIENTS LIST PAGE
  // ============================================
  test.describe('Clients List', () => {

    test('page loads without errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');

      // Check no console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.screenshot({ path: 'audit-screenshots/clients-list.png', fullPage: true });
      expect(errors).toHaveLength(0);
    });

    test('search input is visible and has Hebrew placeholder', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      const searchInput = page.locator('input[type="text"], input[type="search"]').first();
      await expect(searchInput).toBeVisible();

      const placeholder = await searchInput.getAttribute('placeholder');
      console.log('Search placeholder:', placeholder);
      // Should contain Hebrew
    });

    test('filter dropdown works', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      const dropdown = page.locator('select, [role="listbox"], [data-testid*="filter"]').first();

      if (await dropdown.isVisible()) {
        await dropdown.click();
        await page.screenshot({ path: 'audit-screenshots/clients-filter-open.png' });
      }
    });

    test('client rows have consistent styling', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForSelector('table tbody tr, [data-testid*="client-row"], .client-row');

      const rows = page.locator('table tbody tr, [data-testid*="client-row"], .client-row');
      const count = await rows.count();
      console.log(`Found ${count} client rows`);

      // Check first 5 rows for consistent height
      for (let i = 0; i < Math.min(5, count); i++) {
        const box = await rows.nth(i).boundingBox();
        console.log(`Row ${i} height: ${box?.height}px`);
      }
    });

    test('clicking row navigates to client', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForSelector('table tbody tr, [data-testid*="client-row"]');

      await page.click('table tbody tr:first-child, [data-testid*="client-row"]:first-child');
      await page.waitForLoadState('networkidle');

      // Should be on client detail page
      expect(page.url()).toContain('/clients/');
      await page.screenshot({ path: 'audit-screenshots/client-detail.png', fullPage: true });
    });
  });

  // ============================================
  // CLIENT OVERVIEW PAGE
  // ============================================
  test.describe('Client Overview', () => {

    test('header has client name', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child, [data-testid*="client-row"]:first-child');
      await page.waitForLoadState('networkidle');

      // Look for header with client name
      const header = page.locator('h1, h2, [data-testid*="client-name"]').first();
      const name = await header.textContent();
      console.log('Client name in header:', name);
      expect(name).toBeTruthy();
    });

    test('tabs are visible and clickable', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      // Find all tabs
      const tabs = page.locator('[role="tab"], nav a, .tab, [data-testid*="tab"]');
      const count = await tabs.count();
      console.log(`Found ${count} tabs`);

      // List all tab labels
      for (let i = 0; i < count; i++) {
        const label = await tabs.nth(i).textContent();
        console.log(`Tab ${i}: ${label}`);
      }

      // Screenshot each tab
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(500);
        const label = await tabs.nth(i).textContent();
        await page.screenshot({
          path: `audit-screenshots/client-tab-${i}-${label?.trim()}.png`,
          fullPage: true
        });
      }
    });

    test('all buttons have Hebrew labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button');
      const count = await buttons.count();

      const englishButtons = [];
      for (let i = 0; i < count; i++) {
        const text = await buttons.nth(i).textContent();
        // Check if text is English (basic check)
        if (text && /^[a-zA-Z\s]+$/.test(text.trim()) && text.trim().length > 2) {
          englishButtons.push(text.trim());
        }
      }

      console.log('English buttons found:', englishButtons);
      // Report but don't fail - this is for auditing
    });

    test('button inventory', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button');
      const count = await buttons.count();

      console.log('=== BUTTON INVENTORY ===');
      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const text = await btn.textContent();
        const visible = await btn.isVisible();
        const enabled = await btn.isEnabled();
        console.log(`Button ${i}: "${text?.trim()}" | visible: ${visible} | enabled: ${enabled}`);
      }
    });
  });

  // ============================================
  // PRIVACY PAGE
  // ============================================
  test.describe('Privacy Page', () => {

    test('page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/privacy`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'audit-screenshots/privacy-page.png', fullPage: true });
    });

    test('RTL layout check', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/privacy`);
      await page.waitForLoadState('networkidle');

      // Check if dir="rtl" is set
      const html = page.locator('html');
      const dir = await html.getAttribute('dir');
      console.log('HTML dir attribute:', dir);

      // Check main container
      const main = page.locator('main, [data-testid*="privacy"], .privacy-container').first();
      const mainDir = await main.evaluate(el => getComputedStyle(el).direction);
      console.log('Main container direction:', mainDir);
    });

    test('two-panel layout exists', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/privacy`);
      await page.waitForLoadState('networkidle');

      // Look for side-by-side panels
      const panels = page.locator('.grid > div, .flex > div, [data-testid*="panel"]');
      const count = await panels.count();
      console.log(`Found ${count} potential panels`);
    });
  });

  // ============================================
  // RAG PAGE
  // ============================================
  test.describe('RAG Page', () => {

    test('page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/rag`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'audit-screenshots/rag-page.png', fullPage: true });
    });

    test('tabs or sections exist', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/rag`);
      const tabs = page.locator('[role="tab"], .tab, [data-testid*="tab"]');
      const count = await tabs.count();
      console.log(`RAG tabs found: ${count}`);
    });
  });

  // ============================================
  // SETTINGS - QUOTES
  // ============================================
  test.describe('Settings - Quotes', () => {

    test('page loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/settings/quotes`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'audit-screenshots/settings-quotes.png', fullPage: true });
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================
  test.describe('Accessibility', () => {

    test('focus is visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);

      // Tab through elements and check focus visibility
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.screenshot({ path: `audit-screenshots/focus-${i}.png` });
      }
    });

    test('buttons have minimum touch target', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button');
      const count = await buttons.count();

      const smallButtons = [];
      for (let i = 0; i < count; i++) {
        const box = await buttons.nth(i).boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          const text = await buttons.nth(i).textContent();
          smallButtons.push({ text: text?.trim(), width: box.width, height: box.height });
        }
      }

      console.log('Buttons smaller than 44px:', smallButtons);
    });
  });

});
```

### Run Tests

```bash
# Create screenshots directory
mkdir -p audit-screenshots

# Run all tests
npx playwright test audit-tests/ux-audit.spec.js --reporter=html

# View report
npx playwright show-report
```

---

## Checklist to Complete

### A1. Global Design System

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| Colors match design tokens | | |
| Typography consistent | | |
| Spacing uses 4px/8px grid | | |
| RTL layout correct | | |
| Border radius consistent | | |
| Shadows consistent | | |

### A2. Clients List Page

| Element | Pass/Fail | Issue Description |
|---------|-----------|-------------------|
| Page title Hebrew | | |
| Search input placeholder Hebrew | | |
| Filter dropdown Hebrew labels | | |
| Client rows consistent height | | |
| Status badges clear | | |
| Empty state helpful | | |
| Loading state exists | | |
| Hover state visible | | |

### A3. Client Overview Page

**Header:**
| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| Client name prominent | | |
| Primary actions clear (2-3 max) | | |
| Secondary actions in menu | | |

**Button Inventory (list ALL buttons):**
| Button Label | Location | Necessary? | Issue |
|--------------|----------|------------|-------|
| | | | |
| | | | |
| | | | |
| | | | |

**Tabs:**
| Tab | Label Hebrew? | Content Loads? | Useful? |
|-----|---------------|----------------|---------|
| Overview | | | |
| Files | | | |
| Emails | | | |
| Tasks | | | |
| RAG | | | |
| Privacy | | | |

### A4. Privacy Page

| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| RTL layout correct | | |
| List panel position correct | | |
| Detail panel position correct | | |
| All labels Hebrew | | |
| Score display clear | | |
| Override controls usable | | |

### A5. RAG Page

| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| Inbox loads | | |
| Filter buttons work | | |
| Transcript viewer works | | |
| Speaker editing works | | |

### A6. Settings - Quotes

| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| Categories list | | |
| Templates list | | |
| Add/Edit/Delete work | | |
| Preview modal | | |

### A6.5 AI Studio (`/#/ai-studio`)

**Layout & Design:**
| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| Page layout clear | | |
| Chat area readable | | |
| Input field prominent | | |
| Send button visible | | |
| RTL support correct | | |

**Agent Mode Toggle:**
| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| Toggle button visible | | |
| Toggle state clear (on/off) | | |
| Label in Hebrew | | |
| Mode indicator in chat | | |

**Chat Interface:**
| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| User messages styled | | |
| AI responses styled | | |
| Tool executions displayed | | |
| Loading state shown | | |
| Error messages clear | | |

**Tool Display (Agent Mode):**
| Element | Pass/Fail | Issue |
|---------|-----------|-------|
| Tool name shown | | |
| Tool parameters visible | | |
| Tool result displayed | | |
| Visual distinction from text | | |

### A7. Accessibility

| Check | Pass/Fail | Issue |
|-------|-----------|-------|
| Keyboard navigation works | | |
| Focus visible | | |
| All buttons ≥44px | | |
| ARIA labels present | | |
| Color contrast sufficient | | |

---

## Debris List

List ALL elements that seem unnecessary, legacy, or confusing:

| Location | Element | Why Unnecessary | Recommendation |
|----------|---------|-----------------|----------------|
| | | | |
| | | | |
| | | | |
| | | | |
| | | | |

---

## Critical Issues Found

List issues that MUST be fixed:

| # | Location | Issue | Severity | Screenshot |
|---|----------|-------|----------|------------|
| 1 | | | CRITICAL/HIGH/MEDIUM/LOW | |
| 2 | | | | |
| 3 | | | | |

---

## Where to Update Results

**Update your findings in:**
```
docs/AUDIT_RESULTS_SARAH_UX.md
```

**Format:**
1. Copy this entire document
2. Fill in all tables
3. Add screenshots to `audit-screenshots/` folder
4. List all issues found
5. List all debris/unnecessary elements

**When complete, notify CTO.**

---

## Questions?

If you encounter blockers or need clarification:
1. Document the blocker
2. Continue with other sections
3. Note questions at end of report

---

**Good luck. Be brutal. Find everything.**
