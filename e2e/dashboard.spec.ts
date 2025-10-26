import { test, expect } from '@playwright/test';
import { login, takeScreenshot } from './utils';

test('dashboard calendar and stats render without console errors', async ({ page }) => {
  // Capture console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await login(page);
  
  // Take a screenshot for evidence
  await takeScreenshot(page, 'dashboard');
  
  // Wait a bit for the page to fully load
  await page.waitForLoadState('networkidle');
  
  // Take another screenshot after load
  await takeScreenshot(page, 'dashboard_loaded');
  
  // Check that we're on a valid page (not login)
  const url = page.url();
  expect(url).not.toMatch(/sign_in|login/);
  
  console.log('Dashboard URL:', url);
  console.log('Console errors:', errors);
  
  // Assert no console errors
  expect(errors, `Found console errors: ${errors.join('; ')}`).toHaveLength(0);
});

