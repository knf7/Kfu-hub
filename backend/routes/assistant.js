const express = require('express');
const { authenticateToken, injectMerchantId, injectRlsContext, checkPermission } = require('../middleware/auth');
const { clearCacheByPrefix } = require('../utils/cache');

const router = express.Router();

const toEnglishDigits = (input) =>
    String(input || '')
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
        .replace(/[٬،]/g, ',');

const normalizeSpaces = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const normalizeNationalId = (value) => {
    const digits = toEnglishDigits(value).replace(/\D/g, '');
    if (digits.length !== 10) return null;
    return digits;
};

const normalizeMobile = (value) => {
    const digits = toEnglishDigits(value).replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('966') && digits.length >= 12) {
        const local = digits.slice(3);
        return local.startsWith('0') ? local.slice(0, 10) : `0${local.slice(0, 9)}`;
    }
    if (digits.startsWith('5') && digits.length >= 9) {
        return `0${digits.slice(0, 9)}`;
    }
    if (digits.startsWith('05') && digits.length >= 10) {
        return digits.slice(0, 10);
    }
    return digits.length >= 9 ? digits.slice(0, 15) : null;
};

const parseAmount = (text) => {
    const normalized = toEnglishDigits(text);
    const prioritized = normalized.match(/(?:مبلغ|القرض|قرض|بقيمة|قيمته|amount)\s*[:=]?\s*([0-9][0-9,.\s]{0,20})/i);
    const candidate = prioritized?.[1] || normalized.match(/([0-9][0-9,.\s]{1,20})/)?.[1];
    if (!candidate) return null;
    const parsed = Number(candidate.replace(/[,\s]/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100) / 100;
};

const parseProfitPercentage = (text) => {
    const normalized = toEnglishDigits(text);
    const match = normalized.match(/(?:نسبة\s*الربح|الربح|الفائدة|فائده|profit)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*%?/i);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(100, value));
};

const parseReceiptNumber = (text) => {
    const normalized = normalizeSpaces(toEnglishDigits(text));
    const match = normalized.match(/(?:سند|ايصال|إيصال|receipt)\s*(?:رقم|number|no)?\s*[:#]?\s*([A-Za-z0-9\-_/]{3,40})/i);
    return match?.[1] ? String(match[1]).trim() : null;
};

const parseDate = (text) => {
    const normalized = toEnglishDigits(text);
    const ymd = normalized.match(/\b(20\d{2})[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12]\d|3[01])\b/);
    if (ymd) {
        const iso = `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;
        const date = new Date(`${iso}T00:00:00Z`);
        if (!Number.isNaN(date.getTime())) return iso;
    }
    const dmy = normalized.match(/\b(0?[1-9]|[12]\d|3[01])[-\/](0?[1-9]|1[0-2])[-\/](20\d{2})\b/);
    if (dmy) {
        const iso = `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
        const date = new Date(`${iso}T00:00:00Z`);
        if (!Number.isNaN(date.getTime())) return iso;
    }
    return null;
};

const parseFullName = (text) => {
    const normalized = normalizeSpaces(text);
    const patterns = [
        /(?:اسم(?:\s+العميل)?|العميل(?:\s+اسمه)?)\s*[:：]?\s*([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s]{2,60})/i,
        /عميل\s+جديد\s+([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s]{2,60})/i,
    ];
    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (!match?.[1]) continue;
        const cleaned = normalizeSpaces(match[1]).replace(/[0-9٠-٩۰-۹]+/g, '').trim();
        if (cleaned.length >= 3) return cleaned;
    }
    return null;
};

const parseNationalId = (text) => {
    const normalized = toEnglishDigits(text);
    const explicit = normalized.match(/(?:هوية|الهوية|رقم الهوية|national\s*id)\s*[:=]?\s*([0-9]{10})/i);
    if (explicit?.[1]) return normalizeNationalId(explicit[1]);
    const fallback = normalized.match(/\b([0-9]{10})\b/);
    if (!fallback?.[1]) return null;
    return normalizeNationalId(fallback[1]);
};

