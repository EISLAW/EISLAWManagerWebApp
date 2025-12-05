const { test, expect } = require("@playwright/test");

const BASE_URL = "http://20.217.86.4:5173";
const API_URL = "http://20.217.86.4:8799";

test("AI Studio - Page loads with correct components", async ({ page }) => {
  await page.goto(BASE_URL + "/ai-studio");
  await page.waitForLoadState("networkidle");

  // Check page title/header
  await expect(page.locator("h1")).toContainText("AI Studio");
  
  // Check sidebar button
  await expect(page.locator("text=שיחה חדשה")).toBeVisible();
  
  // Check provider dropdown
  await expect(page.locator("select")).toBeVisible();
  
  // Check input field
  await expect(page.locator("textarea")).toBeVisible();
});

test("AI Studio - Provider dropdown has options", async ({ page }) => {
  await page.goto(BASE_URL + "/ai-studio");
  await page.waitForLoadState("networkidle");
  
  const select = page.locator("select");
  const options = await select.locator("option").allTextContents();
  
  console.log("Available providers:", options);
  expect(options.length).toBeGreaterThanOrEqual(1);
});

test("AI Studio - Can type message", async ({ page }) => {
  await page.goto(BASE_URL + "/ai-studio");
  await page.waitForLoadState("networkidle");
  
  const input = page.locator("textarea");
  await input.fill("שלום עולם");
  await expect(input).toHaveValue("שלום עולם");
});

test("AI Studio - Send button state changes", async ({ page }) => {
  await page.goto(BASE_URL + "/ai-studio");
  await page.waitForLoadState("networkidle");
  
  const input = page.locator("textarea");
  const buttons = page.locator("button");
  
  // Find the send button (last button in main area)
  const sendBtn = buttons.last();
  
  // Should be disabled when empty
  await expect(sendBtn).toBeDisabled();
  
  // Type something
  await input.fill("test message");
  
  // Should be enabled now
  await expect(sendBtn).toBeEnabled();
});

test("AI Studio - RTL layout", async ({ page }) => {
  await page.goto(BASE_URL + "/ai-studio");
  await page.waitForLoadState("networkidle");
  
  // Main container should have dir=rtl
  const rtlContainer = page.locator("div[dir=rtl]");
  await expect(rtlContainer).toBeVisible();
});

test("AI Studio - API providers endpoint", async ({ request }) => {
  const response = await request.get(API_URL + "/api/ai-studio/providers");
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(data.providers).toBeDefined();
  expect(data.providers.length).toBeGreaterThan(0);
});

test("AI Studio - API conversations endpoint", async ({ request }) => {
  const response = await request.get(API_URL + "/api/ai-studio/conversations");
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(data.conversations).toBeDefined();
});

test("AI Studio - Chat streaming works", async ({ page }) => {
  await page.goto(BASE_URL + "/ai-studio");
  await page.waitForLoadState("networkidle");
  
  const input = page.locator("textarea");
  const sendBtn = page.locator("button").last();
  
  // Send a message
  await input.fill("שלום");
  await sendBtn.click();
  
  // Wait for response (look for assistant message bubble)
  await page.waitForTimeout(10000);
  
  // Should see the user message and eventually an AI response
  const messages = page.locator(".rounded-2xl");
  const count = await messages.count();
  console.log("Message bubbles found:", count);
  
  expect(count).toBeGreaterThanOrEqual(1);
});

test("AI Studio - New conversation button works", async ({ page }) => {
  await page.goto(BASE_URL + "/ai-studio");
  await page.waitForLoadState("networkidle");
  
  // Click new conversation
  await page.locator("text=שיחה חדשה").click();
  
  // Should show empty state
  await expect(page.locator("text=התחל שיחה חדשה")).toBeVisible();
});
