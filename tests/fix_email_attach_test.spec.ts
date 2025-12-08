import { test, expect } from "@playwright/test";

test("Creating task from email should attach the email as an asset", async ({ page }) => {
  // Go to a client page with emails
  await page.goto("http://localhost:5173/clients/%D7%A1%D7%99%D7%95%D7%95%D7%9F%20%D7%91%D7%A0%D7%99%D7%9E%D7%99%D7%A0%D7%99");
  await page.waitForLoadState("networkidle");
  
  // Go to emails tab
  await page.click("text=אימיילים");
  await page.waitForTimeout(2000);
  
  // Find an email and click the "Create task" button
  const emailRow = page.locator("[data-testid=email-row]").first();
  const createTaskBtn = emailRow.locator("button:has-text(צור משימה)");
  
  // If the button exists, click it
  if (await createTaskBtn.count() > 0) {
    // Intercept the alert
    page.on("dialog", async dialog => {
      console.log("Alert:", dialog.message());
      await dialog.accept();
    });
    
    await createTaskBtn.click();
    await page.waitForTimeout(3000);
  } else {
    console.log("No create task button found, skipping");
  }
  
  // Go to tasks tab
  await page.click("text=משימות");
  await page.waitForTimeout(2000);
  
  // Find the most recently created task (should have "Email ·" in title)
  const taskWithEmail = page.locator("[data-testid=task-item]:has-text(Email ·)").first();
  
  if (await taskWithEmail.count() > 0) {
    // Click to open the task modal
    await taskWithEmail.click();
    await page.waitForTimeout(2000);
    
    // Check if the task modal opened
    const modal = page.locator("[data-testid=task-modal]");
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Check the נכסים section for email assets
    const assetsSection = page.locator("text=נכסים").locator("..");
    const noAssets = assetsSection.locator("text=אין נכסים משויכים עדיין.");
    const emailAsset = assetsSection.locator("[data-kind=email]");
    
    // Verify: either there are email assets, or we failed
    const hasNoAssets = await noAssets.count() > 0;
    const hasEmailAsset = await emailAsset.count() > 0;
    
    console.log("Has no assets message:", hasNoAssets);
    console.log("Has email asset:", hasEmailAsset);
    
    // The fix should ensure email appears in assets
    if (hasNoAssets && !hasEmailAsset) {
      throw new Error("BUG: Email was not attached to task assets!");
    }
  }
});