const parseMobile = (text) => {
    const normalized = toEnglishDigits(text);
    const explicit = normalized.match(/(?:جوال|رقم الجوال|هاتف|mobile|phone)\s*[:=]?\s*(\+?9665\d{8}|05\d{8}|5\d{8})/i);
    if (explicit?.[1]) return normalizeMobile(explicit[1]);
    const fallback = normalized.match(/(\+?9665\d{8}|05\d{8}|5\d{8})/);
    if (!fallback?.[1]) return null;
    return normalizeMobile(fallback[1]);
};

const normalizeReceiptNumber = (value) => {
    const normalized = normalizeSpaces(toEnglishDigits(value));
    if (!normalized) return null;
    const direct = normalized.match(/^[A-Za-z0-9\-_/]{3,40}$/);
    if (direct?.[0]) return direct[0];
    const fallback = normalized.match(/([A-Za-z0-9\-_/]{3,40})/);
    return fallback?.[1] || null;
};

const normalizeAiExtracted = (payload) => {
    if (!payload || typeof payload !== 'object') return {};

    const fullNameCandidate = payload.fullName || payload.full_name || payload.customerName || payload.name;
    const nationalIdCandidate = payload.nationalId || payload.national_id || payload.idNumber || payload.identity;
    const mobileCandidate = payload.mobileNumber || payload.mobile_number || payload.phone || payload.mobile;
    const amountCandidate = payload.amount;
    const profitCandidate = payload.profitPercentage || payload.profit_percentage || payload.profitRate;
    const receiptCandidate = payload.receiptNumber || payload.receipt_number || payload.receipt;
    const dateCandidate = payload.transactionDate || payload.transaction_date || payload.date;

    return {
        fullName: fullNameCandidate ? parseFullName(String(fullNameCandidate)) || normalizeSpaces(fullNameCandidate) : null,
        nationalId: nationalIdCandidate ? normalizeNationalId(nationalIdCandidate) : null,
        mobileNumber: mobileCandidate ? normalizeMobile(mobileCandidate) : null,
        amount: amountCandidate !== undefined && amountCandidate !== null ? parseAmount(String(amountCandidate)) : null,
        profitPercentage: profitCandidate !== undefined && profitCandidate !== null
            ? parseProfitPercentage(String(profitCandidate))
            : null,
        receiptNumber: receiptCandidate ? normalizeReceiptNumber(receiptCandidate) : null,
        transactionDate: dateCandidate ? parseDate(String(dateCandidate)) : null,
        intent: String(payload.intent || payload.action || '').trim().toLowerCase() || null,
    };
};

const mergeDraft = (previousDraft, extracted) => {
    const next = {
        customer: {
            id: previousDraft?.customer?.id || null,
            fullName: previousDraft?.customer?.fullName || null,
            nationalId: previousDraft?.customer?.nationalId || null,
            mobileNumber: previousDraft?.customer?.mobileNumber || null,
            source: previousDraft?.customer?.source || 'new',
        },
        loan: {
            amount: previousDraft?.loan?.amount ?? null,
            profitPercentage: previousDraft?.loan?.profitPercentage ?? 0,
            receiptNumber: previousDraft?.loan?.receiptNumber || null,
            transactionDate: previousDraft?.loan?.transactionDate || null,
            notes: previousDraft?.loan?.notes || null,
        },
    };

    if (extracted.fullName) next.customer.fullName = extracted.fullName;
    if (extracted.nationalId) next.customer.nationalId = extracted.nationalId;
    if (extracted.mobileNumber) next.customer.mobileNumber = extracted.mobileNumber;
    if (extracted.amount !== null && extracted.amount !== undefined) next.loan.amount = extracted.amount;
    if (extracted.profitPercentage !== null && extracted.profitPercentage !== undefined) {
        next.loan.profitPercentage = extracted.profitPercentage;
    }
    if (extracted.receiptNumber) next.loan.receiptNumber = extracted.receiptNumber;
    if (extracted.transactionDate) next.loan.transactionDate = extracted.transactionDate;

    return next;
};

