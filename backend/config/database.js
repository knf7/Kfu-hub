const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'loan_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 5 : 20)),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
    logger.info('✅ Database connected');
});

pool.on('error', (err) => {
    logger.error('❌ Unexpected database error:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
