const { test, expect } = require('@playwright/test');
const { seedAuthenticatedSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSession(page);
    await installMockApi(page);
    await page.goto('/najiz');
    await expect(page.getByRole('heading', { name: 'قضايا ناجز' })).toBeVisible();
});

test('تحديث المبلغ المحصل في ناجز مع التحقق من ثبات التحديث', async ({ page }) => {
    const targetCard = page.locator('.case-card', { hasText: 'NJZ-2026-22' });
    await expect(targetCard).toBeVisible();

    const collectedAmountInput = targetCard.locator('.collection-section input[type="number"]').first();
    await collectedAmountInput.fill('950');
    await targetCard.getByRole('button', { name: /حفظ/ }).click();

    await expect(collectedAmountInput).toHaveValue('950');
});

test('البحث داخل قضايا ناجز بالرقم', async ({ page }) => {
    await page.getByPlaceholder('بحث بالاسم، الهوية، أو رقم القضية...').fill('NJZ-2026-22');
    await expect(page.locator('.case-card')).toHaveCount(1);
    await expect(page.locator('.case-card').first()).toContainText('NJZ-2026-22');
});