const findExistingCustomer = async (client, merchantId, draft) => {
    const nationalId = normalizeNationalId(draft?.customer?.nationalId);
    const mobileNumber = normalizeMobile(draft?.customer?.mobileNumber);
    const fullName = normalizeSpaces(draft?.customer?.fullName || '');

    const byId = draft?.customer?.id;
    if (byId) {
        const found = await client.query(
            `SELECT id, full_name, national_id, mobile_number
             FROM customers
             WHERE id = $1 AND merchant_id = $2 AND deleted_at IS NULL
             LIMIT 1`,
            [byId, merchantId]
        );
        if (found.rows.length > 0) return found.rows[0];
    }

    if (nationalId) {
        const found = await client.query(
            `SELECT id, full_name, national_id, mobile_number
             FROM customers
             WHERE merchant_id = $1 AND national_id = $2 AND deleted_at IS NULL
             LIMIT 1`,
            [merchantId, nationalId]
        );
        if (found.rows.length > 0) return found.rows[0];
    }

    if (mobileNumber) {
        const found = await client.query(
            `SELECT id, full_name, national_id, mobile_number
             FROM customers
             WHERE merchant_id = $1 AND mobile_number = $2 AND deleted_at IS NULL
             LIMIT 1`,
            [merchantId, mobileNumber]
        );
        if (found.rows.length > 0) return found.rows[0];
    }

    if (fullName.length >= 3) {
        const found = await client.query(
            `SELECT id, full_name, national_id, mobile_number
             FROM customers
             WHERE merchant_id = $1
               AND deleted_at IS NULL
               AND lower(full_name) LIKE lower($2)
             ORDER BY created_at DESC
             LIMIT 1`,
            [merchantId, `%${fullName}%`]
        );
        if (found.rows.length > 0) return found.rows[0];
    }

    return null;
};

const getMissingFields = (draft) => {
    const missing = [];
    const hasExistingCustomer = Boolean(draft?.customer?.id);

    if (!hasExistingCustomer) {
        if (!draft?.customer?.fullName) missing.push('fullName');
        if (!normalizeNationalId(draft?.customer?.nationalId)) missing.push('nationalId');
        if (!normalizeMobile(draft?.customer?.mobileNumber)) missing.push('mobileNumber');
    }
    if (!(Number(draft?.loan?.amount) > 0)) missing.push('amount');

    return missing;
};

const MISSING_FIELD_PROMPTS = {
    fullName: 'ما اسم العميل الكامل؟',
    nationalId: 'أرسل رقم الهوية (10 أرقام).',
    mobileNumber: 'أرسل رقم الجوال (مثال: 05XXXXXXXX).',
    amount: 'كم مبلغ القرض؟',
};

const predictIntent = ({
    message,
    aiIntent,
    canCreate,
    missingFields,
    customerMatch,
}) => {
    const normalizedMessage = normalizeSpaces(toEnglishDigits(message || '')).toLowerCase();
    const explicitCreate = /(تأكيد|أكيد|انشئ|أنشئ|انشاء|إنشاء|سجل|اضف|أضف|نفذ|اعتمد|create|confirm|submit|done|yes|ok)\b/i.test(normalizedMessage);
    const explicitCollectMore = /(ناقص|اكمل|كمل|عدّل|تعديل|collect|update|edit|more|next|حقل)/i.test(normalizedMessage);

    let intent = 'collect_more';
    let confidence = 0.58;
    let reason = 'awaiting-more-data';

    if (aiIntent === 'confirm' || aiIntent === 'create') {
        intent = 'create';
        confidence = canCreate ? 0.94 : 0.66;
        reason = 'ai-intent-create';
    } else if (aiIntent === 'collect_more') {
        intent = 'collect_more';
        confidence = 0.88;
        reason = 'ai-intent-collect';
    } else if (explicitCreate) {
        intent = 'create';
        confidence = canCreate ? 0.9 : 0.64;
        reason = 'explicit-create-keyword';
    } else if (explicitCollectMore) {
        intent = 'collect_more';
        confidence = 0.84;
        reason = 'explicit-collect-keyword';
    } else if (canCreate) {
        intent = 'create';
        confidence = 0.85;
        reason = 'all-required-fields-present';
    } else if (customerMatch && missingFields.length === 1 && missingFields[0] === 'amount') {
        intent = 'collect_more';
        confidence = 0.9;
        reason = 'existing-customer-needs-amount';
    }

    const autoConfirmEligible = canCreate && intent === 'create' && confidence >= 0.85;

    return {
        intent,
        confidence: Number(confidence.toFixed(2)),
        reason,
        autoConfirmEligible,
    };
};

