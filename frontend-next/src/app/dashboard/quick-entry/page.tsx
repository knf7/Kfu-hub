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

// SVG for Paperclip attachment
function IconPaperclip({ size = 24, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2001/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

// SVG for Trash
function IconTrash({ size = 24, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2001/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  );
}

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
  imagePreview?: string;
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
  'أرفق صورة لبطاقة الهوية أو إيصال للتحليل البصري',
];

const normalizeSuggestionList = (items: string[]) =>
  Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 5);

const getSuggestionsFromMissing = (fields: string[]) => normalizeSuggestionList(
  fields.map((field) => MISSING_FIELD_SUGGESTIONS[field]).filter(Boolean)
);

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
      text: 'مرحباً، أنا الذكاء الاصطناعي الخاص بـ Rabbit. اكتب تفاصيل القرض أو ارفع صورة لمستند وسألتقط البيانات المعقدة في ثانية!',
    },
  ]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{ file: File; base64: string; type: string } | null>(null);
  const [draft, setDraft] = useState<QuickEntryDraft>(EMPTY_DRAFT);
  const [missingFields, setMissingFields] = useState<string[]>(['fullName', 'nationalId', 'mobileNumber', 'amount']);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerMatch, setCustomerMatch] = useState<AssistantPayload['customerMatch']>(null);
  const [lastRecord, setLastRecord] = useState<AssistantRecord | null>(null);
  const [prediction, setPrediction] = useState<AssistantPayload['prediction'] | null>(null);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  
  const endRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasPrefillRunRef = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const completion = useMemo(() => {
    // Basic logic mapping to completeness
    const required = draft.customer.id ? 2 : 4; 
    let filled = 0;
    if (draft.customer.fullName) filled++;
    if (draft.customer.nationalId) filled++;
    if (draft.customer.mobileNumber) filled++;
    if (draft.loan.amount) filled++;
    
    const percent = (filled / 4) * 100;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }, [draft]);

  const predictionLabel = useMemo(() => {
    if (prediction?.intent === 'create') return 'توقع Rabbit: تصدير مباشر للبيانات';
    if (prediction?.intent) return 'توقع Rabbit: استكمال الحقول';
    return canCreate ? 'جاهز للمراجعة والإنشاء' : 'بانتظار تحليل البيانات';
  }, [canCreate, prediction]);

  const pushMessage = (role: 'assistant' | 'user', text: string, tone: 'neutral' | 'success' = 'neutral', imagePreview?: string) => {
    setMessages((prev) => [...prev, { id: createId(), role, text, tone, imagePreview }]);
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

  // Convert File to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Quick size validation (limit to exactly what Gemini allows typically 4MB is extremely safe)
    if (file.size > 8 * 1024 * 1024) {
      appToast.error('حجم الملف كبير جداً، الحد الأقصى 8 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({
        file,
        base64: ev.target?.result as string,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const analyzeWithGemini = async (text: string, imageObj: typeof attachment): Promise<any> => {
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
      .join('\\n');

    try {
      const response = await fetch('/api/assistant/rabbit-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          draft: draftSnapshot,
          missingFields,
          recentConversation,
          imageBase64: imageObj ? { base64: imageObj.base64, type: imageObj.type } : null
        })
      });

      if (!response.ok) {
         const err = await response.json();
         throw new Error(err.error || 'Failed to analyze with Gemini');
      }

      return await response.json();
    } catch (e: any) {
      console.error(e);
      return null;
    }
  };

  const sendToAssistant = async (text: string, confirm = false) => {
    const clean = String(text || '').trim();
    if ((!clean && !attachment) || loading) return;

    pushMessage('user', clean || 'لقد قمت بإرفاق صورة/مستند للتحليل...', 'neutral', attachment?.base64);
    
    const currentAttachment = attachment;
    setInput('');
    setAttachment(null);
    setLoading(true);

    try {
      // 1. Analyze with Gemini (Vision/Text)
      const parsedAi = await analyzeWithGemini(clean, currentAttachment);
      
      const aiExtracted = parsedAi?.extracted || null;
      const aiIntent = String(aiExtracted?.intent || '').toLowerCase();
      const confirmByAI = aiIntent === 'confirm' || aiIntent === 'create';

      // 2. Synthesize with backend logic to perform creation if validation succeeds
      const response = await assistantAPI.quickEntry({
        message: clean,
        draft,
        confirm: confirm || confirmByAI,
        aiExtracted,
      });
      
      const payload: AssistantPayload = response?.data || {};
      applyPayload(payload, parsedAi?.quickReplies || []);

      const backendAssistant = String(payload.assistant || '').trim();
      if (!backendAssistant && parsedAi?.assistantReply) {
        pushMessage('assistant', parsedAi.assistantReply);
      }
      if ((payload.missingFields?.length || 0) > 0 && parsedAi?.followUpQuestion) {
        if (!backendAssistant.includes(parsedAi.followUpQuestion)) {
          pushMessage('assistant', parsedAi.followUpQuestion);
        }
      }

      if (payload.record?.loan?.id) {
        appToast.success('تأكيد العبقرية: تم إنشاء السجل بنجاح ومزامنته!');
        router.prefetch('/dashboard/loans');
        setQuickSuggestions(DEFAULT_SUGGESTIONS);
      }
    } catch (error: any) {
      const backendMessage = error?.response?.data?.assistant || error?.response?.data?.error;
      const fallbackMessage = backendMessage || 'تعذر إكمال العملية الآن. حاول مرة أخرى أو تأكد من إدخال مفتاح API الخاص بجوجل.';
      pushMessage('assistant', fallbackMessage);
      appToast.error(backendMessage || 'تعذر قراءة التحليل البصري/النصي لـ Rabbit.');
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
    sendToAssistant('تأكيد ومراجعة تم الانتهاء', true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.includes('أرفق صورة')) {
       fileInputRef.current?.click();
       return;
    }
    setInput(suggestion);
    composerRef.current?.focus();
    const end = suggestion.length;
    composerRef.current?.setSelectionRange(end, end);
  };

  const handleReset = () => {
    setInput('');
    setAttachment(null);
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
        text: 'دورة إدخال جديدة. بانتظار النص السريع أو المرفقات البصرية لكي أمارس السحر!',
      },
    ]);
  };

  // Editable Handlers
  const handleDraftChange = (group: 'customer' | 'loan', field: string, value: string | number | null) => {
     setDraft(prev => ({
        ...prev,
        [group]: {
           ...prev[group],
           [field]: value
        }
     }));
     // After any manual edit, let's mark it theoretically ready if basic keys exist
     if (group === 'customer') {
       if (field === 'fullName' || field === 'nationalId' || field === 'mobileNumber') {
          // Trigger optimistic readiness
          if (!canCreate) setCanCreate(true);
       }
     }
  };

  return (
    <div className="qe-page">
      <section className="qe-chat-surface">
        <header className="qe-header">
          <div className="qe-brand">
            <BrandSignature />
            <div>
              <h1>Rabbit Entry • الإدخال السريع الذكي</h1>
              <p>النسخة المعززة بالذكاء الاصطناعي (Gemini Vision) للقراءة الآلية.</p>
            </div>
          </div>
          <div className="qe-header-actions">
            <div className="qe-ai-badge ready">Rabbit AI (Gemini) جاهز</div>
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
            <small>الحقول المنطقية</small>
            <strong>{missingFields.length > 0 ? missingFields.length : 0}</strong>
            <p>{completion >= 100 ? 'كل الحقول الأساسية مكتملة' : 'راجع القيم في الشريط الجانبي'}</p>
          </article>
          <article className={`qe-kpi ${canCreate || completion === 100 ? 'ready' : ''}`}>
            <small>وضع التنفيذ</small>
            <strong>{canCreate || completion === 100 ? 'جاهز للإنشاء' : 'تجهيز السجل'}</strong>
            <p>{predictionLabel}</p>
          </article>
        </section>

        <div className="qe-messages" aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={`qe-message ${message.role} ${message.tone || 'neutral'}`}>
              <div className="qe-bubble">
                {message.imagePreview && (
                  <img src={message.imagePreview} alt="user attachment" style={{ maxWidth: '200px', borderRadius: '8px', marginBottom: '8px' }} />
                )}
                {message.text}
              </div>
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
              <span>رسالة الإدخال أو المرفقات</span>
              <small>ارفع صورة هوية أو سند وسيقوم Rabbit بتفريغ كل البيانات منها آلياً.</small>
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
            
            {/* Attachment Preview Box */}
            {attachment && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', marginBottom: '8px', width: 'fit-content' }}>
                 <IconPaperclip size={16} className="text-blue-600" />
                 <span style={{ fontSize: '13px', color: '#1d4ed8' }}>{attachment.file.name.slice(0, 20)}...</span>
                 <button type="button" onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                   <IconTrash size={16} />
                 </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
               <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
               />
               <button 
                 type="button" 
                 onClick={() => fileInputRef.current?.click()} 
                 style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                 aria-label="إرفاق ملف"
               >
                 <IconPaperclip size={20} className="text-slate-500" />
               </button>

               <textarea
                 ref={composerRef}
                 value={input}
                 onChange={(event) => setInput(event.target.value)}
                 placeholder="اكتب هنا أو أرفق مستنداً بالزر الجانبي للقراءة البصرية..."
                 rows={3}
                 disabled={loading}
                 style={{ flex: 1 }}
               />
            </div>
            <div className="qe-composer-actions" style={{ marginTop: '12px', justifyContent: 'flex-end', display: 'flex', gap: '12px' }}>
              <button type="submit" className="qe-primary-btn" disabled={loading || (!input.trim() && !attachment)}>
                <IconAI size={16} />
                <span>{loading ? 'جاري المعالجة السحرية...' : 'إرسال لـ Rabbit'}</span>
              </button>
              {(canCreate || completion === 100) && (
                <button
                  type="button"
                  className="qe-success-btn"
                  disabled={loading}
                  onClick={handleConfirmCreate}
                >
                  <IconCheck size={16} />
                  <span>تأكيد المراجعة وإنشاء السجل الآن</span>
                </button>
              )}
            </div>
          </form>
        </footer>
      </section>

      <aside className="qe-inspector">
        <div className="qe-inspector-head">
          <h2>مراجعة وتعديل فوري للسجل</h2>
          <p>تستطيع التدخل اليدوي وتعديل أي قيمة لم يعجبك استخراج Rabbit لها هنا.</p>
        </div>
        <section className="qe-panel">
          <header>
            <IconUsers size={16} />
            <h2>بيانات العميل</h2>
          </header>
          <div className="qe-editable-fields">
             <div className="qe-field">
                <label>الاسم</label>
                <input type="text" value={draft.customer.fullName || ''} onChange={(e) => handleDraftChange('customer', 'fullName', e.target.value)} placeholder="اسم العميل الرباعي" />
             </div>
             <div className="qe-field">
                <label>رقم الهوية</label>
                <input type="text" value={draft.customer.nationalId || ''} onChange={(e) => handleDraftChange('customer', 'nationalId', e.target.value)} placeholder="مثال: 1012345678" />
             </div>
             <div className="qe-field">
                <label>الجوال</label>
                <input type="text" dir="ltr" value={draft.customer.mobileNumber || ''} onChange={(e) => handleDraftChange('customer', 'mobileNumber', e.target.value)} placeholder="مثال: 0551234567" />
             </div>
          </div>
          {customerMatch && (
            <p className="qe-note mt-2">
              تم التعرف على عميل سابق: <strong>{customerMatch.full_name}</strong>
            </p>
          )}
        </section>

        <section className="qe-panel">
          <header>
            <IconMoney size={16} />
            <h2>بيانات القرض</h2>
          </header>
          <div className="qe-editable-fields">
            <div className="qe-field">
              <label>المبلغ (ر.س)</label>
              <input type="number" dir="ltr" value={draft.loan.amount || ''} onChange={(e) => handleDraftChange('loan', 'amount', e.target.value ? Number(e.target.value) : null)} placeholder="مثال: 50000" />
            </div>
            <div className="qe-field">
              <label>نسبة الربح (%)</label>
              <input type="number" dir="ltr" value={draft.loan.profitPercentage || ''} onChange={(e) => handleDraftChange('loan', 'profitPercentage', e.target.value ? Number(e.target.value) : null)} placeholder="مثال: 15" />
            </div>
            <div className="qe-field">
               <label>تاريخ المعاملة</label>
               <input type="date" value={draft.loan.transactionDate || getTodayIso()} onChange={(e) => handleDraftChange('loan', 'transactionDate', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="qe-panel compact">
          <header>
            <IconClipboard size={16} />
            <h2>آخر عملية تم تنفيذها</h2>
          </header>
          {lastRecord?.loan?.id ? (
            <div className="qe-last-record">
              <p>رقم القرض: <strong>{lastRecord.loan.id.slice(0, 8)}...</strong></p>
              <p>المبلغ: <strong>{draft.loan.amount ? `${draft.loan.amount.toLocaleString()} ر.س` : '—'}</strong></p>
              <button
                type="button"
                className="qe-link-btn mt-2"
                onClick={() => router.push('/dashboard/loans')}
              >
                فتح سجل القروض للمتابعة
              </button>
            </div>
          ) : (
            <p className="qe-note">لم تقم بصناعة أي قرض في هذه الجلسة بعد.</p>
          )}
        </section>
      </aside>
    </div>
  );
}
