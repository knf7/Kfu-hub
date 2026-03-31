const request = require('supertest');
const app = require('../server');
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

jest.mock('../config/database');

describe('Reports / Analytics Controller', () => {
    let token;
    const merchantId = '123e4567-e89b-12d3-a456-426614174000';

    beforeAll(() => {
        token = jwt.sign({ merchantId, email: 'test@example.com' }, JWT_SECRET);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock for session version check in authenticateToken
        db.query.mockResolvedValue({ rows: [{ session_version: 1 }] });
    });

    describe('GET /api/reports/dashboard', () => {
        it('should return complete dashboard metrics', async () => {
            // Mocking multiple queries in /dashboard
            db.query
                .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
                .mockResolvedValueOnce({ rows: [{ total_debt: '5000' }] }) // Debt
                .mockResolvedValueOnce({ rows: [{ total_profit: '250' }] }) // Profit
                .mockResolvedValueOnce({ rows: [{ total_customers: 10, active_customers: 5 }] }) // Customers
                .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // monthRes
                .mockResolvedValueOnce({ rows: [{ paid: '2000', total: '7000' }] }) // rateRes
                .mockResolvedValueOnce({ rows: [{ overdue_count: 1 }] }) // overdueRes
                .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // raisedRes
                .mockResolvedValueOnce({ rows: [] }) // recentRes
                .mockResolvedValueOnce({ rows: [{}] }) // najizSummaryRes
                .mockResolvedValueOnce({ rows: [] }); // najizDetailsRes

            const res = await request(app)
                .get('/api/reports/dashboard')
                .set('Cookie', [`token=${token}`]);

            expect(res.statusCode).toEqual(200);
            expect(res.body.metrics.totalDebt).toBe(5000);
            expect(res.body.metrics.collectionRate).toBe(28.57);
        });

        it('should handle zero total debt in collection rate', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
                .mockResolvedValueOnce({ rows: [{ total_debt: '0' }] })
                .mockResolvedValueOnce({ rows: [{ total_profit: '0' }] })
                .mockResolvedValueOnce({ rows: [{ total_customers: 0, active_customers: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ paid: '0', total: '0' }] }) // Total = 0
                .mockResolvedValueOnce({ rows: [{ overdue_count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{}] })
                .mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/reports/dashboard')
                .set('Cookie', [`token=${token}`]);

            expect(res.body.metrics.collectionRate).toBe(0);
        });
    });

    describe('GET /api/reports/ai-analysis', () => {
        it('should reject non-enterprise users', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
                .mockResolvedValueOnce({ rows: [{ subscription_plan: 'Basic' }] }); // Plan check

            const res = await request(app)
                .get('/api/reports/ai-analysis')
                .set('Cookie', [`token=${token}`]);

            expect(res.statusCode).toEqual(403);
            expect(res.body.requiresUpgrade).toBe(true);
        });

        it('should provide rich insights for enterprise users', async () => {
            db.query.mockReset();
            db.query
                .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
                .mockResolvedValueOnce({ rows: [{ subscription_plan: 'Enterprise' }] }) // Plan check
                .mockResolvedValueOnce({
                    rows: [{
                        total_portfolio: '10000',
                        paid_amount: '9000',
                        active_amount: '1000',
                        cancelled_amount: '0',
                        total_loans: 10,
                        paid_count: 9,
                        active_count: 1,
                        cancelled_count: 0
                    }]
                })
                .mockResolvedValueOnce({
                    rows: [
                        { month: '2026-02', total: '5000', count: 5 },
                        { month: '2026-01', total: '4000', count: 4 }
                    ]
                })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ month: '2026-02', total: '5000' }] })
                .mockResolvedValueOnce({ rows: [{ avg_amount: 1000, max_amount: 1000, min_amount: 100, stddev_amount: 10 }] })
                .mockResolvedValueOnce({ rows: [{ high_risk: 0, medium_risk: 0, low_risk: 1, high_risk_amount: 0 }] });

            const res = await request(app)
                .get('/api/reports/ai-analysis')
                .set('Cookie', [`token=${token}`]);

            expect(res.statusCode).toEqual(200);
            expect(res.body.summary.collectionRate).toBe(90);
            expect(res.body.summary.growthRate).toBe(25); // (5000-4000)/4000
            expect(res.body.insights[0].type).toBe('success'); // Collection > 80%
        });
    });

    describe('GET /api/reports/monthly-summary', () => {
        it('should return monthly summary with insights and recommendations', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
                .mockResolvedValueOnce({
                    rows: [{
                        total_loans: 4,
                        total_disbursed: '12000',
                        total_collected: '8000',
                        active_amount: '3000',
                        raised_amount: '1000'
                    }]
                }) // summaryRes
                .mockResolvedValueOnce({
                    rows: [{ unique_customers: 3, active_customers: 2 }]
                }) // customerRes
                .mockResolvedValueOnce({
                    rows: [
                        { status: 'Active', count: 2, amount: '3000' },
                        { status: 'Paid', count: 2, amount: '9000' }
                    ]
                }) // statusRes
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 'cust-1',
                            full_name: 'عميل تجريبي',
                            mobile_number: '0501234567',
                            loans_count: 2,
                            total_amount: '7000',
                            paid_amount: '4000'
                        }
                    ]
                }) // topCustomersRes
                .mockResolvedValueOnce({
                    rows: [{ week_key: '2026-09', week_start: '2026-03-01', loans_count: 2, total_amount: '6000' }]
                }) // weeklyRes
                .mockResolvedValueOnce({
                    rows: [{ total_loans: 3, total_disbursed: '10000', total_collected: '7000', active_amount: '2000' }]
                }) // previousSummaryRes
                .mockResolvedValueOnce({
                    rows: [{
                        loan_id: 'loan-1',
                        customer_id: 'cust-1',
                        full_name: 'عميل تجريبي',
                        mobile_number: '0501234567',
                        tracked_amount: '1000',
                        najiz_collected_amount: '300',
                        status: 'Raised',
                        najiz_case_number: 'NJ-01',
                        najiz_status: 'قيد المتابعة',
                        transaction_date: '2026-03-10'
                    }]
                }) // najizTrackingRes
                .mockResolvedValueOnce({
                    rows: [{
                        loan_id: 'loan-1',
                        customer_id: 'cust-1',
                        full_name: 'عميل تجريبي',
                        mobile_number: '0501234567',
                        amount: '1000',
                        status: 'Active',
                        najiz_case_number: 'NJ-01',
                        has_najiz_case: true,
                        transaction_date: '2026-03-10'
                    }]
                }); // monthEndUnpaidRes

            const res = await request(app)
                .get('/api/reports/monthly-summary?year=2026&month=3')
                .set('Cookie', [`token=${token}`]);

            expect(res.statusCode).toEqual(200);
            expect(res.body.period.month).toBe(3);
            expect(res.body.summary.totalLoans).toBe(4);
            expect(res.body.summary.collectionRate).toBe(66.67);
            expect(Array.isArray(res.body.insights)).toBe(true);
            expect(Array.isArray(res.body.recommendations)).toBe(true);
            expect(Array.isArray(res.body.tracking?.najizCases)).toBe(true);
            expect(Array.isArray(res.body.tracking?.monthEndUnpaid)).toBe(true);
            expect(res.body.tracking?.scope?.mode).toBe('from_selected_month');
            expect(res.body.tracking?.scope?.fromDate).toBe('2026-03-01');
            expect(res.body.tracking?.integration?.overlappedCount).toBe(1);
        });
    });

    describe('GET /api/reports/export', () => {
        it('should export Excel with default date range', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
                .mockResolvedValueOnce({
                    rows: [
                        { id: '1', full_name: 'Client A', amount: '1000', status: 'Active', transaction_date: '2026-02-01' }
                    ]
                }); // Data

            const res = await request(app)
                .get('/api/reports/export')
                .set('Cookie', [`token=${token}`]);

            expect(res.header['content-type']).toContain('spreadsheetml');
            expect(res.statusCode).toEqual(200);
        });
    });
});