const buildAssistantMessage = ({ customerMatch, missingFields, canCreate, justCreated }) => {
    if (justCreated) {
        return 'تم إنشاء السجل بنجاح. أنشأت العميل/القرض ويمكنك متابعة التعديل أو إضافة سجل جديد.';
    }

    if (customerMatch && missingFields.length === 1 && missingFields[0] === 'amount') {
        return `تم العثور على عميل سابق (${customerMatch.full_name}). ممتاز، بقي فقط مبلغ القرض.`;
    }

    if (canCreate) {
        return 'البيانات مكتملة. اكتب "تأكيد" أو اضغط زر إنشاء السجل الآن.';
    }

    const firstMissing = missingFields[0];
    return MISSING_FIELD_PROMPTS[firstMissing] || 'أرسل البيانات الناقصة لإكمال إنشاء السجل.';
};

const createLoanRecord = async (client, merchantId, draft) => {
    let customerId = draft.customer.id;

    if (!customerId) {
        const nationalId = normalizeNationalId(draft.customer.nationalId);
        const mobileNumber = normalizeMobile(draft.customer.mobileNumber);
        const fullName = normalizeSpaces(draft.customer.fullName);

        const existing = await client.query(
            `SELECT id
             FROM customers
             WHERE merchant_id = $1
               AND national_id = $2
               AND deleted_at IS NULL
             LIMIT 1`,
            [merchantId, nationalId]
        );

        if (existing.rows.length > 0) {
            customerId = existing.rows[0].id;
        } else {
            const createdCustomer = await client.query(
                `INSERT INTO customers (merchant_id, full_name, national_id, mobile_number)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, full_name, national_id, mobile_number`,
                [merchantId, fullName, nationalId, mobileNumber]
            );
            customerId = createdCustomer.rows[0].id;
        }
    }

    const amount = Number(draft.loan.amount);
    const profitPercentage = Number(draft.loan.profitPercentage || 0);
    const transactionDate = draft.loan.transactionDate
        ? new Date(`${draft.loan.transactionDate}T00:00:00`)
        : new Date();
    const receiptNumber = draft.loan.receiptNumber || null;
    const notes = draft.loan.notes || null;

    const createdLoan = await client.query(
        `INSERT INTO loans (
            merchant_id,
            customer_id,
            amount,
            principal_amount,
            profit_percentage,
            receipt_number,
            transaction_date,
            notes,
            status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id, customer_id, amount, receipt_number, transaction_date, status, created_at`,
        [merchantId, customerId, amount, amount, profitPercentage, receiptNumber, transactionDate, notes, 'Active']
    );

    const customer = await client.query(
        `SELECT id, full_name, national_id, mobile_number
         FROM customers
         WHERE id = $1
         LIMIT 1`,
        [customerId]
    );

    return {
        customer: customer.rows[0] || null,
        loan: createdLoan.rows[0] || null,
    };
};

const invalidateReportsCache = async (merchantId) => {
    if (!merchantId) return;
    try {
        await clearCacheByPrefix(`reports:dashboard:${merchantId}`);
        await clearCacheByPrefix(`reports:analytics:${merchantId}:`);
        await clearCacheByPrefix(`reports:monthly:${merchantId}:`);
        await clearCacheByPrefix(`reports:ai:${merchantId}`);
        await clearCacheByPrefix(`loans:list:${merchantId}:`);
        await clearCacheByPrefix(`customers:list:${merchantId}:`);
    } catch {
        // Best-effort cache invalidation
    }
};

router.use(authenticateToken);
router.use(injectMerchantId);
router.use(injectRlsContext);

