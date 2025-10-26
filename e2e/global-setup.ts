import { chromium, FullConfig } from '@playwright/test';

export default async function setup(_: FullConfig) {
  const baseURL = process.env.BASE_URL || 'https://sc-mvp-staging-c6ef090c6c41.herokuapp.com';
  const email = process.env.ADMIN_EMAIL || 'natalie@socialcatering.com';
  const secret = process.env.E2E_SECRET || 'test-secret-change-me';

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  const res = await page.request.get(`/e2e/test_login?email=${encodeURIComponent(email)}&secret=${encodeURIComponent(secret)}`);
  if (!res.ok()) throw new Error(`test_login failed: ${res.status()} ${await res.text()}`);

  // Ensure SPA session probe passes
  const probe = await page.request.get('/api/v1/sessions/current');
  if (probe.status() !== 200) throw new Error(`session probe failed: ${probe.status()} ${await probe.text()}`);

  await context.storageState({ path: 'e2e/.auth.json' });
  await browser.close();
}
