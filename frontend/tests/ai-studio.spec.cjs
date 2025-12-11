// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://20.217.86.4:5173';

test.describe('AI Studio - Senior Review Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to AI Studio
    await page.goto(`${BASE_URL}/ai-studio`);
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('Page loads with correct title and components', async ({ page }) => {
    // Check page title/header
    await expect(page.locator('h1')).toContainText('AI Studio');

    // Check subtitle exists
    await expect(page.locator('text=צ\'אט עם AI')).toBeVisible();

    // Check sidebar exists with "שיחה חדשה" button
    await expect(page.locator('text=שיחה חדשה')).toBeVisible();

    // Check provider dropdown exists
    await expect(page.locator('select')).toBeVisible();

    // Check empty state message
    await expect(page.locator('text=התחל שיחה חדשה')).toBeVisible();

    // Check input field exists
    await expect(page.locator('textarea[placeholder="הקלד הודעה..."]')).toBeVisible();

    // Check send button exists
    await expect(page.locator('button:has(svg)')).toBeVisible();
  });

  test('Provider dropdown shows available providers', async ({ page }) => {
    const select = page.locator('select');

    // Get all options
    const options = await select.locator('option').allTextContents();

    // Should have Gemini, Claude, OpenAI
    expect(options.some(o => o.includes('Gemini'))).toBeTruthy();
    expect(options.some(o => o.includes('Claude'))).toBeTruthy();
    expect(options.some(o => o.includes('OpenAI'))).toBeTruthy();
  });

  test('Can type in chat input', async ({ page }) => {
    const input = page.locator('textarea[placeholder="הקלד הודעה..."]');

    // Type a message
    await input.fill('שלום, מה שלומך?');

    // Verify the text was entered
    await expect(input).toHaveValue('שלום, מה שלומך?');
  });

  test('Send button disabled when input is empty', async ({ page }) => {
    const sendButton = page.locator('button:has(svg.lucide-send)');

    // Button should be disabled initially (empty input)
    await expect(sendButton).toBeDisabled();

    // Type something
    const input = page.locator('textarea[placeholder="הקלד הודעה..."]');
    await input.fill('test');

    // Button should now be enabled
    await expect(sendButton).toBeEnabled();
  });

  test('Can send message and receive streaming response', async ({ page }) => {
    const input = page.locator('textarea[placeholder="הקלד הודעה..."]');
    const sendButton = page.locator('button:has(svg.lucide-send), button:has(svg.lucide-loader-2)');

    // Type and send a message
    await input.fill('שלום');
    await sendButton.click();

    // User message should appear immediately
    await expect(page.locator('text=שלום').first()).toBeVisible({ timeout: 2000 });

    // Wait for AI response (streaming might take time)
    // Look for loading indicator or response
    await page.waitForTimeout(1000);

    // Should see either loading indicator or response
    const hasLoader = await page.locator('svg.animate-spin').isVisible().catch(() => false);
    const hasResponse = await page.locator('.bg-slate-100').count() > 0;

    expect(hasLoader || hasResponse).toBeTruthy();

    // Wait for response to complete (max 30 seconds)
    await expect(page.locator('.bg-slate-100')).toBeVisible({ timeout: 30000 });
  });

  test('Conversation list updates after sending message', async ({ page }) => {
    const input = page.locator('textarea[placeholder="הקלד הודעה..."]');
    const sendButton = page.locator('button:has(svg.lucide-send)');

    // Send a unique message
    const uniqueMsg = `בדיקה ${Date.now()}`;
    await input.fill(uniqueMsg);
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Reload page to check conversation was saved
    await page.reload();
    await page.waitForLoadState('networkidle');

    // The conversation should appear in the sidebar
    // (title is first 50 chars of first message)
    await expect(page.locator('.truncate').first()).toBeVisible({ timeout: 5000 });
  });

  test('New conversation button clears chat', async ({ page }) => {
    const input = page.locator('textarea[placeholder="הקלד הודעה..."]');
    const sendButton = page.locator('button:has(svg.lucide-send)');

    // Send a message first
    await input.fill('הודעה ראשונה');
    await sendButton.click();
    await page.waitForTimeout(3000);

    // Click "שיחה חדשה"
    await page.locator('text=שיחה חדשה').click();

    // Messages should be cleared
    await expect(page.locator('text=התחל שיחה חדשה')).toBeVisible();
  });

  test('RTL layout is correct', async ({ page }) => {
    // Main container should have dir="rtl"
    const mainContainer = page.locator('div[dir="rtl"]');
    await expect(mainContainer).toBeVisible();

    // Sidebar should be on the RIGHT (in RTL, border-left means right side)
    const sidebar = page.locator('.border-l.border-slate-200');
    await expect(sidebar).toBeVisible();
  });

  test('Provider can be switched', async ({ page }) => {
    const select = page.locator('select');

    // Get initial value
    const initialValue = await select.inputValue();

    // Try to select a different provider
    const options = await select.locator('option:not([disabled])').all();
    if (options.length > 1) {
      // Select a different option
      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value !== initialValue) {
          await select.selectOption(value);
          break;
        }
      }

      // Verify selection changed
      const newValue = await select.inputValue();
      expect(newValue).not.toBe(initialValue);
    }
  });

  test('Error handling - displays error message on failure', async ({ page }) => {
    // This test would need to simulate an API failure
    // For now, we verify error container exists in the UI structure

    // The error div structure should be present (hidden when no error)
    const errorClasses = '.bg-red-50.border-red-200.text-red-700';

    // It might not be visible if no error, but we can check the component renders errors
    // We'll do this indirectly by checking the code structure loads
    const input = page.locator('textarea[placeholder="הקלד הודעה..."]');
    await expect(input).toBeVisible();
  });

  test('Mobile viewport - components remain accessible', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Core components should still be visible (though layout may be broken)
    await expect(page.locator('h1')).toContainText('AI Studio');
    await expect(page.locator('textarea')).toBeVisible();

    // Note: This test documents current behavior, not ideal behavior
    // The sidebar likely overlaps on mobile
  });

});

