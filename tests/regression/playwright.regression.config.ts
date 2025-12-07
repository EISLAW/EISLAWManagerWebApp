import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Regression Tests
 *
 * Targets the Azure VM deployment for regression testing.
 * Run with: npx playwright test --config=tests/regression/playwright.regression.config.ts
 */
export default defineConfig({
  testDir: './',
  timeout: 30_000,
  retries: 1,
  fullyParallel: true,
  workers: 2,

  use: {
    // Azure VM URL - change this if testing locally
    baseURL: process.env.TEST_URL || 'http://20.217.86.4:5173',
    viewport: { width: 1920, height: 1080 },
    locale: 'he-IL',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Mobile tests disabled - requires webkit browser installation
    // {
    //   name: 'Mobile',
    //   use: {
    //     ...devices['iPhone 13'],
    //     viewport: { width: 375, height: 667 },
    //   },
    // },
  ],

  reporter: [
    ['list'],
    ['html', { outputFolder: '../../playwright-report/regression', open: 'never' }],
    ['junit', { outputFile: '../../playwright-report/regression/junit.xml' }],
  ],

  // No webServer config - tests run against deployed Azure VM
});
