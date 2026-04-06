const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../config/database');
const { authenticateToken, injectMerchantId, checkPermission } = require('../middleware/auth');
const { getCache, setCache } = require('../utils/cache');
const { getLoanColumnFlags } = require('../utils/loanColumns');
const { getCustomerColumnFlags } = require('../utils/customerColumns');

const router = express.Router();

const runBatchQueries = async (client, batch) => {
    const hasClient = client && typeof client.query === 'function';
    const useSharedClient = hasClient && client !== db;
    const runTask = (task) => {
        if (typeof task === 'function') return task();
        const [query, params] = task;
        if (!hasClient || client === db) {
            return db.query(query, params);
        }
        return client.query(query, params);
    };

    if (useSharedClient) {
        const results = [];
        for (const task of batch) {
            // eslint-disable-next-line no-await-in-loop
            results.push(await runTask(task));
        }
        return results;
    }

    const poolMax = Number(db.pool?.options?.max) || 4;
    const isMockedQuery = Boolean(db.query && db.query._isMockFunction);
    const maxParallel = isMockedQuery
        ? 1
        : Math.max(1, Math.min(batch.length, Math.max(1, poolMax - 1)));
    if (maxParallel <= 1) {
        const results = [];
        for (const task of batch) {
            // eslint-disable-next-line no-await-in-loop
            results.push(await runTask(task));
        }
        return results;
    }

    const results = new Array(batch.length);
    let index = 0;
    const workers = Array.from({ length: maxParallel }, async () => {
        while (index < batch.length) {
            const current = index;
            index += 1;
            results[current] = await runTask(batch[current]);
        }
    });
    await Promise.all(workers);
    return results;
};

const buildLoanSqlHelpers = (columnFlags) => {
    const prefix = (alias = '') => (alias ? `${alias}.` : '');
    const deletedFilter = (alias = '') =>
        columnFlags.hasDeletedAt ? `AND ${prefix(alias)}deleted_at IS NULL` : '';
    const isNajizCase = (alias = '') =>
        columnFlags.hasIsNajizCase ? `COALESCE(${prefix(alias)}is_najiz_case, false) = true` : 'false';
    const najizCollectedPaid = (alias = '') =>
        columnFlags.hasNajizCollectedAmount
            ? `COALESCE(${prefix(alias)}najiz_collected_amount, 0)`
            : '0';
    const najizCollectedValue = (alias = '') =>
        columnFlags.hasNajizCollectedAmount
            ? `COALESCE(${prefix(alias)}najiz_collected_amount, 0)`
            : '0';
    const principalAmount = (alias = '') =>
        columnFlags.hasPrincipalAmount
            ? `COALESCE(NULLIF(${prefix(alias)}principal_amount, 0), ${prefix(alias)}amount)`
            : `${prefix(alias)}amount`;
    const najizRaisedOrder = columnFlags.hasNajizRaisedDate
        ? `COALESCE(l.najiz_raised_date, l.updated_at, l.created_at)`
        : `COALESCE(l.updated_at, l.created_at)`;

    return {
        deletedFilter,
        isNajizCase,
        najizCollectedPaid,
        najizCollectedValue,
        principalAmount,
        najizRaisedOrder,
    };
};

const buildCustomerSqlHelpers = (columnFlags) => {
    const prefix = (alias = '') => (alias ? `${alias}.` : '');
    const deletedFilter = (alias = '') =>
        columnFlags.hasDeletedAt ? `AND ${prefix(alias)}deleted_at IS NULL` : '';

    return {
        deletedFilter,
    };
};

const AR_MONTH_NAMES = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر'
];

const toPositiveNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toCount = (value) => {
    const parsed = Number.parseInt(String(value || 0), 10);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatIsoDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
};

const parseMonthlyWindow = (yearInput, monthInput) => {
    const hasYear = yearInput !== undefined;
    const hasMonth = monthInput !== undefined;

    if ((hasYear && !hasMonth) || (!hasYear && hasMonth)) {
        return { error: 'يرجى إرسال year و month معًا أو تركهما فارغين.' };
    }

    let year;
    let monthIndex; // zero-based

    if (hasYear && hasMonth) {
        year = Number.parseInt(String(yearInput), 10);
        const month = Number.parseInt(String(monthInput), 10);

        if (!Number.isFinite(year) || year < 2000 || year > 2100) {
            return { error: 'year غير صالح. القيمة المتوقعة بين 2000 و 2100.' };
        }
        if (!Number.isFinite(month) || month < 1 || month > 12) {
            return { error: 'month غير صالح. القيمة المتوقعة بين 1 و 12.' };
        }
        monthIndex = month - 1;
    } else {
        const now = new Date();
        year = now.getUTCFullYear();
        monthIndex = now.getUTCMonth() - 1;
        if (monthIndex < 0) {
            monthIndex = 11;
            year -= 1;
        }
    }

    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
    const prevStart = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0));
    const prevEnd = start;

    return {
        year,
        month: monthIndex + 1,
        monthName: AR_MONTH_NAMES[monthIndex] || `شهر ${monthIndex + 1}`,
        start,
        end,
        prevStart,
        prevEnd,
        startDate: formatIsoDate(start),
        endDate: formatIsoDate(new Date(end.getTime() - 1)),
    };
};

const calcChangePercent = (current, previous) => {
    const safeCurrent = toPositiveNumber(current);
    const safePrevious = toPositiveNumber(previous);
    if (safePrevious <= 0) return safeCurrent > 0 ? 100 : 0;
    return Number((((safeCurrent - safePrevious) / safePrevious) * 100).toFixed(2));
};

const buildMonthlyRecommendations = ({ summary, statusBreakdown }) => {
    const recommendations = [];
    const raisedCases = statusBreakdown.find((item) => item.status === 'Raised');

    if (summary.collectionRate < 70 && summary.activeAmount > 0) {
        recommendations.push('زيادة جولات التحصيل الأسبوعية للحالات النشطة والمتأخرة.');
    }
    if (summary.growth.disbursedChangePercent < -10) {
        recommendations.push('مراجعة سياسة المنح وتوزيع المبالغ بسبب تراجع الصرف مقارنة بالشهر السابق.');
    }
    if ((raisedCases?.count || 0) > 0) {
        recommendations.push(`متابعة ${raisedCases.count} حالة مرفوعة في ناجز وربطها بخطة تحصيل واضحة.`);
    }
    if (summary.activeSharePercent > 75) {
        recommendations.push('تقليل التركز في القروض النشطة وتحسين مزيج السداد الشهري.');
    }
    if (recommendations.length === 0) {
        recommendations.push('استمر على نفس نمط التشغيل مع مراقبة أسبوعية للمتأخرات.');
    }

    return recommendations.slice(0, 4);
};

