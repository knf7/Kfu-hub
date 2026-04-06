'use client';

import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { appToast } from '@/components/ui/sonner';
import { assistantAPI } from '@/lib/api';
import {
  IconAI,
  IconCheck,
  IconClipboard,
  IconMoney,
  IconRefresh,
  IconUsers,
} from '@/components/layout/icons';
import './quick-entry.css';

type QuickEntryDraft = {
  customer: {
    id: string | null;
    fullName: string | null;
    nationalId: string | null;
    mobileNumber: string | null;
    source?: string | null;
  };
  loan: {
    amount: number | null;
    profitPercentage: number | null;
    receiptNumber: string | null;
    transactionDate: string | null;
    notes: string | null;
  };
};

type AssistantRecord = {
  customer?: {
    id?: string;
    full_name?: string;
    national_id?: string;
    mobile_number?: string;
  } | null;
  loan?: {
    id?: string;
    amount?: number;
    status?: string;
    transaction_date?: string;
  } | null;
};

type AssistantPayload = {
  assistant?: string;
  draft?: QuickEntryDraft;
  missingFields?: string[];
  canCreate?: boolean;
  prediction?: {
    intent?: 'create' | 'collect_more' | string;
    confidence?: number;
    reason?: string;
    autoConfirmEligible?: boolean;
  };
  record?: AssistantRecord | null;
  customerMatch?: {
    id: string;
    full_name: string;
    national_id: string;
    mobile_number: string;
  } | null;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  tone?: 'neutral' | 'success';
};

type AiExtracted = {
  fullName?: string | null;
  nationalId?: string | null;
  mobileNumber?: string | null;
  amount?: number | string | null;
  profitPercentage?: number | string | null;
  receiptNumber?: string | null;
  transactionDate?: string | null;
  intent?: string | null;
};

type PuterIntelligence = {
  extracted: AiExtracted | null;
  assistantReply: string | null;
  followUpQuestion: string | null;
  quickReplies: string[];
};

declare global {
  interface Window {
    puter?: {
      ai?: {
        chat: (...args: any[]) => Promise<any>;
      };
    };
  }
}

const EMPTY_DRAFT: QuickEntryDraft = {
  customer: {
    id: null,
    fullName: null,
    nationalId: null,
    mobileNumber: null,
    source: 'new',
  },
  loan: {
    amount: null,
    profitPercentage: 0,
    receiptNumber: null,
    transactionDate: null,
    notes: null,
  },
};

const MISSING_FIELD_LABELS: Record<string, string> = {
  fullName: 'اسم العميل',
  nationalId: 'رقم الهوية',
  mobileNumber: 'رقم الجوال',
  amount: 'مبلغ القرض',
};

const MISSING_FIELD_SUGGESTIONS: Record<string, string> = {
  fullName: 'اسم العميل: ________',
  nationalId: 'رقم الهوية: 10 أرقام',
  mobileNumber: 'رقم الجوال: 05XXXXXXXX',
  amount: 'مبلغ القرض: ______ ر.س',
};

const DEFAULT_SUGGESTIONS = [
  'عميل جديد: الاسم + الهوية + الجوال + المبلغ',
  'عميل سابق: الهوية + مبلغ القرض',
  'أكمل البيانات الناقصة تلقائياً',
];

const normalizeSuggestionList = (items: string[]) =>
  Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 5);

const getSuggestionsFromMissing = (fields: string[]) => normalizeSuggestionList(
  fields.map((field) => MISSING_FIELD_SUGGESTIONS[field]).filter(Boolean)
);

const formatCurrency = (value: number | null | undefined) => {
  if (!Number.isFinite(Number(value))) return '—';
  return `${Number(value).toLocaleString('en-US')} ر.س`;
};

const getTodayIso = () => new Date().toISOString().slice(0, 10);

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const PUTER_SCRIPT_SRC = 'https://js.puter.com/v2/';
const PUTER_MODEL = 'gpt-5.4-nano';

const extractJsonObject = (value: string) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const normalizePuterResponseText = (response: any): string => {
  if (typeof response === 'string') return response;
  if (typeof response?.text === 'string') return response.text;
  if (typeof response?.content === 'string') return response.content;
  if (typeof response?.message?.content === 'string') return response.message.content;
  if (Array.isArray(response?.choices) && response.choices[0]?.message?.content) {
    return String(response.choices[0].message.content);
  }
  return JSON.stringify(response || '');
};

