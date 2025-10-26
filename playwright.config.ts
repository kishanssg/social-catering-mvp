import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://sc-mvp-staging-c6ef090c6c41.herokuapp.com',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
    storageState: 'e2e/.auth.json'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'tablet',  use: { ...devices['iPad (gen 7) landscape'] } },
    { name: 'mobile',  use: { ...devices['iPhone 12'] } }
  ],
  globalSetup: './e2e/global-setup.ts',
  outputDir: 'tmp/evidence/run'
});