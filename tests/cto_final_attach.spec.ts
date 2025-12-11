import { test, expect } from "@playwright/test";

test.describe("CTO Final Task Attachments Test", () => {

  test("1. API returns tasks with attachments (SQLite working)", async ({ request }) => {
    const response = await request.get("http://localhost:8799/api/tasks");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const tasks = data.tasks || [];
    console.log("Total tasks from API:", tasks.length);

    // Find UX task
    const uxTask = tasks.find((t: any) => t.title?.includes("בדיקת UX"));
    if (uxTask) {
      console.log("UX Task found with", uxTask.attachments?.length || 0, "attachments:");
      for (const att of uxTask.attachments || []) {
        console.log(`  - ${att.kind}: ${att.subject || att.web_url || att.local_path || "?"}`);
      }
    }
    expect(uxTask).toBeDefined();
    expect(uxTask.attachments?.length).toBeGreaterThan(0);
  });

  test("2. Navigate to Clients → Tasks tab (full task board)", async ({ page }) => {
    // Go to /clients?tab=tasks which has full task board
    await page.goto("http://localhost:5173/clients?tab=tasks");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "tests/final-1-clients-tasks.png", fullPage: true });

    // Check if we see task board
    const pageText = await page.textContent("body");
    console.log("Page contains 'בדיקת UX':", pageText?.includes("בדיקת UX"));
    console.log("Page contains 'לביצוע':", pageText?.includes("לביצוע")); // "To Do" in Hebrew
    console.log("Page contains 'בתהליך':", pageText?.includes("בתהליך")); // "In Progress"
  });

  test("3. Open task by clicking on it", async ({ page }) => {
    await page.goto("http://localhost:5173/clients?tab=tasks");
    await page.waitForTimeout(3000);

    // Look for task cards or any clickable task element
    const uxTask = page.getByText("בדיקת UX");
    if (await uxTask.count() > 0) {
      console.log("Found UX task - clicking");
      await uxTask.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/final-2-task-clicked.png", fullPage: true });

      // Check for modal or side panel
      const modal = page.locator("[role='dialog'], .modal, .fixed");
      console.log("Modals/panels found:", await modal.count());

      // Check for attachment elements
      const attachRows = page.locator("[data-testid='tm.asset.row']");
      const assetCount = await attachRows.count();
      console.log("Attachment rows found:", assetCount);

      // Check for attach buttons
      const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
      const emailBtnVisible = await emailBtn.isVisible();
      console.log("Email attach button visible:", emailBtnVisible);

      if (assetCount > 0) {
        console.log("SUCCESS: Attachments are displayed in UI!");
      } else if (emailBtnVisible) {
        console.log("Task panel open but no attachments visible - potential display issue");
      }
    } else {
      console.log("UX task not visible on page");
      await page.screenshot({ path: "tests/final-2-no-task.png", fullPage: true });
    }
  });

  test("4. Test attach email flow", async ({ page }) => {
    await page.goto("http://localhost:5173/clients?tab=tasks");
    await page.waitForTimeout(3000);

    // Click on UX task
    const uxTask = page.getByText("בדיקת UX");
    if (await uxTask.count() > 0) {
      await uxTask.first().click();
      await page.waitForTimeout(2000);

      // Click email attach button
      const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
      if (await emailBtn.isVisible()) {
        await emailBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "tests/final-3-email-modal.png", fullPage: true });

        // Check modal opened
        const modal = page.locator("[data-testid='tm.attach-email']");
        const modalVisible = await modal.isVisible();
        console.log("Email attach modal visible:", modalVisible);

        // Check for emails
        const attachBtns = page.locator("[data-testid='tm.email.attach']");
        const emailCount = await attachBtns.count();
        console.log("Emails available to attach:", emailCount);

        if (emailCount > 0) {
          // Try to attach
          await attachBtns.first().click();
          await page.waitForTimeout(2000);
          console.log("Clicked attach on first email");
          await page.screenshot({ path: "tests/final-4-after-attach.png", fullPage: true });
        }
      } else {
        console.log("Email button not found after clicking task");
      }
    }
  });

  test("5. API test - attach and verify", async ({ request }) => {
    // Get current task state
    const beforeRes = await request.get("http://localhost:8799/api/tasks");
    const beforeData = await beforeRes.json();
    const uxTask = beforeData.tasks?.find((t: any) => t.title?.includes("בדיקת UX"));

    if (!uxTask) {
      console.log("UX Task not found");
      return;
    }

    const beforeCount = uxTask.attachments?.length || 0;
    console.log("Attachments before:", beforeCount);

    // Try to attach a test email via API
    const attachRes = await request.post(
      `http://localhost:8799/tasks/${uxTask.id}/emails/attach`,
      {
        data: {
          id: `playwright-test-${Date.now()}`,
          subject: "Playwright Test Email",
          from: "playwright@test.com",
          received: new Date().toISOString(),
          has_attachments: false,
          attachments_count: 0,
          client_name: "Test",
          task_title: "Test",
        },
      }
    );

    console.log("Attach API status:", attachRes.status());
    const attachData = await attachRes.json();
    console.log("Attach API response:", JSON.stringify(attachData));

    // Verify
    const afterRes = await request.get("http://localhost:8799/api/tasks");
    const afterData = await afterRes.json();
    const uxTaskAfter = afterData.tasks?.find((t: any) => t.title?.includes("בדיקת UX"));
    const afterCount = uxTaskAfter?.attachments?.length || 0;
    console.log("Attachments after:", afterCount);

    if (afterCount > beforeCount) {
      console.log("SUCCESS: Attachment was added via API!");
    } else {
      console.log("WARNING: Attachment count unchanged");
    }
  });
});
