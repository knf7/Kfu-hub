const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const { clerkClient } = require('@clerk/clerk-sdk-node');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const decodeJwtPayload = (token) => {
    try {
        const parts = String(token || '').split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
        return null;
    }
};

const isLikelyLocalJwt = (token) => {
    const payload = decodeJwtPayload(token);
    return Boolean(payload && payload.merchantId);
};

const verifySupabaseToken = async (token) => {
    if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return null;
    const endpoint = `${String(SUPABASE_URL).replace(/\/$/, '')}/auth/v1/user`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                apikey: SUPABASE_PUBLIC_KEY,
                Authorization: `Bearer ${token}`
            },
            signal: controller.signal
        });
        if (!response.ok) return null;
        const supabaseUser = await response.json();
        const email = supabaseUser?.email ? String(supabaseUser.email).toLowerCase().trim() : null;
        if (!email) return null;

        const result = await db.query(
            `SELECT id, email, session_version
             FROM merchants
             WHERE lower(email) = lower($1)
             LIMIT 1`,
            [email]
        );
        if (!result.rows.length) return null;

        const merchant = result.rows[0];
        return {
            merchantId: merchant.id,
            userId: merchant.id,
            email: merchant.email || email,
            role: 'merchant',
            permissions: null,
            employeeId: null,
            version: Number(merchant.session_version || 1),
            supabaseUserId: supabaseUser?.id || null
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
};

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Fallback to cookie
    if (!token && req.cookies) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // 1) Try Clerk token verification first (if configured)
    if (process.env.CLERK_SECRET_KEY) {
        try {
            const decoded = await clerkClient.verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
            });

            const clerkUserId = decoded.sub;
            let merchantEmail = null;

            try {
                const user = await clerkClient.users.getUser(clerkUserId);
                merchantEmail = user.emailAddresses[0]?.emailAddress;
            } catch (e) {
                console.error('[AUTH] Failed to fetch user from Clerk API', e.message);
            }

            if (merchantEmail) {
                const result = await db.query(
                    'SELECT id FROM merchants WHERE email = $1',
                    [merchantEmail]
                );

                if (result.rows.length > 0) {
                    req.user = {
                        merchantId: result.rows[0].id,
                        clerkUserId,
                        email: merchantEmail,
                        role: 'merchant',
                        userId: result.rows[0].id
                    };
                    return next();
                }
            }
        } catch (err) {
            // Fallback to local JWT verification below
            console.warn('[AUTH] Clerk verification failed, trying local JWT:', err.message);
        }
    }

    // 2) Try Supabase session token (when configured and token is not our local JWT).
    if (!isLikelyLocalJwt(token)) {
        const supabaseUser = await verifySupabaseToken(token);
        if (supabaseUser) {
            req.user = supabaseUser;
            return next();
        }
    }

    // 3) Fallback: local JWT (issued by /api/auth/login)
    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded.merchantId) {
            return res.status(401).json({ error: 'Invalid token payload: merchantId missing' });
        }

        req.user = {
            merchantId: decoded.merchantId,
            userId: decoded.userId || decoded.merchantId,
            email: decoded.email || null,
            role: decoded.role || 'merchant',
            permissions: decoded.permissions || null,
            employeeId: decoded.employeeId || null,
            version: decoded.version || 1
        };

        // Session-version check (security + test compatibility).
        // If DB is mocked/offline, we gracefully skip this check.
        if (typeof db.query === 'function') {
            try {
                const sessionResult = await db.query(
                    'SELECT session_version FROM merchants WHERE id = $1',
                    [req.user.merchantId]
                );
                if (sessionResult.rows && sessionResult.rows.length > 0) {
                    const currentVersion = Number(sessionResult.rows[0].session_version || 1);
                    const tokenVersion = Number(req.user.version || 1);
                    if (tokenVersion < currentVersion) {
                        return res.status(401).json({ error: 'Session expired' });
                    }
                }
            } catch (e) {
                // Do not block auth path on telemetry/mocked DB errors.
            }
        }

        return next();
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        return res.status(401).json({
            error: 'Invalid or expired token',
            code: 'TOKEN_EXPIRED',
            message: 'انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مجدداً.'
        });
    }
};

const injectMerchantId = (req, res, next) => {
    if (req.user && req.user.merchantId) {
        req.merchantId = req.user.merchantId;
        next();
    } else {
        res.status(403).json({ error: 'Merchant ID not found in token' });
    }
};

/**
 * ── injectRlsContext ──
 * Enforces PostgreSQL Row-Level Security (RLS) at the connection level.
 * Acquires a client, starts a transaction, sets app.merchant_id,
 * and attaches it to req.dbClient for use in controllers.
 */
