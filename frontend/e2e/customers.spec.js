const { test, expect } = require('@playwright/test');
const { seedAuthenticatedSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSession(page);
    await installMockApi(page);
    await page.goto('/customers');
    await expect(page.getByRole('heading', { name: 'العملاء' })).toBeVisible();
});

test('إضافة عميل جديد ثم تعديله', async ({ page }) => {
    await page.getByRole('button', { name: '＋ عميل جديد' }).click();
    const addModal = page.locator('.modal-box', { hasText: 'إضافة عميل جديد' });
    await expect(addModal).toBeVisible();

    await addModal.getByPlaceholder('محمد عبدالله').fill('عميل اختبار');
    await addModal.getByPlaceholder('1XXXXXXXXX').fill('4455667788');
    await addModal.getByPlaceholder('05XXXXXXXX').fill('0501234567');
    await addModal.getByPlaceholder('email@example.com').fill('qa.customer@example.com');
    await addModal.getByRole('button', { name: /حفظ العميل/ }).click();

    const customerRow = page.locator('tr', { hasText: 'عميل اختبار' });
    await expect(customerRow).toBeVisible();

    await customerRow.locator('button[title="تعديل بيانات العميل"]').click();
    const editModal = page.locator('.modal-box', { hasText: 'تعديل بيانات العميل' });
    await expect(editModal).toBeVisible();
    await editModal.locator('input').first().fill('عميل معدل');
    await editModal.getByRole('button', { name: /حفظ التعديلات/ }).click();

    await expect(page.locator('tr', { hasText: 'عميل معدل' })).toBeVisible();
});
