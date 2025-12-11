# Audit Instructions: David (Product Senior)

**Project:** EISLAW System Audit
**Role:** Product Reviewer
**Date:** 2025-12-05
**Report To:** CTO

---

## Your Mission

You are conducting a **brutal, adversarial product review** of the EISLAW system. Your job is to determine: Does every feature serve a real user need? Is every button necessary? Are there features missing? Are there features that should be removed?

**Philosophy:** Features that don't get used are worse than missing features - they add complexity and confusion. Be ruthless.

---

## System Access

| Resource | URL |
|----------|-----|
| Frontend (Dev) | http://20.217.86.4:5173 |
| API Docs | http://20.217.86.4:8799/docs |

---

## User Personas

### Persona 1: Legal Secretary (Primary)
**Name:** רונית
**Goal:** Manage client information efficiently
**Daily tasks:**
- Find client info quickly
- Check client emails
- Track tasks and follow-ups
- Archive old clients

### Persona 2: Privacy Consultant
**Name:** יעל
**Goal:** Review privacy assessments, validate algorithm
**Daily tasks:**
- Review new submissions
- Validate scoring accuracy
- Override when algorithm wrong
- Send reports to clients

### Persona 3: Knowledge Analyst
**Name:** אורי
**Goal:** Extract insights from meetings
**Daily tasks:**
- Review new recordings
- Edit transcripts
- Publish to knowledge base
- Search for information

---

## Review Methodology

### Step 1: User Journey Mapping (1 hour)
Walk through each persona's daily workflow. Note every friction point.

### Step 2: Feature Inventory (2 hours)
List EVERY feature. For each one:
- Who uses it?
- How often?
- Is it actually needed?

### Step 3: Flow Testing with Playwright (2 hours)
Automate critical user flows. Find what breaks.

### Step 4: Gap Analysis (1 hour)
What's missing? What's over-engineered?

---

## Playwright Setup

```bash
cd /path/to/frontend
npm install @playwright/test
npx playwright install chromium
mkdir -p audit-tests
mkdir -p audit-screenshots
```

### Test File: `audit-tests/product-audit.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://20.217.86.4:5173';
const API_URL = 'http://20.217.86.4:8799';

