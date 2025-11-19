import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5197',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'python -m uvicorn scoring_service.main:app --host 127.0.0.1 --port 8788',
      port: 8788,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        DEV_CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5197,http://127.0.0.1:5197',
        DEV_ENABLE_OPEN: '1',
        DEV_DESKTOP_ENABLE: '1',
      },
    },
    {
      command: 'npm run build && npm run preview -- --port 5197 --host',
      port: 5197,
      reuseExistingServer: true,
      timeout: 180_000,
      cwd: 'frontend',
      env: {
        VITE_API_URL: 'http://127.0.0.1:8788',
        VITE_MODE: 'LOCAL',
        VITE_HIDE_OUTLOOK: '0',
      },
    },
  ],
  projects: [
    { name: 'Chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
  ],
});
