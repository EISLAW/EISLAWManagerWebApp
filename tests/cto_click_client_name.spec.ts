import { test, expect } from "@playwright/test";

test.describe("CTO Test - Click Client Name Link", () => {

  test("Full flow with proper client click", async ({ page }) => {
    // Step 1: Navigate to Clients
    await page.goto("http://localhost:5173");
    await page.waitForTimeout(2000);
    await page.locator("text=Clients").first().click();
    await page.waitForTimeout(2000);
    console.log("Step 1: On Clients list");

    // Step 2: Click on סיון בנימיני client NAME (the blue link)
    const sivanLink = page.locator("a").filter({ hasText: "סיון בנימיני" });
    console.log("Sivan link count:", await sivanLink.count());

    if (await sivanLink.count() > 0) {
      await sivanLink.first().click();
      await page.waitForTimeout(2000);
      console.log("Step 2: Clicked Sivan client link");
      await page.screenshot({ path: "tests/click-name-2-detail.png", fullPage: true });

      // Check URL changed
      console.log("Current URL:", page.url());

      // Step 3: Look for tabs
      const tabs = await page.locator("text=סקירה, text=קבצים, text=אימיילים, text=משימות").allTextContents();
      console.log("Tabs on page:", tabs.join(" | "));

      // Click משימות tab
      const tasksTab = page.locator("text=משימות");
      if (await tasksTab.count() > 0) {
        await tasksTab.first().click();
        await page.waitForTimeout(2000);
        console.log("Step 3: Clicked Tasks tab");
        await page.screenshot({ path: "tests/click-name-3-tasks.png", fullPage: true });

        // Look for tasks
        const pageContent = await page.textContent("body");
        console.log("Has בדיקת UX:", pageContent?.includes("בדיקת UX"));

        // Click on UX task if found
        const uxTask = page.getByText("בדיקת UX");
        if (await uxTask.count() > 0) {
          await uxTask.first().click();
          await page.waitForTimeout(2000);
          console.log("Step 4: Clicked UX task");
          await page.screenshot({ path: "tests/click-name-4-task.png", fullPage: true });

          // Check for attachments
          const attachRows = page.locator("[data-testid='tm.asset.row']");
          console.log("Attachment rows:", await attachRows.count());

          const emailBtn = page.locator("[data-testid='tm.assets.add.email']");
          console.log("Email button visible:", await emailBtn.isVisible());

          if (await emailBtn.isVisible()) {
            // Try to attach email
            await emailBtn.click();
            await page.waitForTimeout(3000);
            console.log("Step 5: Clicked email attach button");
            await page.screenshot({ path: "tests/click-name-5-modal.png", fullPage: true });

            const attachBtns = page.locator("[data-testid='tm.email.attach']");
            console.log("צרף buttons:", await attachBtns.count());

            if (await attachBtns.count() > 0) {
              await attachBtns.first().click();
              await page.waitForTimeout(2000);
              console.log("SUCCESS: Clicked צרף!");
              await page.screenshot({ path: "tests/click-name-6-attached.png", fullPage: true });
            }
          }
        } else {
          console.log("UX task not found in tasks tab");
        }
      } else {
        console.log("Tasks tab not found");
        // List all text on page
        const allText = await page.locator("button, a, [role='tab']").allTextContents();
        console.log("Buttons/tabs:", allText.slice(0, 20).join(" | "));
      }
    } else {
      console.log("Sivan link not found, listing all links:");
      const allLinks = await page.locator("a").allTextContents();
      console.log("Links:", allLinks.join(" | "));
    }
  });
});
