import { test, expect } from "@playwright/test";

test.describe("CTO Test - Client Tasks Tab", () => {

  test("1. Navigate to Clients and open client detail", async ({ page }) => {
    await page.goto("http://localhost:5173/clients");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "tests/client-tasks-1-list.png", fullPage: true });

    // Look for client names - try clicking on "סיון בנימיני" (has UX task)
    const sivanClient = page.getByText("סיון בנימיני");
    if (await sivanClient.count() > 0) {
      console.log("Found Sivan client - clicking");
      await sivanClient.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/client-tasks-2-detail.png", fullPage: true });
    } else {
      // Try any client
      const anyClient = page.locator("a, [role='link'], .cursor-pointer").filter({ hasText: /לקוח|client/i }).first();
      if (await anyClient.count() > 0) {
        await anyClient.click();
        await page.waitForTimeout(2000);
      }
      console.log("Sivan not found, tried another client");
    }
  });

  test("2. Click on Tasks tab in client detail", async ({ page }) => {
    await page.goto("http://localhost:5173/clients");
    await page.waitForTimeout(2000);

    // Click on Sivan client
    const sivanClient = page.getByText("סיון בנימיני");
    if (await sivanClient.count() > 0) {
      await sivanClient.first().click();
      await page.waitForTimeout(2000);
    }

    // Look for Tasks tab - Hebrew: משימות
    const tasksTab = page.getByText("משימות", { exact: false });
    console.log("Tasks tabs found:", await tasksTab.count());

    if (await tasksTab.count() > 0) {
      await tasksTab.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/client-tasks-3-tab.png", fullPage: true });

      // Check what's on the page
      const pageText = await page.textContent("body");
      console.log("Page has 'בדיקת UX':", pageText?.includes("בדיקת UX"));
      console.log("Page has 'לביצוע':", pageText?.includes("לביצוע"));
      console.log("Page has 'בתהליך':", pageText?.includes("בתהליך"));
    } else {
      console.log("Tasks tab not found");
      // List all tabs
      const tabs = await page.locator("[role='tab'], button").allTextContents();
      console.log("Available tabs/buttons:", tabs.slice(0, 15).join(" | "));
    }
  });

  test("3. Find and click on UX task", async ({ page }) => {
    await page.goto("http://localhost:5173/clients");
    await page.waitForTimeout(2000);

    // Click Sivan
    const sivanClient = page.getByText("סיון בנימיני");
    if (await sivanClient.count() > 0) {
      await sivanClient.first().click();
      await page.waitForTimeout(2000);
    }

    // Click Tasks tab
    const tasksTab = page.getByText("משימות");
    if (await tasksTab.count() > 0) {
      await tasksTab.first().click();
      await page.waitForTimeout(2000);
    }

    // Now find UX task
    const uxTask = page.getByText("בדיקת UX");
    console.log("UX task found:", await uxTask.count());

    if (await uxTask.count() > 0) {
      await uxTask.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/client-tasks-4-task-open.png", fullPage: true });

      // Check for attachments section
      const attachRows = page.locator("[data-testid='tm.asset.row']");
      console.log("Attachment rows:", await attachRows.count());

      const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
      console.log("Email button visible:", await emailBtn.isVisible());

      // Check for "no assets" message
      const noAssets = page.getByText("אין נכסים משויכים עדיין");
      console.log("No assets message:", await noAssets.isVisible());
    }
  });

  test("4. Test attach email button", async ({ page }) => {
    await page.goto("http://localhost:5173/clients");
    await page.waitForTimeout(2000);

    // Navigate to Sivan > Tasks > UX Task
    const sivanClient = page.getByText("סיון בנימיני");
    if (await sivanClient.count() > 0) {
      await sivanClient.first().click();
      await page.waitForTimeout(2000);
    }

    const tasksTab = page.getByText("משימות");
    if (await tasksTab.count() > 0) {
      await tasksTab.first().click();
      await page.waitForTimeout(2000);
    }

    const uxTask = page.getByText("בדיקת UX");
    if (await uxTask.count() > 0) {
      await uxTask.first().click();
      await page.waitForTimeout(2000);
    }

    // Click email attach button
    const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
    if (await emailBtn.isVisible()) {
      console.log("Clicking email attach button");
      await emailBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "tests/client-tasks-5-email-modal.png", fullPage: true });

      // Check modal
      const modal = page.locator("[data-testid='tm.attach-email']");
      console.log("Email modal visible:", await modal.isVisible());

      // Check for emails
      const attachBtns = page.locator("[data-testid='tm.email.attach']");
      console.log("Emails available:", await attachBtns.count());

      if (await attachBtns.count() > 0) {
        // Click attach on first email
        await attachBtns.first().click();
        await page.waitForTimeout(2000);
        console.log("Attached email!");
        await page.screenshot({ path: "tests/client-tasks-6-attached.png", fullPage: true });
      }
    } else {
      console.log("Email button NOT visible");
      await page.screenshot({ path: "tests/client-tasks-5-no-email-btn.png", fullPage: true });
    }
  });

  test("5. Verify attachments display", async ({ page }) => {
    await page.goto("http://localhost:5173/clients");
    await page.waitForTimeout(2000);

    // Navigate to task
    await page.getByText("סיון בנימיני").first().click();
    await page.waitForTimeout(2000);

    await page.getByText("משימות").first().click();
    await page.waitForTimeout(2000);

    await page.getByText("בדיקת UX").first().click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "tests/client-tasks-7-final.png", fullPage: true });

    // Count attachments
    const attachRows = page.locator("[data-testid='tm.asset.row']");
    const count = await attachRows.count();
    console.log("FINAL: Attachment rows displayed:", count);

    if (count > 0) {
      console.log("SUCCESS: Attachments are showing in the task!");
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await attachRows.nth(i).textContent();
        console.log(`  Attachment ${i + 1}:`, text?.substring(0, 60));
      }
    } else {
      const noAssets = page.getByText("אין נכסים משויכים עדיין");
      if (await noAssets.isVisible()) {
        console.log("FAIL: 'No assets' message showing despite API having 6 attachments");
      }
    }
  });
});
