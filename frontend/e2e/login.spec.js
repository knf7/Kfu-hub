const { test, expect } = require('@playwright/test');
const { clearSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test('تسجيل الدخول عبر OTP ثم التحويل للوحة التحكم', async ({ page }) => {
    await clearSession(page);
    await installMockApi(page);

    await page.goto('/login');
    await expect(page.getByText('مرحباً بعودتك')).toBeVisible();

    await page.locator('input[name="email"]').fill('owner@example.com');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.getByRole('button', { name: 'دخول', exact: true }).click();

    await expect(page.getByText('التحقق بخطوتين')).toBeVisible();
    const otpInputs = page.locator('.otp-digit');
    const otp = ['1', '2', '3', '4', '5', '6'];
    for (let i = 0; i < otp.length; i += 1) {
        await otpInputs.nth(i).fill(otp[i]);
    }

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
});
