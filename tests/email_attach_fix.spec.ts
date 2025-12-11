import { test, expect } from "@playwright/test";

test("Task created from email should have email in assets", async ({ page }) => {
  // Navigate to a client with emails
  await page.goto("http://localhost:5173/clients/%D7%A1%D7%99%D7%95%D7%95%D7%9F%20%D7%91%D7%A0%D7%99%D7%9E%D7%99%D7%A0%D7%99?tab=emails");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  
  // Handle the dialog (alert) that appears after creating task
  page.on("dialog", async dialog => {
    console.log("Alert message:", dialog.message());
    await dialog.accept();
  });
  
  // Find an email row and click the create task button
  const createTaskBtn = page.locator("button:has-text(צור משימה)").first();
  
  if (await createTaskBtn.count() > 0) {
    console.log("Found create task button, clicking...");
    await createTaskBtn.click();
    await page.waitForTimeout(3000);
    
    // Navigate to tasks tab
    await page.click("text=משימות");
    await page.waitForTimeout(2000);
    
    // Find a task with "Email ·" prefix (created from email)
    const emailTask = page.locator("text=Email ·").first();
    
    if (await emailTask.count() > 0) {
      console.log("Found email task, clicking to open modal...");
      await emailTask.click();
      await page.waitForTimeout(2000);
      
      // Check if the modal shows assets
      const noAssets = page.locator("text=אין נכסים משויכים עדיין.");
      const emailAsset = page.locator("[data-testid=task-files] >> text=אימייל");
      
      const hasNoAssetsMsg = await noAssets.count() > 0;
      const hasEmailAsset = await emailAsset.count() > 0;
      
      console.log("No assets message visible:", hasNoAssetsMsg);
      console.log("Email asset visible:", hasEmailAsset);
      
      // Take a screenshot for verification
      await page.screenshot({ path: "test-results/email-attach-fix.png" });
      
      // The fix should ensure we DONT see no assets for email-created tasks