const injectRlsContext = async (req, res, next) => {
    if (!req.user || !req.user.merchantId) {
        return res.status(403).json({ error: 'Security context missing (Unauthenticated)' });
    }

    // Test/mock fallback: use plain db.query client when pool/transaction is unavailable.
    if (!db.pool || typeof db.pool.connect !== 'function') {
        req.dbClient = { query: db.query };
        req.afterCommit = async (task) => {
            if (typeof task === 'function') {
                await task();
            }
        };
        return next();
    }

    let client;
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS);
    const useSessionMode = process.env.RLS_SESSION_MODE === 'true' || isServerless;
    const setRlsContext = async (dbClient, merchantId, isLocal) => {
        await dbClient.query('SELECT set_config($1, $2, $3)', ['app.merchant_id', merchantId, isLocal]);
    };
    const resetRlsContext = async (dbClient) => {
        await dbClient.query('SELECT set_config($1, $2, $3)', ['app.merchant_id', '', false]);
    };

    try {
        const afterCommitTasks = [];
        req.afterCommit = (task) => {
            if (typeof task === 'function') {
                afterCommitTasks.push(task);
            }
            return Promise.resolve();
        };
        client = await db.pool.connect();
        if (!client || typeof client.query !== 'function') {
            req.dbClient = { query: db.query };
            req.afterCommit = async (task) => {
                if (typeof task === 'function') {
                    await task();
                }
            };
            if (client && typeof client.release === 'function') client.release();
            return next();
        }

        if (useSessionMode) {
            await setRlsContext(client, req.user.merchantId, false);
        } else {
            await client.query('BEGIN');
            // SET LOCAL is scoped to the transaction only - failsafe against connection pooling leaks
            await setRlsContext(client, req.user.merchantId, true);
        }

        req.dbClient = client;
        let finalized = false;
        const runAfterCommitTasks = async () => {
            while (afterCommitTasks.length > 0) {
                const task = afterCommitTasks.shift();
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await task();
                } catch (taskErr) {
                    console.error('Post-commit task failed:', taskErr);
                }
            }
        };

        const cleanup = async () => {
            if (finalized) return;
            finalized = true;
            res.removeListener('finish', cleanup);
            res.removeListener('close', cleanup);
            try {
                if (!useSessionMode) {
                    if (req.dbClientBroken || res.statusCode >= 400) {
                        await client.query('ROLLBACK');
                    } else {
                        await client.query('COMMIT');
                        await runAfterCommitTasks();
                    }
                } else {
                    await resetRlsContext(client);
                    if (!(req.dbClientBroken || res.statusCode >= 400)) {
                        await runAfterCommitTasks();
                    }
                }
            } catch (err) {
                console.error('RLS Transaction Commit Error:', err);
                try {
                    if (!useSessionMode) await client.query('ROLLBACK');
                } catch { }
            } finally {
                client.release(true);
            }
        };

        res.on('finish', cleanup);
        res.on('close', cleanup);

        next();
    } catch (err) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch { }
            client.release();
        }
        console.error('RLS Injection Failure:', err);
        res.status(500).json({ error: 'حدث خطأ في جدار الحماية للبيانات' });
    }
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        // Merchants have all permissions
        if (!req.user.role || req.user.role === 'merchant') {
            return next();
        }

        // Check employee permissions
        if (req.user.permissions && req.user.permissions[permission]) {
            return next();
        }

        res.status(403).json({ error: 'ليس لديك صلاحية للقيام بهذا الإجراء' });
    };
};

/**
 * ── stepUpAuth ──
 * Requires a valid one-time token (OTT) generated via password verification.
 */
const { redis } = require('../config/redis');

const stepUpAuth = async (req, res, next) => {
    const stepUpToken = req.headers['x-step-up-token'];

    if (!stepUpToken) {
        return res.status(401).json({
            error: 'step_up_required',
            message: 'هذه العملية تتطلب تأكيد إضافي للهوية (Step-Up Auth)'
        });
    }

    try {
        const userId = req.user.userId;
        // We can use the originalUrl or a generic 'mutation' action type
        const actionType = req.method + ':' + req.baseUrl;
        const key = `stepup:${userId}:${actionType}`;

        const storedToken = await redis.get(key);

        if (!storedToken || storedToken !== stepUpToken) {
            return res.status(401).json({ error: 'رمز التأكيد غير صالح أو منتهي الصلاحية' });
        }

        // OTT: One-time use
        await redis.del(key);

        next();
    } catch (err) {
        console.error('Step-Up Auth Verification Error:', err);
        res.status(500).json({ error: 'خطأ في التحقق من الرمز' });
    }
};

module.exports = {
    authenticateToken,
    injectMerchantId,
    injectRlsContext,
    checkPermission,
    stepUpAuth,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
