const express = require('express');
const { performance } = require('perf_hooks');
const { authenticateToken, injectMerchantId, checkPermission } = require('../middleware/auth');
const { getCache, setCache } = require('../utils/cache');

const router = express.Router();

router.use(authenticateToken);
router.use(injectMerchantId);

const buildBaseUrl = (req) => {
    const envBase = process.env.PERF_BASE_URL || process.env.BACKEND_URL || '';
    if (envBase) {
        return envBase.replace(/\/$/, '');
    }
    const host = req.get('host');
    const proto = req.protocol || 'https';
    return host ? `${proto}://${host}` : '';
};

const requestTiming = async (url, headers) => {
    if (typeof fetch === 'function') {
        const response = await fetch(url, { headers });
        await response.text();
        return response.status;
    }

    const { URL } = require('url');
    const parsed = new URL(url);
    const httpModule = parsed.protocol === 'https:' ? require('https') : require('http');
    return new Promise((resolve) => {
        const req = httpModule.request(
            parsed,
            { method: 'GET', headers },
            (resp) => {
                resp.on('data', () => {});
                resp.on('end', () => resolve(resp.statusCode || 0));
            }
        );
        req.on('error', () => resolve(0));
        req.end();
    });
};

router.get('/dashboard', checkPermission('can_view_dashboard'), async (req, res) => {
    try {
        const cacheKey = `perf:dashboard:${req.merchantId}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ ...cached, cached: true });
        }

        const baseUrl = buildBaseUrl(req);
        if (!baseUrl) {
            return res.status(500).json({ error: 'Unable to resolve base URL for perf checks' });
        }

        const authHeader = req.headers.authorization;
        const cookieHeader = req.headers.cookie;
        const merchantHeader = req.headers['x-merchant-id'];
        const headers = {
            ...(authHeader ? { Authorization: authHeader } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            ...(merchantHeader ? { 'X-Merchant-ID': merchantHeader } : {}),
        };

        const endpoints = [
            { id: 'reports_dashboard', path: '/api/reports/dashboard' },
            { id: 'reports_analytics', path: '/api/reports/analytics?interval=year' },
            { id: 'customers_light', path: '/api/customers?limit=15&include_stats=false' },
            { id: 'loans', path: '/api/loans?limit=20' },
            { id: 'najiz', path: '/api/loans?is_najiz_case=true&limit=50&skip_count=true' },
        ];

        const timings = [];
        let totalMs = 0;

        for (const endpoint of endpoints) {
            const url = `${baseUrl}${endpoint.path}`;
            const start = performance.now();
            let status = 0;
            try {
                status = await requestTiming(url, headers);
            } catch (err) {
                status = 0;
            }
            const elapsed = Math.round(performance.now() - start);
            totalMs += elapsed;
            timings.push({ id: endpoint.id, path: endpoint.path, status, ms: elapsed });
        }

        const payload = {
            ok: true,
            baseUrl,
            measuredAt: new Date().toISOString(),
            totalMs,
            timings
        };

        await setCache(cacheKey, payload, 60);
        res.json(payload);
    } catch (err) {
        console.error('Perf dashboard error:', err);
        res.status(500).json({ error: 'Failed to run perf checks' });
    }
});

module.exports = router;