router.post('/quick-entry', checkPermission('can_add_loans'), async (req, res) => {
    try {
        const message = String(req.body?.message || '').trim();
        const confirmByMessage = /^(تأكيد|أكيد|انشئ|أنشئ|create|confirm|yes|ok)$/i.test(message);
        const previousDraft = (req.body?.draft && typeof req.body.draft === 'object') ? req.body.draft : {};
        const aiExtracted = normalizeAiExtracted(req.body?.aiExtracted);
        const aiIntent = String(aiExtracted.intent || '').trim().toLowerCase();
        const confirmByIntent = aiIntent === 'confirm' || aiIntent === 'create';
        const confirm = Boolean(req.body?.confirm) || confirmByMessage || confirmByIntent;

        const extracted = {
            fullName: aiExtracted.fullName || parseFullName(message),
            nationalId: aiExtracted.nationalId || parseNationalId(message),
            mobileNumber: aiExtracted.mobileNumber || parseMobile(message),
            amount: aiExtracted.amount !== null && aiExtracted.amount !== undefined ? aiExtracted.amount : parseAmount(message),
            profitPercentage: aiExtracted.profitPercentage !== null && aiExtracted.profitPercentage !== undefined
                ? aiExtracted.profitPercentage
                : parseProfitPercentage(message),
            receiptNumber: aiExtracted.receiptNumber || parseReceiptNumber(message),
            transactionDate: aiExtracted.transactionDate || parseDate(message),
        };

        const draft = mergeDraft(previousDraft, extracted);
        const customerMatch = await findExistingCustomer(req.dbClient, req.merchantId, draft);
        if (customerMatch) {
            draft.customer.id = customerMatch.id;
            draft.customer.fullName = customerMatch.full_name;
            draft.customer.nationalId = customerMatch.national_id;
            draft.customer.mobileNumber = customerMatch.mobile_number;
            draft.customer.source = 'existing';
        }

        const missingFields = getMissingFields(draft);
        const canCreate = missingFields.length === 0;
        const prediction = predictIntent({
            message,
            aiIntent,
            canCreate,
            missingFields,
            customerMatch,
        });
        const autoCreate = !confirm && prediction.autoConfirmEligible;

        if (confirm || autoCreate) {
            if (!canCreate) {
                return res.status(400).json({
                    assistant: buildAssistantMessage({ customerMatch, missingFields, canCreate: false, justCreated: false }),
                    draft,
                    missingFields,
                    canCreate: false,
                    needsConfirmation: false,
                    prediction: { ...prediction, autoConfirmEligible: false },
                    record: null,
                });
            }

            const record = await createLoanRecord(req.dbClient, req.merchantId, draft);
            if (typeof req.afterCommit === 'function') {
                req.afterCommit(() => invalidateReportsCache(req.merchantId));
            } else {
                invalidateReportsCache(req.merchantId);
            }
            return res.status(201).json({
                assistant: autoCreate
                    ? 'فهمت المدخلات كاملة وتم إنشاء السجل تلقائياً عبر Rabbit AI.'
                    : buildAssistantMessage({ customerMatch, missingFields: [], canCreate: true, justCreated: true }),
                draft: {
                    customer: { id: null, fullName: null, nationalId: null, mobileNumber: null, source: 'new' },
                    loan: { amount: null, profitPercentage: 0, receiptNumber: null, transactionDate: null, notes: null },
                },
                missingFields: [],
                canCreate: false,
                needsConfirmation: false,
                prediction: {
                    intent: 'create',
                    confidence: autoCreate ? 0.96 : prediction.confidence,
                    reason: autoCreate ? 'auto-created-from-prediction' : prediction.reason,
                    autoConfirmEligible: false,
                },
                record,
            });
        }

        return res.json({
            assistant: buildAssistantMessage({ customerMatch, missingFields, canCreate, justCreated: false }),
            draft,
            missingFields,
            canCreate,
            needsConfirmation: canCreate,
            prediction,
            record: null,
            customerMatch: customerMatch ? {
                id: customerMatch.id,
                full_name: customerMatch.full_name,
                national_id: customerMatch.national_id,
                mobile_number: customerMatch.mobile_number,
            } : null,
        });
    } catch (err) {
        console.error('Quick-entry assistant error:', err);
        res.status(500).json({ error: 'تعذر معالجة الإدخال السريع حالياً.' });
    }
});

module.exports = router;
