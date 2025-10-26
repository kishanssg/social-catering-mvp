import { Page, expect } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/users/sign_in');
  await expect(page.locator('input[type="email"], input[name*="email"]')).toBeVisible({ timeout: 10000 });
  await page.fill('input[type="email"], input[name*="email"]', email);
  await page.fill('input[type="password"], input[name*="password"]', password);
  await page.click('button[type="submit"], input[type="submit"]');
  // Wait for redirect after login - check for dashboard or home page
  await page.waitForLoadState('networkidle');
}

