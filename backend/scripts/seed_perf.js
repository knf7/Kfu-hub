require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { setOTP } = require('../config/redis');

if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD is required to run seed_perf.js');
}
if (!process.env.PERF_SEED_PASSWORD) {
    throw new Error('PERF_SEED_PASSWORD is required to run seed_perf.js');
}

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'loan_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function main() {
    try {
        console.log('🌱 Seeding performance test data...');
        const passwordHash = await bcrypt.hash(process.env.PERF_SEED_PASSWORD, 10);
        const perfApiKey = `perf_${crypto.randomBytes(24).toString('hex')}`;

        // Ensure merchant exists
        const mRes = await pool.query(`
            INSERT INTO merchants (business_name, email, password_hash, api_key, status, subscription_plan)
            VALUES ('Perf Test Merchant', 'test@example.com', $1, $2, 'approved', 'Enterprise')
            ON CONFLICT (email) DO UPDATE SET subscription_plan = 'Enterprise', status = 'approved'
            RETURNING id;
        `, [passwordHash, perfApiKey]);
        const merchantId = mRes.rows[0].id;

        // Set static OTP in Redis
        const seedOtp = process.env.PERF_SEED_OTP || '123456';
        await setOTP(merchantId, seedOtp, 3600); // 1 hour
        console.log(`🔑 Static OTP ${seedOtp} set for ${merchantId}`);

        // Seed some customers for dash metrics
        for (let i = 1; i <= 20; i++) {
            await pool.query(`
                INSERT INTO customers (id, merchant_id, full_name, national_id, mobile_number)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT DO NOTHING;
            `, [crypto.randomUUID(), merchantId, `Customer ${i}`, `123456789${i}`, `050000000${i}`]);
        }

        console.log('✅ Performance data seeded.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
}

main();
