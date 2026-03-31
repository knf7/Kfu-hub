const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const db = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

jest.mock('../config/database');

describe('Assistant Quick Entry API', () => {
    let token;
    const merchantId = '123e4567-e89b-12d3-a456-426614174000';

    beforeAll(() => {
        token = jwt.sign({ merchantId, email: 'assistant-test@example.com' }, JWT_SECRET);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        db.query.mockResolvedValue({ rows: [{ session_version: 1 }] });
    });

    it('should return missing fields when payload is incomplete', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
            .mockResolvedValueOnce({ rows: [] }); // findExistingCustomer by name

        const res = await request(app)
            .post('/api/assistant/quick-entry')
            .set('Cookie', [`token=${token}`])
            .send({
                message: 'اسم العميل فهد محمد، مبلغ القرض 15000'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.canCreate).toBe(false);
        expect(res.body.missingFields).toContain('nationalId');
        expect(res.body.missingFields).toContain('mobileNumber');
        expect(res.body.draft.loan.amount).toBe(15000);
    });

    it('should create a loan record when confirm=true and data is complete', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
            .mockResolvedValueOnce({
                rows: [{
                    id: '9f8fbc61-3523-4f5f-b176-7802ad0d1d7c',
                    full_name: 'فهد محمد',
                    national_id: '1023456789',
                    mobile_number: '0551234567'
                }]
            }) // findExistingCustomer by national_id
            .mockResolvedValueOnce({
                rows: [{
                    id: '1f688ef2-0826-471f-b011-27b5f74e2d8c',
                    customer_id: '9f8fbc61-3523-4f5f-b176-7802ad0d1d7c',
                    amount: '22000',
                    status: 'Active',
                    transaction_date: '2026-03-10T00:00:00.000Z'
                }]
            }) // create loan
            .mockResolvedValueOnce({
                rows: [{
                    id: '9f8fbc61-3523-4f5f-b176-7802ad0d1d7c',
                    full_name: 'فهد محمد',
                    national_id: '1023456789',
                    mobile_number: '0551234567'
                }]
            }); // load customer

        const res = await request(app)
            .post('/api/assistant/quick-entry')
            .set('Cookie', [`token=${token}`])
            .send({
                confirm: true,
                message: 'تأكيد',
                draft: {
                    customer: {
                        fullName: 'فهد محمد',
                        nationalId: '1023456789',
                        mobileNumber: '0551234567'
                    },
                    loan: {
                        amount: 22000,
                        profitPercentage: 12,
                        receiptNumber: 'R-1002',
                        transactionDate: '2026-03-10'
                    }
                }
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.record).toBeTruthy();
        expect(res.body.record.loan.id).toBe('1f688ef2-0826-471f-b011-27b5f74e2d8c');
        expect(res.body.assistant).toMatch(/تم إنشاء السجل/);
    });

    it('should honor aiExtracted payload and create record without full natural text', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
            .mockResolvedValueOnce({
                rows: [{
                    id: '9f8fbc61-3523-4f5f-b176-7802ad0d1d7c',
                    full_name: 'فهد محمد',
                    national_id: '1023456789',
                    mobile_number: '0551234567'
                }]
            }) // findExistingCustomer by national_id
            .mockResolvedValueOnce({
                rows: [{
                    id: 'loan-ai-1',
                    customer_id: '9f8fbc61-3523-4f5f-b176-7802ad0d1d7c',
                    amount: '18000',
                    status: 'Active',
                    transaction_date: '2026-03-12T00:00:00.000Z'
                }]
            }) // create loan
            .mockResolvedValueOnce({
                rows: [{
                    id: '9f8fbc61-3523-4f5f-b176-7802ad0d1d7c',
                    full_name: 'فهد محمد',
                    national_id: '1023456789',
                    mobile_number: '0551234567'
                }]
            }); // load customer

        const res = await request(app)
            .post('/api/assistant/quick-entry')
            .set('Cookie', [`token=${token}`])
            .send({
                message: 'سجلها',
                draft: {},
                aiExtracted: {
                    fullName: 'فهد محمد',
                    nationalId: '1023456789',
                    mobileNumber: '0551234567',
                    amount: 18000,
                    profitPercentage: 10,
                    transactionDate: '2026-03-12',
                    intent: 'confirm'
                }
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.record.loan.id).toBe('loan-ai-1');
        expect(res.body.record.loan.amount).toBe('18000');
    });

    it('should auto-create when message is complete and prediction allows it', async () => {
        db.query
            .mockResolvedValueOnce({ rows: [{ session_version: 1 }] }) // Auth
            .mockResolvedValueOnce({
                rows: [{
                    id: 'customer-auto-1',
                    full_name: 'محمد صالح',
                    national_id: '1034567890',
                    mobile_number: '0559876543'
                }]
            }) // findExistingCustomer by national_id
            .mockResolvedValueOnce({
                rows: [{
                    id: 'loan-auto-1',
                    customer_id: 'customer-auto-1',
                    amount: '25000',
                    status: 'Active',
                    transaction_date: '2026-03-20T00:00:00.000Z'
                }]
            }) // create loan
            .mockResolvedValueOnce({
                rows: [{
                    id: 'customer-auto-1',
                    full_name: 'محمد صالح',
                    national_id: '1034567890',
                    mobile_number: '0559876543'
                }]
            }); // load customer

        const res = await request(app)
            .post('/api/assistant/quick-entry')
            .set('Cookie', [`token=${token}`])
            .send({
                message: 'محمد صالح الهوية 1034567890 الجوال 0559876543 مبلغ 25000',
                draft: {}
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.record?.loan?.id).toBe('loan-auto-1');
        expect(res.body.prediction?.reason).toBe('auto-created-from-prediction');
    });
});
