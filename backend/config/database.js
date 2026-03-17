const { Pool } = require('pg');
const logger = require('../utils/logger');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS);
const defaultPoolMax = isServerless ? 3 : 20;
const poolMax = Number(process.env.DB_POOL_MAX || defaultPoolMax);
const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS || (isServerless ? 10000 : 30000));
const connectionTimeoutMillis = Number(process.env.DB_CONN_TIMEOUT_MS || (isServerless ? 5000 : 10000));

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'loan_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: poolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    allowExitOnIdle: isServerless
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
