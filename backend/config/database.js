const { Pool } = require('pg');
const logger = require('../utils/logger');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS);

// ── Pool sizing ───────────────────────────────────────────────────────────────
const defaultPoolMax = isServerless ? 5 : 20;
const poolMax = Number(process.env.DB_POOL_MAX || defaultPoolMax);

// ── Timeouts ──────────────────────────────────────────────────────────────────
// Serverless: longer connection timeout (cold start can be slow)
const idleTimeoutMillis      = Number(process.env.DB_IDLE_TIMEOUT_MS      || (isServerless ? 20000  : 30000));
const connectionTimeoutMillis = Number(process.env.DB_CONN_TIMEOUT_MS || (isServerless ? 10000  : 15000));

const pool = new Pool({
    host:     process.env.DB_HOST     || 'postgres',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'loan_management',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max:  poolMax,
    min:  isServerless ? 1 : 2,          // keep 1-2 warm connections
    idleTimeoutMillis,
    connectionTimeoutMillis,
    allowExitOnIdle: isServerless,

    // ── TCP keepalive: prevents cloud proxy from dropping idle connections ──
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

pool.on('connect', (client) => {
    // Set per-session statement_timeout as a safety net (30 s)
    client.query("SET statement_timeout = '30000'").catch(() => {});
    logger.info('✅ Database connected');
});

pool.on('error', (err) => {
    logger.error('❌ Unexpected database error:', err);
    // In serverless, don't crash — let the next request get a fresh pool
    if (!isServerless) process.exit(-1);
});

// ── Warm-up: establish one connection on startup to absorb cold-start cost ───
if (!isServerless) {
    pool.connect()
        .then(client => { client.release(); logger.info('🔥 DB pool pre-warmed'); })
        .catch(err   => logger.warn('DB warm-up failed (non-fatal):', err.message));
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
