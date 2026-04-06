const { DEFAULT_MERCHANT } = require('./auth');

const CORS_HEADERS = {
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Merchant-ID',
};

const now = new Date();
const iso = (date) => new Date(date).toISOString();
const dateOnly = (date) => iso(date).slice(0, 10);

function sanitizeDigits(value) {
    return String(value || '').replace(/\D/g, '');
}

function whatsappLink(mobile) {
    const clean = sanitizeDigits(mobile);
    return clean ? `https://wa.me/${clean}` : null;
}

function najizLink(nationalId) {
    const clean = String(nationalId || '').trim();
    return clean
        ? `https://www.najiz.sa/applications/landing/verification?id=${encodeURIComponent(clean)}`
        : null;
}

function parseBody(request) {
    try {
        return request.postDataJSON();
    } catch {
        try {
            return JSON.parse(request.postData() || '{}');
        } catch {
            return {};
        }
    }
}

function monthKey(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? dateOnly(now).slice(0, 7) : d.toISOString().slice(0, 7);
}

function createInitialState(overrides = {}) {
    const customers = [
        {
            id: 'cust-1',
            full_name: 'أحمد علي',
            national_id: '1234567890',
            mobile_number: '0500000001',
            email: 'ahmad@example.com',
        },
        {
            id: 'cust-2',
            full_name: 'سارة محمد',
            national_id: '2234567890',
            mobile_number: '0500000002',
            email: 'sarah@example.com',
        },
        {
            id: 'cust-3',
            full_name: 'عبدالله ناصر',
            national_id: '3234567890',
            mobile_number: '0500000003',
            email: 'abdullah@example.com',
        },
    ];

    const loans = [
        {
            id: 'loan-1',
            customer_id: 'cust-1',
            amount: 1500,
            principal_amount: 1200,
            profit_percentage: 25,
            receipt_number: 'R-100',
            status: 'Active',
            transaction_date: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)),
            created_at: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)),
            notes: 'دين نشط',
            is_najiz_case: false,
            najiz_case_number: null,
            najiz_case_amount: null,
            najiz_collected_amount: null,
            najiz_status: null,
            najiz_plaintiff_name: null,
            najiz_plaintiff_national_id: null,
            najiz_raised_date: null,
            deleted: false,
        },
        {
            id: 'loan-2',
            customer_id: 'cust-2',
            amount: 2600,
            principal_amount: 2000,
            profit_percentage: 30,
            receipt_number: 'R-200',
            status: 'Raised',
            transaction_date: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15)),
            created_at: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15)),
            notes: 'قضية ناجز',
            is_najiz_case: true,
            najiz_case_number: 'NJZ-2026-22',
            najiz_case_amount: 2600,
            najiz_collected_amount: 500,
            najiz_status: 'قيد التنفيذ',
            najiz_plaintiff_name: 'سارة محمد',
            najiz_plaintiff_national_id: '2234567890',
            najiz_raised_date: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12)),
            deleted: false,
        },
        {
            id: 'loan-3',
            customer_id: 'cust-3',
            amount: 1800,
            principal_amount: 1500,
            profit_percentage: 20,
            receipt_number: 'R-300',
            status: 'Paid',
            transaction_date: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)),
            created_at: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)),
            notes: 'تم السداد',
            is_najiz_case: true,
            najiz_case_number: 'NJZ-2026-12',
            najiz_case_amount: 1800,
            najiz_collected_amount: 1800,
            najiz_status: 'مغلقة',
            najiz_plaintiff_name: 'عبدالله ناصر',
            najiz_plaintiff_national_id: '3234567890',
            najiz_raised_date: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28)),
            deleted: false,
        },
    ];

    return {
        merchant: { ...DEFAULT_MERCHANT, ...(overrides.merchant || {}) },
        profile: {
            username: 'owner',
            business_name: 'متجر الاختبار',
            email: 'owner@example.com',
            mobile_number: '0500000099',
            whatsapp_phone_id: '99887766',
            ...(overrides.profile || {}),
        },
        employees: [
            {
                id: 'emp-1',
                full_name: 'موظف المبيعات',
                email: 'employee@example.com',
                permissions: {
                    can_view_loans: true,
                    can_add_loans: true,
                    can_view_customers: true,
                    can_view_analytics: false,
                },
            },
        ],
        customers,
        loans,
        requestLog: [],
    };
}

