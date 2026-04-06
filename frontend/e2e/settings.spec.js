const { test, expect } = require('@playwright/test');
const { seedAuthenticatedSession } = require('./helpers/auth');
const { installMockApi } = require('./helpers/mockApi');

test.beforeEach(async ({ page }) => {
    await seedAuthenticatedSession(page);
    await installMockApi(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'إعدادات الحساب' })).toBeVisible();
});

test('تحديث بيانات الحساب الأساسية وإضافة موظف', async ({ page }) => {
    const profileCard = page.locator('.settings-card').first();

    await profileCard.getByPlaceholder('Username').fill('owner-updated');
    await profileCard.locator('input[type="email"]').fill('owner.updated@example.com');
    await profileCard.getByRole('button', { name: 'حفظ التغييرات' }).click();
    await expect(page.getByText('تم التحديث بنجاح')).toBeVisible();

    await page.getByRole('button', { name: '+ إضافة موظف' }).click();
    const employeeModal = page.locator('.modal-content', { hasText: 'إضافة موظف جديد' });
    await expect(employeeModal).toBeVisible();

    await employeeModal.locator('input[type="text"]').first().fill('موظف اختبار');
    await employeeModal.locator('input[type="email"]').fill('new.employee@example.com');
    await employeeModal.locator('input[type="password"]').fill('Password123!');
    await employeeModal.getByRole('button', { name: 'إضافة الموظف' }).click();

    await expect(page.getByText('موظف اختبار')).toBeVisible();
});

test('تحديث كلمة المرور من صفحة الإعدادات', async ({ page }) => {
    const passwordCard = page.locator('.settings-card', { hasText: 'الأمان وتغيير كلمة المرور' });
    await expect(passwordCard).toBeVisible();

    const pwdInputs = passwordCard.locator('input[type="password"]');
    await pwdInputs.nth(0).fill('old-password');
    await pwdInputs.nth(1).fill('new-password-123');
    await pwdInputs.nth(2).fill('new-password-123');
    await passwordCard.getByRole('button', { name: 'تحديث كلمة المرور' }).click();

    await expect(page.getByText('تم تغيير كلمة المرور بنجاح')).toBeVisible();
});
