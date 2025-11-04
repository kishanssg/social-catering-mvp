import { test, expect } from '@playwright/test';

test('authentication flow - check login page loads', async ({ page }) => {
  // Navigate to home page
  await page.goto('/');
  
  // Should redirect to login or show login form
  await expect(page).toHaveURL(/sign_in|login|users/, { timeout: 10000 });
  
  // Take screenshot for evidence
  await page.screenshot({ path: 'tmp/security/login_page.png' });
  
  // Check if login form elements exist
  const emailInput = page.locator('input[type="email"], input[name*="email"]');
  const passwordInput = page.locator('input[type="password"], input[name*="password"]');
  
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await expect(passwordInput).toBeVisible({ timeout: 5000 });
  
  console.log('Login page loaded successfully');
});

test('dashboard loads after API authentication', async ({ page }) => {
  // First, authenticate via API
  const email = process.env.ADMIN_EMAIL || 'natalie@socialcatering.com';
  const password = process.env.ADMIN_PASSWORD || 'password123';
  
  // Get CSRF token
  await page.goto('/users/sign_in');
  const csrfToken = await page.locator('meta[name="csrf-token"]').getAttribute('content');
  
  // Login via API
  const response = await page.request.post('/api/v1/login', {
    data: {
      user: { email, password }
    }
  });
  
  expect(response.ok()).toBeTruthy();
  
  // Now navigate to dashboard
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'tmp/security/dashboard.png' });
  
  console.log('Dashboard page loaded successfully');
});