function findCustomer(state, id) {
    return state.customers.find((customer) => customer.id === id) || null;
}

function decorateLoan(state, loan) {
    const customer = findCustomer(state, loan.customer_id);
    return {
        ...loan,
        customer_name: customer?.full_name || 'غير محدد',
        national_id: customer?.national_id || '',
        mobile_number: customer?.mobile_number || '',
        whatsappLink: whatsappLink(customer?.mobile_number),
        najizLink: najizLink(customer?.national_id),
    };
}

function customerDebt(state, customerId) {
    return state.loans
        .filter((loan) => !loan.deleted && loan.customer_id === customerId && !['Paid', 'Cancelled'].includes(loan.status))
        .reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
}

function decorateCustomer(state, customer) {
    const debt = customerDebt(state, customer.id);
    return {
        ...customer,
        total_debt: debt.toFixed(2),
        status: debt > 0 ? 'Overdue' : 'Paid',
        whatsappLink: whatsappLink(customer.mobile_number),
        najizLink: najizLink(customer.national_id),
    };
}

function makeDashboardMetrics(state) {
    const activeOrRaised = state.loans.filter((loan) => !loan.deleted && ['Active', 'Raised', 'Overdue'].includes(loan.status));
    const totalDebt = activeOrRaised.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const paidTotal = state.loans
        .filter((loan) => !loan.deleted && loan.status === 'Paid')
        .reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const allTotal = state.loans.filter((loan) => !loan.deleted).reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
    const raisedCount = state.loans.filter((loan) => !loan.deleted && loan.status === 'Raised').length;
    const overdueCustomers = state.customers.filter((customer) => customerDebt(state, customer.id) > 0).length;
    const thisMonth = dateOnly(now).slice(0, 7);
    const loansThisMonth = state.loans.filter((loan) => !loan.deleted && monthKey(loan.transaction_date) === thisMonth).length;

    return {
        totalDebt: totalDebt.toFixed(2),
        totalCustomers: state.customers.length,
        activeCustomers: state.customers.filter((customer) => customerDebt(state, customer.id) > 0).length,
        loansThisMonth,
        raisedCount,
        overdueCustomers,
        collectionRate: allTotal > 0 ? Number(((paidTotal / allTotal) * 100).toFixed(1)) : 0,
    };
}

