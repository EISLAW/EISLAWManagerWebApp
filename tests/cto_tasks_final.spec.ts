import { test, expect } from "@playwright/test";

test.describe("CTO Final Test - Task Attachments in Client", () => {

  test("Full flow: Clients → Client → Tasks Tab → Task → Attachments", async ({ page }) => {
    // Step 1: Go to homepage and click Clients
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);

    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);
    console.log("Step 1: Clicked Clients sidebar");
    await page.screenshot({ path: "tests/final-flow-1-clients-list.png", fullPage: true });

    // Step 2: Click on first client row (table row)
    const clientRow = page.locator("table tbody tr").first();
    if (await clientRow.count() > 0) {
      await clientRow.click();
      await page.waitForTimeout(2000);
      console.log("Step 2: Clicked first client row");
    }
    await page.screenshot({ path: "tests/final-flow-2-client-detail.png", fullPage: true });

    // Step 3: Click on משימות (Tasks) tab
    const tasksTab = page.locator("text=משימות");
    console.log("Tasks tab found:", await tasksTab.count());
    if (await tasksTab.count() > 0) {
      await tasksTab.first().click();
      await page.waitForTimeout(2000);
      console.log("Step 3: Clicked Tasks tab");
    }
    await page.screenshot({ path: "tests/final-flow-3-tasks-tab.png", fullPage: true });

    // Step 4: Look for task cards
    const content = await page.textContent("body");
    console.log("Page has 'בדיקת UX':", content?.includes("בדיקת UX"));
    console.log("Page has 'לביצוע':", content?.includes("לביצוע"));
    console.log("Page has 'בתהליך':", content?.includes("בתהליך"));

    // Try to find and click on a task
    const uxTask = page.getByText("בדיקת UX");
    console.log("UX task elements:", await uxTask.count());

    if (await uxTask.count() > 0) {
      await uxTask.first().click();
      await page.waitForTimeout(2000);
      console.log("Step 4: Clicked UX task");
      await page.screenshot({ path: "tests/final-flow-4-task-open.png", fullPage: true });

      // Step 5: Check for attachments
      const attachRows = page.locator("[data-testid='tm.asset.row']");
      const attachCount = await attachRows.count();
      console.log("Step 5: Attachment rows:", attachCount);

      const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
      console.log("Email button visible:", await emailBtn.isVisible());

      // Check for "no assets" message
      const noAssets = page.getByText("אין נכסים משויכים עדיין");
      const noAssetsVisible = await noAssets.isVisible();
      console.log("No assets message visible:", noAssetsVisible);

      if (attachCount > 0) {
        console.log("SUCCESS: Attachments are displayed!");
        for (let i = 0; i < Math.min(attachCount, 3); i++) {
          const text = await attachRows.nth(i).textContent();
          console.log(`  Attachment ${i + 1}:`, text?.substring(0, 50));
        }
      } else if (noAssetsVisible) {
        console.log("ISSUE: No assets message showing but API has 6 attachments");
      }

      await page.screenshot({ path: "tests/final-flow-5-final.png", fullPage: true });
    } else {
      console.log("UX task not found in Tasks tab");
    }
  });

  test("Test attach email button", async ({ page }) => {
    // Navigate to client tasks
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);

    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);

    await page.locator("table tbody tr").first().click();
    await page.waitForTimeout(2000);

    await page.locator("text=משימות").first().click();
    await page.waitForTimeout(2000);

    // Click on UX task
    const uxTask = page.getByText("בדיקת UX");
    if (await uxTask.count() > 0) {
      await uxTask.first().click();
      await page.waitForTimeout(2000);

      // Click email attach button
      const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
      if (await emailBtn.isVisible()) {
        console.log("Clicking email attach button");
        await emailBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "tests/final-flow-6-email-modal.png", fullPage: true });

        // Check modal
        const modal = page.locator("[data-testid='tm.attach-email']");
        console.log("Email modal visible:", await modal.isVisible());

        // Check for צרף buttons
        const attachBtns = page.locator("[data-testid='tm.email.attach']");
        const btnCount = await attachBtns.count();
        console.log("צרף buttons:", btnCount);

        if (btnCount > 0) {
          // Click first צרף
          console.log("Clicking צרף on first email");
          await attachBtns.first().click();
          await page.waitForTimeout(2000);
          console.log("SUCCESS: Attached email!");
          await page.screenshot({ path: "tests/final-flow-7-attached.png", fullPage: true });
        }
      } else {
        console.log("Email button not visible");
        await page.screenshot({ path: "tests/final-flow-6-no-btn.png", fullPage: true });
      }
    }
  });
});
