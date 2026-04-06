const { test, expect } = require('@playwright/test');
const { seedAuthenticatedSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSession(page, {
        merchant: {
            subscription_plan: 'Pro',
            subscriptionPlan: 'Pro',
        },
    });
    await installMockApi(page);
    await page.goto('/excel-upload');
    await expect(page.getByRole('heading', { name: 'رفع بيانات Excel / CSV' })).toBeVisible();
});

test('رفع ملف CSV وتنفيذ الاستيراد بنجاح', async ({ page }) => {
    const csv = 'رقم الهوية,اسم العميل,رقم الجوال,المبلغ\n1234567890,عميل رفع,0500000011,1200\n';
    await page.locator('input[type="file"]').setInputFiles({
        name: 'loans.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8'),
    });

    await expect(page.getByText('loans.csv')).toBeVisible();
    await page.getByRole('button', { name: /بدء رفع/ }).click();

    await expect(page.getByText(/تم استيراد\s+1 قرض بنجاح/)).toBeVisible();
});
