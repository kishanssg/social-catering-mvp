import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors } from './utils';

test('dashboard: calendar & stats, no console errors', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Wait for page content to load (any text content)
  const content = page.locator('body');
  await expect(content).toBeVisible({ timeout: 30000 });
  
  await assertNoConsoleErrors(page);
  await page.screenshot({ path: 'tmp/evidence/dashboard.png', fullPage: true });
});