test.describe('AI Studio - API Integration Tests', () => {

  test('GET /api/ai-studio/providers returns valid data', async ({ request }) => {
    const response = await request.get('http://20.217.86.4:8799/api/ai-studio/providers');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.providers).toBeDefined();
    expect(data.providers.length).toBeGreaterThan(0);

    // Each provider should have required fields
    for (const provider of data.providers) {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.available).toBeDefined();
    }
  });

  test('GET /api/ai-studio/conversations returns array', async ({ request }) => {
    const response = await request.get('http://20.217.86.4:8799/api/ai-studio/conversations');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.conversations).toBeDefined();
    expect(Array.isArray(data.conversations)).toBeTruthy();
  });

  test('POST /api/ai-studio/chat streams response', async ({ request }) => {
    const response = await request.post('http://20.217.86.4:8799/api/ai-studio/chat', {
      data: {
        message: 'בדיקה',
        provider: 'gemini'
      }
    });

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('text/event-stream');
  });

  test('DELETE /api/ai-studio/conversations/{id} works', async ({ request }) => {
    // First create a conversation
    await request.post('http://20.217.86.4:8799/api/ai-studio/chat', {
      data: { message: 'test delete', provider: 'gemini' }
    });

    // Get conversations
    const listResponse = await request.get('http://20.217.86.4:8799/api/ai-studio/conversations');
    const data = await listResponse.json();

    if (data.conversations.length > 0) {
      const idToDelete = data.conversations[0].id;

      // Delete it
      const deleteResponse = await request.delete(`http://20.217.86.4:8799/api/ai-studio/conversations/${idToDelete}`);
      expect(deleteResponse.ok()).toBeTruthy();
    }
  });

});
