import { test, expect } from "@playwright/test";

test.describe("CTO Full Task Attachments Test", () => {

  test("1. Verify API returns tasks with attachments", async ({ request }) => {
    const response = await request.get("http://localhost:8799/api/tasks");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const tasks = data.tasks || [];
    console.log("Total tasks from API:", tasks.length);

    let tasksWithAttachments = 0;
    for (const task of tasks) {
      const atts = task.attachments || [];
      if (atts.length > 0) {
        tasksWithAttachments++;
        console.log(`Task "${task.title.substring(0, 40)}" has ${atts.length} attachments`);
      }
    }
    console.log("Tasks with attachments:", tasksWithAttachments);
    expect(tasks.length).toBeGreaterThan(0);
  });

  test("2. Navigate to Task Board and open task", async ({ page }) => {
    // Go directly to task board
    await page.goto("http://localhost:5173/tasks");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "tests/tests/full-1-taskboard.png", fullPage: true });

    // Check if we see task cards
    const pageText = await page.textContent("body");
    console.log("Page contains 'בדיקת UX':", pageText?.includes("בדיקת UX"));
    console.log("Page contains 'משימה':", pageText?.includes("משימה"));

    // Try to find and click on task board link if we're on dashboard
    const taskBoardLink = page.getByText("Open Task Board");
    if (await taskBoardLink.isVisible()) {
      await taskBoardLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/tests/full-2-after-link.png", fullPage: true });
    }

    // Try clicking on a task title
    const uxTask = page.getByText("בדיקת UX");
    if (await uxTask.count() > 0) {
      console.log("Found UX task - clicking");
      await uxTask.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/tests/full-3-task-opened.png", fullPage: true });

      // Look for attachment elements
      const attachments = page.locator("[data-testid='tm.asset.row']");
      const count = await attachments.count();
      console.log("Attachment rows found:", count);

      // Look for attach buttons
      const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
      console.log("Email attach button visible:", await emailBtn.isVisible());
    } else {
      console.log("UX task not found on page");
      // List all visible text elements to debug
      const texts = await page.locator("h1, h2, h3, span, p, button").allTextContents();
      console.log("Visible texts:", texts.slice(0, 20).join(" | "));
    }
  });

  test("3. Test attach email flow if task found", async ({ page }) => {
    await page.goto("http://localhost:5173/tasks");
    await page.waitForTimeout(2000);

    // Click task board if visible
    const taskBoardLink = page.getByText("Open Task Board");
    if (await taskBoardLink.isVisible()) {
      await taskBoardLink.click();
      await page.waitForTimeout(2000);
    }

    // Find and click UX task
    const uxTask = page.getByText("בדיקת UX");
    if (await uxTask.count() > 0) {
      await uxTask.first().click();
      await page.waitForTimeout(1500);

      // Click email attach button
      const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
      if (await emailBtn.isVisible()) {
        await emailBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: "tests/tests/full-4-email-modal.png", fullPage: true });

        // Check if modal opened
        const modal = page.locator("[data-testid='tm.attach-email']");
        console.log("Email modal visible:", await modal.isVisible());

        // Look for attach buttons in modal
        const attachBtns = page.locator("[data-testid='tm.email.attach']");
        console.log("Attach buttons in modal:", await attachBtns.count());
      } else {
        console.log("Email button not visible");
        await page.screenshot({ path: "tests/tests/full-4-no-email-btn.png", fullPage: true });
      }
    }
  });

  test("4. Direct URL test - open specific task", async ({ page, request }) => {
    // Get task ID from API
    const response = await request.get("http://localhost:8799/api/tasks");
    const data = await response.json();
    const tasks = data.tasks || [];

    // Find UX task
    const uxTask = tasks.find((t: any) => t.title?.includes("בדיקת UX"));
    if (uxTask) {
      console.log("UX Task ID:", uxTask.id);
      console.log("UX Task attachments:", uxTask.attachments?.length || 0);

      // Try to navigate directly to task
      await page.goto(`http://localhost:5173/tasks/${uxTask.id}`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "tests/tests/full-5-direct-url.png", fullPage: true });

      // Check for attachment elements
      const attachments = page.locator("[data-testid='tm.asset.row']");
      console.log("Attachment rows:", await attachments.count());
    } else {
      console.log("UX task not found in API");
    }
  });
});
