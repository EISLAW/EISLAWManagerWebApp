import { test, expect } from "@playwright/test";

test("CTO Review - Create Task from Email", async ({ page }) => {
  // Go to client emails
  await page.goto("http://localhost:5173/#/clients/CTO%20Final%20Test");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Click emails tab
  await page.getByText("אימיילים").first().click();
  await page.waitForTimeout(2000);
  
  // Click first email to expand
  await page.locator("text=natesnewsletter").first().click();
  await page.waitForTimeout(1000);
  
  // Find and click Create task button
  const createTaskBtn = page.getByText("Create task");
  expect(await createTaskBtn.isVisible()).toBeTruthy();
  
  console.log("=== TESTING CREATE TASK ===");
  
  // Listen for task API call
  let taskApiCalled = false;
  page.on("response", async (resp) => {
    if (resp.url().includes("/tasks") && resp.request().method() === "POST") {
      taskApiCalled = true;
      console.log("Task API called: " + resp.status());
      const body = await resp.text().catch(() => "");
      console.log("Response: " + body.substring(0, 300));
    }
  });
  
  await createTaskBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "tests/cto-create-task.png", fullPage: true });
  
  // Check page for any feedback
  const text = await page.evaluate(() => document.body.innerText);
  console.log("\nPage text after Create Task click (first 500 chars):");
  console.log(text.substring(0, 500));
  
  // Look for success indicators
  const hasTaskSuccess = text.includes("נוצר") || text.includes("created") || text.includes("Success");
  console.log("\nSuccess indicator found: " + hasTaskSuccess);
  console.log("Task API was called: " + taskApiCalled);
});
