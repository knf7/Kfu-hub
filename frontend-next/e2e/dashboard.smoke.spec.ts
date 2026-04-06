import { expect, type Page, type Route, test } from '@playwright/test';

const json = (route: Route, payload: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(payload),
  });

const setupAuthenticatedSession = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('merchant_id', 'merchant-e2e');
    localStorage.setItem(
      'merchant',
      JSON.stringify({
        id: 'merchant-e2e',
        store_name: 'متجر الاختبار',
        role: 'merchant',
      })
    );
  });
};

const registerApiMocks = async (page: Page, options?: { failDashboard?: boolean }) => {
  const failDashboard = Boolean(options?.failDashboard);

  await page.route('**/api/**', (route) => json(route, {}));

  await page.route('**/api/reports/dashboard**', (route) => {
    if (failDashboard) {
      return route.abort();
    }
    return json(route, {
      metrics: {
        totalDebt: 13500,
        totalProfit: 4853.4,
        activeCustomers: 49,
        totalCustomers: 57,
        collectionRate: 83.12,
        overdueCustomers: 6,
        loansThisMonth: 24,
        najizRemainingAmount: 2910,
      },
      najizSummary: {
        totalCases: 47,
        activeCases: 12,
        paidCases: 35,
      },
      najizDetails: [
        {
          id: 'njz-1',
          customer_name: 'عميل تجريبي',
          najiz_case_number: 'N-12345',
          najiz_case_amount: 3000,
          najiz_collected_amount: 90,
          status: 'Raised',
        },
      ],
    });
  });

  await page.route('**/api/reports/analytics**', (route) =>
    json(route, {
      debtTrend: [
        { month: '2026-01', total: 2100, loan_count: 3 },
        { month: '2026-02', total: 2900, loan_count: 4 },
        { month: '2026-03', total: 3300, loan_count: 6 },
      ],
    })
  );

  await page.route('**/api/reports/ai-analysis**', (route) =>
    json(route, {
      summary: {
        growthRate: 12.3,
        riskSegmentation: {
          highRisk: 2,
        },
      },
      insights: [
        { type: 'success', title: 'نمو جيد', detail: 'تحسن التحصيل هذا الشهر.' },
      ],
      recommendations: ['تكثيف المتابعة للحالات المتأخرة.'],
      overdueClients: [{ full_name: 'عميل متأخر', debt: 1200 }],
    })
  );

  await page.route('**/api/reports/monthly-summary**', (route) =>
    json(route, {
      period: {
        year: 2026,
        month: 3,
        monthName: 'مارس',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      },
      summary: {
        totalLoans: 47,
        totalDisbursed: 111531.4,
        totalCollected: 92708.4,
        activeAmount: 18823,
        raisedAmount: 13500,
        uniqueCustomers: 46,
        activeCustomers: 39,
        collectionRate: 83.12,
        activeSharePercent: 16.88,
        averageLoanAmount: 2373.0,
        growth: {
          disbursedChangePercent: 12,
          loanCountChangePercent: 8,
          collectedChangePercent: 9,
        },
      },
      statusBreakdown: [
        { status: 'Paid', count: 33, amount: 80000 },
        { status: 'Active', count: 8, amount: 21000 },
        { status: 'Raised', count: 6, amount: 10500 },
      ],
      weeklyTrend: [],
      topCustomers: [],
      tracking: {
        scope: { fromDate: '2026-03-01', throughDate: '2026-03-31' },
        najizCases: [],
        monthEndUnpaid: [],
        integration: {
          najizCasesCount: 6,
          unpaidAfterMonthEndCount: 12,
          overlappedCount: 4,
          trackedCoveragePercent: 75,
        },
      },
      insights: [],
      recommendations: [],
      generatedAt: '2026-03-31T12:00:00.000Z',
    })
  );

  await page.route('**/api/reports/export**', (route) =>
    route.fulfill({
      status: 200,
      body: Buffer.from('fake-xlsx-content'),
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  );
};

test.describe('Dashboard smoke', () => {
  test('loads KPI cards on dashboard', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await registerApiMocks(page);

    await page.goto('/dashboard');
    await expect(page.locator('[data-test="dashboard-page"]')).toBeVisible();
    await expect(page.locator('[data-test="kpi-card"]')).toHaveCount(4);
    await expect(page.locator('[data-test="kpi-grid"]').getByText('إجمالي المحفظة النشطة', { exact: true })).toBeVisible();
  });

  test('opens quick-entry from dashboard shortcut', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await registerApiMocks(page);

    await page.goto('/dashboard');
    await page.locator('[data-test="quick-entry-action"]').click();
    await expect(page).toHaveURL(/\/dashboard\/quick-entry$/);
    await expect(page.getByRole('heading', { name: /الإدخال السريع الذكي/i })).toBeVisible();
  });

  test('exports monthly report as excel', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await registerApiMocks(page);

    await page.goto('/dashboard/monthly-report');
    const exportButton = page.locator('[data-test="export-excel"]');
    await expect(exportButton).toBeEnabled();

    const exportResponse = page.waitForResponse((response) =>
      response.request().method() === 'GET' && response.url().includes('/api/reports/export')
    );
    await exportButton.click();
    const response = await exportResponse;
    expect(response.ok()).toBeTruthy();
  });

  test('shows blocking error state when dashboard API fails', async ({ page }) => {
    await setupAuthenticatedSession(page);
    await registerApiMocks(page, { failDashboard: true });

    await page.goto('/dashboard');
    await expect(page.locator('[data-test="error-state"]')).toBeVisible();
    await expect(page.locator('[data-test="retry-dashboard"]')).toBeVisible();
  });
});
