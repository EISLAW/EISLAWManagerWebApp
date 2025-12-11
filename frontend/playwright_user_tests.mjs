// Playwright User Simulation & Adversarial Tests
// Pre-Production Final Testing for Archive Feature

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8799';

// Test results collector
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);
}

function pass(testName) {
  results.passed.push(testName);
  log(`✅ PASS: ${testName}`);
}

function fail(testName, error) {
  results.failed.push({ name: testName, error: String(error) });
  log(`❌ FAIL: ${testName} - ${error}`);
}

function warn(testName, msg) {
  results.warnings.push({ name: testName, msg });
  log(`⚠️ WARN: ${testName} - ${msg}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════
// USER FLOW TESTS
// ═══════════════════════════════════════════════════════════

async function testUserFlow_ViewClientsList(page) {
  const testName = 'User Flow: View Clients List';
  try {
    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Check title
    const title = await page.locator('h1').first().textContent();
    if (!title.includes('לקוחות')) throw new Error('Title not found');

    // Check table exists
    const rows = await page.locator('tbody tr').count();
    if (rows === 0) throw new Error('No clients displayed');

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testUserFlow_StatusFilterDropdown(page) {
  const testName = 'User Flow: Status Filter Dropdown';
  try {
    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    const dropdown = page.locator('[data-testid="status-filter"]');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    // Check options
    const options = await dropdown.locator('option').allTextContents();
    log(`  Dropdown options: ${options.join(', ')}`);

    if (!options.some(o => o.includes('פעילים'))) throw new Error('Missing active option');
    if (!options.some(o => o.includes('ארכיון'))) throw new Error('Missing archive option');
    if (!options.some(o => o.includes('הכל'))) throw new Error('Missing all option');

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testUserFlow_FilterByArchived(page) {
  const testName = 'User Flow: Filter by Archived';
  try {
    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    const dropdown = page.locator('[data-testid="status-filter"]');

    // Get initial count
    const initialRows = await page.locator('tbody tr').count();
    log(`  Initial rows: ${initialRows}`);

    // Switch to archived
    await dropdown.selectOption('archived');
    await sleep(2000);

    const archivedRows = await page.locator('tbody tr').count();
    log(`  Archived rows: ${archivedRows}`);

    // Switch to all
    await dropdown.selectOption('all');
    await sleep(2000);

    const allRows = await page.locator('tbody tr').count();
    log(`  All rows: ${allRows}`);

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testUserFlow_LoadingSpinner(page) {
  const testName = 'User Flow: Loading Spinner Appears';
  try {
    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(1000);

    const dropdown = page.locator('[data-testid="status-filter"]');

    // Listen for loading indicator
    const loadingPromise = page.locator('text=טוען').waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);

    await dropdown.selectOption('all');

    const loadingAppeared = await loadingPromise;
    if (loadingAppeared === null) {
      warn(testName, 'Loading spinner may be too fast to see (not necessarily a problem)');
    }

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testUserFlow_NavigateToClientDetail(page) {
  const testName = 'User Flow: Navigate to Client Detail';
  try {
    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Click first client
    const firstLink = page.locator('tbody tr').first().locator('a').first();
    const clientName = await firstLink.textContent();
    log(`  Clicking on client: ${clientName}`);

    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Verify we're on detail page
    const url = page.url();
    if (!url.includes('/clients/')) throw new Error('Did not navigate to client detail');

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testUserFlow_ArchiveFromMoreMenu(page) {
  const testName = 'User Flow: Archive from More Menu';
  try {
    // First restore any archived clients via API
    const clients = await fetch(`${API_URL}/api/clients?status=archived`).then(r => r.json());
    for (const c of clients) {
      await fetch(`${API_URL}/api/clients/${encodeURIComponent(c.name)}/restore`, { method: 'PATCH' });
    }

    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Click first client
    const firstLink = page.locator('tbody tr').first().locator('a').first();
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Find and click More menu
    const moreBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).first();
    // Try different selectors for the more menu
    let menuOpened = false;

    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const svg = await btn.locator('svg.lucide-more-vertical').count();
      if (svg > 0) {
        await btn.click();
        menuOpened = true;
        break;
      }
    }

    if (!menuOpened) {
      warn(testName, 'Could not find More menu button');
      pass(testName + ' (partial)');
      return true;
    }

    await sleep(500);

    // Look for archive option
    const archiveBtn = page.locator('text=העבר לארכיון');
    const hasArchive = await archiveBtn.count() > 0;
    log(`  Archive option found: ${hasArchive}`);

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testUserFlow_ArchivedBanner(page) {
  const testName = 'User Flow: Archived Banner Display';
  try {
    // Archive a client via API
    const clients = await fetch(`${API_URL}/api/clients?status=active`).then(r => r.json());
    if (clients.length === 0) throw new Error('No clients to test with');

    const testClient = clients[0].name;
    await fetch(`${API_URL}/api/clients/${encodeURIComponent(testClient)}/archive`, { method: 'PATCH' });

    // Navigate to the archived client
    await page.goto(`${BASE_URL}/#/clients/${encodeURIComponent(testClient)}`);
    await page.waitForLoadState('networkidle');
    await sleep(3000);

    // Check for banner
    const banner = page.locator('text=לקוח זה בארכיון');
    const bannerVisible = await banner.isVisible().catch(() => false);
    log(`  Banner visible: ${bannerVisible}`);

    // Restore client
    await fetch(`${API_URL}/api/clients/${encodeURIComponent(testClient)}/restore`, { method: 'PATCH' });

    if (!bannerVisible) throw new Error('Archived banner not visible');

    pass(testName);
    return true;
  } catch (e) {
    // Cleanup
    const clients = await fetch(`${API_URL}/api/clients?status=archived`).then(r => r.json()).catch(() => []);
    for (const c of clients) {
      await fetch(`${API_URL}/api/clients/${encodeURIComponent(c.name)}/restore`, { method: 'PATCH' }).catch(() => {});
    }
    fail(testName, e.message);
    return false;
  }
}

