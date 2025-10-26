import { Page, expect } from '@playwright/test';

export async function login(page: Page) {
  const email = process.env.ADMIN_EMAIL || 'natalie@socialcatering.com';
  const password = process.env.ADMIN_PASSWORD || 'password123';
  
  await page.goto('/users/sign_in');
  await expect(page.locator('input[type="email"], input[name*="email"]')).toBeVisible({ timeout: 10000 });
  await page.fill('input[type="email"], input[name*="email"]', email);
  await page.fill('input[type="password"], input[name*="password"]', password);
  await page.click('button[type="submit"], input[type="submit"]');
  // Wait for redirect after login - check for dashboard or home page
  await page.waitForLoadState('networkidle');
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `tmp/security/${name}.png`, fullPage: true });
}