test.describe('Product Audit - David', () => {

  // ============================================
  // USER JOURNEY: Legal Secretary (רונית)
  // ============================================
  test.describe('Journey: Legal Secretary', () => {

    test('J1: Find client by name', async ({ page }) => {
      console.log('=== Journey: Find Client ===');

      // Step 1: Go to clients
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');
      console.log('✓ Clients page loaded');

      // Step 2: Search for client
      const searchInput = page.locator('input').first();
      await searchInput.fill('סיון');
      await page.waitForTimeout(500);
      console.log('✓ Typed search term');

      // Step 3: Verify results filtered
      await page.screenshot({ path: 'audit-screenshots/journey-find-client.png' });

      // Step 4: Click on result
      const firstRow = page.locator('table tbody tr, [data-testid*="client-row"]').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();
        console.log('✓ Clicked on client row');
      }

      await page.waitForLoadState('networkidle');
      console.log('Journey complete');
    });

    test('J2: Check client emails', async ({ page }) => {
      console.log('=== Journey: Check Emails ===');

      // Navigate to specific client
      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      // Find and click emails tab
      const emailsTab = page.locator('text=אימיילים, text=Emails, [data-testid*="emails"]').first();
      if (await emailsTab.isVisible()) {
        await emailsTab.click();
        await page.waitForTimeout(1000);
        console.log('✓ Clicked emails tab');
      } else {
        console.log('✗ Emails tab not found');
      }

      await page.screenshot({ path: 'audit-screenshots/journey-check-emails.png', fullPage: true });

      // Check if emails loaded
      const emailRows = page.locator('[data-testid*="email"], .email-row, table tbody tr');
      const count = await emailRows.count();
      console.log(`Found ${count} email rows`);
    });

    test('J3: Create a task for client', async ({ page }) => {
      console.log('=== Journey: Create Task ===');

      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      // Find tasks tab
      const tasksTab = page.locator('text=משימות, text=Tasks, [data-testid*="tasks"]').first();
      if (await tasksTab.isVisible()) {
        await tasksTab.click();
        await page.waitForTimeout(500);
        console.log('✓ Clicked tasks tab');
      }

      await page.screenshot({ path: 'audit-screenshots/journey-create-task-1.png', fullPage: true });

      // Find add task input or button
      const addTaskInput = page.locator('input[placeholder*="משימה"], input[placeholder*="task"], [data-testid*="new-task"]').first();
      if (await addTaskInput.isVisible()) {
        await addTaskInput.fill('Test task from audit');
        console.log('✓ Filled task input');

        // Find submit button
        const submitBtn = page.locator('button:has-text("צור"), button:has-text("Create"), button:has-text("הוסף")').first();
        if (await submitBtn.isVisible()) {
          // Don't actually click - just verify it exists
          console.log('✓ Submit button found');
        }
      } else {
        console.log('✗ Add task input not found');
      }

      await page.screenshot({ path: 'audit-screenshots/journey-create-task-2.png', fullPage: true });
    });

    test('J4: Archive a client', async ({ page }) => {
      console.log('=== Journey: Archive Client ===');

      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      // Find archive button
      const archiveBtn = page.locator('button:has-text("ארכיון"), button:has-text("Archive"), [data-testid*="archive"]').first();

      if (await archiveBtn.isVisible()) {
        console.log('✓ Archive button found');
        await page.screenshot({ path: 'audit-screenshots/journey-archive.png' });
        // Don't click - just verify it exists
      } else {
        console.log('✗ Archive button not found');
      }
    });
  });

  // ============================================
  // USER JOURNEY: Privacy Consultant (יעל)
  // ============================================
  test.describe('Journey: Privacy Consultant', () => {

    test('J5: Review new submission', async ({ page }) => {
      console.log('=== Journey: Review Privacy Submission ===');

      await page.goto(`${BASE_URL}/#/privacy`);
      await page.waitForLoadState('networkidle');
      console.log('✓ Privacy page loaded');

      await page.screenshot({ path: 'audit-screenshots/journey-privacy-list.png', fullPage: true });

      // Click on first submission
      const firstSubmission = page.locator('[data-testid*="submission"], .submission-row, table tbody tr').first();
      if (await firstSubmission.isVisible()) {
        await firstSubmission.click();
        await page.waitForTimeout(500);
        console.log('✓ Clicked on submission');
      }

      await page.screenshot({ path: 'audit-screenshots/journey-privacy-detail.png', fullPage: true });

      // Check if score is visible
      const scoreElement = page.locator('[data-testid*="score"], .score, .level').first();
      if (await scoreElement.isVisible()) {
        const score = await scoreElement.textContent();
        console.log(`✓ Score visible: ${score}`);
      } else {
        console.log('✗ Score not visible');
      }
    });

    test('J6: Validate submission (click נכון)', async ({ page }) => {
      console.log('=== Journey: Validate Submission ===');

      await page.goto(`${BASE_URL}/#/privacy`);
      await page.click('[data-testid*="submission"], .submission-row, table tbody tr >> nth=0');
      await page.waitForTimeout(500);

      // Look for validation button
      const validateBtn = page.locator('button:has-text("נכון"), button:has-text("Correct"), [data-testid*="validate"]').first();

      if (await validateBtn.isVisible()) {
        console.log('✓ Validate button found');
      } else {
        console.log('✗ Validate button NOT found - this is a gap');
      }

      await page.screenshot({ path: 'audit-screenshots/journey-validate.png', fullPage: true });
    });

    test('J7: Override submission', async ({ page }) => {
      console.log('=== Journey: Override Submission ===');

      await page.goto(`${BASE_URL}/#/privacy`);
      await page.click('[data-testid*="submission"], .submission-row, table tbody tr >> nth=0');
      await page.waitForTimeout(500);

      // Look for override controls
      const overrideSection = page.locator('[data-testid*="override"], .override, text=תקן, text=Override').first();

      if (await overrideSection.isVisible()) {
        console.log('✓ Override section found');
      } else {
        console.log('? Override section not immediately visible (might be collapsed)');
      }

      await page.screenshot({ path: 'audit-screenshots/journey-override.png', fullPage: true });
    });
  });

  // ============================================
  // USER JOURNEY: Knowledge Analyst (אורי)
  // ============================================
  test.describe('Journey: Knowledge Analyst', () => {

    test('J8: Review new recording', async ({ page }) => {
      console.log('=== Journey: Review Recording ===');

      await page.goto(`${BASE_URL}/#/rag`);
      await page.waitForLoadState('networkidle');
      console.log('✓ RAG page loaded');

      await page.screenshot({ path: 'audit-screenshots/journey-rag-inbox.png', fullPage: true });

      // Look for recordings list
      const recordings = page.locator('[data-testid*="recording"], .recording-row, table tbody tr');
      const count = await recordings.count();
      console.log(`Found ${count} recordings`);

      if (count > 0) {
        await recordings.first().click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'audit-screenshots/journey-rag-detail.png', fullPage: true });
      }
    });

    test('J9: Edit transcript speaker', async ({ page }) => {
      console.log('=== Journey: Edit Speaker ===');

      await page.goto(`${BASE_URL}/#/rag`);
      await page.waitForLoadState('networkidle');

      // This requires finding a specific recording with transcript
      // Just document what exists
      const editControls = page.locator('[data-testid*="edit"], button:has-text("ערוך"), .edit-speaker');
      const count = await editControls.count();
      console.log(`Found ${count} edit controls`);

      await page.screenshot({ path: 'audit-screenshots/journey-edit-speaker.png', fullPage: true });
    });
  });

  // ============================================
  // FEATURE INVENTORY
  // ============================================
  test.describe('Feature Inventory', () => {

    test('Clients List Features', async ({ page }) => {
      console.log('=== Feature Inventory: Clients List ===');

      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');

      // Count all interactive elements
      const buttons = await page.locator('button').count();
      const inputs = await page.locator('input').count();
      const links = await page.locator('a').count();
      const selects = await page.locator('select, [role="listbox"]').count();

      console.log(`Buttons: ${buttons}`);
      console.log(`Inputs: ${inputs}`);
      console.log(`Links: ${links}`);
      console.log(`Selects: ${selects}`);

      // List all button texts
      const buttonTexts = await page.locator('button').allTextContents();
      console.log('Button labels:', buttonTexts);
    });

    test('Client Detail Features', async ({ page }) => {
      console.log('=== Feature Inventory: Client Detail ===');

      await page.goto(`${BASE_URL}/#/clients`);
      await page.click('table tbody tr:first-child');
      await page.waitForLoadState('networkidle');

      const buttons = await page.locator('button').allTextContents();
      console.log('All buttons on client detail:', buttons);

      // Count tabs
      const tabs = page.locator('[role="tab"], nav a, .tab');
      const tabCount = await tabs.count();
      const tabLabels = await tabs.allTextContents();
      console.log(`Tabs (${tabCount}):`, tabLabels);
    });

    test('API Endpoints in Use', async ({ request }) => {
      console.log('=== API Feature Inventory ===');

      const endpoints = [
        '/api/clients',
        '/api/tasks',
        '/api/privacy/submissions',
        '/api/privacy/stats',
        '/api/rag/inbox',
        '/health'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await request.get(`${API_URL}${endpoint}`);
          console.log(`${endpoint}: ${response.status()}`);
        } catch (e) {
          console.log(`${endpoint}: ERROR - ${e.message}`);
        }
      }
    });
  });

});
```

### Run Tests

```bash
npx playwright test audit-tests/product-audit.spec.js --reporter=html
npx playwright show-report
```

---

## Checklists to Complete

### B1. User Journey Assessment

**Journey: Find Client (רונית)**
| Step | Time Taken | Friction | Notes |
|------|------------|----------|-------|
| Open clients page | | | |
| Type search | | | |
| Find result | | | |
| Click to open | | | |

**Friction Score (1-5, 1=smooth, 5=painful):** ___

---

**Journey: Check Emails (רונית)**
| Step | Time Taken | Friction | Notes |
|------|------------|----------|-------|
| Open client | | | |
| Find emails tab | | | |
| View email list | | | |
| Read email content | | | |

**Friction Score:** ___

---

**Journey: Create Task (רונית)**
| Step | Time Taken | Friction | Notes |
|------|------------|----------|-------|
| Navigate to tasks | | | |
| Find add form | | | |
| Enter task | | | |
| Save task | | | |

**Friction Score:** ___

---

**Journey: Review Privacy (יעל)**
| Step | Time Taken | Friction | Notes |
|------|------------|----------|-------|
| Open privacy page | | | |
| Select submission | | | |
| View score | | | |
| Validate or override | | | |

**Friction Score:** ___

---

**Journey: Edit Transcript (אורי)**
| Step | Time Taken | Friction | Notes |
|------|------------|----------|-------|
| Open RAG page | | | |
| Select recording | | | |
| Edit speaker | | | |
| Save changes | | | |

**Friction Score:** ___

---

### B2. Feature Inventory

**Clients Module:**
| Feature | Who Uses | Frequency | Necessary? | Notes |
|---------|----------|-----------|------------|-------|
| Client list | | | YES/NO/MAYBE | |
| Client search | | | | |
| Status filter | | | | |
| Client detail view | | | | |
| Overview tab | | | | |
| Files tab | | | | |
| Emails tab | | | | |
| Tasks tab | | | | |
| RAG tab | | | | |
| Privacy tab | | | | |
| Contact editing | | | | |
| SharePoint link | | | | |
| Airtable sync | | | | |
| Archive/restore | | | | |
| Quote generation | | | | |

**Privacy Module:**
| Feature | Who Uses | Frequency | Necessary? | Notes |
|---------|----------|-----------|------------|-------|
| Submission list | | | | |
| Detail view | | | | |
| Score display | | | | |
| Override controls | | | | |
| Email preview | | | | |
| Send email | | | | |
| Publish report | | | | |
| Metrics | | | | |

**RAG Module:**
| Feature | Who Uses | Frequency | Necessary? | Notes |
|---------|----------|-----------|------------|-------|
| Zoom recordings | | | | |
| Upload audio | | | | |
| Transcript view | | | | |
| Speaker editing | | | | |
| Publish | | | | |
| Library search | | | | |

**AI Studio Module:**
| Feature | Who Uses | Frequency | Necessary? | Notes |
|---------|----------|-----------|------------|-------|
| Chat interface | | | | |
| Agent Mode toggle | | | | |
| get_system_summary tool | | | | |
| search_clients tool | | | | |
| get_client_details tool | | | | |
| search_tasks tool | | | | |
| create_task tool | | | | |
| update_task tool | | | | |
| Tool execution display | | | | |

---

### B2.5 AI Studio User Journey

**Journey: Ask system question (Agent Mode)**
| Step | Time Taken | Friction | Notes |
|------|------------|----------|-------|
| Open AI Studio | | | |
| Enable Agent Mode | | | |
| Type question | | | |
| View response | | | |
| See tool execution | | | |

**Friction Score (1-5):** ___

**Test queries to try:**
1. "How many clients do we have?"
2. "Find client Sivan"
3. "Create a task to call David tomorrow"
4. "Mark that task as done"
5. "What tasks are pending?"

---

### B3. Gap Analysis

**Missing Features (should exist but don't):**
| Feature | Who Needs | Why Needed | Priority |
|---------|-----------|------------|----------|
| | | | |
| | | | |

**Over-engineered Features (too complex):**
| Feature | Current | Actually Needed | Simplification |
|---------|---------|-----------------|----------------|
| | | | |
| | | | |

**Duplicate Features:**
| Feature A | Feature B | Keep Which | Notes |
|-----------|-----------|------------|-------|
| | | | |

---

### B4. Debris List

Features that serve no current user need:

| Feature | Location | Original Purpose | Current Use | Recommendation |
|---------|----------|------------------|-------------|----------------|
| | | | None | REMOVE |
| | | | | |
| | | | | |

---

### B5. Critical Issues

| # | Issue | Impact | Recommendation | Priority |
|---|-------|--------|----------------|----------|
| 1 | | | | P0/P1/P2 |
| 2 | | | | |
| 3 | | | | |

---

## Where to Update Results

**Update your findings in:**
```
docs/AUDIT_RESULTS_DAVID_PRODUCT.md
```

**Format:**
1. Copy this entire document
2. Fill in all tables with your findings
3. Score each user journey (1-5 friction)
4. List debris and unnecessary features
5. List critical issues

**When complete, notify CTO.**

---

**Be the user's advocate. Question every feature. Find the bloat.**