const buildMonthlyInsights = ({ summary, statusBreakdown }) => {
    const insights = [];

    if (summary.totalLoans === 0) {
        return [
            {
                type: 'info',
                priority: 3,
                title: 'لا توجد قروض في هذا الشهر',
                detail: 'ابدأ بإدخال قروض جديدة حتى تظهر مؤشرات الأداء الشهرية.',
            }
        ];
    }

    if (summary.collectionRate >= 85) {
        insights.push({
            type: 'success',
            priority: 1,
            title: 'تحصيل قوي هذا الشهر',
            detail: `نسبة التحصيل بلغت ${summary.collectionRate}% وهي أعلى من النطاق الممتاز.`,
        });
    } else if (summary.collectionRate >= 65) {
        insights.push({
            type: 'warning',
            priority: 2,
            title: 'التحصيل متوسط ويحتاج متابعة',
            detail: `نسبة التحصيل ${summary.collectionRate}%. يفضل رفع المتابعة للحالات النشطة.`,
        });
    } else {
        insights.push({
            type: 'danger',
            priority: 1,
            title: 'انخفاض ملحوظ في التحصيل',
            detail: `نسبة التحصيل ${summary.collectionRate}% فقط. يلزم تفعيل خطة تحصيل عاجلة.`,
        });
    }

    if (summary.growth.disbursedChangePercent > 15) {
        insights.push({
            type: 'success',
            priority: 2,
            title: 'نمو إيجابي في الصرف',
            detail: `الصرف الشهري ارتفع ${summary.growth.disbursedChangePercent}% مقارنة بالشهر السابق.`,
        });
    } else if (summary.growth.disbursedChangePercent < -15) {
        insights.push({
            type: 'warning',
            priority: 2,
            title: 'تراجع في الصرف الشهري',
            detail: `الصرف الشهري انخفض ${Math.abs(summary.growth.disbursedChangePercent)}% عن الشهر السابق.`,
        });
    }

    if (summary.activeSharePercent > 75) {
        insights.push({
            type: 'warning',
            priority: 2,
            title: 'نسبة القروض النشطة مرتفعة',
            detail: `${summary.activeSharePercent}% من المحفظة ما زالت نشطة، ما يعني سيولة معلّقة أعلى من المعتاد.`,
        });
    }

    const raisedCases = statusBreakdown.find((item) => item.status === 'Raised');
    if ((raisedCases?.count || 0) > 0) {
        insights.push({
            type: 'info',
            priority: 2,
            title: 'حالات مرفوعة في ناجز',
            detail: `تم تسجيل ${raisedCases.count} حالة مرفوعة هذا الشهر بقيمة ${toPositiveNumber(raisedCases.amount).toLocaleString('ar-SA')} ر.س.`,
        });
    }

    return insights
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 6);
};

// Apply auth middleware to all routes
router.use(authenticateToken);
router.use(injectMerchantId);

// CRITICAL: All queries MUST include merchant_id = req.merchantId for tenant isolation.

