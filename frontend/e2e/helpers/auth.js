const DEFAULT_MERCHANT = {
    id: 'merchant-e2e-1',
    store_name: 'متجر الاختبار',
    email: 'owner@example.com',
    role: 'merchant',
    subscription_plan: 'Enterprise',
    subscriptionPlan: 'Enterprise',
    subscriptionStatus: 'Active',
};

async function seedAuthenticatedSession(page, options = {}) {
    const token = options.token || 'e2e-token';
    const merchant = { ...DEFAULT_MERCHANT, ...(options.merchant || {}) };
    const user = { ...merchant, role: options.role || 'merchant' };

    await page.addInitScript(({ seededToken, seededMerchant, seededUser }) => {
        window.localStorage.setItem('token', seededToken);
        window.localStorage.setItem('merchant', JSON.stringify(seededMerchant));
        window.localStorage.setItem('user', JSON.stringify(seededUser));
    }, {
        seededToken: token,
        seededMerchant: merchant,
        seededUser: user,
    });
}

async function clearSession(page) {
    await page.addInitScript(() => {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('merchant');
        window.localStorage.removeItem('user');
    });
}

module.exports = {
    DEFAULT_MERCHANT,
    seedAuthenticatedSession,
    clearSession,
};
