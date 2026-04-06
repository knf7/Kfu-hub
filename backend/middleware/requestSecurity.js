const DEFAULT_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || '1mb';

const toPositiveInt = (value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const normalized = Math.trunc(parsed);
    if (normalized < min) return min;
    if (normalized > max) return max;
    return normalized;
};

const REQUEST_MAX_DEPTH = toPositiveInt(process.env.REQUEST_MAX_DEPTH, 8, 1, 32);
const REQUEST_MAX_OBJECT_KEYS = toPositiveInt(process.env.REQUEST_MAX_OBJECT_KEYS, 200, 1, 5000);
const REQUEST_MAX_ARRAY_LENGTH = toPositiveInt(process.env.REQUEST_MAX_ARRAY_LENGTH, 200, 1, 10000);
const REQUEST_MAX_STRING_LENGTH = toPositiveInt(process.env.REQUEST_MAX_STRING_LENGTH, 10000, 32, 500000);
const REQUEST_MAX_QUERY_PARAMS = toPositiveInt(process.env.REQUEST_MAX_QUERY_PARAMS, 80, 1, 2000);

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const createHttpError = (status, message, code) => {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    return err;
};

const sanitizeText = (value) => String(value)
    .replace(/\u0000/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

const walkPayload = (value, depth = 0) => {
    if (value === null || value === undefined) return value;

    if (depth > REQUEST_MAX_DEPTH) {
        throw createHttpError(
            413,
            `Payload depth exceeds allowed limit (${REQUEST_MAX_DEPTH})`,
            'PAYLOAD_DEPTH_EXCEEDED'
        );
    }

    if (typeof value === 'string') {
        if (value.length > REQUEST_MAX_STRING_LENGTH) {
            throw createHttpError(
                413,
                `String value exceeds allowed length (${REQUEST_MAX_STRING_LENGTH})`,
                'STRING_TOO_LONG'
            );
        }
        return sanitizeText(value);
    }

    if (Array.isArray(value)) {
        if (value.length > REQUEST_MAX_ARRAY_LENGTH) {
            throw createHttpError(
                413,
                `Array length exceeds allowed limit (${REQUEST_MAX_ARRAY_LENGTH})`,
                'ARRAY_TOO_LARGE'
            );
        }
        return value.map((item) => walkPayload(item, depth + 1));
    }

    if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length > REQUEST_MAX_OBJECT_KEYS) {
            throw createHttpError(
                413,
                `Object key count exceeds allowed limit (${REQUEST_MAX_OBJECT_KEYS})`,
                'OBJECT_TOO_LARGE'
            );
        }

        const sanitized = {};
        for (const key of keys) {
            if (FORBIDDEN_KEYS.has(key)) {
                throw createHttpError(400, 'Payload contains forbidden object keys', 'FORBIDDEN_KEY');
            }
            sanitized[key] = walkPayload(value[key], depth + 1);
        }
        return sanitized;
    }

    return value;
};

const payloadGuard = (req, res, next) => {
    try {
        if (req.path && req.path.startsWith('/api/webhooks')) {
            return next();
        }

        if (req.query && Object.keys(req.query).length > REQUEST_MAX_QUERY_PARAMS) {
            throw createHttpError(
                413,
                `Query parameter count exceeds allowed limit (${REQUEST_MAX_QUERY_PARAMS})`,
                'TOO_MANY_QUERY_PARAMS'
            );
        }

        if (req.body && typeof req.body === 'object') {
            req.body = walkPayload(req.body);
        }
        if (req.query && typeof req.query === 'object') {
            req.query = walkPayload(req.query);
        }
        if (req.params && typeof req.params === 'object') {
            req.params = walkPayload(req.params);
        }

        next();
    } catch (err) {
        return res.status(err.status || 400).json({
            error: err.message || 'Invalid request payload',
            code: err.code || 'INVALID_PAYLOAD',
        });
    }
};

const bodyParserErrorHandler = (err, req, res, next) => {
    if (!err) return next();

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'Request payload is too large',
            code: 'PAYLOAD_TOO_LARGE',
        });
    }

    if (err instanceof SyntaxError && err.status === 400 && Object.prototype.hasOwnProperty.call(err, 'body')) {
        return res.status(400).json({
            error: 'Malformed JSON payload',
            code: 'MALFORMED_JSON',
        });
    }

    return next(err);
};

module.exports = {
    DEFAULT_BODY_LIMIT,
    payloadGuard,
    bodyParserErrorHandler,
};
