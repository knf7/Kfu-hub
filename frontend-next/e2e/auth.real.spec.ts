import { expect, test } from '@playwright/test';

const runRealAuth = process.env.E2E_REAL_AUTH === 'true';

const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const account = {
  username: `e2e${seed}`.slice(0, 20),
  businessName: `E2E Business ${seed.slice(-6)}`,
  email: `e2e+${seed}@example.com`,
  mobile: `05${seed.slice(-8)}`,
  password: process.env.E2E_REAL_AUTH_PASSWORD || `E2E!${seed.slice(-8)}aA`,
};

test.describe.serial('Real auth flow (frontend-next)', () => {
  test.skip(!runRealAuth, 'Real auth flow is disabled by default. Set E2E_REAL_AUTH=true to run it.');

  test('registers a new merchant account', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'إنشاء حساب جديد' })).toBeVisible();

    await page.locator('input[name="username"]').fill(account.username);
    await page.locator('input[name="businessName"]').fill(account.businessName);
    await page.locator('input[name="email"]').fill(account.email);
    await page.locator('input[name="mobile"]').fill(account.mobile);
    await page.locator('input[name="password"]').fill(account.password);

    const registerResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().includes('/api/auth/register')
    ));

    await page.getByRole('button', { name: 'إنشاء حساب' }).click();
    const response = await registerResponse;
    expect(response.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
  });

  test('logs in and reaches dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'مرحباً بعودتك' })).toBeVisible();

    await page.locator('input[name="identifier"]').fill(account.email);
    await page.locator('input[name="password"]').fill(account.password);
    await page.getByRole('button', { name: 'دخول', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
    await expect
      .poll(async () => page.evaluate(() => Boolean(window.localStorage.getItem('token'))))
      .toBeTruthy();
  });

  test('sends forgot password request', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'استعادة كلمة المرور' })).toBeVisible();

    await page.locator('input[name="email"]').fill(account.email);
    const forgotResponse = page.waitForResponse((response) => {
      if (response.request().method() !== 'POST') return false;
      const url = response.url();
      return url.includes('/api/auth/forgot-password') || url.includes('/auth/v1/recover');
    });

    await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click();
    const response = await forgotResponse;
    expect(response.status()).toBeLessThan(500);
  });

  test('calls reset endpoint when token is provided', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token');
    await expect(page.getByRole('heading', { name: 'إعادة تعيين كلمة المرور' })).toBeVisible();

    const resetPassword = process.env.E2E_REAL_RESET_PASSWORD || `New!${seed.slice(-8)}aA`;
    await page.locator('input[name="password"]').fill(resetPassword);
    await page.locator('input[name="confirmPassword"]').fill(resetPassword);

    const resetResponse = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && response.url().includes('/api/auth/reset-password')
    ));

    await page.getByRole('button', { name: 'تحديث كلمة المرور' }).click();
    const response = await resetResponse;
    expect([400, 401]).toContain(response.status());
  });
});