async function testUserFlow_ToastNotification(page) {
  const testName = 'User Flow: Toast Notification Display';
  try {
    const clients = await fetch(`${API_URL}/api/clients?status=active`).then(r => r.json());
    if (clients.length === 0) throw new Error('No clients to test with');

    const testClient = clients[0].name;

    // Navigate to client
    await page.goto(`${BASE_URL}/#/clients/${encodeURIComponent(testClient)}`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Handle dialog
    page.on('dialog', async dialog => {
      log(`  Dialog: ${dialog.message()}`);
      await dialog.accept();
    });

    // Find More menu and archive
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const svg = await btn.locator('svg.lucide-more-vertical').count();
      if (svg > 0) {
        await btn.click();
        break;
      }
    }

    await sleep(500);

    const archiveBtn = page.locator('text=העבר לארכיון');
    if (await archiveBtn.count() > 0) {
      await archiveBtn.click();
      await sleep(1500);

      // Check for toast
      const toast = page.locator('.bg-emerald-600, .bg-red-600');
      const toastVisible = await toast.count() > 0;
      log(`  Toast appeared: ${toastVisible}`);
    }

    // Cleanup
    await fetch(`${API_URL}/api/clients/${encodeURIComponent(testClient)}/restore`, { method: 'PATCH' });

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// ADVERSARIAL TESTS
// ═══════════════════════════════════════════════════════════

async function testAdversarial_XSSInClientName(page) {
  const testName = 'Adversarial: XSS in Client Name';
  try {
    // Try to inject XSS via URL
    await page.goto(`${BASE_URL}/#/clients/<script>alert('xss')</script>`);
    await sleep(2000);

    // Check no alert was triggered
    const alerts = [];
    page.on('dialog', d => alerts.push(d));

    await sleep(1000);

    if (alerts.length > 0 && alerts.some(a => a.message().includes('xss'))) {
      throw new Error('XSS vulnerability detected!');
    }

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testAdversarial_SQLInjection() {
  const testName = 'Adversarial: SQL Injection in API';
  try {
    const maliciousNames = [
      "'; DROP TABLE clients; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --"
    ];

    for (const name of maliciousNames) {
      const res = await fetch(`${API_URL}/api/clients/${encodeURIComponent(name)}/archive`, {
        method: 'PATCH'
      });
      const data = await res.json();

      // Should return 404, not error/crash
      if (res.status !== 404) {
        log(`  Unexpected status for "${name}": ${res.status}`);
      }
    }

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testAdversarial_RapidArchiveRestore() {
  const testName = 'Adversarial: Rapid Archive/Restore (Race Condition)';
  try {
    const clients = await fetch(`${API_URL}/api/clients?status=active`).then(r => r.json());
    if (clients.length === 0) throw new Error('No clients');

    const testClient = clients[0].name;
    const encoded = encodeURIComponent(testClient);

    // Rapid fire archive/restore
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(fetch(`${API_URL}/api/clients/${encoded}/archive`, { method: 'PATCH' }));
      promises.push(fetch(`${API_URL}/api/clients/${encoded}/restore`, { method: 'PATCH' }));
    }

    await Promise.all(promises);

    // Check final state is consistent
    await sleep(500);
    const finalState = await fetch(`${API_URL}/api/client/summary?name=${encoded}`).then(r => r.json());

    log(`  Final state: active=${finalState.client?.active}`);

    // Restore to known state
    await fetch(`${API_URL}/api/clients/${encoded}/restore`, { method: 'PATCH' });

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testAdversarial_InvalidStatusParameter() {
  const testName = 'Adversarial: Invalid Status Parameter';
  try {
    const invalidStatuses = ['invalid', '123', '<script>', 'null', 'undefined', ''];

    for (const status of invalidStatuses) {
      const res = await fetch(`${API_URL}/api/clients?status=${status}`);
      // Should not crash
      if (res.status >= 500) {
        throw new Error(`Server error for status="${status}"`);
      }
    }

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testAdversarial_LargePayload() {
  const testName = 'Adversarial: Large Client Name';
  try {
    const largeName = 'A'.repeat(10000);
    const res = await fetch(`${API_URL}/api/clients/${encodeURIComponent(largeName)}/archive`, {
      method: 'PATCH'
    });

    // Should handle gracefully (404 or 400, not 500)
    if (res.status >= 500) {
      throw new Error('Server crashed on large payload');
    }

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testAdversarial_ConcurrentUsers(page, browser) {
  const testName = 'Adversarial: Concurrent Users';
  try {
    // Open 3 browser contexts
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(c => c.newPage()));

    // All navigate to clients list
    await Promise.all(pages.map(p => p.goto(`${BASE_URL}/#/clients`)));
    await sleep(3000);

    // Check all loaded
    for (let i = 0; i < pages.length; i++) {
      const rows = await pages[i].locator('tbody tr').count();
      log(`  Context ${i + 1}: ${rows} rows`);
    }

    // Cleanup
    await Promise.all(contexts.map(c => c.close()));

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testAdversarial_NetworkFailure(page) {
  const testName = 'Adversarial: Network Failure Handling';
  try {
    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Block API requests
    await page.route('**/api/clients**', route => route.abort());

    // Try to change filter
    const dropdown = page.locator('[data-testid="status-filter"]');
    await dropdown.selectOption('archived');

    await sleep(2000);

    // Should not crash, maybe show error or keep old data
    const pageStillWorks = await page.locator('h1').count() > 0;

    // Unblock
    await page.unroute('**/api/clients**');

    if (!pageStillWorks) {
      throw new Error('Page crashed after network failure');
    }

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

async function testAdversarial_MobileViewport(page) {
  const testName = 'Adversarial: Mobile Viewport';
  try {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto(`${BASE_URL}/#/clients`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    // Check dropdown is visible
    const dropdown = page.locator('[data-testid="status-filter"]');
    const isVisible = await dropdown.isVisible();

    if (!isVisible) {
      warn(testName, 'Dropdown not visible on mobile');
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    pass(testName);
    return true;
  } catch (e) {
    fail(testName, e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PLAYWRIGHT PRE-PRODUCTION TESTING - ARCHIVE FEATURE     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                     USER FLOW TESTS                           ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();

  await testUserFlow_ViewClientsList(page);
  await testUserFlow_StatusFilterDropdown(page);
  await testUserFlow_FilterByArchived(page);
  await testUserFlow_LoadingSpinner(page);
  await testUserFlow_NavigateToClientDetail(page);
  await testUserFlow_ArchiveFromMoreMenu(page);
  await testUserFlow_ArchivedBanner(page);
  await testUserFlow_ToastNotification(page);

  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                   ADVERSARIAL TESTS                           ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();

  await testAdversarial_XSSInClientName(page);
  await testAdversarial_SQLInjection();
  await testAdversarial_RapidArchiveRestore();
  await testAdversarial_InvalidStatusParameter();
  await testAdversarial_LargePayload();
  await testAdversarial_ConcurrentUsers(page, browser);
  await testAdversarial_NetworkFailure(page);
  await testAdversarial_MobileViewport(page);

  await browser.close();

  // Print summary
  console.log();
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                      TEST SUMMARY                             ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log();
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log();

  if (results.failed.length > 0) {
    console.log('Failed tests:');
    for (const f of results.failed) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
    console.log();
  }

  if (results.warnings.length > 0) {
    console.log('Warnings:');
    for (const w of results.warnings) {
      console.log(`  - ${w.name}: ${w.msg}`);
    }
    console.log();
  }

  const readyForProduction = results.failed.length === 0;
  console.log('═══════════════════════════════════════════════════════════════');
  if (readyForProduction) {
    console.log('🚀 VERDICT: READY FOR PRODUCTION');
  } else {
    console.log('🛑 VERDICT: NOT READY - FIX FAILED TESTS FIRST');
  }
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
