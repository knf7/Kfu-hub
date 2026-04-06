const { test, expect } = require('@playwright/test');
const { seedAuthenticatedSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSession(page);
    await installMockApi(page);
    await page.goto('/loans');
    await expect(page.getByRole('heading', { name: 'إدارة القروض' })).toBeVisible();
});

test('إضافة قرض ثم تحويل الحالة ثم حذف القرض', async ({ page }) => {
    await expect(page.locator('tr', { hasText: 'R-100' })).toBeVisible();

    await page.getByRole('button', { name: /إضافة قرض جديد/ }).click();
    const addModal = page.locator('.modal-content', { hasText: 'إضافة قرض جديد' });
    await expect(addModal).toBeVisible();
    await addModal.locator('select').first().selectOption({ index: 1 });
    await addModal.locator('input[type="number"]').first().fill('2100');
    await addModal.locator('input[type="text"]').first().fill('R-NEW');
    await addModal.getByRole('button', { name: 'حفظ' }).click();

    const newLoanRow = page.locator('tr', { hasText: 'R-NEW' });
    await expect(newLoanRow).toBeVisible();

    await newLoanRow.getByRole('button', { name: 'تحويل لمدفوع' }).click();
    await expect(newLoanRow).toContainText('تم الدفع');

    page.once('dialog', async (dialog) => {
        await dialog.accept('حذف');
    });
    await newLoanRow.locator('button[title="حذف"]').click();
    await expect(page.locator('tr', { hasText: 'R-NEW' })).toHaveCount(0);
});

test('تعديل القرض وتحويله إلى ناجز', async ({ page }) => {
    const targetRow = page.locator('tr', { hasText: 'R-100' });
    await expect(targetRow).toBeVisible();

    await targetRow.locator('button[title="تعديل بيانات القرض"]').click();
    const editModal = page.locator('.modal-content', { hasText: 'تعديل بيانات القرض' });
    await expect(editModal).toBeVisible();

    await editModal.locator('select').first().selectOption('Raised');
    await editModal.locator('input[type="text"]').first().fill('NJZ-EDIT-1');
    await editModal.getByRole('button', { name: 'حفظ التعديلات' }).click();

    await expect(page.locator('tr', { hasText: 'R-100' })).toContainText('تم الرفع (ناجز)');
});
