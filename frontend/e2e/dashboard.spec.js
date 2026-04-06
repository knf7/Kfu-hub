const { test, expect } = require('@playwright/test');
const { seedAuthenticatedSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSession(page);
    await installMockApi(page);
    await page.goto('/dashboard');
});

test('عرض مؤشرات لوحة التحكم والتحليلات السريعة', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
    await expect(page.getByText('إجمالي الديون')).toBeVisible();
    await expect(page.getByText('إجمالي العملاء')).toBeVisible();
    await expect(page.getByRole('main').getByText('قضايا ناجز')).toBeVisible();
    await expect(page.getByRole('main').getByText('نسبة التحصيل', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'شهري' }).click();
    await expect(page.locator('.recharts-surface').first()).toBeVisible();

    await expect(page.getByRole('button', { name: 'إضافة قرض جديد' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'تصدير CSV' })).toBeVisible();
});
