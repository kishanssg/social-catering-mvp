import { Page, expect } from '@playwright/test';

export async function loginViaForm(page: Page, email: string, password: string) {
  // Go to Devise sign in
  await page.goto('/users/sign_in', { waitUntil: 'domcontentloaded' });

  // Fill and submit form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: /log in|sign in/i }).click()
  ]);
}

export async function waitForSessionOk(page: Page) {
  // Wait until SPA verifies session with the BE
  const resp = await page.waitForResponse(
    r => /\/api\/v1\/sessions\/current$/.test(r.url()) && r.status() === 200,
    { timeout: 15000 }
  );
  expect(resp.ok()).toBeTruthy();
}

export async function assertNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.waitForTimeout(500); // small settle
  expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0);
}