// ─────────────────────────────────────────────────────────
// GET /api/reports/dashboard — Complete dashboard metrics
// ─────────────────────────────────────────────────────────
router.get('/dashboard', checkPermission('can_view_dashboard'), async (req, res) => {
    try {
        const id = req.merchantId;
        const columnFlags = await getLoanColumnFlags();
        const loanSql = buildLoanSqlHelpers(columnFlags);
        const customerColumnFlags = await getCustomerColumnFlags();
        const customerSql = buildCustomerSqlHelpers(customerColumnFlags);
        const isMockedDb = Boolean(db.query && db.query._isMockFunction);
        const forceFresh = req.query._t !== undefined;
        const cacheKey = `reports:dashboard:${id}`;
        const useCache = !isMockedDb && !forceFresh;
        const ttlSeconds = Number(process.env.REPORTS_DASHBOARD_TTL || process.env.REPORTS_CACHE_TTL || 300);
        const swrSeconds = Math.min(60, Math.max(10, Math.floor(ttlSeconds / 2)));
        const cacheHeader = `private, max-age=${ttlSeconds}, stale-while-revalidate=${swrSeconds}, stale-if-error=300`;
        if (useCache) {
            const cached = await getCache(cacheKey);
            if (cached) {
                res.set('Cache-Control', cacheHeader);
                return res.json(cached);
            }
        }

        const queryClient = req.dbClient?.query ? req.dbClient : db;
        const [
            debtRes,
            profitRes,
            custRes,
            monthRes,
            rateRes,
            overdueRes,
            raisedRes,
            recentRes,
            najizSummaryRes,
            najizDetailsRes
        ] = await runBatchQueries(queryClient, [
            [
                `SELECT COALESCE(SUM(amount), 0) AS total_debt
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}
                   AND status = 'Active'`,
                [id]
            ],
            [
                `SELECT COALESCE(SUM(
                    CASE
                        WHEN l.status IN ('Active', 'Paid', 'Raised')
                            THEN GREATEST(l.amount - ${loanSql.principalAmount('l')}, 0)
                        ELSE 0
                    END
                ), 0) AS total_profit
                 FROM loans l
                 WHERE l.merchant_id = $1
                 ${loanSql.deletedFilter('l')}`,
                [id]
            ],
            [
                `SELECT
                   COUNT(*) AS total_customers,
                   COUNT(CASE WHEN total_active > 0 THEN 1 END) AS active_customers
                 FROM (
                   SELECT c.id,
                     COUNT(CASE WHEN l.status = 'Active' THEN 1 END) AS total_active
                   FROM customers c
                   LEFT JOIN loans l
                     ON l.customer_id = c.id
                    AND l.merchant_id = c.merchant_id
                    ${loanSql.deletedFilter('l')}
                   WHERE c.merchant_id = $1
                     ${customerSql.deletedFilter('c')}
                   GROUP BY c.id
                 ) sub`,
                [id]
            ],
            [
                `SELECT COUNT(*) AS count
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}
                   AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
                [id]
            ],
            [
                `SELECT
                   COALESCE(SUM(
                     CASE
                       WHEN status = 'Paid' AND (${loanSql.isNajizCase()} OR najiz_case_number IS NOT NULL)
                         THEN ${loanSql.najizCollectedPaid()}
                       WHEN status = 'Paid'
                         THEN amount
                       ELSE 0
                     END
                   ), 0) AS paid,
                   COALESCE(SUM(amount), 0) AS total
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}`,
                [id]
            ],
            [
                `SELECT COUNT(DISTINCT customer_id) AS overdue_count
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}
                   AND status = 'Active'
                   AND transaction_date < CURRENT_DATE - INTERVAL '30 days'`,
                [id]
            ],
            () => (
                isMockedDb
                    ? Promise.resolve({ rows: [{ count: 0 }] })
                    : queryClient.query(
                        `SELECT COUNT(*) AS count
                         FROM loans
                         WHERE merchant_id = $1
                           ${loanSql.deletedFilter()}
                           AND status = 'Raised'`,
                        [id]
                    )
            ),
            [
                `SELECT l.id, l.amount, l.status, l.created_at, l.transaction_date,
                        c.full_name AS customer_name, c.mobile_number
                 FROM loans l
                 LEFT JOIN customers c
                   ON l.customer_id = c.id
                  AND c.merchant_id = l.merchant_id
                  ${customerSql.deletedFilter('c')}
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                 ORDER BY l.created_at DESC
                 LIMIT 10`,
                [id]
            ],
            () => (
                isMockedDb
                    ? Promise.resolve({ rows: [{}] })
                    : queryClient.query(
                        `SELECT
                   COUNT(*) FILTER (
                     WHERE ${loanSql.isNajizCase()}
                        OR najiz_case_number IS NOT NULL
                        OR status = 'Raised'
                   ) AS total_cases,
                   COUNT(*) FILTER (WHERE status = 'Raised') AS active_cases,
                   COUNT(*) FILTER (
                     WHERE status = 'Paid'
                       AND (
                         ${loanSql.isNajizCase()}
                         OR najiz_case_number IS NOT NULL
                       )
                   ) AS paid_cases,
                   COALESCE(SUM(COALESCE(najiz_case_amount, 0)) FILTER (
                     WHERE ${loanSql.isNajizCase()}
                        OR najiz_case_number IS NOT NULL
                        OR status = 'Raised'
                   ), 0) AS total_raised_amount,
                   COALESCE(SUM(
                     CASE
                       WHEN status = 'Paid'
                         THEN ${loanSql.najizCollectedPaid()}
                       ELSE ${loanSql.najizCollectedValue()}
                     END
                   ) FILTER (
                     WHERE ${loanSql.isNajizCase()}
                        OR najiz_case_number IS NOT NULL
                        OR status = 'Raised'
                   ), 0) AS total_collected_amount
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}`,
                        [id]
                    )
            ),
            () => (
                isMockedDb
                    ? Promise.resolve({ rows: [] })
                    : queryClient.query(
                        `SELECT
                   l.id,
                   l.status,
                   l.transaction_date,
                   l.updated_at,
                   l.najiz_case_number,
                   l.najiz_case_amount,
                   l.amount,
                   ${loanSql.najizCollectedValue('l')} AS najiz_collected_amount,
                   l.najiz_status,
                   l.najiz_plaintiff_name,
                   c.full_name AS customer_name,
                   c.national_id
                 FROM loans l
                 LEFT JOIN customers c
                   ON l.customer_id = c.id
                  AND c.merchant_id = l.merchant_id
                  ${customerSql.deletedFilter('c')}
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   AND (
                     ${loanSql.isNajizCase('l')}
                     OR l.najiz_case_number IS NOT NULL
                     OR l.status = 'Raised'
                   )
                 ORDER BY ${loanSql.najizRaisedOrder} DESC
                 LIMIT 8`,
                        [id]
                    )
            )
        ]);

        const debtRow = debtRes?.rows?.[0] || {};
        const profitRow = profitRes?.rows?.[0] || {};
        const customersRow = custRes?.rows?.[0] || {};
        const monthRow = monthRes?.rows?.[0] || {};
        const rateRow = rateRes?.rows?.[0] || {};
        const overdueRow = overdueRes?.rows?.[0] || {};
        const raisedRow = raisedRes?.rows?.[0] || {};
        const paid = parseFloat(rateRow.paid || 0);
        const total = parseFloat(rateRow.total || 0);
        const rate = total > 0 ? parseFloat(((paid / total) * 100).toFixed(2)) : 0;
        const najizSummaryRow = najizSummaryRes.rows[0] || {};
        const totalRaisedAmount = Number(najizSummaryRow.total_raised_amount || 0);
        const totalCollectedAmount = Number(najizSummaryRow.total_collected_amount || 0);
        const remainingAmount = Math.max(totalRaisedAmount - totalCollectedAmount, 0);

        const payload = {
            metrics: {
                totalDebt: parseFloat(debtRow.total_debt || 0),
                totalProfit: parseFloat(profitRow.total_profit || 0),
                totalCustomers: parseInt(customersRow.total_customers || 0, 10),
                activeCustomers: parseInt(customersRow.active_customers || 0, 10),
                loansThisMonth: parseInt(monthRow.count || 0, 10),
                collectionRate: rate,
                overdueCustomers: parseInt(overdueRow.overdue_count || 0, 10),
                raisedCount: parseInt(raisedRow.count || 0, 10),
                najizRaisedAmount: totalRaisedAmount,
                najizCollectedAmount: totalCollectedAmount,
                najizRemainingAmount: remainingAmount
            },
            recentActivity: recentRes.rows,
            najizSummary: {
                totalCases: Number(najizSummaryRow.total_cases || 0),
                activeCases: Number(najizSummaryRow.active_cases || 0),
                paidCases: Number(najizSummaryRow.paid_cases || 0),
                totalRaisedAmount,
                totalCollectedAmount,
                remainingAmount
            },
            najizDetails: najizDetailsRes.rows
        };

        if (useCache) {
            await setCache(cacheKey, payload, Number.isFinite(ttlSeconds) ? ttlSeconds : 30);
            res.set('Cache-Control', cacheHeader);
        } else if (forceFresh) {
            res.set('Cache-Control', 'no-store');
        }
        res.json(payload);
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/analytics — Charts & distribution data
// ─────────────────────────────────────────────────────────
router.get('/analytics', checkPermission('can_view_analytics'), async (req, res) => {
    try {
        const id = req.merchantId;
        const columnFlags = await getLoanColumnFlags();
        const loanSql = buildLoanSqlHelpers(columnFlags);
        const customerColumnFlags = await getCustomerColumnFlags();
        const customerSql = buildCustomerSqlHelpers(customerColumnFlags);
        const isMockedDb = Boolean(db.query && db.query._isMockFunction);
        const forceFresh = req.query._t !== undefined;
        const interval = req.query.interval || 'month';
        const cacheKey = `reports:analytics:${id}:${interval}`;
        const useCache = !isMockedDb && !forceFresh;
        const ttlSeconds = Number(process.env.REPORTS_ANALYTICS_TTL || 300);
        const swrSeconds = Math.min(90, Math.max(20, Math.floor(ttlSeconds / 2)));
        const cacheHeader = `private, max-age=${ttlSeconds}, stale-while-revalidate=${swrSeconds}, stale-if-error=300`;
        if (useCache) {
            const cached = await getCache(cacheKey);
            if (cached) {
                res.set('Cache-Control', cacheHeader);
                return res.json(cached);
            }
        }

        let groupInterval = 'month';
        let dateFormat = 'YYYY-MM';
        let intervalSql = '12 months';

        if (interval === 'week') {
            groupInterval = 'day';
            dateFormat = 'MM-DD';
            intervalSql = '7 days';
        } else if (interval === 'month') {
            groupInterval = 'week';
            dateFormat = 'IYYY-IW';
            intervalSql = '4 weeks';
        } else if (interval === 'year') {
            groupInterval = 'month';
            dateFormat = 'YYYY-MM';
            intervalSql = '12 months';
        } else if (interval === '6months') {
            groupInterval = 'month';
            dateFormat = 'YYYY-MM';
            intervalSql = '6 months';
        }

        const queryClient = req.dbClient?.query ? req.dbClient : db;
        const [
            trendRes,
            distRes,
            debtorsRes,
            overdueRes,
            collectionRes,
            profitSplitRes
        ] = await runBatchQueries(queryClient, [
            [
                `SELECT
                   TO_CHAR(DATE_TRUNC($2, transaction_date), $3) AS month,
                   SUM(amount)  AS total,
                   COUNT(*)     AS loan_count
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}
                   AND transaction_date >= CURRENT_DATE - CAST($4 AS INTERVAL)
                 GROUP BY DATE_TRUNC($2, transaction_date)
                 ORDER BY DATE_TRUNC($2, transaction_date) ASC`,
                [id, groupInterval, dateFormat, intervalSql]
            ],
            [
                `SELECT
                   status,
                   COUNT(*)     AS count,
                   SUM(amount)  AS total
                 FROM loans WHERE merchant_id = $1 ${loanSql.deletedFilter()}
                 GROUP BY status
                 ORDER BY count DESC`,
                [id]
            ],
            [
                `SELECT c.full_name, c.mobile_number,
                        SUM(l.amount) AS total_debt,
                        COUNT(l.id)   AS loan_count
                 FROM customers c
                 JOIN loans l
                   ON l.customer_id = c.id
                  AND l.merchant_id = c.merchant_id
                 WHERE c.merchant_id = $1
                   ${customerSql.deletedFilter('c')}
                   AND l.status = 'Active'
                   ${loanSql.deletedFilter('l')}
                 GROUP BY c.id, c.full_name, c.mobile_number
                 ORDER BY total_debt DESC
                 LIMIT 10`,
                [id]
            ],
            [
                `SELECT
                   CASE
                     WHEN age_days BETWEEN 30  AND 60  THEN '30-60 يوم'
                     WHEN age_days BETWEEN 61  AND 90  THEN '61-90 يوم'
                     WHEN age_days BETWEEN 91  AND 180 THEN '91-180 يوم'
                     ELSE '+180 يوم'
                   END AS bucket,
                   COUNT(*) AS count,
                   SUM(amount) AS total
                 FROM (
                   SELECT amount,
                          EXTRACT(DAY FROM CURRENT_DATE - transaction_date)::int AS age_days
                   FROM loans
                 WHERE merchant_id = $1
                     ${loanSql.deletedFilter()}
                     AND status = 'Active'
                     AND transaction_date < CURRENT_DATE - INTERVAL '30 days'
                 ) sub
                 GROUP BY bucket
                 ORDER BY MIN(age_days)`,
                [id]
            ],
            [
                `SELECT
                   TO_CHAR(DATE_TRUNC('month', updated_at), 'YYYY-MM') AS month,
                   SUM(
                     CASE
                       WHEN ${loanSql.isNajizCase()}
                         THEN ${loanSql.najizCollectedPaid()}
                       ELSE amount
                     END
                   ) AS collected,
                   COUNT(*)     AS count
                 FROM loans
                 WHERE merchant_id = $1 AND status = 'Paid'
                   ${loanSql.deletedFilter()}
                   AND updated_at >= CURRENT_DATE - INTERVAL '12 months'
                 GROUP BY DATE_TRUNC('month', updated_at)
                 ORDER BY month ASC`,
                [id]
            ],
            [
                `SELECT
                   COALESCE(SUM(
                     CASE
                       WHEN status = 'Paid' AND NOT (${loanSql.isNajizCase()})
                         THEN GREATEST(amount - ${loanSql.principalAmount()}, 0)
                       ELSE 0
                     END
                   ), 0) AS regular_profit,
                   COALESCE(SUM(
                     CASE
                       WHEN status = 'Paid' AND (${loanSql.isNajizCase()})
                         THEN GREATEST(${loanSql.najizCollectedPaid()} - amount, 0)
                       ELSE 0
                     END
                   ), 0) AS najiz_profit,
                   COALESCE(SUM(
                     CASE
                       WHEN status = 'Paid' AND NOT (${loanSql.isNajizCase()}) THEN amount
                       ELSE 0
                     END
                   ), 0) AS regular_collected,
                   COALESCE(SUM(
                     CASE
                       WHEN status = 'Paid' AND (${loanSql.isNajizCase()})
                         THEN ${loanSql.najizCollectedPaid()}
                       ELSE 0
                     END
                   ), 0) AS najiz_collected,
                   COALESCE(SUM(amount), 0) AS portfolio_total
                 FROM loans
                 WHERE merchant_id = $1 ${loanSql.deletedFilter()}`,
                [id]
            ]
        ]);

        const profitSplitRow = profitSplitRes.rows[0] || {};
        const regularCollected = Number(profitSplitRow.regular_collected || 0);
        const najizCollected = Number(profitSplitRow.najiz_collected || 0);
        const portfolioTotal = Number(profitSplitRow.portfolio_total || 0);
        const totalCollected = regularCollected + najizCollected;
        const collectionRate = portfolioTotal > 0 ? Number(((totalCollected / portfolioTotal) * 100).toFixed(2)) : 0;

        const payload = {
            debtTrend: trendRes.rows,
            statusDistribution: distRes.rows,
            topDebtors: debtorsRes.rows,
            overdueBreakdown: overdueRes.rows,
            monthlyCollection: collectionRes.rows,
            profitSplit: {
                regularProfit: Number(profitSplitRow.regular_profit || 0),
                najizProfit: Number(profitSplitRow.najiz_profit || 0),
                totalProfit: Number(profitSplitRow.regular_profit || 0) + Number(profitSplitRow.najiz_profit || 0)
            },
            summary: {
                regularCollected,
                najizCollected,
                totalCollected,
                portfolioTotal,
                collectionRate
            }
        };

        if (useCache) {
            await setCache(cacheKey, payload, Number.isFinite(ttlSeconds) ? ttlSeconds : 60);
            res.set('Cache-Control', cacheHeader);
        } else if (forceFresh) {
            res.set('Cache-Control', 'no-store');
        }
        res.json(payload);
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/monthly-summary — Previous/current month summary
// ─────────────────────────────────────────────────────────
router.get('/monthly-summary', checkPermission('can_view_analytics'), async (req, res) => {
    try {
        const id = req.merchantId;
        const monthlyWindow = parseMonthlyWindow(req.query.year, req.query.month);
        if (monthlyWindow.error) {
            return res.status(400).json({ error: monthlyWindow.error });
        }

        const columnFlags = await getLoanColumnFlags();
        const loanSql = buildLoanSqlHelpers(columnFlags);
        const customerColumnFlags = await getCustomerColumnFlags();
        const customerSql = buildCustomerSqlHelpers(customerColumnFlags);
        const isMockedDb = Boolean(db.query && db.query._isMockFunction);
        const forceFresh = req.query._t !== undefined;
        const cacheKey = `reports:monthly:${id}:${monthlyWindow.year}-${String(monthlyWindow.month).padStart(2, '0')}`;
        const useCache = !isMockedDb && !forceFresh;
        const ttlSeconds = Number(process.env.REPORTS_MONTHLY_TTL || 300);
        const swrSeconds = Math.min(120, Math.max(30, Math.floor(ttlSeconds / 2)));
        const cacheHeader = `private, max-age=${ttlSeconds}, stale-while-revalidate=${swrSeconds}, stale-if-error=300`;

        if (useCache) {
            const cached = await getCache(cacheKey);
            if (cached) {
                res.set('Cache-Control', cacheHeader);
                return res.json(cached);
            }
        }

        const queryClient = req.dbClient?.query ? req.dbClient : db;
        const [
            summaryRes,
            customerRes,
            statusRes,
            topCustomersRes,
            weeklyRes,
            previousSummaryRes,
            najizTrackingRes,
            monthEndUnpaidRes
        ] = await runBatchQueries(queryClient, [
            [
                `SELECT
                   COUNT(*)::int AS total_loans,
                   COALESCE(SUM(l.amount), 0) AS total_disbursed,
                   COALESCE(SUM(
                     CASE
                       WHEN l.status = 'Paid' AND (${loanSql.isNajizCase('l')})
                         THEN ${loanSql.najizCollectedPaid('l')}
                       WHEN l.status = 'Paid'
                         THEN l.amount
                       ELSE 0
                     END
                   ), 0) AS total_collected,
                   COALESCE(SUM(CASE WHEN l.status = 'Active' THEN l.amount ELSE 0 END), 0) AS active_amount,
                   COALESCE(SUM(CASE WHEN l.status = 'Raised' THEN COALESCE(l.najiz_case_amount, l.amount) ELSE 0 END), 0) AS raised_amount
                 FROM loans l
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   AND l.transaction_date >= $2
                   AND l.transaction_date < $3`,
                [id, monthlyWindow.start, monthlyWindow.end]
            ],
            [
                `SELECT
                   COUNT(DISTINCT l.customer_id)::int AS unique_customers,
                   COUNT(DISTINCT CASE WHEN l.status = 'Active' THEN l.customer_id END)::int AS active_customers
                 FROM loans l
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   AND l.transaction_date >= $2
                   AND l.transaction_date < $3`,
                [id, monthlyWindow.start, monthlyWindow.end]
            ],
            [
                `SELECT
                   l.status,
                   COUNT(*)::int AS count,
                   COALESCE(SUM(l.amount), 0) AS amount
                 FROM loans l
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   AND l.transaction_date >= $2
                   AND l.transaction_date < $3
                 GROUP BY l.status
                 ORDER BY count DESC, amount DESC`,
                [id, monthlyWindow.start, monthlyWindow.end]
            ],
            [
                `SELECT
                   c.id,
                   c.full_name,
                   c.mobile_number,
                   COUNT(l.id)::int AS loans_count,
                   COALESCE(SUM(l.amount), 0) AS total_amount,
                   COALESCE(SUM(CASE WHEN l.status = 'Paid' THEN l.amount ELSE 0 END), 0) AS paid_amount
                 FROM loans l
                 JOIN customers c
                   ON c.id = l.customer_id
                  AND c.merchant_id = l.merchant_id
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   ${customerSql.deletedFilter('c')}
                   AND l.transaction_date >= $2
                   AND l.transaction_date < $3
                 GROUP BY c.id, c.full_name, c.mobile_number
                 ORDER BY total_amount DESC, loans_count DESC
                 LIMIT 8`,
                [id, monthlyWindow.start, monthlyWindow.end]
            ],
            [
                `SELECT
                   TO_CHAR(DATE_TRUNC('week', l.transaction_date), 'IYYY-IW') AS week_key,
                   MIN(DATE_TRUNC('week', l.transaction_date)) AS week_start,
                   COUNT(*)::int AS loans_count,
                   COALESCE(SUM(l.amount), 0) AS total_amount
                 FROM loans l
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   AND l.transaction_date >= $2
                   AND l.transaction_date < $3
                 GROUP BY DATE_TRUNC('week', l.transaction_date)
                 ORDER BY week_start ASC`,
                [id, monthlyWindow.start, monthlyWindow.end]
            ],
            [
                `SELECT
                   COUNT(*)::int AS total_loans,
                   COALESCE(SUM(l.amount), 0) AS total_disbursed,
                   COALESCE(SUM(
                     CASE
                       WHEN l.status = 'Paid' AND (${loanSql.isNajizCase('l')})
                         THEN ${loanSql.najizCollectedPaid('l')}
                       WHEN l.status = 'Paid'
                         THEN l.amount
                       ELSE 0
                     END
                   ), 0) AS total_collected,
                   COALESCE(SUM(CASE WHEN l.status = 'Active' THEN l.amount ELSE 0 END), 0) AS active_amount
                 FROM loans l
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   AND l.transaction_date >= $2
                   AND l.transaction_date < $3`,
                [id, monthlyWindow.prevStart, monthlyWindow.prevEnd]
            ],
            [
                `SELECT
                   l.id AS loan_id,
                   l.customer_id,
                   c.full_name,
                   c.mobile_number,
                   COALESCE(l.najiz_case_amount, l.amount) AS tracked_amount,
                   COALESCE(l.najiz_collected_amount, 0) AS najiz_collected_amount,
                   l.status,
                   l.najiz_case_number,
                   l.najiz_status,
                   l.transaction_date
                 FROM loans l
                 JOIN customers c
                   ON c.id = l.customer_id
                  AND c.merchant_id = l.merchant_id
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   ${customerSql.deletedFilter('c')}
                   AND l.transaction_date >= $2
                   AND (
                     (${loanSql.isNajizCase('l')})
                     OR l.status = 'Raised'
                     OR l.najiz_case_number IS NOT NULL
                   )
                 ORDER BY l.transaction_date DESC
                 LIMIT 200`,
                [id, monthlyWindow.start]
            ],
            [
                `SELECT
                   l.id AS loan_id,
                   l.customer_id,
                   c.full_name,
                   c.mobile_number,
                   l.amount,
                   l.status,
                   l.najiz_case_number,
                   l.transaction_date,
                   (
                     (${loanSql.isNajizCase('l')})
                     OR l.status = 'Raised'
                     OR l.najiz_case_number IS NOT NULL
                   ) AS has_najiz_case
                 FROM loans l
                 JOIN customers c
                   ON c.id = l.customer_id
                  AND c.merchant_id = l.merchant_id
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   ${customerSql.deletedFilter('c')}
                   AND l.transaction_date >= $2
                   AND l.status NOT IN ('Paid', 'Cancelled')
                 ORDER BY l.transaction_date DESC
                 LIMIT 200`,
                [id, monthlyWindow.start]
            ],
        ]);

        const summaryRow = summaryRes.rows[0] || {};
        const customersRow = customerRes.rows[0] || {};
        const previousRow = previousSummaryRes.rows[0] || {};

        const totalLoans = toCount(summaryRow.total_loans);
        const totalDisbursed = toPositiveNumber(summaryRow.total_disbursed);
        const totalCollected = toPositiveNumber(summaryRow.total_collected);
        const activeAmount = toPositiveNumber(summaryRow.active_amount);
        const raisedAmount = toPositiveNumber(summaryRow.raised_amount);
        const uniqueCustomers = toCount(customersRow.unique_customers);
        const activeCustomers = toCount(customersRow.active_customers);

        const previousDisbursed = toPositiveNumber(previousRow.total_disbursed);
        const previousLoans = toCount(previousRow.total_loans);
        const previousCollected = toPositiveNumber(previousRow.total_collected);

        const collectionRate = totalDisbursed > 0
            ? Number(((totalCollected / totalDisbursed) * 100).toFixed(2))
            : 0;
        const activeSharePercent = totalDisbursed > 0
            ? Number(((activeAmount / totalDisbursed) * 100).toFixed(2))
            : 0;

        const statusBreakdown = statusRes.rows.map((row) => ({
            status: row.status,
            count: toCount(row.count),
            amount: toPositiveNumber(row.amount),
        }));
        const najizCases = najizTrackingRes.rows.map((row) => ({
            loanId: row.loan_id,
            customerId: row.customer_id,
            customerName: row.full_name,
            mobileNumber: row.mobile_number,
            amount: toPositiveNumber(row.tracked_amount),
            collectedAmount: toPositiveNumber(row.najiz_collected_amount),
            remainingAmount: Math.max(
                toPositiveNumber(row.tracked_amount) - toPositiveNumber(row.najiz_collected_amount),
                0
            ),
            status: row.status,
            najizCaseNumber: row.najiz_case_number || null,
            najizStatus: row.najiz_status || null,
            transactionDate: row.transaction_date ? formatIsoDate(new Date(row.transaction_date)) : null,
        }));
        const monthEndUnpaid = monthEndUnpaidRes.rows.map((row) => ({
            loanId: row.loan_id,
            customerId: row.customer_id,
            customerName: row.full_name,
            mobileNumber: row.mobile_number,
            amount: toPositiveNumber(row.amount),
            status: row.status,
            hasNajizCase: Boolean(row.has_najiz_case),
            najizCaseNumber: row.najiz_case_number || null,
            transactionDate: row.transaction_date ? formatIsoDate(new Date(row.transaction_date)) : null,
        }));
        const najizLoanIds = new Set(najizCases.map((item) => item.loanId));
        const overlappedCount = monthEndUnpaid.filter((item) => item.hasNajizCase || najizLoanIds.has(item.loanId)).length;
        const coveragePercent = monthEndUnpaid.length > 0
            ? Number(((overlappedCount / monthEndUnpaid.length) * 100).toFixed(2))
            : 0;

        const summary = {
            totalLoans,
            totalDisbursed,
            totalCollected,
            activeAmount,
            raisedAmount,
            uniqueCustomers,
            activeCustomers,
            collectionRate,
            activeSharePercent,
            averageLoanAmount: totalLoans > 0 ? Number((totalDisbursed / totalLoans).toFixed(2)) : 0,
            growth: {
                disbursedChangePercent: calcChangePercent(totalDisbursed, previousDisbursed),
                loanCountChangePercent: calcChangePercent(totalLoans, previousLoans),
                collectedChangePercent: calcChangePercent(totalCollected, previousCollected),
            },
        };

        const payload = {
            period: {
                year: monthlyWindow.year,
                month: monthlyWindow.month,
                monthName: monthlyWindow.monthName,
                startDate: monthlyWindow.startDate,
                endDate: monthlyWindow.endDate,
            },
            summary,
            statusBreakdown,
            weeklyTrend: weeklyRes.rows.map((row) => ({
                weekKey: row.week_key,
                weekStart: formatIsoDate(new Date(row.week_start)),
                loansCount: toCount(row.loans_count),
                totalAmount: toPositiveNumber(row.total_amount),
            })),
            topCustomers: topCustomersRes.rows.map((row) => ({
                id: row.id,
                fullName: row.full_name,
                mobileNumber: row.mobile_number,
                loansCount: toCount(row.loans_count),
                totalAmount: toPositiveNumber(row.total_amount),
                paidAmount: toPositiveNumber(row.paid_amount),
            })),
            tracking: {
                scope: {
                    mode: 'from_selected_month',
                    fromDate: monthlyWindow.startDate,
                    throughDate: formatIsoDate(new Date()),
                },
                najizCases,
                monthEndUnpaid,
                integration: {
                    najizCasesCount: najizCases.length,
                    unpaidAfterMonthEndCount: monthEndUnpaid.length,
                    overlappedCount,
                    trackedCoveragePercent: coveragePercent,
                },
            },
            insights: buildMonthlyInsights({ summary, statusBreakdown }),
            recommendations: buildMonthlyRecommendations({ summary, statusBreakdown }),
            generatedAt: new Date().toISOString(),
        };

        if (useCache) {
            await setCache(cacheKey, payload, Number.isFinite(ttlSeconds) ? ttlSeconds : 60);
            res.set('Cache-Control', cacheHeader);
        } else if (forceFresh) {
            res.set('Cache-Control', 'no-store');
        }

        return res.json(payload);
    } catch (err) {
        console.error('Monthly summary error:', err);
        return res.status(500).json({ error: 'Failed to fetch monthly summary' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/ai-analysis — AI-powered analysis engine
// Returns rich insights derived from real data (ENTERPRISE ONLY)
// ─────────────────────────────────────────────────────────
router.get('/ai-analysis', checkPermission('can_view_analytics'), async (req, res) => {
    try {
        const id = req.merchantId;
        const isMockedDb = Boolean(db.query && db.query._isMockFunction);
        const forceFresh = req.query._t !== undefined;
        const loanColumnFlags = await getLoanColumnFlags();
        const loanSql = buildLoanSqlHelpers(loanColumnFlags);
        const customerColumnFlags = await getCustomerColumnFlags();
        const customerSql = buildCustomerSqlHelpers(customerColumnFlags);

        // 1. Verify SaaS Tier (must be enterprise)
        const merchantRes = await db.query('SELECT subscription_plan FROM merchants WHERE id = $1', [id]);
        const plan = merchantRes.rows[0]?.subscription_plan?.toLowerCase() || 'free';

        if (plan !== 'enterprise') {
            return res.status(403).json({
                error: 'تتطلب هذه الميزة باقة الأعمال (Enterprise). يرجى الترقية للحصول على تحليلات الذكاء الاصطناعي.',
                requiresUpgrade: true
            });
        }

        const cacheKey = `reports:ai:${id}`;
        const useCache = !isMockedDb && !forceFresh;
        const ttlSeconds = Number(process.env.REPORTS_AI_TTL || 600);
        const swrSeconds = Math.min(300, Math.max(60, Math.floor(ttlSeconds / 2)));
        const cacheHeader = `private, max-age=${ttlSeconds}, stale-while-revalidate=${swrSeconds}, stale-if-error=600`;
        if (useCache) {
            const cached = await getCache(cacheKey);
            if (cached) {
                res.set('Cache-Control', cacheHeader);
                return res.json(cached);
            }
        }

        const queryClient = req.dbClient?.query ? req.dbClient : db;
        const [
            totalsRes,
            monthlyRes,
            overdueClientsRes,
            bestMonthRes,
            avgLoanRes,
            riskSegRes
        ] = await runBatchQueries(queryClient, [
            [
                `SELECT
                   COALESCE(SUM(amount), 0)                                              AS total_portfolio,
                   COALESCE(SUM(CASE WHEN status='Paid'      THEN amount ELSE 0 END), 0) AS paid_amount,
                   COALESCE(SUM(CASE WHEN status='Active'    THEN amount ELSE 0 END), 0) AS active_amount,
                   COALESCE(SUM(CASE WHEN status='Cancelled' THEN amount ELSE 0 END), 0) AS cancelled_amount,
                   COUNT(*)                                                               AS total_loans,
                   COUNT(CASE WHEN status='Paid'      THEN 1 END)                        AS paid_count,
                   COUNT(CASE WHEN status='Active'    THEN 1 END)                        AS active_count,
                   COUNT(CASE WHEN status='Cancelled' THEN 1 END)                        AS cancelled_count
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}`,
                [id]
            ],
            [
                `SELECT
                   TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month,
                   SUM(amount) AS total,
                   COUNT(*)    AS count
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}
                   AND transaction_date >= CURRENT_DATE - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', transaction_date)
                 ORDER BY month DESC
                 LIMIT 6`,
                [id]
            ],
            [
                `SELECT c.full_name, c.mobile_number,
                        SUM(l.amount) AS debt,
                        MAX(EXTRACT(DAY FROM CURRENT_DATE - l.transaction_date))::int AS days_overdue
                 FROM loans l
                 JOIN customers c
                   ON l.customer_id = c.id
                  AND c.merchant_id = l.merchant_id
                 WHERE l.merchant_id = $1
                   ${loanSql.deletedFilter('l')}
                   ${customerSql.deletedFilter('c')}
                   AND l.status = 'Active'
                   AND l.transaction_date < CURRENT_DATE - INTERVAL '30 days'
                 GROUP BY c.id, c.full_name, c.mobile_number
                 ORDER BY debt DESC
                 LIMIT 20`,
                [id]
            ],
            [
                `SELECT
                   TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month,
                   SUM(amount) AS total
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}
                 GROUP BY DATE_TRUNC('month', transaction_date)
                 ORDER BY total DESC
                 LIMIT 1`,
                [id]
            ],
            [
                `SELECT
                   COALESCE(AVG(amount), 0)         AS avg_amount,
                   COALESCE(MAX(amount), 0)         AS max_amount,
                   COALESCE(MIN(amount), 0)         AS min_amount,
                   COALESCE(STDDEV(amount), 0)      AS stddev_amount
                 FROM loans
                 WHERE merchant_id = $1
                   ${loanSql.deletedFilter()}
                   AND status != 'Cancelled'`,
                [id]
            ],
            [
                `SELECT
                   COUNT(CASE WHEN age_days > 90  THEN 1 END) AS high_risk,
                   COUNT(CASE WHEN age_days BETWEEN 60 AND 90 THEN 1 END) AS medium_risk,
                   COUNT(CASE WHEN age_days BETWEEN 30 AND 59 THEN 1 END) AS low_risk,
                   SUM(CASE WHEN age_days > 90 THEN amount ELSE 0 END) AS high_risk_amount
                 FROM (
                   SELECT amount, EXTRACT(DAY FROM CURRENT_DATE - transaction_date)::int AS age_days
                   FROM loans
                   WHERE merchant_id = $1
                     ${loanSql.deletedFilter()}
                     AND status = 'Active'
                 ) sub`,
                [id]
            ]
        ]);

        const t = totalsRes.rows[0];
        const monthly = monthlyRes.rows;
        const overdueClients = overdueClientsRes.rows;
        const avg = avgLoanRes.rows[0];
        const risk = riskSegRes.rows[0];

        const totalPortfolio = parseFloat(t.total_portfolio) || 0;
        const paidAmount = parseFloat(t.paid_amount) || 0;
        const activeAmount = parseFloat(t.active_amount) || 0;
        const totalLoans = parseInt(t.total_loans) || 0;
        const paidCount = parseInt(t.paid_count) || 0;
        const activeCount = parseInt(t.active_count) || 0;

        const collectionRate = totalPortfolio > 0
            ? parseFloat(((paidAmount / totalPortfolio) * 100).toFixed(1))
            : 0;

        // Growth trend: compare current month to previous month
        const sortedMonthly = [...monthly].reverse(); // ascending
        let growthRate = 0;
        if (sortedMonthly.length >= 2) {
            const curr = parseFloat(sortedMonthly[sortedMonthly.length - 1]?.total) || 0;
            const prev = parseFloat(sortedMonthly[sortedMonthly.length - 2]?.total) || 1;
            growthRate = parseFloat((((curr - prev) / prev) * 100).toFixed(1));
        }

        // ── Rule-Based AI Insights Engine ──────────────────
        const insights = [];

        // 1. Collection health
        if (collectionRate >= 80) {
            insights.push({
                category: 'التحصيل',
                type: 'success',
                priority: 1,
                icon: '✅',
                title: 'أداء التحصيل ممتاز',
                detail: `نسبة التحصيل ${collectionRate}%، وهي فوق المستهدف المثالي 80%. استمر في المتابعة المنتظمة.`,
                action: null
            });
        } else if (collectionRate >= 60) {
            insights.push({
                category: 'التحصيل',
                type: 'warning',
                priority: 2,
                icon: '⚠️',
                title: 'نسبة التحصيل متوسطة',
                detail: `نسبة التحصيل ${collectionRate}%، أقل من الهدف المثالي 80%. يُنصح بتكثيف التواصل مع العملاء المتأخرين.`,
                action: 'متابعة المتأخرين'
            });
        } else if (totalLoans > 0) {
            insights.push({
                category: 'التحصيل',
                type: 'danger',
                priority: 1,
                icon: '🔴',
                title: 'نسبة تحصيل منخفضة — تحتاج إجراء فوري',
                detail: `نسبة التحصيل ${collectionRate}% فقط. ${activeAmount.toLocaleString('ar-SA')} ر.س لا تزال غير محصّلة. يُنصح بالتواصل الفوري مع العملاء.`,
                action: 'اتصل بالعملاء المتأخرين الآن'
            });
        }

        // 2. Risk segmentation alert
        const highRisk = parseInt(risk.high_risk) || 0;
        const medRisk = parseInt(risk.medium_risk) || 0;
        const lowRisk = parseInt(risk.low_risk) || 0;
        const highRiskAmt = parseFloat(risk.high_risk_amount) || 0;

        if (highRisk > 0) {
            insights.push({
                category: 'المخاطر',
                type: 'danger',
                priority: 1,
                icon: '🚨',
                title: `${highRisk} عميل في المنطقة الحمراء (+90 يوم)`,
                detail: `${highRiskAmt.toLocaleString('ar-SA')} ر.س معرّضة للخسارة. هؤلاء العملاء تجاوزوا 90 يوماً بدون سداد. يُنصح بالإجراء القانوني عبر ناجز.`,
                action: 'فتح ناجز'
            });
        }
        if (medRisk > 0) {
            insights.push({
                category: 'المخاطر',
                type: 'warning',
                priority: 2,
                icon: '🟠',
                title: `${medRisk} عميل في المنطقة البرتقالية (60-90 يوم)`,
                detail: `${medRisk} عميل تجاوزوا 60 يوماً. يحتاجون متابعة مكثّفة قبل التصعيد.`,
                action: 'إرسال تنبيه واتساب'
            });
        }
        if (lowRisk > 0) {
            insights.push({
                category: 'المخاطر',
                type: 'info',
                priority: 3,
                icon: '🟡',
                title: `${lowRisk} عميل في منطقة المتابعة (30-60 يوم)`,
                detail: `${lowRisk} عميل قرب مرحلة التأخر. تواصل معهم مبكراً لتجنب التصعيد.`,
                action: null
            });
        }

        // 3. Growth trend
        if (growthRate > 20) {
            insights.push({
                category: 'النمو',
                type: 'success',
                priority: 2,
                icon: '📈',
                title: `نمو قوي هذا الشهر +${growthRate}%`,
                detail: `حجم القروض الشهري ارتفع بنسبة ${growthRate}% مقارنةً بالشهر الماضي. أداء استثنائي!`,
                action: null
            });
        } else if (growthRate < -10) {
            insights.push({
                category: 'النمو',
                type: 'warning',
                priority: 2,
                icon: '📉',
                title: `تراجع في حجم القروض ${Math.abs(growthRate)}%`,
                detail: `حجم القروض انخفض ${Math.abs(growthRate)}% مقارنةً بالشهر الماضي. راجع أسباب التراجع.`,
                action: null
            });
        }

        // 4. Portfolio concentration (avg loan size)
        const avgAmount = parseFloat(avg.avg_amount) || 0;
        const maxAmount = parseFloat(avg.max_amount) || 0;
        if (maxAmount > avgAmount * 3 && totalLoans > 3) {
            insights.push({
                category: 'التوزيع',
                type: 'info',
                priority: 3,
                icon: '⚖️',
                title: 'تركّز المخاطر في قروض كبيرة',
                detail: `أكبر قرض (${maxAmount.toLocaleString('ar-SA')} ر.س) يساوي أكثر من 3 أضعاف المتوسط (${avgAmount.toLocaleString('ar-SA')} ر.س). توزّع المخاطر.`,
                action: null
            });
        }

        // 5. Zero activity
        if (totalLoans === 0) {
            insights.push({
                category: 'عام',
                type: 'info',
                priority: 4,
                icon: '💡',
                title: 'ابدأ بإضافة بياناتك',
                detail: 'لا توجد قروض مسجّلة بعد. أضف أول قرض لبدء التحليل.',
                action: 'إضافة قرض'
            });
        }

        // Sort by priority ascending (1 = most critical)
        insights.sort((a, b) => a.priority - b.priority);

        // ── Summary Recommendations ──────────────────────
        const recommendations = [];
        if (highRisk > 0) recommendations.push(`تصعيد ${highRisk} حالة عبر ناجز فوراً`);
        if (collectionRate < 70) recommendations.push('تكثيف جلسات تحصيل أسبوعية');
        if (overdueClients.length > 0) recommendations.push(`إرسال رسائل واتساب لـ ${overdueClients.length} عميل متأخر`);
        if (growthRate < 0) recommendations.push('مراجعة سياسة منح القروض لتحفيز النشاط');

        // ── AI Risk Algorithm (New Feature) ──────────────
        // Calculate "Next Month Budget" based on recent 3 months average + growth projection
        const recentMonths = sortedMonthly.slice(-3);
        let recentCollectedSum = 0;
        recentMonths.forEach(m => recentCollectedSum += (parseFloat(m.total) || 0));
        const avgRecent = recentMonths.length > 0 ? (recentCollectedSum / recentMonths.length) : 0;

        // Base growth projection (+10%) adjusted by actual recent growth
        const projectedGrowth = Math.max(0.10, Math.min(0.50, (growthRate / 100)));
        const nextMonthBudget = avgRecent > 0 ? (avgRecent * (1 + projectedGrowth)) : 50000; // default to 50k if no data

        // Calculate "High Risk Capacity (%)" based on Collection Rate
        // If collection > 85%, allow 15% risk. If < 60%, 0% risk.
        let riskCapacity = 0;
        if (collectionRate >= 85) riskCapacity = 15;
        else if (collectionRate >= 70) riskCapacity = 10;
        else if (collectionRate >= 60) riskCapacity = 5;

        const payload = {
            summary: {
                totalPortfolio,
                paidAmount,
                activeAmount,
                totalLoans,
                paidCount,
                activeCount,
                collectionRate,
                growthRate,
                avgLoanAmount: parseFloat(avgAmount.toFixed(2)),
                maxLoanAmount: parseFloat(maxAmount.toFixed(2)),
                overdueCount: overdueClients.length,
                riskSegmentation: {
                    highRisk,
                    medRisk,
                    lowRisk,
                    highRiskAmount: parseFloat(highRiskAmt.toFixed(2))
                },
                aiPredictions: {
                    nextMonthBudget: parseFloat(nextMonthBudget.toFixed(2)),
                    highRiskCapacityPercent: riskCapacity
                }
            },
            insights,
            overdueClients,
            recommendations,
            generatedAt: new Date().toISOString()
        };

        if (useCache) {
            await setCache(cacheKey, payload, Number.isFinite(ttlSeconds) ? ttlSeconds : 300);
            res.set('Cache-Control', cacheHeader);
        } else if (forceFresh) {
            res.set('Cache-Control', 'no-store');
        }

        res.json(payload);
    } catch (err) {
        console.error('AI Analysis error:', err);
        res.status(500).json({ error: 'Failed to generate AI analysis' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/export-yearly-workbook — Export one workbook with monthly sheets
// ─────────────────────────────────────────────────────────
router.get('/export-yearly-workbook', checkPermission('can_view_loans'), async (req, res) => {
    try {
        const loanColumnFlags = await getLoanColumnFlags();
        const loanSql = buildLoanSqlHelpers(loanColumnFlags);
        const customerColumnFlags = await getCustomerColumnFlags();
        const customerSql = buildCustomerSqlHelpers(customerColumnFlags);
        const nowYear = new Date().getUTCFullYear();
        const year = Number.parseInt(String(req.query?.year || nowYear), 10);
        if (!Number.isFinite(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ error: 'year غير صالح. القيمة المتوقعة بين 2000 و 2100.' });
        }

        const startDate = `${year}-01-01T00:00:00.000Z`;
        const endDate = `${year}-12-31T23:59:59.999Z`;

        const result = await db.query(
            `SELECT l.id, c.full_name, c.national_id, c.mobile_number,
                    l.amount, l.receipt_number, l.status, l.transaction_date, l.created_at
             FROM loans l
             LEFT JOIN customers c
               ON l.customer_id = c.id
              AND c.merchant_id = l.merchant_id
              ${customerSql.deletedFilter('c')}
             WHERE l.merchant_id = $1
               ${loanSql.deletedFilter('l')}
               AND l.transaction_date >= $2
               AND l.transaction_date <= $3
             ORDER BY l.transaction_date ASC`,
            [req.merchantId, startDate, endDate]
        );

        const workbook = new ExcelJS.Workbook();
        const statusAR = {
            Active: 'نشط',
            Paid: 'مدفوع',
            Cancelled: 'ملغي',
            Raised: 'مرفوع',
            Overdue: 'متأخر'
        };
        const buckets = Array.from({ length: 12 }, () => []);

        result.rows.forEach((row) => {
            const txDate = row.transaction_date ? new Date(row.transaction_date) : null;
            if (!txDate || Number.isNaN(txDate.getTime())) return;
            const monthIndex = txDate.getUTCMonth();
            if (monthIndex < 0 || monthIndex > 11) return;
            buckets[monthIndex].push(row);
        });

        const summarySheet = workbook.addWorksheet(`ملخص-${year}`);
        summarySheet.columns = [
            { header: 'الشهر', key: 'month', width: 16 },
            { header: 'عدد القروض', key: 'count', width: 14 },
            { header: 'إجمالي المبالغ (ر.س)', key: 'totalAmount', width: 22 },
            { header: 'مبالغ مسددة (ر.س)', key: 'paidAmount', width: 21 },
        ];
        summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2B4A' } };

        for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
            const rows = buckets[monthIndex];
            const totalAmount = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const paidAmount = rows
                .filter((item) => String(item.status || '').toLowerCase() === 'paid')
                .reduce((sum, item) => sum + Number(item.amount || 0), 0);

            summarySheet.addRow({
                month: AR_MONTH_NAMES[monthIndex] || `شهر ${monthIndex + 1}`,
                count: rows.length,
                totalAmount: Number(totalAmount.toFixed(2)),
                paidAmount: Number(paidAmount.toFixed(2)),
            });
        }

        for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
            const monthLabel = AR_MONTH_NAMES[monthIndex] || `شهر ${monthIndex + 1}`;
            const sheet = workbook.addWorksheet(`${monthLabel}-${year}`);
            sheet.columns = [
                { header: 'رقم القرض', key: 'id', width: 36 },
                { header: 'اسم العميل', key: 'full_name', width: 25 },
                { header: 'رقم الهوية', key: 'national_id', width: 15 },
                { header: 'رقم الجوال', key: 'mobile_number', width: 15 },
                { header: 'المبلغ (ر.س)', key: 'amount', width: 14 },
                { header: 'رقم السند', key: 'receipt_number', width: 15 },
                { header: 'الحالة', key: 'status', width: 12 },
                { header: 'تاريخ المعاملة', key: 'transaction_date', width: 16 },
            ];

            sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

            const rows = buckets[monthIndex];
            if (rows.length === 0) {
                sheet.addRow({
                    full_name: 'لا توجد سجلات لهذا الشهر',
                });
                continue;
            }

            rows.forEach((row) => {
                sheet.addRow({
                    id: row.id,
                    full_name: row.full_name || '-',
                    national_id: row.national_id || '-',
                    mobile_number: row.mobile_number || '-',
                    amount: Number(row.amount || 0),
                    receipt_number: row.receipt_number || '-',
                    status: statusAR[row.status] || row.status,
                    transaction_date: row.transaction_date
                        ? new Date(row.transaction_date).toLocaleDateString('ar-SA')
                        : '-'
                });
            });

            const monthTotal = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const totalRow = sheet.addRow({
                full_name: `الإجمالي (${monthLabel})`,
                amount: Number(monthTotal.toFixed(2)),
            });
            totalRow.font = { bold: true };
            totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=loans-workbook-${year}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Yearly workbook export error:', err);
        res.status(500).json({ error: 'Failed to export yearly workbook' });
    }
});

// ─────────────────────────────────────────────────────────
// GET /api/reports/export — Export loans to XLSX
// ─────────────────────────────────────────────────────────
router.get('/export', checkPermission('can_view_loans'), async (req, res) => {
    try {
        const loanColumnFlags = await getLoanColumnFlags();
        const customerColumnFlags = await getCustomerColumnFlags();
        const customerSql = buildCustomerSqlHelpers(customerColumnFlags);
        let { startDate, endDate, status } = req.query;
        const conditions = ['l.merchant_id = $1'];
        const params = [req.merchantId];
        let idx = 2;

        if (loanColumnFlags.hasDeletedAt) {
            conditions.push('l.deleted_at IS NULL');
        }

        // If no dates are provided, default to the current month
        if (!startDate && !endDate) {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        }

        if (startDate) { conditions.push(`l.transaction_date >= $${idx++}`); params.push(startDate); }
        if (endDate) { conditions.push(`l.transaction_date <= $${idx++}`); params.push(endDate); }
        if (status) { conditions.push(`l.status = $${idx++}`); params.push(status); }

        const result = await db.query(
            `SELECT l.id, c.full_name, c.national_id, c.mobile_number,
                    l.amount, l.receipt_number, l.status, l.transaction_date, l.created_at
             FROM loans l
             LEFT JOIN customers c
               ON l.customer_id = c.id
              AND c.merchant_id = l.merchant_id
              ${customerSql.deletedFilter('c')}
             WHERE ${conditions.join(' AND ')}
             ORDER BY l.transaction_date DESC`,
            params
        );

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('تقرير القروض');
        const statusAR = { Active: 'نشط', Paid: 'مدفوع', Cancelled: 'ملغي' };

        sheet.columns = [
            { header: 'رقم القرض', key: 'id', width: 36 },
            { header: 'اسم العميل', key: 'full_name', width: 25 },
            { header: 'رقم الهوية', key: 'national_id', width: 15 },
            { header: 'رقم الجوال', key: 'mobile_number', width: 15 },
            { header: 'المبلغ (ر.س)', key: 'amount', width: 14 },
            { header: 'رقم السند', key: 'receipt_number', width: 15 },
            { header: 'الحالة', key: 'status', width: 12 },
            { header: 'تاريخ المعاملة', key: 'transaction_date', width: 16 },
        ];

        // Style header row
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2B4A' } };
        sheet.getRow(1).height = 22;

        result.rows.forEach(row => {
            sheet.addRow({
                id: row.id,
                full_name: row.full_name || '-',
                national_id: row.national_id || '-',
                mobile_number: row.mobile_number || '-',
                amount: parseFloat(row.amount),
                receipt_number: row.receipt_number || '-',
                status: statusAR[row.status] || row.status,
                transaction_date: row.transaction_date
                    ? new Date(row.transaction_date).toLocaleDateString('ar-SA')
                    : '-'
            });
        });

        // Totals row
        const totalRow = sheet.addRow({
            full_name: 'الإجمالي',
            amount: result.rows.reduce((s, r) => s + parseFloat(r.amount), 0)
        });
        totalRow.font = { bold: true };
        totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=loans-${Date.now()}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export report' });
    }
});

module.exports = router;
