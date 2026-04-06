const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const authLimiterWindowMs = toNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const authLimiterMax = toNumber(
    process.env.AUTH_RATE_LIMIT_MAX,
    process.env.NODE_ENV === 'test' ? 100000 : 5
);
const authAttemptLimiter = rateLimit({
    windowMs: authLimiterWindowMs,
    max: authLimiterMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'تم تجاوز الحد المسموح لمحاولات المصادقة. حاول مرة أخرى بعد 15 دقيقة.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    handler: (req, res, _next, options) => {
        res.status(options.statusCode).json(options.message);
    },
});

router.use([
    '/register',
    '/login',
    '/verify-otp',
    '/resend-otp',
    '/forgot-password',
    '/reset-password',
    '/refresh',
], authAttemptLimiter);

// Traditional Auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.get('/me', authenticateToken, authController.me);
router.post('/refresh', authenticateToken, authController.refresh);
router.post('/logout', authenticateToken, authController.logout);
router.post('/end-all-sessions', authenticateToken, authController.endAllSessions);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/step-up', authenticateToken, authController.issueStepUpToken);

module.exports = router;
