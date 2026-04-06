const { test, expect } = require('@playwright/test');
const { seedAuthenticatedSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSession(page);
    await installMockApi(page);
    await page.goto('/dashboard');
});

test('التنقل بين الصفحات الرئيسية من القائمة الجانبية', async ({ page }) => {
    const routes = [
        { label: 'القروض', path: '/loans', heading: 'إدارة القروض' },
        { label: 'قضايا ناجز', path: '/najiz', heading: 'قضايا ناجز' },
        { label: 'العملاء', path: '/customers', heading: 'العملاء' },
        { label: 'التحليلات', path: '/analytics', heading: 'التحليلات التفصيلية' },
        { label: 'رفع ملف', path: '/excel-upload', heading: 'رفع بيانات Excel / CSV' },
        { label: 'الإعدادات', path: '/settings', heading: 'إعدادات الحساب' },
    ];

    for (const route of routes) {
        await page.locator('.sidebar-nav .nav-item', { hasText: route.label }).click();
        await expect(page).toHaveURL(new RegExp(`${route.path}$`));
        await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
    }
});
