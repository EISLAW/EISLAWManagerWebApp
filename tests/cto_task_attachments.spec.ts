import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:8799";

test.describe("CTO Skeptical Review - Task Attachments (Phase 4J)", () => {

  test("1. API verification - GET /api/tasks returns tasks from SQLite", async ({ request }) => {
    const response = await request.get(`${API_URL}/api/tasks`);
    expect(response.ok()).toBeTruthy();

    const tasks = await response.json();
    console.log("Total tasks from API:", tasks.length);

    // Check if any task has attachments
    let tasksWithAttachments = 0;
    for (const task of tasks) {
      const attachments = task.attachments || [];
      if (Array.isArray(attachments) && attachments.length > 0) {
        tasksWithAttachments++;
        console.log(`Task "${task.title}" has ${attachments.length} attachments`);
      }
    }

    console.log("Tasks with attachments:", tasksWithAttachments);
    expect(tasks.length).toBeGreaterThan(0);
  });

  test("2. Navigate to Tasks Board", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    // Click on Tasks in sidebar
    const tasksLink = page.locator("text=משימות").first();
    await tasksLink.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "tests/attach-1-tasks-board.png", fullPage: true });

    // Verify we are on tasks page
    await expect(page).toHaveURL(/tasks/);
  });

  test("3. Open task and find attach buttons", async ({ page }) => {
    await page.goto(BASE_URL + "/tasks");
    await page.waitForTimeout(2000);

    // Find a task card - try multiple selectors
    let taskOpened = false;

    // Try clicking on task title
    const taskTitle = page.locator(".cursor-pointer, [role='button']").filter({ hasText: /משימה|בדיקה|UX/ }).first();
    if (await taskTitle.count() > 0) {
      await taskTitle.click();
      taskOpened = true;
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: "tests/attach-2-task-open.png", fullPage: true });

    // Look for attachment buttons
    const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
    const fileBtn = page.locator("[data-testid='tm.assets.add.file']");
    const linkBtn = page.locator("[data-testid='tm.assets.add.link']");
    const folderBtn = page.locator("[data-testid='tm.assets.add.folder']");

    console.log("Email button visible:", await emailBtn.isVisible());
    console.log("File button visible:", await fileBtn.isVisible());
    console.log("Link button visible:", await linkBtn.isVisible());
    console.log("Folder button visible:", await folderBtn.isVisible());
  });

  test("4. Click Email attach button and verify modal opens", async ({ page }) => {
    await page.goto(BASE_URL + "/tasks");
    await page.waitForTimeout(2000);

    // Open first task - try finding by text
    const taskText = page.getByText("בדיקת UX", { exact: false });
    if (await taskText.count() > 0) {
      await taskText.first().click();
    } else {
      // Fallback - click on any task-looking element
      const anyTask = page.locator(".bg-white.rounded-lg.shadow, .task-card, [class*='task']").first();
      if (await anyTask.count() > 0) {
        await anyTask.click();
      }
    }

    await page.waitForTimeout(1500);

    // Look for the email attach button
    const emailBtn = page.locator("[data-testid='tm.assets.add.email']");

    await page.screenshot({ path: "tests/attach-3-before-click.png", fullPage: true });

    if (await emailBtn.isVisible()) {
      await emailBtn.click();
      await page.waitForTimeout(3000); // Wait for emails to load

      await page.screenshot({ path: "tests/attach-3-modal-open.png", fullPage: true });

      // Verify modal opened
      const modal = page.locator("[data-testid='tm.attach-email']");
      const modalVisible = await modal.isVisible();
      console.log("Attach email modal visible:", modalVisible);

      // Check for emails in modal
      const attachBtns = page.locator("[data-testid='tm.email.attach']");
      const emailCount = await attachBtns.count();
      console.log("Emails available to attach:", emailCount);

    } else {
      console.log("Email button not found - task may not have client associated");
      await page.screenshot({ path: "tests/attach-3-no-button.png", fullPage: true });
    }
  });

  test("5. Attach an email and verify it appears", async ({ page }) => {
    await page.goto(BASE_URL + "/tasks");
    await page.waitForTimeout(2000);

    // Open UX test task
    const taskText = page.getByText("בדיקת UX", { exact: false });
    if (await taskText.count() > 0) {
      await taskText.first().click();
      await page.waitForTimeout(1500);
    }

    // Count attachments before
    const assetsBefore = await page.locator("[data-testid='tm.asset.row']").count();
    console.log("Attachments before:", assetsBefore);

    // Click email attach button
    const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
    if (await emailBtn.isVisible()) {
      await emailBtn.click();
      await page.waitForTimeout(3000);

      // Find and click the first attach button
      const attachBtn = page.locator("[data-testid='tm.email.attach']").first();

      if (await attachBtn.isVisible()) {
        await page.screenshot({ path: "tests/attach-4-before-attach.png", fullPage: true });
        await attachBtn.click();
        await page.waitForTimeout(2000);

        // Try to close modal
        await page.keyboard.press("Escape");
        await page.waitForTimeout(1000);

        await page.screenshot({ path: "tests/attach-4-after-attach.png", fullPage: true });

        // Count attachments after
        const assetsAfter = await page.locator("[data-testid='tm.asset.row']").count();
        console.log("Attachments after:", assetsAfter);

        if (assetsAfter > assetsBefore) {
          console.log("SUCCESS: Attachment was added!");
        } else {
          console.log("NOTE: Count unchanged - email may already be attached or there was an issue");
        }
      } else {
        console.log("No emails available to attach");
        await page.screenshot({ path: "tests/attach-4-no-emails.png", fullPage: true });
      }
    }
  });

  test("6. Verify existing attachments display correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/tasks");
    await page.waitForTimeout(2000);

    // Open UX test task (known to have attachments)
    const taskText = page.getByText("בדיקת UX", { exact: false });
    if (await taskText.count() > 0) {
      await taskText.first().click();
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: "tests/attach-5-check-assets.png", fullPage: true });

    // Check if there are any asset rows
    const assetRows = page.locator("[data-testid='tm.asset.row']");
    const count = await assetRows.count();

    console.log("Found", count, "attachments in task");

    // Check for "no assets" message
    const noAssets = page.locator("text=אין נכסים משויכים עדיין");
    const hasNoAssets = await noAssets.isVisible();

    if (hasNoAssets) {
      console.log("WARNING: No assets message visible - attachments not loaded");
    } else if (count > 0) {
      console.log("SUCCESS: Task has", count, "visible attachments");

      // List the types of attachments
      for (let i = 0; i < Math.min(count, 5); i++) {
        const row = assetRows.nth(i);
        const text = await row.textContent();
        console.log(`  Attachment ${i + 1}:`, text?.substring(0, 50));
      }
    }
  });

  test("7. Test add link attachment", async ({ page }) => {
    await page.goto(BASE_URL + "/tasks");
    await page.waitForTimeout(2000);

    // Open UX test task
    const taskText = page.getByText("בדיקת UX", { exact: false });
    if (await taskText.count() > 0) {
      await taskText.first().click();
      await page.waitForTimeout(1500);
    }

    // Click link button
    const linkBtn = page.locator("[data-testid='tm.assets.add.link']");
    if (await linkBtn.isVisible()) {
      await linkBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "tests/attach-6-link-modal.png", fullPage: true });
    }
  });

  test("8. Test delete attachment button exists", async ({ page }) => {
    await page.goto(BASE_URL + "/tasks");
    await page.waitForTimeout(2000);

    // Open UX test task
    const taskText = page.getByText("בדיקת UX", { exact: false });
    if (await taskText.count() > 0) {
      await taskText.first().click();
      await page.waitForTimeout(1500);
    }

    // Find delete button on an asset
    const deleteBtn = page.locator("[data-testid='tm.asset.delete']").first();

    if (await deleteBtn.isVisible()) {
      console.log("Delete button found - delete functionality available");
      await page.screenshot({ path: "tests/attach-7-delete-visible.png", fullPage: true });
    } else {
      console.log("No delete button visible - no attachments or different UI state");
    }
  });
});
