/**
 * Clerk Webhook Handler
 * Listens to Clerk events (user.created, user.updated, user.deleted)
 * and syncs them to the PostgreSQL merchants table.
 * 
 * Clerk sends webhooks signed with Svix - we verify them before processing.
 */
const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');
const { logAudit } = require('../utils/auditLogger');

// Clerk webhooks must receive the raw body for signature verification
router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        logger.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify the webhook signature
    const svixId = req.headers['svix-id'];
    const svixTimestamp = req.headers['svix-timestamp'];
    const svixSignature = req.headers['svix-signature'];

    if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({ error: 'Missing svix headers' });
    }

    let event;
    try {
        const wh = new Webhook(WEBHOOK_SECRET);
        event = wh.verify(req.body, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
        });
    } catch (err) {
        logger.error('[Clerk Webhook] Signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Process the event
    const { type, data } = event;

    try {
        switch (type) {
            case 'user.created': {
                const email = data.email_addresses?.[0]?.email_address;
                const clerkUserId = data.id;
                const businessName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'My Business';
                const apiKey = 'sk_live_' + require('crypto').randomBytes(32).toString('hex');

                const result = await db.query(
                    `INSERT INTO merchants (clerk_user_id, email, password_hash, business_name, api_key, subscription_plan, subscription_status, expiry_date)
                     VALUES ($1, $2, 'clerk_managed', $3, $4, 'Pro', 'Active', CURRENT_TIMESTAMP + INTERVAL '45 days')
                     ON CONFLICT (clerk_user_id) DO NOTHING
                     RETURNING id`,
                    [clerkUserId, email, businessName, apiKey]
                );

                if (result.rows.length > 0) {
                    await logAudit({
                        merchantId: result.rows[0].id,
                        action: 'CLERK_USER_CREATED',
                        entity: 'Merchant',
                        entityId: result.rows[0].id,
                        details: { email, clerkUserId },
                    });
                    logger.info(`[Clerk Webhook] Created merchant for: ${email}`);
                }
                break;
            }

            case 'user.updated': {
                const email = data.email_addresses?.[0]?.email_address;
                const clerkUserId = data.id;
                const businessName = `${data.first_name || ''} ${data.last_name || ''}`.trim();

                if (businessName) {
                    await db.query(
                        `UPDATE merchants SET email = $1, business_name = $2, updated_at = NOW() WHERE clerk_user_id = $3`,
                        [email, businessName, clerkUserId]
                    );
                }
                logger.info(`[Clerk Webhook] Updated merchant for: ${email}`);
                break;
            }

            case 'user.deleted': {
                const clerkUserId = data.id;
                // Soft delete or hard delete based on your policy
                // For safety, we'll just log it and mark as inactive
                await db.query(
                    `UPDATE merchants SET subscription_status = 'Cancelled', updated_at = NOW() WHERE clerk_user_id = $1`,
                    [clerkUserId]
                );
                logger.info(`[Clerk Webhook] Deactivated merchant for clerk_user_id: ${clerkUserId}`);
                break;
            }

            default:
                logger.info(`[Clerk Webhook] Unhandled event type: ${type}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        logger.error('[Clerk Webhook] Processing error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

const sanitizeDigits = (value) => String(value || '').replace(/\D/g, '');

const buildHelpMessage = () => (
  'مرحباً بك في خدمة أصيل على واتساب.\n'
  + 'أرسل أحد الأوامر التالية:\n'
  + '• ملخص\n'
  + '• رصيدي\n'
  + '• حالتي\n'
  + 'وسنرسل لك بياناتك بشكل مباشر.'
);

const sendWhatsAppText = async ({ phoneNumberId, to, text }) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v20.0';
  if (!token || !phoneNumberId || !to || !text) return false;

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('[WhatsApp Webhook] Failed sending message', { status: response.status, body });
    return false;
  }

  return true;
};

const verifyWhatsAppSignature = (req) => {
  const appSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!appSecret) return true;

  const signatureHeader = req.headers['x-hub-signature-256'];
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  const [algo, providedHash] = signatureHeader.split('=');
  if (algo !== 'sha256' || !providedHash || !req.rawBody) return false;

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(providedHash, 'hex'));
  } catch {
    return false;
  }
};

const resolveMerchantForPhoneId = async (phoneNumberId) => {
  if (!phoneNumberId) return null;
  const result = await db.query(
    `SELECT id, business_name, whatsapp_phone_id
     FROM merchants
     WHERE whatsapp_phone_id = $1
     LIMIT 1`,
    [String(phoneNumberId)]
  );
  return result.rows[0] || null;
};

const resolveCustomerByWhatsAppSender = async (merchantId, senderWaId) => {
  const senderDigits = sanitizeDigits(senderWaId);
  if (!merchantId || !senderDigits) return null;

  const result = await db.query(
    `SELECT id, full_name, mobile_number
     FROM customers
     WHERE merchant_id = $1
       AND deleted_at IS NULL
       AND right(regexp_replace(mobile_number, '\D', '', 'g'), 9) = right($2, 9)
     ORDER BY updated_at DESC
     LIMIT 1`,
    [merchantId, senderDigits]
  );

  return result.rows[0] || null;
};

const getCustomerLoanSummary = async (merchantId, customerId) => {
  const result = await db.query(
    `SELECT
        COUNT(*)::int AS total_loans,
        COUNT(*) FILTER (WHERE status = 'Paid')::int AS paid_loans,
        COUNT(*) FILTER (WHERE status <> 'Paid' AND status <> 'Cancelled')::int AS open_loans,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS paid_amount,
        COALESCE(SUM(CASE WHEN status <> 'Paid' AND status <> 'Cancelled' THEN amount ELSE 0 END), 0) AS outstanding_amount,
        COALESCE(SUM(amount), 0) AS total_amount
     FROM loans
     WHERE merchant_id = $1
       AND customer_id = $2
       AND deleted_at IS NULL`,
    [merchantId, customerId]
  );

  return result.rows[0] || {
    total_loans: 0,
    paid_loans: 0,
    open_loans: 0,
    paid_amount: 0,
    outstanding_amount: 0,
    total_amount: 0,
  };
};

const toMoney = (value) => Number(value || 0).toLocaleString('en-US');

const buildCustomerSummaryMessage = ({ customerName, summary }) => (
  `مرحباً ${customerName}\n`
  + 'هذا ملخص بياناتك الحالية:\n'
  + `• إجمالي القروض: ${Number(summary.total_loans || 0)}\n`
  + `• القروض المفتوحة: ${Number(summary.open_loans || 0)}\n`
  + `• القروض المسددة: ${Number(summary.paid_loans || 0)}\n`
  + `• إجمالي المبالغ: ${toMoney(summary.total_amount)} ﷼\n`
  + `• المتبقي حالياً: ${toMoney(summary.outstanding_amount)} ﷼\n`
  + `• المسدد حتى الآن: ${toMoney(summary.paid_amount)} ﷼`
);

const parseRequestedIntent = (text) => {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return 'help';
  if (normalized.includes('رصيد') || normalized.includes('متبقي')) return 'summary';
  if (normalized.includes('حال') || normalized.includes('ملخص') || normalized.includes('بيانات')) return 'summary';
  return 'help';
};

// WhatsApp webhook verification (Meta Cloud API)
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('forbidden');
});

// WhatsApp inbound events (messages + statuses)
router.post(
  '/whatsapp',
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
  async (req, res) => {
    try {
      if (!verifyWhatsAppSignature(req)) {
        return res.status(401).json({ error: 'Invalid WhatsApp signature' });
      }

      const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
      const tasks = [];

      for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changes) {
          const value = change?.value || {};
          const phoneNumberId = value?.metadata?.phone_number_id;
          const messages = Array.isArray(value?.messages) ? value.messages : [];

          if (!messages.length) continue;

          for (const message of messages) {
            const from = sanitizeDigits(message?.from);
            const body = message?.text?.body || '';
            if (!from) continue;

            tasks.push((async () => {
              const merchant = await resolveMerchantForPhoneId(phoneNumberId);
              if (!merchant) {
                await sendWhatsAppText({
                  phoneNumberId,
                  to: from,
                  text: 'لم يتم تفعيل قناة واتساب لهذه المنشأة بعد. الرجاء التواصل مع الدعم.',
                });
                return;
              }

              const customer = await resolveCustomerByWhatsAppSender(merchant.id, from);
              if (!customer) {
                await sendWhatsAppText({
                  phoneNumberId,
                  to: from,
                  text: 'تعذر العثور على بياناتك في النظام. تأكد من رقم الهاتف المسجل لدى المنشأة.',
                });
                return;
              }

              const intent = parseRequestedIntent(body);
              if (intent === 'help') {
                await sendWhatsAppText({
                  phoneNumberId,
                  to: from,
                  text: buildHelpMessage(),
                });
                return;
              }

              const summary = await getCustomerLoanSummary(merchant.id, customer.id);
              await sendWhatsAppText({
                phoneNumberId,
                to: from,
                text: buildCustomerSummaryMessage({
                  customerName: customer.full_name || 'عميلنا الكريم',
                  summary,
                }),
              });
            })());
          }
        }
      }

      await Promise.allSettled(tasks);
      return res.status(200).json({ received: true });
    } catch (err) {
      logger.error('[WhatsApp Webhook] Processing error', { error: err?.message });
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

module.exports = router;
