import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * Tests critical user flows through the EISLAW application.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  timeout: 60000, // 60 seconds for E2E tests

  reporter: [
    ['list'],
    ['html', { outputFolder: '../../playwright-report/e2e', open: 'never' }],
  ],

  use: {
    baseURL: process.env.TEST_URL || 'http://20.217.86.4:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'he-IL',
  },

  projects: [
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Mobile tests disabled - requires WebKit browser installation on VM
    // {
    //   name: 'Mobile',
    //   use: {
    //     ...devices['iPhone 12'],
    //     viewport: { width: 390, height: 844 },
    //   },
    // },
  ],
});
