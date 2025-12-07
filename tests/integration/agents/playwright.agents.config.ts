import { defineConfig } from '@playwright/test';

/**
 * Playwright Configuration for Agent Integration Tests
 * Tests the agent registry, approvals, and audit API endpoints.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: false, // Run sequentially for API state consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for API tests
  timeout: 30000,

  reporter: [
    ['list'],
    ['html', { outputFolder: '../../../playwright-report/agents', open: 'never' }],
  ],

  use: {
    baseURL: process.env.API_URL || 'http://20.217.86.4:8799',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  projects: [
    {
      name: 'Agent API Tests',
      testMatch: '**/*.spec.ts',
    },
  ],
});
