import { test, expect } from "@playwright/test";

test.describe("Quick Actions - Client Workflow", () => {
  const mockClientName = "טסט לקוח";
  const encodedClientName = encodeURIComponent(mockClientName);

  test.beforeEach(async ({ page }) => {
    // Mock client summary API
    await page.route("**/api/client/summary**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          client: {
            name: mockClientName,
            emails: ["test@example.com"],
            phone: "052-1234567",
            sharepoint_url: "https://sharepoint.com/client",
            airtable_id: "rec123",
          },
          files: [],
          emails: [],
        }),
      });
    });

    // Mock templates API
    await page.route("**/api/templates/quotes**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          categories: [
            {
              id: "privacy",
              name: "פרטיות",
              templates: [
                { id: "basic", name: "מאגר בידי יחיד", price: "2,300 ₪" },
                { id: "medium", name: "רמת אבטחה בינונית", price: "14,250 ₪" },
              ],
            },
            {
              id: "commercial",
              name: "מסחרי",
              templates: [
                { id: "client_agreement", name: "הסכם לקוחות", price: "3,500 ₪" },
              ],
            },
          ],
        }),
      });
    });

    // Mock delivery templates API
    await page.route("**/api/templates/delivery**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          templates: [
            { id: "full_package", name: "משלוח מסמכים - חבילה מלאה" },
            { id: "partial", name: "משלוח מסמכים - המשך/חלקי" },
            { id: "single", name: "משלוח מסמך בודד" },
          ],
        }),
      });
    });

    // Mock SharePoint files
    await page.route("**/api/sharepoint/files**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            { name: "מדיניות פרטיות.docx", webUrl: "https://sharepoint/doc1" },
            { name: "הסכם עיבוד מידע.docx", webUrl: "https://sharepoint/doc2" },
          ],
        }),
      });
    });
  });

  test("Quick Actions section is visible in Client Overview", async ({ page }) => {
    await page.goto(`/#/clients/${encodedClientName}`);
    await page.waitForSelector("[data-testid=\"quick-actions-section\"]", { timeout: 15000 });
    await expect(page.getByTestId("quick-actions-section")).toBeVisible();
  });

  test("Shows three action buttons: Quote, Documents, Delivery", async ({ page }) => {
    await page.goto(`/#/clients/${encodedClientName}`);
    await page.waitForSelector("[data-testid=\"quick-actions-section\"]", { timeout: 15000 });

    await expect(page.getByTestId("btn-quote")).toBeVisible();
    await expect(page.getByTestId("btn-documents")).toBeVisible();
    await expect(page.getByTestId("btn-delivery")).toBeVisible();
  });

  test("Quote button opens QuoteModal with template categories", async ({ page }) => {
    await page.goto(`/#/clients/${encodedClientName}`);
    await page.waitForSelector("[data-testid=\"btn-quote\"]", { timeout: 15000 });

    await page.getByTestId("btn-quote").click();

    await expect(page.getByTestId("quote-modal")).toBeVisible();
    await expect(page.getByText("פרטיות")).toBeVisible();
    await expect(page.getByText("מסחרי")).toBeVisible();
    await expect(page.getByText("מאגר בידי יחיד")).toBeVisible();
  });

  test("Quote modal shows preview and open in Outlook button", async ({ page }) => {
    await page.goto(`/#/clients/${encodedClientName}`);
    await page.waitForSelector("[data-testid=\"btn-quote\"]", { timeout: 15000 });

    await page.getByTestId("btn-quote").click();
    await page.waitForSelector("[data-testid=\"quote-modal\"]");

    // Select a template
    await page.getByText("מאגר בידי יחיד").click();

    await expect(page.getByTestId("btn-preview-quote")).toBeVisible();
  });

  test("Delivery button opens DeliveryEmailModal", async ({ page }) => {
    await page.goto(`/#/clients/${encodedClientName}`);
    await page.waitForSelector("[data-testid=\"btn-delivery\"]", { timeout: 15000 });

    await page.getByTestId("btn-delivery").click();

    await expect(page.getByTestId("delivery-modal")).toBeVisible();
    await expect(page.getByText("משלוח מסמכים - חבילה מלאה")).toBeVisible();
  });

  test("Delivery modal shows document attachments from SharePoint", async ({ page }) => {
    await page.goto(`/#/clients/${encodedClientName}`);
    await page.waitForSelector("[data-testid=\"btn-delivery\"]", { timeout: 15000 });

    await page.getByTestId("btn-delivery").click();
    await page.waitForSelector("[data-testid=\"delivery-modal\"]");

    await expect(page.getByText("מדיניות פרטיות.docx")).toBeVisible();
    await expect(page.getByText("הסכם עיבוד מידע.docx")).toBeVisible();
  });
});
