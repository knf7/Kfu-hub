const { test, expect } = require('@playwright/test');

test('اختبار حقيقي: تسجيل حساب ثم تحديث مبالغ ناجز والتحقق من الثبات', async ({ page }) => {
    const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const merchant = {
        username: `qauser${unique}`,
        businessName: `متجر اختبار ${unique}`,
        email: `qa.real.${unique}@example.com`,
        password: process.env.E2E_REAL_PASSWORD || `Qa!${String(unique).slice(-8)}aA`,
        mobile: `05${String(unique).slice(-8)}`,
    };
    const customer = {
        fullName: `عميل حقيقي ${unique}`,
        nationalId: `1${String(unique).slice(-9)}`,
        mobile: `05${String(unique).slice(-8)}`,
        email: `qa.customer.${unique}@example.com`,
    };
    const loan = {
        principalAmount: '3200',
        receiptNumber: `REAL-${unique}`,
        najizCaseAmount: '3300',
        collectedAmount: '950',
    };

    // Register a real merchant account.
    await page.goto('/login');
    await page.getByRole('button', { name: 'حساب جديد', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'إنشاء حساب جديد' })).toBeVisible();

    await page.locator('input[name="username"]').fill(merchant.username);
    await page.locator('input[name="businessName"]').fill(merchant.businessName);
    await page.locator('input[name="email"]').fill(merchant.email);
    await page.locator('input[name="mobile"]').fill(merchant.mobile);
    await page.locator('input[name="password"]').fill(merchant.password);
    await page.getByRole('button', { name: 'تسجيل', exact: true }).click();

    // Registration stores token in localStorage, but current frontend auth flow
    // relies on login cookie for protected requests. Perform a real login step.
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(merchant.email);
    await page.locator('input[name="password"]').fill(merchant.password);
    await page.getByRole('button', { name: 'دخول', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();

    // Create a real customer.
    await page.locator('.sidebar-nav .nav-item', { hasText: 'العملاء' }).click();
    await expect(page).toHaveURL(/\/customers$/);

    await page.getByRole('button', { name: /عميل جديد/ }).click();
    const addCustomerModal = page.locator('.modal-box', { hasText: 'إضافة عميل جديد' });
    await expect(addCustomerModal).toBeVisible();
    await addCustomerModal.locator('input[name="full_name"]').fill(customer.fullName);
    await addCustomerModal.locator('input[name="national_id"]').fill(customer.nationalId);
    await addCustomerModal.locator('input[name="mobile_number"]').fill(customer.mobile);
    await addCustomerModal.locator('input[name="email"]').fill(customer.email);
    await Promise.all([
        page.waitForResponse((res) => (
            res.url().includes('/api/customers')
            && res.request().method() === 'POST'
            && res.status() === 201
        )),
        addCustomerModal.locator('button[type="submit"]').click(),
    ]);
    await expect(addCustomerModal).toBeHidden({ timeout: 10_000 });

    const customersSearch = page.getByPlaceholder('ابحث بالاسم أو رقم الهوية أو الجوال...');
    await customersSearch.fill(customer.nationalId);
    await expect.poll(async () => (
        page.locator('tr', { hasText: customer.nationalId }).count()
    ), { timeout: 20_000 }).toBeGreaterThan(0);

    // Create a real loan for the new customer and convert it to Najiz.
    await page.locator('.sidebar-nav .nav-item', { hasText: 'القروض' }).click();
    await expect(page).toHaveURL(/\/loans$/);

    await page.getByRole('button', { name: /إضافة قرض جديد/ }).click();
    const addLoanModal = page.locator('.modal-content', { hasText: 'إضافة قرض جديد' });
    await expect(addLoanModal).toBeVisible();

    const customerSelect = addLoanModal.locator('select').first();
    let customerOptionValue = '';
    await expect.poll(async () => {
        customerOptionValue = await customerSelect.evaluate((el, nationalId) => {
            const match = Array.from(el.options).find((opt) => (opt.textContent || '').includes(nationalId));
            return match ? match.value : '';
        }, customer.nationalId);
        return customerOptionValue;
    }, { timeout: 20_000 }).not.toBe('');

    await customerSelect.selectOption(customerOptionValue);
    await addLoanModal.locator('input[type="number"]').first().fill(loan.principalAmount);
    await addLoanModal.locator('input[type="text"]').first().fill(loan.receiptNumber);
    await Promise.all([
        page.waitForResponse((res) => (
            /\/api\/loans$/.test(res.url())
            && res.request().method() === 'POST'
            && res.status() === 201
        )),
        addLoanModal.locator('button[type="submit"]').click(),
    ]);
    await expect(addLoanModal).toBeHidden({ timeout: 10_000 });

    const loansSearch = page.getByPlaceholder('بحث بالاسم أو رقم الهوية...');
    await loansSearch.fill(customer.nationalId);
    const loanRow = page.locator('tr', { hasText: customer.nationalId });
    await expect(loanRow).toBeVisible({ timeout: 20_000 });

    await Promise.all([
        page.waitForResponse((res) => (
            /\/api\/loans\/[^/]+\/status$/.test(res.url())
            && res.request().method() === 'PATCH'
            && res.status() === 200
        )),
        loanRow.locator('button[title="تحويل لناجز"]').click(),
    ]);

    // Update Najiz amounts and verify persistence after reload.
    await page.locator('.sidebar-nav .nav-item', { hasText: 'قضايا ناجز' }).click();
    await expect(page).toHaveURL(/\/najiz$/);

    const najizSearch = page.getByPlaceholder('بحث بالاسم، الهوية، أو رقم القضية...');
    await najizSearch.fill(customer.fullName);
    const caseCard = page.locator('.case-card', { hasText: customer.fullName });
    await expect(caseCard).toBeVisible({ timeout: 20_000 });

    const caseAmountInput = caseCard.locator('.case-details input[type="number"]').first();
    const collectedInput = caseCard.locator('.collection-section input[type="number"]').first();

    await caseAmountInput.fill(loan.najizCaseAmount);
    await collectedInput.fill(loan.collectedAmount);
    await Promise.all([
        page.waitForResponse((res) => (
            /\/api\/loans\/[^/]+\/najiz$/.test(res.url())
            && res.request().method() === 'PATCH'
            && res.status() === 200
        )),
        caseCard.getByRole('button', { name: /حفظ/ }).click(),
    ]);
    await expect.poll(async () => (
        Number.parseFloat(await collectedInput.inputValue())
    ), { timeout: 20_000 }).toBeCloseTo(Number(loan.collectedAmount), 2);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'قضايا ناجز' })).toBeVisible();

    await page.getByPlaceholder('بحث بالاسم، الهوية، أو رقم القضية...').fill(customer.fullName);
    const refreshedCard = page.locator('.case-card', { hasText: customer.fullName });
    await expect(refreshedCard).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (
        Number.parseFloat(await refreshedCard.locator('.collection-section input[type="number"]').first().inputValue())
    ), { timeout: 30_000 }).toBeCloseTo(Number(loan.collectedAmount), 2);
    await expect.poll(async () => (
        Number.parseFloat(await refreshedCard.locator('.case-details input[type="number"]').first().inputValue())
    ), { timeout: 30_000 }).toBeCloseTo(Number(loan.najizCaseAmount), 2);
});