function makeAnalytics(state) {
    const loans = state.loans.filter((loan) => !loan.deleted);
    const monthly = new Map();
    loans.forEach((loan) => {
        const key = monthKey(loan.transaction_date);
        const existing = monthly.get(key) || { month: key, total: 0, loan_count: 0 };
        existing.total += Number(loan.amount || 0);
        existing.loan_count += 1;
        monthly.set(key, existing);
    });
    const debtTrend = Array.from(monthly.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((item) => ({
            month: item.month,
            total: item.total.toFixed(2),
            loan_count: String(item.loan_count),
        }));

    const statuses = ['Active', 'Raised', 'Paid', 'Cancelled'];
    const statusDistribution = statuses.map((status) => {
        const rows = loans.filter((loan) => loan.status === status);
        return {
            status,
            count: String(rows.length),
            total: rows.reduce((sum, loan) => sum + Number(loan.amount || 0), 0).toFixed(2),
        };
    });

    return { debtTrend, statusDistribution };
}

function makeAiAnalysis(state) {
    const overdueClients = state.customers
        .map((customer) => {
            const openLoans = state.loans.filter((loan) => !loan.deleted && loan.customer_id === customer.id && ['Active', 'Raised'].includes(loan.status));
            if (openLoans.length === 0) return null;
            const debt = openLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
            return {
                full_name: customer.full_name,
                mobile_number: customer.mobile_number,
                debt: debt.toFixed(2),
                days_overdue: customer.id === 'cust-1' ? 95 : 45,
            };
        })
        .filter(Boolean);

    return {
        generatedAt: now.toISOString(),
        summary: {
            growthRate: 12,
            riskSegmentation: {
                highRisk: overdueClients.filter((client) => client.days_overdue > 90).length,
                medRisk: overdueClients.filter((client) => client.days_overdue > 60 && client.days_overdue <= 90).length,
                lowRisk: overdueClients.filter((client) => client.days_overdue <= 60).length,
            },
            aiPredictions: {
                nextMonthBudget: 25000,
                highRiskCapacityPercent: 35,
            },
        },
        insights: [
            {
                type: 'warning',
                category: 'تحصيل',
                title: 'ارتفاع المتأخرات',
                detail: 'لاحظنا زيادة في العملاء المتأخرين لأكثر من 30 يوم.',
                action: 'تابع العملاء ذوي المخاطر العالية أولاً',
            },
            {
                type: 'success',
                category: 'الأداء',
                title: 'تحسن معدل التحصيل',
                detail: 'نسبة التحصيل العامة أعلى من الشهر الماضي.',
            },
        ],
        recommendations: [
            'إرسال تذكيرات واتساب يومية للعملاء المتأخرين.',
            'إعادة جدولة العملاء ذوي التعثر المتوسط.',
        ],
        overdueClients,
    };
}

function paginate(items, page, limit) {
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);
    return {
        page,
        limit,
        totalCount: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / limit)),
        hasMore: start + limit < items.length,
        items: paged,
    };
}

function loanById(state, id) {
    return state.loans.find((loan) => loan.id === id && !loan.deleted) || null;
}

