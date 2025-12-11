import { test, expect } from "@playwright/test";

test("CTO Review - Email Viewer and Create Task", async ({ page }) => {
  // Go to client emails tab
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Click emails tab
  await page.getByText("אימיילים").first().click();
  await page.waitForTimeout(2000);
  
  // Click first email to expand
  const emailRow = page.locator("text=natesnewsletter").first();
  await emailRow.click();
  await page.waitForTimeout(1000);
  
  // Click "Open in Viewer"
  const viewerBtn = page.getByText("Open in Viewer");
  if (await viewerBtn.isVisible()) {
    console.log("=== CLICKING OPEN IN VIEWER ===");
    await viewerBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "tests/cto-email-viewer.png", fullPage: true });
    
    // Check for modal/viewer content
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log("\n=== VIEWER FEATURE CHECK ===");
    console.log("Outlook: " + html.includes("Outlook"));
    console.log("Reply: " + (html.includes("Reply") || html.includes("השב")));
    console.log("פתח ב-Outlook: " + html.includes("פתח ב-Outlook"));
    console.log("Email body visible: " + html.includes("Claude Code Agent"));
    
    // Get buttons in viewer
    const btns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button")).map(b => ({
        t: b.textContent?.trim().substring(0, 50),
        h: Math.round(b.getBoundingClientRect().height)
      }));
    });
    console.log("\n=== BUTTONS IN VIEWER ===");
    btns.forEach((b, i) => console.log(i + ". [" + b.h + "px] " + b.t));
    
    // Close viewer if there is an X button
    const closeBtn = page.locator("button:has-text(×), button:has-text(Close), button:has-text(סגור)").first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }
  
  // Now test Create Task
  console.log("\n=== TESTING CREATE TASK ===");
  await emailRow.click();
  await page.waitForTimeout(1000);
  
  const createTaskBtn = page.getByText("Create task");
  if (await createTaskBtn.isVisible()) {
    console.log("Create task button found, clicking...");
    
    // Listen for API call
    const taskCreatePromise = page.waitForResponse(resp => 
      resp.url().includes("/tasks") && resp.request().method() === "POST",
      { timeout: 5000 }
    ).catch(() => null);
    
    await createTaskBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "tests/cto-after-create-task.png", fullPage: true });
    
    const taskResp = await taskCreatePromise;
    if (taskResp) {
      console.log("Task API response: " + taskResp.status());
      const body = await taskResp.text().catch(() => "");
      console.log("Response: " + body.substring(0, 200));
    } else {
      console.log("No task API call detected");
    }
    
    // Check if any modal/form appeared
    const text = await page.evaluate(() => document.body.innerText);
    const hasTaskForm = text.includes("משימה") || text.includes("Task");
    console.log("Task form visible: " + hasTaskForm);
  }
});
