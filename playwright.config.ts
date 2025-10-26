import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 60_000,
  use: {
    baseURL: process.env.BASE_URL || 'https://sc-mvp-staging-c6ef090c6c41.herokuapp.com',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
});