async function installMockApi(page, options = {}) {
    const state = createInitialState(options);

    await page.route('**/*', async (route) => {
        const request = route.request();
        const method = request.method().toUpperCase();
        const url = new URL(request.url());
        const apiIndex = url.pathname.indexOf('/api/');

        if (apiIndex === -1) {
            return route.continue();
        }

        const origin = request.headers().origin || 'http://127.0.0.1:3000';
        const withCors = (headers = {}) => ({
            ...CORS_HEADERS,
            'access-control-allow-origin': origin,
            vary: 'Origin',
            ...headers,
        });

        if (method === 'OPTIONS') {
            return route.fulfill({
                status: 204,
                headers: withCors(),
            });
        }

        const path = url.pathname.slice(apiIndex + 4);
        const body = parseBody(request);
        state.requestLog.push({ method, path, body });

        const json = (status, payload) => route.fulfill({
            status,
            headers: withCors({ 'content-type': 'application/json; charset=utf-8' }),
            body: JSON.stringify(payload),
        });

        // Authentication
        if (method === 'POST' && path === '/auth/login') {
            return json(200, {
                requires2FA: true,
                sessionId: 'otp-session-1',
                email: 'o***@example.com',
            });
        }
        if (method === 'POST' && path === '/auth/verify-otp') {
            return json(200, {
                token: 'e2e-token',
                user: state.merchant,
            });
        }
        if (method === 'POST' && path === '/auth/resend-otp') {
            return json(200, { message: 'OTP resent' });
        }
        if (method === 'POST' && path === '/auth/end-all-sessions') {
            return json(200, { message: 'All sessions ended' });
        }

        // Reports
        if (method === 'GET' && path === '/reports/dashboard') {
            return json(200, { metrics: makeDashboardMetrics(state) });
        }
        if (method === 'GET' && path === '/reports/analytics') {
            return json(200, makeAnalytics(state));
        }
        if (method === 'GET' && path === '/reports/ai-analysis') {
            return json(200, makeAiAnalysis(state));
        }
        if (method === 'GET' && path === '/reports/export') {
            return route.fulfill({
                status: 200,
                headers: withCors({ 'content-type': 'text/csv' }),
                body: 'loan_id,amount\nloan-1,1500\n',
            });
        }

        // Settings
        if (method === 'GET' && path === '/settings/profile') {
            return json(200, { profile: state.profile });
        }
        if (method === 'PATCH' && path === '/settings/profile') {
            state.profile = { ...state.profile, ...body };
            return json(200, { profile: state.profile });
        }
        if (method === 'POST' && path === '/settings/verify-profile-update') {
            return json(200, { profile: state.profile });
        }
        if (method === 'POST' && path === '/settings/change-password') {
            return json(200, { message: 'Password updated successfully' });
        }

        // Employees
        if (method === 'GET' && path === '/employees') {
            return json(200, { employees: state.employees });
        }
        if (method === 'POST' && path === '/employees') {
            const employee = {
                id: `emp-${state.employees.length + 1}`,
                full_name: body.fullName,
                email: body.email,
                permissions: body.permissions || {},
            };
            state.employees.push(employee);
            return json(201, { employee });
        }
        const employeeMatch = path.match(/^\/employees\/([^/]+)$/);
        if (employeeMatch && method === 'DELETE') {
            const id = employeeMatch[1];
            state.employees = state.employees.filter((employee) => employee.id !== id);
            return json(200, { message: 'Employee deleted' });
        }
        if (employeeMatch && method === 'PATCH') {
            const id = employeeMatch[1];
            const index = state.employees.findIndex((employee) => employee.id === id);
            if (index === -1) return json(404, { error: 'Employee not found' });
            state.employees[index] = { ...state.employees[index], ...body };
            return json(200, { employee: state.employees[index] });
        }

        // Customers
        if (method === 'GET' && path === '/customers') {
            const query = url.searchParams;
            const search = String(query.get('search') || '').trim().toLowerCase();
            const pageNumber = Math.max(1, Number(query.get('page') || 1));
            const limit = Math.max(1, Math.min(200, Number(query.get('limit') || 20)));
            const decorated = state.customers.map((customer) => decorateCustomer(state, customer));
            const filtered = search
                ? decorated.filter((customer) => (
                    customer.full_name.toLowerCase().includes(search)
                    || String(customer.national_id || '').includes(search)
                    || String(customer.mobile_number || '').includes(search)
                ))
                : decorated;
            const pagination = paginate(filtered, pageNumber, limit);
            return json(200, {
                customers: pagination.items,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    totalCount: pagination.totalCount,
                    totalPages: pagination.totalPages,
                },
            });
        }
        if (method === 'POST' && path === '/customers') {
            const customer = {
                id: `cust-${state.customers.length + 1}`,
                full_name: body.fullName || body.full_name || 'عميل جديد',
                national_id: body.nationalId || body.national_id || `${Date.now()}`.slice(-10),
                mobile_number: body.mobileNumber || body.mobile_number || '0500000000',
                email: body.email || null,
            };
            state.customers.push(customer);
            return json(201, { customer: decorateCustomer(state, customer) });
        }
        const customerMatch = path.match(/^\/customers\/([^/]+)$/);
        if (customerMatch && method === 'PATCH') {
            const id = customerMatch[1];
            const index = state.customers.findIndex((customer) => customer.id === id);
            if (index === -1) return json(404, { error: 'Customer not found' });
            state.customers[index] = {
                ...state.customers[index],
                full_name: body.fullName ?? state.customers[index].full_name,
                national_id: body.nationalId ?? state.customers[index].national_id,
                mobile_number: body.mobileNumber ?? state.customers[index].mobile_number,
                email: body.email ?? state.customers[index].email,
            };
            return json(200, { customer: decorateCustomer(state, state.customers[index]) });
        }
        if (customerMatch && method === 'DELETE') {
            const id = customerMatch[1];
            state.customers = state.customers.filter((customer) => customer.id !== id);
            state.loans = state.loans.map((loan) => (loan.customer_id === id ? { ...loan, deleted: true } : loan));
            return json(200, { message: 'Customer deleted' });
        }

        // Loan upload
        if (method === 'POST' && path === '/loans/upload') {
            return json(200, {
                message: 'تمت المعالجة بنجاح',
                summary: {
                    totalRowsInFile: 1,
                    success: 1,
                    failed: 0,
                    errors: [],
                },
            });
        }
        if (method === 'POST' && path === '/loans/upload-attachment') {
            return json(201, {
                attachmentUrl: 'https://example.com/uploads/receipt-1.pdf',
                attachmentPath: '/uploads/receipt-1.pdf',
            });
        }

        // Loans list
        if (method === 'GET' && path === '/loans') {
            const query = url.searchParams;
            const pageNumber = Math.max(1, Number(query.get('page') || 1));
            const limit = Math.max(1, Math.min(200, Number(query.get('limit') || 20)));
            const status = query.get('status');
            const search = String(query.get('search') || '').trim().toLowerCase();
            const delayed = query.get('delayed') === 'true';
            const isNajizCase = query.get('is_najiz_case') === 'true';

            let items = state.loans.filter((loan) => !loan.deleted);
            if (status) items = items.filter((loan) => loan.status === status);
            if (isNajizCase) items = items.filter((loan) => loan.is_najiz_case || !!loan.najiz_case_number);
            if (delayed) items = items.filter((loan) => ['Active', 'Raised'].includes(loan.status));
            if (search) {
                items = items.filter((loan) => {
                    const decorated = decorateLoan(state, loan);
                    return (
                        String(decorated.customer_name || '').toLowerCase().includes(search)
                        || String(decorated.national_id || '').includes(search)
                        || String(decorated.mobile_number || '').includes(search)
                        || String(decorated.najiz_case_number || '').toLowerCase().includes(search)
                    );
                });
            }

            items = items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const pagination = paginate(items, pageNumber, limit);
            return json(200, {
                loans: pagination.items.map((loan) => decorateLoan(state, loan)),
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    totalCount: pagination.totalCount,
                    totalPages: pagination.totalPages,
                    hasMore: pagination.hasMore,
                },
            });
        }

        if (method === 'POST' && path === '/loans') {
            const customer = findCustomer(state, body.customerId);
            if (!customer) return json(404, { error: 'Customer not found' });
            const newLoan = {
                id: `loan-${state.loans.length + 1}`,
                customer_id: body.customerId,
                amount: Number(body.amount || 0),
                principal_amount: Number(body.principal_amount || body.amount || 0),
                profit_percentage: Number(body.profit_percentage || 0),
                receipt_number: body.receiptNumber || body.receipt_number || null,
                status: body.status || 'Active',
                transaction_date: body.transactionDate ? iso(body.transactionDate) : iso(now),
                created_at: iso(now),
                notes: body.notes || '',
                is_najiz_case: body.status === 'Raised',
                najiz_case_number: body.status === 'Raised' ? (body.najiz_case_number || null) : null,
                najiz_case_amount: body.status === 'Raised' ? Number(body.najiz_case_amount || 0) : null,
                najiz_collected_amount: null,
                najiz_status: body.status === 'Raised' ? (body.najiz_status || null) : null,
                najiz_plaintiff_name: null,
                najiz_plaintiff_national_id: null,
                najiz_raised_date: body.status === 'Raised' ? iso(now) : null,
                deleted: false,
            };
            state.loans.push(newLoan);
            return json(201, { message: 'Loan created successfully', loan: decorateLoan(state, newLoan) });
        }

        const loanStatusMatch = path.match(/^\/loans\/([^/]+)\/status$/);
        if (loanStatusMatch && method === 'PATCH') {
            const id = loanStatusMatch[1];
            const loan = loanById(state, id);
            if (!loan) return json(404, { error: 'Loan not found' });
            loan.status = body.status || loan.status;
            if (loan.status === 'Raised') {
                loan.is_najiz_case = true;
                loan.najiz_raised_date = loan.najiz_raised_date || iso(now);
            }
            if (loan.status === 'Paid' && body.najiz_collected_amount !== undefined) {
                loan.najiz_collected_amount = Number(body.najiz_collected_amount || 0);
                loan.is_najiz_case = body.is_najiz_case !== undefined ? Boolean(body.is_najiz_case) : loan.is_najiz_case;
            }
            if (['Active', 'Cancelled'].includes(loan.status)) {
                loan.is_najiz_case = false;
            }
            return json(200, { message: 'Status updated successfully', loan: decorateLoan(state, loan) });
        }

        const loanNajizMatch = path.match(/^\/loans\/([^/]+)\/najiz$/);
        if (loanNajizMatch && method === 'PATCH') {
            const id = loanNajizMatch[1];
            const loan = loanById(state, id);
            if (!loan) return json(404, { error: 'Loan not found' });
            loan.is_najiz_case = body.is_najiz_case !== undefined ? Boolean(body.is_najiz_case) : true;
            if (body.najiz_case_amount !== undefined) loan.najiz_case_amount = body.najiz_case_amount === null ? null : Number(body.najiz_case_amount);
            if (body.najiz_collected_amount !== undefined) loan.najiz_collected_amount = body.najiz_collected_amount === null ? null : Number(body.najiz_collected_amount);
            if (body.najiz_case_number !== undefined) loan.najiz_case_number = body.najiz_case_number || null;
            if (body.najiz_status !== undefined) loan.najiz_status = body.najiz_status || null;
            if (body.najiz_plaintiff_name !== undefined) loan.najiz_plaintiff_name = body.najiz_plaintiff_name || null;
            if (body.najiz_plaintiff_national_id !== undefined) loan.najiz_plaintiff_national_id = body.najiz_plaintiff_national_id || null;
            if (body.najiz_raised_date !== undefined) loan.najiz_raised_date = body.najiz_raised_date ? iso(body.najiz_raised_date) : null;
            return json(200, { message: 'Najiz details updated successfully', loan: decorateLoan(state, loan) });
        }

        const loanMatch = path.match(/^\/loans\/([^/]+)$/);
        if (loanMatch && method === 'GET') {
            const id = loanMatch[1];
            const loan = loanById(state, id);
            if (!loan) return json(404, { error: 'Loan not found' });
            return json(200, decorateLoan(state, loan));
        }
        if (loanMatch && method === 'PATCH') {
            const id = loanMatch[1];
            const loan = loanById(state, id);
            if (!loan) return json(404, { error: 'Loan not found' });
            Object.assign(loan, {
                amount: body.amount !== undefined ? Number(body.amount) : loan.amount,
                principal_amount: body.principal_amount !== undefined ? Number(body.principal_amount) : loan.principal_amount,
                profit_percentage: body.profit_percentage !== undefined ? Number(body.profit_percentage) : loan.profit_percentage,
                status: body.status !== undefined ? body.status : loan.status,
                receipt_number: body.receiptNumber ?? body.receipt_number ?? loan.receipt_number,
                transaction_date: body.transactionDate ? iso(body.transactionDate) : (body.transaction_date ? iso(body.transaction_date) : loan.transaction_date),
                notes: body.notes !== undefined ? body.notes : loan.notes,
                najiz_case_number: body.najiz_case_number !== undefined ? body.najiz_case_number : loan.najiz_case_number,
                najiz_case_amount: body.najiz_case_amount !== undefined ? (body.najiz_case_amount === null ? null : Number(body.najiz_case_amount)) : loan.najiz_case_amount,
                najiz_status: body.najiz_status !== undefined ? body.najiz_status : loan.najiz_status,
                najiz_collected_amount: body.najiz_collected_amount !== undefined ? (body.najiz_collected_amount === null ? null : Number(body.najiz_collected_amount)) : loan.najiz_collected_amount,
                is_najiz_case: body.is_najiz_case !== undefined ? Boolean(body.is_najiz_case) : loan.is_najiz_case,
            });
            return json(200, { message: 'Loan updated successfully', loan: decorateLoan(state, loan) });
        }
        if (loanMatch && method === 'DELETE') {
            const id = loanMatch[1];
            const loan = loanById(state, id);
            if (!loan) return json(404, { error: 'Loan not found' });
            loan.deleted = true;
            return json(200, { message: 'تم حذف القرض بنجاح (Soft Delete)', id });
        }

        return json(404, { error: `Mock route not found: ${method} ${path}` });
    });

    return state;
}

module.exports = {
    installMockApi,
};