function BrandSignature() {
  return (
    <svg viewBox="0 0 88 88" className="qe-brand-mark" role="img" aria-label="شعار أصيل">
      <defs>
        <linearGradient id="qe-core" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="18" y="18" width="52" height="52" rx="16" fill="url(#qe-core)" />
      <rect x="13" y="13" width="62" height="62" rx="20" fill="none" stroke="#bfdbfe" strokeWidth="3" opacity="0.9" />
      <rect x="30" y="31" width="7" height="26" rx="3.5" fill="#f8fafc" />
      <rect x="43" y="26" width="7" height="31" rx="3.5" fill="#e2e8f0" />
      <rect x="56" y="36" width="7" height="21" rx="3.5" fill="#cbd5e1" />
      <circle cx="59.5" cy="29.5" r="4.3" fill="#f8fafc" />
    </svg>
  );
}

export default function QuickEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      tone: 'neutral',
      text: 'ابدأ الآن: اكتب تفاصيل القرض بأي صيغة وسأجمع الحقول الناقصة تلقائيًا.',
    },
  ]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<QuickEntryDraft>(EMPTY_DRAFT);
  const [missingFields, setMissingFields] = useState<string[]>(['fullName', 'nationalId', 'mobileNumber', 'amount']);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerMatch, setCustomerMatch] = useState<AssistantPayload['customerMatch']>(null);
  const [lastRecord, setLastRecord] = useState<AssistantRecord | null>(null);
  const [prediction, setPrediction] = useState<AssistantPayload['prediction'] | null>(null);
  const [aiProviderState, setAiProviderState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const endRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const hasPrefillRunRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.puter?.ai?.chat) {
      setAiProviderState('ready');
      return;
    }

    const markReady = () => setAiProviderState(window.puter?.ai?.chat ? 'ready' : 'fallback');
    const markFallback = () => setAiProviderState('fallback');

    const existing = document.querySelector(`script[src="${PUTER_SCRIPT_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', markReady);
      existing.addEventListener('error', markFallback);
      return () => {
        existing.removeEventListener('load', markReady);
        existing.removeEventListener('error', markFallback);
      };
    }

    const script = document.createElement('script');
    script.src = PUTER_SCRIPT_SRC;
    script.async = true;
    script.onload = markReady;
    script.onerror = markFallback;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  const completion = useMemo(() => {
    const required = draft.customer.id ? 1 : 4;
    const missingCount = Math.min(missingFields.length, required);
    const percent = ((required - missingCount) / required) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }, [draft.customer.id, missingFields]);
  const aiProviderLabel = useMemo(() => {
    if (aiProviderState === 'ready') return 'Rabbit AI جاهز (Puter)';
    if (aiProviderState === 'loading') return 'تهيئة Rabbit AI...';
    return 'وضع احتياطي';
  }, [aiProviderState]);
  const predictionLabel = useMemo(() => {
    if (prediction?.intent === 'create') return 'توقع Rabbit: إنشاء مباشر';
    if (prediction?.intent) return 'توقع Rabbit: استكمال بيانات';
    return canCreate ? 'جاهز للإنشاء' : 'بانتظار استكمال';
  }, [canCreate, prediction]);

  const pushMessage = (role: 'assistant' | 'user', text: string, tone: 'neutral' | 'success' = 'neutral') => {
    setMessages((prev) => [...prev, { id: createId(), role, text, tone }]);
  };

  const refreshSuggestions = (fields: string[], aiReplies: string[] = []) => {
    const next = normalizeSuggestionList([
      ...getSuggestionsFromMissing(fields),
      ...aiReplies,
    ]);
    setQuickSuggestions(next.length ? next : DEFAULT_SUGGESTIONS);
  };

  const applyPayload = (payload: AssistantPayload, aiReplies: string[] = []) => {
    const nextMissingFields = payload.missingFields || [];
    setDraft(payload.draft || EMPTY_DRAFT);
    setMissingFields(nextMissingFields);
    setCanCreate(Boolean(payload.canCreate));
    setCustomerMatch(payload.customerMatch || null);
    setPrediction(payload.prediction || null);
    refreshSuggestions(nextMissingFields, aiReplies);
    if (payload.record) {
      setLastRecord(payload.record);
    }
    if (payload.assistant) {
      pushMessage('assistant', payload.assistant, payload.record ? 'success' : 'neutral');
    }
  };

  const analyzeWithPuter = async (text: string): Promise<PuterIntelligence | null> => {
    if (typeof window === 'undefined' || !window.puter?.ai?.chat) return null;

    const draftSnapshot = {
      customer: {
        fullName: draft.customer.fullName,
        nationalId: draft.customer.nationalId,
        mobileNumber: draft.customer.mobileNumber,
      },
      loan: {
        amount: draft.loan.amount,
        profitPercentage: draft.loan.profitPercentage,
        receiptNumber: draft.loan.receiptNumber,
        transactionDate: draft.loan.transactionDate,
      },
    };
    const recentConversation = messages
      .slice(-6)
      .map((msg) => `${msg.role === 'assistant' ? 'ASSISTANT' : 'USER'}: ${msg.text}`)
      .join('\n');

    const prompt = [
      'أنت مساعد ذكي للإدخال السريع للقروض في السعودية.',
      'المطلوب: استخراج الحقول، اقتراح سؤال متابعة ذكي، وتوليد اقتراحات رد جاهزة للمستخدم.',
      'أعد JSON فقط بدون markdown بالشكل التالي:',
      '{"extracted":{"fullName":null,"nationalId":null,"mobileNumber":null,"amount":null,"profitPercentage":null,"receiptNumber":null,"transactionDate":null,"intent":null},"assistantReply":null,"followUpQuestion":null,"quickReplies":[]}',
      'intent يجب أن تكون واحدة من: confirm أو collect_more أو create.',
      'followUpQuestion يجب أن تكون جملة عربية قصيرة تجمع أهم البيانات الناقصة.',
      'quickReplies مصفوفة قصيرة (2-4 عناصر) تساعد المستخدم على الرد بسرعة.',
      `Draft الحالي: ${JSON.stringify(draftSnapshot)}`,
      `الحقول الناقصة الحالية: ${JSON.stringify(missingFields)}`,
      `سياق المحادثة (آخر الرسائل): ${recentConversation || 'لا يوجد سياق بعد'}`,
      `الرسالة: ${text}`,
    ].join('\n');

    try {
      const raw = await window.puter.ai.chat(prompt, { model: PUTER_MODEL });
      const parsed = extractJsonObject(normalizePuterResponseText(raw));
      if (!parsed || typeof parsed !== 'object') return null;

      const source = (parsed.extracted && typeof parsed.extracted === 'object') ? parsed.extracted : parsed;
      const quickReplies = normalizeSuggestionList(
        Array.isArray(parsed.quickReplies)
          ? parsed.quickReplies.map((item: unknown) => String(item ?? ''))
          : []
      );

      return {
        extracted: {
          fullName: source.fullName ?? null,
          nationalId: source.nationalId ?? null,
          mobileNumber: source.mobileNumber ?? null,
          amount: source.amount ?? null,
          profitPercentage: source.profitPercentage ?? null,
          receiptNumber: source.receiptNumber ?? null,
          transactionDate: source.transactionDate ?? null,
          intent: source.intent ?? parsed.intent ?? null,
        },
        assistantReply: typeof parsed.assistantReply === 'string' ? parsed.assistantReply.trim() : null,
        followUpQuestion: typeof parsed.followUpQuestion === 'string' ? parsed.followUpQuestion.trim() : null,
        quickReplies,
      };
    } catch {
      return null;
    }
  };

  const sendToAssistant = async (text: string, confirm = false) => {
    const clean = String(text || '').trim();
    if (!clean || loading) return;

    pushMessage('user', clean);
    setInput('');
    setLoading(true);
    let aiIntelligence: PuterIntelligence | null = null;

    try {
      aiIntelligence = aiProviderState === 'ready' ? await analyzeWithPuter(clean) : null;
      const aiExtracted = aiIntelligence?.extracted || null;
      const aiIntent = String(aiExtracted?.intent || '').toLowerCase();
      const confirmByAI = aiIntent === 'confirm' || aiIntent === 'create';

      const response = await assistantAPI.quickEntry({
        message: clean,
        draft,
        confirm: confirm || confirmByAI,
        aiExtracted,
      });
      const payload: AssistantPayload = response?.data || {};
      applyPayload(payload, aiIntelligence?.quickReplies || []);

      const backendAssistant = String(payload.assistant || '').trim();
      if (!backendAssistant && aiIntelligence?.assistantReply) {
        pushMessage('assistant', aiIntelligence.assistantReply);
      }
      if ((payload.missingFields?.length || 0) > 0 && aiIntelligence?.followUpQuestion) {
        if (!backendAssistant.includes(aiIntelligence.followUpQuestion)) {
          pushMessage('assistant', aiIntelligence.followUpQuestion);
        }
      }

      if (payload.record?.loan?.id) {
        appToast.success('تم إنشاء السجل بنجاح وجرى مزامنته مع صفحة القروض.');
        router.prefetch('/dashboard/loans');
        setQuickSuggestions(DEFAULT_SUGGESTIONS);
      }
    } catch (error: any) {
      const backendMessage = error?.response?.data?.assistant || error?.response?.data?.error;
      const fallbackMessage = backendMessage || aiIntelligence?.assistantReply || 'تعذر إكمال العملية الآن. حاول مرة أخرى.';
      pushMessage('assistant', fallbackMessage);
      appToast.error(backendMessage || 'تعذر تنفيذ الإدخال السريع.');
      if (aiIntelligence?.quickReplies?.length) {
        setQuickSuggestions(normalizeSuggestionList([
          ...aiIntelligence.quickReplies,
          ...getSuggestionsFromMissing(missingFields),
        ]));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendToAssistant(input, false);
  };

  useEffect(() => {
    if (hasPrefillRunRef.current) return;
    const prefill = String(searchParams.get('q') || '').trim();
    if (!prefill) return;
    hasPrefillRunRef.current = true;
    setInput(prefill);
    sendToAssistant(prefill, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConfirmCreate = () => {
    sendToAssistant('تأكيد', true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    composerRef.current?.focus();
    const end = suggestion.length;
    composerRef.current?.setSelectionRange(end, end);
  };

  const handleReset = () => {
    setInput('');
    setDraft(EMPTY_DRAFT);
    setMissingFields(['fullName', 'nationalId', 'mobileNumber', 'amount']);
    setCanCreate(false);
    setCustomerMatch(null);
    setLastRecord(null);
    setPrediction(null);
    setQuickSuggestions(DEFAULT_SUGGESTIONS);
    setMessages([
      {
        id: createId(),
        role: 'assistant',
        text: 'جلسة جديدة جاهزة. اكتب اسم العميل مع الهوية والجوال والمبلغ للبدء.',
      },
    ]);
  };

  return (
    <div className="qe-page">
      <section className="qe-chat-surface">
        <header className="qe-header">
          <div className="qe-brand">
            <BrandSignature />
            <div>
              <h1>Rabbit Entry • الإدخال السريع الذكي</h1>
              <p>اكتب بلغة طبيعية، وRabbit يرتّب البيانات ويجهز السجل خطوة بخطوة.</p>
            </div>
          </div>
          <div className="qe-header-actions">
            <div className={`qe-ai-badge ${aiProviderState}`}>{aiProviderLabel}</div>
            <button type="button" className="qe-ghost-btn" onClick={handleReset}>
              <IconRefresh size={16} />
              <span>جلسة جديدة</span>
            </button>
          </div>
        </header>

        <section className="qe-kpi-row" aria-label="ملخص حالة الإدخال">
          <article className="qe-kpi">
            <small>اكتمال البيانات</small>
            <strong>{completion}%</strong>
            <div className="qe-kpi-bar"><i style={{ width: `${completion}%` }} /></div>
          </article>
          <article className="qe-kpi">
            <small>الحقول الناقصة</small>
            <strong>{missingFields.length}</strong>
            <p>{missingFields.length > 0 ? 'تحتاج استكمال قبل الإنشاء' : 'كل الحقول الأساسية مكتملة'}</p>
          </article>
          <article className={`qe-kpi ${canCreate ? 'ready' : ''}`}>
            <small>وضع التنفيذ</small>
            <strong>{canCreate ? 'جاهز للإنشاء' : 'تجهيز السجل'}</strong>
            <p>{predictionLabel}</p>
          </article>
        </section>

        <div className="qe-missing-strip">
          <p className="qe-strip-label">متطلبات الإدخال</p>
          <div className="qe-chip-row">
            {prediction?.intent && (
              <span className={`qe-chip rabbit ${prediction.intent === 'create' ? 'create' : ''}`}>
                {prediction.intent === 'create' ? 'إنشاء مباشر' : 'استكمال بيانات'}
                {typeof prediction.confidence === 'number' && ` (${Math.round(prediction.confidence * 100)}%)`}
              </span>
            )}
            {missingFields.length > 0 ? (
              missingFields.map((field) => (
                <span key={field} className="qe-chip">{MISSING_FIELD_LABELS[field] || field}</span>
              ))
            ) : (
              <span className="qe-chip success"><IconCheck size={14} /> البيانات مكتملة</span>
            )}
          </div>
        </div>

        <div className="qe-messages" aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={`qe-message ${message.role} ${message.tone || 'neutral'}`}>
              <div className="qe-bubble">{message.text}</div>
            </article>
          ))}
          {loading && (
            <article className="qe-message assistant neutral">
              <div className="qe-bubble typing">
                <span />
                <span />
                <span />
              </div>
            </article>
          )}
          <div ref={endRef} />
        </div>

        <footer className="qe-composer">
          <form onSubmit={handleSubmit}>
            <div className="qe-composer-head">
              <span>رسالة الإدخال</span>
              <small>يدعم الصياغة الحرة بالعربية ويتعامل مع النصوص المختصرة</small>
            </div>
            {quickSuggestions.length > 0 && (
              <div className="qe-suggestion-strip" aria-label="اقتراحات ذكية سريعة">
                {quickSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="qe-suggestion-chip"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={composerRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="مثال: العميل محمد أحمد، الهوية 1023456789، الجوال 0551234567، مبلغ 25000، نسبة الربح 12%"
              rows={3}
              disabled={loading}
            />
            <div className="qe-composer-actions">
              <button type="submit" className="qe-primary-btn" disabled={loading || !input.trim()}>
                <IconAI size={16} />
                <span>{loading ? 'جاري المعالجة...' : 'إرسال'}</span>
              </button>
              {canCreate && (
                <button
                  type="button"
                  className="qe-success-btn"
                  disabled={loading}
                  onClick={handleConfirmCreate}
                >
                  <IconCheck size={16} />
                  <span>إنشاء السجل الآن</span>
                </button>
              )}
            </div>
          </form>
        </footer>
      </section>

      <aside className="qe-inspector">
        <div className="qe-inspector-head">
          <h2>ملخص فوري للسجل</h2>
          <p>كل ما يفهمه Rabbit يظهر هنا لحظة بلحظة قبل الإنشاء النهائي.</p>
        </div>
        <section className="qe-panel">
          <header>
            <IconUsers size={16} />
            <h2>بيانات العميل</h2>
          </header>
          <dl>
            <div><dt>الاسم</dt><dd>{draft.customer.fullName || '—'}</dd></div>
            <div><dt>رقم الهوية</dt><dd>{draft.customer.nationalId || '—'}</dd></div>
            <div><dt>الجوال</dt><dd>{draft.customer.mobileNumber || '—'}</dd></div>
            <div><dt>النوع</dt><dd>{draft.customer.id ? 'عميل سابق' : 'عميل جديد'}</dd></div>
          </dl>
          {customerMatch && (
            <p className="qe-note">
              تم التعرف على عميل سابق: <strong>{customerMatch.full_name}</strong>
            </p>
          )}
        </section>

        <section className="qe-panel">
          <header>
            <IconMoney size={16} />
            <h2>بيانات القرض</h2>
          </header>
          <dl>
            <div><dt>المبلغ</dt><dd>{formatCurrency(draft.loan.amount)}</dd></div>
            <div><dt>نسبة الربح</dt><dd>{Number(draft.loan.profitPercentage || 0)}%</dd></div>
            <div><dt>رقم السند</dt><dd>{draft.loan.receiptNumber || '—'}</dd></div>
            <div><dt>تاريخ المعاملة</dt><dd>{draft.loan.transactionDate || getTodayIso()}</dd></div>
          </dl>
        </section>

        <section className="qe-panel compact">
          <header>
            <IconClipboard size={16} />
            <h2>آخر عملية</h2>
          </header>
          {lastRecord?.loan?.id ? (
            <div className="qe-last-record">
              <p>رقم القرض: <strong>{lastRecord.loan.id.slice(0, 8)}...</strong></p>
              <p>المبلغ: <strong>{formatCurrency(lastRecord.loan.amount)}</strong></p>
              <p>الحالة: <strong>{lastRecord.loan.status || 'Active'}</strong></p>
              <button
                type="button"
                className="qe-link-btn"
                onClick={() => router.push('/dashboard/loans')}
              >
                فتح صفحة القروض
              </button>
            </div>
          ) : (
            <p className="qe-note">لا توجد عملية مكتملة في هذه الجلسة بعد.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
