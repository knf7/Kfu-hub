'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { loansAPI, reportsAPI, DASHBOARD_DIRTY_KEY } from '@/lib/api';
import { useDataSync } from '@/hooks/useDataSync';
import {
    DollarSign, Users, Calendar, CheckCircle2, AlertTriangle,
    TrendingUp, TrendingDown, Download, Plus, Rocket,
    Shield, AlertCircle, Info, ClipboardList,
    CreditCard, BadgeDollarSign
} from 'lucide-react';
import './dashboard.css';

const MONTH_NAMES: Record<string, string> = {
    '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
    '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
    '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    Active: { label: 'نشط', color: 'var(--coral)' },
    Paid: { label: 'مدفوع', color: 'var(--success)' },
    Overdue: { label: 'متأخر', color: 'var(--danger)' },
    Cancelled: { label: 'ملغي', color: 'var(--text-muted)' },
};

const CHART_INTERVALS = [
    { id: 'week', label: 'أسبوعي' },
    { id: 'month', label: 'شهري' },
];

const CACHE_TTL_MS = 1000 * 60 * 10;
const DASHBOARD_SUMMARY_CACHE_KEY = 'dashboard-summary-cache';
const DASHBOARD_AI_CACHE_KEY = 'dashboard-ai-cache';
const readSession = (key: string) => {
    if (typeof window === 'undefined') return undefined;
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : undefined;
    } catch {
        return undefined;
    }
};
const readPersisted = (key: string) => {
    if (typeof window === 'undefined') return undefined;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return undefined;
        if (!parsed.savedAt || (Date.now() - parsed.savedAt) > CACHE_TTL_MS) {
            localStorage.removeItem(key);
            return undefined;
        }
        return parsed.data;
    } catch {
        return undefined;
    }
};
const writePersisted = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch { /* ignore */ }
};

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
    danger: <AlertCircle size={18} color="var(--danger)" />,
    warning: <AlertTriangle size={18} color="var(--warning)" />,
    success: <CheckCircle2 size={18} color="var(--success)" />,
    info: <Info size={18} color="var(--info)" />,
};

// ─── Stat Card ─────────────────────────────────
const StatCard = React.memo(function StatCard({ label, value, sub, Icon, color, trend, loading, onClick }: any) {
    return (
        <div className={`stat-card fade-up ${onClick ? 'clickable' : ''}`} onClick={onClick}>
            <div className="stat-icon" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                {Icon && <Icon size={22} color={color} />}
            </div>
            <div className="stat-body">
                <div className="stat-value">{loading ? <span className="sk-val" /> : value}</div>
                <div className="stat-label">{label}</div>
                {sub && <div className="stat-sub">{sub}</div>}
            </div>
            {trend !== undefined && (
                <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
                    {trend >= 0
                        ? <TrendingUp size={13} color="var(--success)" />
                        : <TrendingDown size={13} color="var(--danger)" />}
                    <span>{Math.abs(trend)}%</span>
                </div>
            )}
        </div>
    );
});

// ─── Toast ────────────────────────────────────
const ToastContainer = React.memo(function ToastContainer({ toasts }: { toasts: any[] }) {
    return (
        <div className="toast-container">
            {toasts.map((t: any) => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <div className="toast-icon-wrap">
                        {t.type === 'danger' && <AlertCircle size={18} color="var(--danger)" />}
                        {t.type === 'warning' && <AlertTriangle size={18} color="var(--warning)" />}
                        {t.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
                        {t.type === 'info' && <Info size={18} color="var(--info)" />}
                    </div>
                    <div>
                        <div className="toast-title">{t.title}</div>
                        <div className="toast-text">{t.text}</div>
                    </div>
                </div>
            ))}
        </div>
    );
});


// ─── AI Insight Card ──────────────────────────
const InsightCard = React.memo(function InsightCard({ ins }: { ins: any }) {
    return (
        <div className={`insight-card insight-${ins.type}`}>
            <div className="insight-header">
                <div className={`insight-icon-wrap insight-icon-${ins.type}`}>
                    {INSIGHT_ICONS[ins.type]}
                </div>
                <div className="insight-category">{ins.category}</div>
            </div>
            <div className="insight-title">{ins.title}</div>
            <p className="insight-detail">{ins.detail}</p>
            {ins.action && <div className="insight-action">{ins.action}</div>}
        </div>
    );
});

// ─── Free Trial Banner ────────────────────────
const FreeTrialBanner = React.memo(function FreeTrialBanner({ expiryDate }: { expiryDate: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!expiryDate) return;
        const updateTimer = () => {
            const end = new Date(expiryDate).getTime();
            const now = new Date().getTime();
            const diff = end - now;
            if (diff <= 0) { setTimeLeft('انتهى الاشتراك'); return; }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            setTimeLeft(`${days} يوم و ${hours} ساعة`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [expiryDate]);

    if (!expiryDate) return null;

    return (
        <div className="free-trial-banner fade-up" style={{ padding: '12px 24px', justifyContent: 'flex-start' }}>
            <div className="ft-icon" style={{ background: 'rgba(255,255,255,0.2)' }}><Rocket size={20} color="#fff" /></div>
            <div className="ft-content" style={{ margin: 0 }}>
                <div className="ft-subtitle" style={{ fontSize: '1rem', opacity: 1 }}>
                    الوقت المتبقي لانتهاء الاشتراك: <strong style={{ letterSpacing: '0.5px' }}>{timeLeft}</strong>
                </div>
            </div>
        </div>
    );
});

// ─── Main Dashboard ────────────────────────────
export default function DashboardPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [chartInterval, setChartInterval] = useState('week');
    const [toasts, setToasts] = useState<any[]>([]);
    const [rabbitInput, setRabbitInput] = useState('');
    const [rabbitExpanded, setRabbitExpanded] = useState(false);
    const [merchant, setMerchant] = useState<any>({});
    const [todayLabel, setTodayLabel] = useState('');
    const notifiedRef = useRef({ overdue: false, highRisk: false, summaryError: false });
    const rabbitInputRef = useRef<HTMLInputElement | null>(null);
    const [enableHeavyFetch, setEnableHeavyFetch] = useState(false);
    const [refreshToken, setRefreshToken] = useState(0);

    const subscriptionPlan = String(merchant?.subscriptionPlan || merchant?.subscription_plan || '').toLowerCase();
    const initialSummary = useMemo(
        () => readSession(DASHBOARD_SUMMARY_CACHE_KEY) ?? readPersisted(DASHBOARD_SUMMARY_CACHE_KEY),
        []
    );
    const initialAnalytics = useMemo(
        () =>
            readSession(`dashboard-analytics-${chartInterval}`)
            ?? readPersisted(`dashboard-analytics-${chartInterval}`),
        [chartInterval]
    );
    const initialAi = useMemo(
        () => readSession(DASHBOARD_AI_CACHE_KEY) ?? readPersisted(DASHBOARD_AI_CACHE_KEY),
        []
    );

    const addToast = useCallback((toast: any) => {
        const id = Date.now() + Math.random();
        setToasts((prev: any[]) => [...prev, { id, ...toast }]);
        setTimeout(() => setToasts((prev: any[]) => prev.filter((t: any) => t.id !== id)), 6000);
    }, []);

    const summaryQuery = useQuery({
        queryKey: ['dashboard', 'summary', refreshToken],
        queryFn: async () => {
            const res = await reportsAPI.getDashboard(refreshToken ? { _t: refreshToken } : {});
            return (res as any).data ?? res;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
        initialData: initialSummary,
    });

    const analyticsQuery = useQuery({
        queryKey: ['dashboard', 'analytics', chartInterval, refreshToken],
        queryFn: async () => {
            const res = await reportsAPI.getAnalytics({ interval: chartInterval, _t: refreshToken || undefined });
            return (res as any).data ?? res;
        },
        enabled: enableHeavyFetch,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,
        initialData: initialAnalytics,
    });

    const aiQuery = useQuery({
        queryKey: ['dashboard', 'ai', refreshToken],
        queryFn: async () => {
            const res = await reportsAPI.getAIAnalysis(refreshToken ? { _t: refreshToken } : {});
            return (res as any).data ?? res;
        },
        enabled: enableHeavyFetch && subscriptionPlan === 'enterprise',
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: false,
        refetchOnWindowFocus: false,
        initialData: initialAi,
    });

    useEffect(() => {
        if (!summaryQuery.data) return;
        try {
            sessionStorage.setItem(DASHBOARD_SUMMARY_CACHE_KEY, JSON.stringify(summaryQuery.data));
        } catch { /* ignore */ }
        writePersisted(DASHBOARD_SUMMARY_CACHE_KEY, summaryQuery.data);
    }, [summaryQuery.data]);

    useEffect(() => {
        if (!analyticsQuery.data) return;
        try {
            sessionStorage.setItem(
                `dashboard-analytics-${chartInterval}`,
                JSON.stringify(analyticsQuery.data)
            );
        } catch { /* ignore */ }
        writePersisted(`dashboard-analytics-${chartInterval}`, analyticsQuery.data);
    }, [analyticsQuery.data, chartInterval]);

    useEffect(() => {
        if (aiQuery.data === undefined) return;
        try {
            sessionStorage.setItem(DASHBOARD_AI_CACHE_KEY, JSON.stringify(aiQuery.data));
        } catch { /* ignore */ }
        writePersisted(DASHBOARD_AI_CACHE_KEY, aiQuery.data);
    }, [aiQuery.data]);

    useEffect(() => {
        setTodayLabel(
            new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        );
    }, []);

    useEffect(() => {
        if (enableHeavyFetch) return;
        if (typeof window === 'undefined') return;
        const globalAny = globalThis as any;
        let idleHandle: number | null = null;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        const trigger = () => setEnableHeavyFetch(true);
        if (typeof globalAny.requestIdleCallback === 'function') {
            idleHandle = globalAny.requestIdleCallback(trigger, { timeout: 1200 });
        } else {
            timeoutHandle = setTimeout(trigger, 400);
        }
        return () => {
            if (idleHandle !== null && typeof globalAny.cancelIdleCallback === 'function') {
                globalAny.cancelIdleCallback(idleHandle);
            }
            if (timeoutHandle !== null) {
                clearTimeout(timeoutHandle);
            }
        };
    }, [enableHeavyFetch]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const dirty = localStorage.getItem(DASHBOARD_DIRTY_KEY);
            if (!dirty) return;
            localStorage.removeItem(DASHBOARD_DIRTY_KEY);
            setRefreshToken(Date.now());
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setEnableHeavyFetch(true);
            summaryQuery.refetch();
        } catch { /* ignore */ }
    }, [queryClient, summaryQuery]);

    useDataSync(() => {
        setRefreshToken(Date.now());
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setEnableHeavyFetch(true);
        summaryQuery.refetch();
    }, { scopes: ['dashboard', 'reports', 'loans', 'customers', 'najiz'], debounceMs: 250 });

    useEffect(() => {
        try {
            const m = JSON.parse(localStorage.getItem('merchant') || '{}');
            setMerchant(m);
        } catch { /* ignore */ }
    }, []);

    // CSV Export
    const handleExportCSV = async () => {
        try {
            const res = await loansAPI.getAll({ limit: 9999 });
            const data = (res as any).data ?? res;
            const loans = data?.loans || [];
            if (!loans.length) { addToast({ type: 'warning', title: 'لا توجد بيانات', text: 'لم يتم العثور على قروض' }); return; }
            const headers = ['الاسم', 'رقم الهوية', 'الجوال', 'المبلغ', 'الحالة', 'تاريخ المعاملة'];
            const rows = loans.map((l: any) => [
                l.customer_name || '', l.national_id || '', l.mobile_number || '',
                l.amount || 0, STATUS_MAP[l.status]?.label || l.status || '',
                l.transaction_date ? new Date(l.transaction_date).toLocaleDateString('en-GB') : ''
            ]);
            const csv = [headers, ...rows].map((r: any) => r.join(',')).join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `قروض-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            addToast({ type: 'success', title: 'تم التصدير بنجاح', text: `${loans.length} سجل` });
        } catch {
            addToast({ type: 'danger', title: 'خطأ', text: 'فشل تصدير البيانات' });
        }
    };

    const summary = summaryQuery.data ?? {};
    const metrics = summary?.metrics ?? {};
    const najizSummary = summary?.najizSummary ?? null;
    const najizDetails = summary?.najizDetails ?? [];

    const analytics = analyticsQuery.data ?? {};
    const debtTrend = useMemo(() => {
        return (analytics.debtTrend || []).map((r: any) => {
            let name = r.month;
            if (chartInterval === 'week') {
                const [mm, d] = (r.month || '').split('-');
                name = `${d}/${mm}`;
            } else if (chartInterval === 'month') {
                const [, w] = (r.month || '').split('-');
                name = `أسبوع ${w}`;
            } else if (chartInterval === '6months' || chartInterval === 'year') {
                name = MONTH_NAMES[r.month?.slice(5, 7)] || r.month || '';
            }
            return { month: name, amount: parseFloat(r.total) || 0, count: parseInt(r.loan_count) || 0 };
        });
    }, [analytics, chartInterval]);

    const hasCharts = useMemo(() => debtTrend.length > 0, [debtTrend]);

    const aiData = aiQuery.data ?? null;
    const ai = useMemo(() => aiData?.summary || {}, [aiData]);
    const aiPredictions = useMemo(
        () => aiData?.aiPredictions ?? (ai as any)?.aiPredictions ?? null,
        [aiData, ai]
    );
    const nextMonthBudget = useMemo(
        () => (Number.isFinite(aiPredictions?.nextMonthBudget) ? aiPredictions.nextMonthBudget : null),
        [aiPredictions]
    );
    const highRiskCapacityPercent = useMemo(
        () => (Number.isFinite(aiPredictions?.highRiskCapacityPercent) ? aiPredictions.highRiskCapacityPercent : null),
        [aiPredictions]
    );
    const hasAiPredictions = useMemo(
        () => nextMonthBudget !== null && highRiskCapacityPercent !== null,
        [nextMonthBudget, highRiskCapacityPercent]
    );
    const insights = useMemo(() => aiData?.insights || [], [aiData]);
    const overdueClients = useMemo(() => aiData?.overdueClients || [], [aiData]);
    const recommendations = useMemo(() => aiData?.recommendations || [], [aiData]);
    const isInitialLoading = summaryQuery.isLoading && !summaryQuery.data;
    const hasCachedSummary = Boolean(summaryQuery.data);

    useEffect(() => {
        const highRisk = ai?.riskSegmentation?.highRisk || 0;
        if (overdueClients.length > 0 && !notifiedRef.current.overdue) {
            addToast({ type: 'warning', title: 'عملاء متأخرون', text: `${overdueClients.length} عميل لم يسددوا منذ +30 يوم` });
            notifiedRef.current.overdue = true;
        }
        if (highRisk > 0 && !notifiedRef.current.highRisk) {
            addToast({ type: 'danger', title: 'تنبيه مخاطر عالية', text: `${highRisk} عميل تجاوز 90 يوماً — إجراء عاجل مطلوب` });
            notifiedRef.current.highRisk = true;
        }
        if (summaryQuery.isError && hasCachedSummary && !notifiedRef.current.summaryError) {
            addToast({ type: 'info', title: 'تم عرض آخر بيانات محفوظة', text: 'تعذر تحديث البيانات حالياً.' });
            notifiedRef.current.summaryError = true;
        }
    }, [addToast, ai, overdueClients, summaryQuery.isError, hasCachedSummary]);

    const handleNajizClick = useCallback(() => router.push('/dashboard/najiz'), [router]);
    const handleDelayedClick = useCallback(() => router.push('/dashboard/loans?delayed=true'), [router]);
    const handleNewLoanClick = useCallback(() => router.push('/dashboard/loans/new'), [router]);
    const openRabbitEntry = useCallback(() => setRabbitExpanded(true), []);
    const closeRabbitEntry = useCallback(() => setRabbitExpanded(false), []);
    const handleRabbitSubmit = useCallback((event: React.FormEvent) => {
        event.preventDefault();
        const payload = String(rabbitInput || '').trim();
        if (!payload) return;
        router.push(`/dashboard/quick-entry?q=${encodeURIComponent(payload)}&source=rabbit-dashboard`);
    }, [rabbitInput, router]);
    const rabbitPresets = useMemo(() => ([
        'عميل جديد اسمه أحمد، الهوية 1023456789، الجوال 0551234567، مبلغ 18000',
        'عميل سابق الهوية 1034567890 مبلغ 22000 نسبة الربح 12%',
        'تأكيد إنشاء السجل الحالي',
    ]), []);

    const statCards = useMemo(() => ([
        {
            id: 'totalDebt',
            category: 'finance',
            label: 'إجمالي الديون',
            Icon: DollarSign,
            color: 'var(--coral)',
            value: `${(parseFloat(metrics?.totalDebt) || 0).toLocaleString('en-US')} ﷼`,
            sub: 'إجمالي المحفظة النشطة',
        },
        {
            id: 'totalProfit',
            category: 'finance',
            label: 'الأرباح المتحققة',
            Icon: BadgeDollarSign,
            color: 'var(--success)',
            value: `${(parseFloat(metrics?.totalProfit) || 0).toLocaleString('en-US')} ﷼`,
            sub: 'إجمالي الفوائد المحققة',
        },
        {
            id: 'totalCustomers',
            category: 'customers',
            label: 'العملاء النشطين',
            Icon: Users,
            color: 'var(--info)',
            value: metrics?.activeCustomers || 0,
            sub: `من أصل ${metrics?.totalCustomers || 0} عميل`,
        },
        {
            id: 'loansThisMonth',
            category: 'customers',
            label: 'قروض هذا الشهر',
            Icon: Calendar,
            color: 'var(--warning)',
            value: metrics?.loansThisMonth || 0,
            sub: 'تمت إضافتهم هذا الشهر',
        },
        {
            id: 'najizCases',
            category: 'najiz',
            label: 'قضايا ناجز',
            Icon: Shield,
            color: 'var(--warning)',
            value: metrics?.raisedCount || 0,
            sub: 'قضايا مرفوعة في ناجز',
            onClick: handleNajizClick,
        },
        {
            id: 'najizRaised',
            category: 'finance',
            label: 'مبالغ ناجز المرفوعة',
            Icon: Shield,
            color: 'var(--info)',
            value: `${(parseFloat(metrics?.najizRaisedAmount) || 0).toLocaleString('en-US')} ﷼`,
            sub: `${najizSummary?.totalCases || 0} قضية إجمالاً`,
            onClick: handleNajizClick,
        },
        {
            id: 'najizCollected',
            category: 'finance',
            label: 'المحصّل من ناجز',
            Icon: CheckCircle2,
            color: 'var(--success)',
            value: `${(parseFloat(metrics?.najizCollectedAmount) || 0).toLocaleString('en-US')} ﷼`,
            sub: `${najizSummary?.paidCases || 0} قضية مكتملة`,
        },
        {
            id: 'najizRemaining',
            category: 'finance',
            label: 'المتبقي في ناجز',
            Icon: AlertTriangle,
            color: 'var(--danger)',
            value: `${(parseFloat(metrics?.najizRemainingAmount) || 0).toLocaleString('en-US')} ﷼`,
            sub: `${najizSummary?.activeCases || 0} قضية نشطة`,
            onClick: handleNajizClick,
        },
        {
            id: 'overdueCustomers',
            category: 'customers',
            label: 'متأخرات (+30)',
            Icon: AlertTriangle,
            color: 'var(--danger)',
            value: metrics?.overdueCustomers || 0,
            sub: 'عملاء تجاوزوا 30 يوماً',
            onClick: handleDelayedClick,
        },
        {
            id: 'collectionRate',
            category: 'finance',
            label: 'نسبة التحصيل',
            Icon: CheckCircle2,
            color: 'var(--success)',
            value: `${metrics?.collectionRate || 0}%`,
            sub: 'من إجمالي قيمة القروض',
            trend: ai.growthRate,
        },
    ]), [ai.growthRate, handleDelayedClick, handleNajizClick, metrics, najizSummary]);

    // Select the focused KPI cards inspired by the requested overview style
    const visibleStats = useMemo(() => {
        const priorityIds = ['totalDebt', 'totalProfit', 'totalCustomers', 'overdueCustomers'];
        return statCards.filter((card) => priorityIds.includes(card.id));
    }, [statCards]);
    const topInsights = useMemo(() => insights.slice(0, 3), [insights]);
    const monthlyDigest = useMemo(() => {
        const collectionRate = Number(metrics?.collectionRate || 0);
        const overdue = Number(metrics?.overdueCustomers || 0);
        const loansThisMonth = Number(metrics?.loansThisMonth || 0);
        const activeCustomers = Number(metrics?.activeCustomers || 0);
        const totalCustomers = Number(metrics?.totalCustomers || 0);
        const totalProfit = Number(metrics?.totalProfit || 0);
        const totalDebt = Number(metrics?.totalDebt || 0);

        const tone = collectionRate >= 80 && overdue === 0
            ? 'excellent'
            : collectionRate >= 65
                ? 'good'
                : 'attention';

        const title = tone === 'excellent'
            ? 'أداء الشهر ممتاز والتحصيل في مستوى قوي'
            : tone === 'good'
                ? 'أداء الشهر مستقر مع فرصة تحسين التحصيل'
                : 'الشهر يحتاج متابعة أدق لحالات التأخر';

        const bullets = [
            `الأرباح المتحققة: ${totalProfit.toLocaleString('en-US')} ﷼`,
            `إجمالي المحفظة النشطة: ${totalDebt.toLocaleString('en-US')} ﷼`,
            overdue > 0 ? `يوجد ${overdue} عميل متأخر (+30 يوم).` : 'لا توجد حالات تأخر (+30 يوم).',
            `العملاء النشطون: ${activeCustomers} من أصل ${totalCustomers}.`,
        ];

        return {
            tone,
            title,
            lead: `تمت إضافة ${loansThisMonth} قرض خلال هذا الشهر، ونسبة التحصيل الحالية ${collectionRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}%.`,
            collectionRate,
            overdue,
            loansThisMonth,
            bullets,
        };
    }, [metrics]);

    useEffect(() => {
        if (!rabbitExpanded) return;
        const frame = window.requestAnimationFrame(() => rabbitInputRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [rabbitExpanded]);

    if (isInitialLoading) {
        return (
            <div className="db-loading">
                <div className="db-spinner" />
                <p>جاري تحميل البيانات...</p>
            </div>
        );
    }

    return (
        <>
            <ToastContainer toasts={toasts} />

            {/* Free Trial Banner */}
            {subscriptionPlan === 'enterprise' && merchant.expiryDate && (
                <FreeTrialBanner expiryDate={merchant.expiryDate} />
            )}

            {/* Page Header */}
            <div className="db-header fade-up">
                <div className="db-header-main">
                    <span className="db-kicker">مساحة التشغيل اليومية</span>
                    <h1 className="db-title">لوحة التحكم</h1>
                    <p className="db-subtitle">
                        {todayLabel}
                        {merchant.store_name && <span className="db-store"> · {merchant.store_name}</span>}
                    </p>
                </div>
                <div className="db-actions">
                    <button className="btn btn-secondary" onClick={() => router.push('/dashboard/monthly-report')}>
                        <ClipboardList size={16} /> التقرير الشهري
                    </button>
                    <button className="btn btn-secondary" onClick={handleExportCSV}>
                        <Download size={16} /> تصدير CSV
                    </button>
                    <button className="btn btn-primary" onClick={handleNewLoanClick}>
                        <Plus size={16} /> إضافة قرض
                    </button>
                </div>
            </div>

            <section className={`rabbit-entry ${rabbitExpanded ? 'rabbit-entry-expanded' : 'rabbit-entry-compact'} fade-up`}>
                {!rabbitExpanded ? (
                    <button
                        type="button"
                        className="rabbit-expand-tile"
                        onClick={openRabbitEntry}
                        aria-label="فتح الإدخال السريع"
                    >
                        <span className="rabbit-expand-icon"><Rocket size={28} /></span>
                        <span className="rabbit-expand-title">الإدخال السريع</span>
                        <span className="rabbit-expand-sub">اضغط للتوسيع</span>
                    </button>
                ) : (
                    <>
                        <div className="rabbit-head">
                            <div className="rabbit-title-wrap">
                                <Rocket size={18} />
                                <h2>Rabbit AI • الإدخال السريع</h2>
                            </div>
                            <p>أدخل بيانات القرض أو العميل بسطر واحد وسنحوّلها مباشرة إلى الإدخال الذكي.</p>
                        </div>
                        <form className="rabbit-command" onSubmit={handleRabbitSubmit}>
                            <div className="rabbit-command-brand">
                                <Rocket size={18} />
                                <span>Rabbit</span>
                            </div>
                            <input
                                ref={rabbitInputRef}
                                value={rabbitInput}
                                onChange={(event) => setRabbitInput(event.target.value)}
                                placeholder="مثال: عميل جديد محمد، الهوية 1023..., الجوال 055..., مبلغ 25000"
                            />
                            <button type="submit" className="btn btn-primary rabbit-send-btn" disabled={!rabbitInput.trim()}>
                                إدخال سريع
                            </button>
                        </form>
                        <div className="rabbit-presets">
                            {rabbitPresets.map((preset) => (
                                <button key={preset} type="button" onClick={() => setRabbitInput(preset)}>
                                    {preset}
                                </button>
                            ))}
                        </div>
                        <div className="rabbit-collapse-wrap">
                            <button type="button" className="rabbit-collapse-btn" onClick={closeRabbitEntry}>
                                تصغير
                            </button>
                        </div>
                    </>
                )}
            </section>

            {/* Essential Key Metrics */}
            <div className="stats-grid fade-up" style={{ marginBottom: '32px' }}>
                {visibleStats.map((card) => (
                    <StatCard key={card.id} {...card} />
                ))}
            </div>

            {/* Najiz Details */}
            {najizDetails.length > 0 && (
                <div className="najiz-dashboard-section fade-up">
                    <div className="section-header">
                        <div className="section-title-wrap">
                            <div className="section-icon-wrap">
                                <Shield size={16} color="var(--warning)" />
                            </div>
                            <div>
                                <h3 className="section-title">تفاصيل مبالغ ناجز</h3>
                                <p className="section-sub">آخر القضايا مع المستحق والمحصل والمتبقي</p>
                            </div>
                        </div>
                        <button className="btn btn-sm btn-outline" onClick={() => router.push('/dashboard/najiz')}>
                            عرض صفحة ناجز
                        </button>
                    </div>

                    <div className="najiz-table-wrap">
                        <table className="najiz-table">
                            <thead>
                                <tr>
                                    <th>العميل</th>
                                    <th>رقم القضية</th>
                                    <th>المبلغ المرفوع</th>
                                    <th>المبلغ المحصل</th>
                                    <th>المتبقي</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {najizDetails.map((item: any) => {
                                    const raised = Number(item.najiz_case_amount ?? item.amount ?? 0);
                                    const collected = item.status === 'Paid'
                                        ? Number(item.najiz_collected_amount || item.najiz_case_amount || 0)
                                        : Number(item.najiz_collected_amount || 0);
                                    const remaining = Math.max(raised - collected, 0);
                                    const statusLabel = item.status === 'Paid' ? 'تم السداد' : (item.najiz_status || 'قيد المتابعة');
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="najiz-customer">{item.customer_name || 'غير محدد'}</div>
                                                <div className="najiz-customer-sub">{item.national_id || ''}</div>
                                            </td>
                                            <td>{item.najiz_case_number || 'غير محدد'}</td>
                                            <td>{raised.toLocaleString('en-US')} ﷼</td>
                                            <td className="najiz-collected">{collected.toLocaleString('en-US')} ﷼</td>
                                            <td className="najiz-remaining">{remaining.toLocaleString('en-US')} ﷼</td>
                                            <td>
                                                <span className={`najiz-state ${item.status === 'Paid' ? 'done' : 'active'}`}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="db-charts fade-up">
                {/* Area Chart */}
                <div className="chart-card chart-card-lg">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">
                                <TrendingUp size={16} color="var(--coral)" /> حركة المبالغ
                            </h3>
                            <p className="chart-sub">تتبع المبالغ المرفوعة والمحصلة خلال الشهر</p>
                        </div>
                        <div className="chart-interval-selector">
                            {CHART_INTERVALS.map(btn => (
                                <button
                                    key={btn.id}
                                    className={`btn-interval ${chartInterval === btn.id ? 'active' : ''}`}
                                    onClick={() => setChartInterval(btn.id)}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {!hasCharts ? (
                        <div className="chart-empty">
                            <CreditCard size={40} color="var(--border)" />
                            <p>لا توجد بيانات بعد</p>
                            <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/loans/new')}>
                                <Plus size={14} /> إضافة أول قرض
                            </button>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={debtTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradCoral" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="var(--coral)" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,43,74,0.06)" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9AABBE' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#9AABBE' }} axisLine={false} tickLine={false}
                                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                                <Tooltip
                                    contentStyle={{ background: '#1A2B4A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13 }}
                                    formatter={(v: any) => [`${Number(v).toLocaleString('en-US')} ﷼`, 'Amount']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="var(--coral)" strokeWidth={2.5}
                                    fill="url(#gradCoral)" dot={{ fill: 'var(--coral)', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Monthly Brief */}
            <section className={`monthly-brief fade-up monthly-${monthlyDigest.tone}`}>
                <div className="monthly-brief-head">
                    <div className="monthly-brief-title-wrap">
                        <ClipboardList size={18} />
                        <h3>الزبدة الشهرية</h3>
                    </div>
                    <span className="monthly-brief-badge">
                        {monthlyDigest.collectionRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}% تحصيل
                    </span>
                </div>
                <div className="monthly-brief-grid">
                    <div className="monthly-brief-main">
                        <h4>{monthlyDigest.title}</h4>
                        <p>{monthlyDigest.lead}</p>
                        <ul className="monthly-brief-points">
                            {monthlyDigest.bullets.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="monthly-brief-side">
                        <div className="monthly-mini-card">
                            <small>قروض هذا الشهر</small>
                            <strong>{monthlyDigest.loansThisMonth.toLocaleString('en-US')}</strong>
                        </div>
                        <div className="monthly-mini-card">
                            <small>عملاء متأخرون</small>
                            <strong>{monthlyDigest.overdue.toLocaleString('en-US')}</strong>
                        </div>
                        {hasAiPredictions && (
                            <div className="monthly-mini-card accent">
                                <small>ميزانية الشهر القادم (تقديري)</small>
                                <strong>{Number(nextMonthBudget || 0).toLocaleString('en-US')} ﷼</strong>
                                <span>استيعاب المخاطر: {Number(highRiskCapacityPercent || 0).toLocaleString('en-US')}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {topInsights.length > 0 && (
                    <div className="monthly-insight-grid">
                        {topInsights.map((ins: any, i: number) => <InsightCard key={i} ins={ins} />)}
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div className="monthly-recommendations">
                        {recommendations.slice(0, 3).map((item: string) => (
                            <div key={item} className="monthly-recommendation-item">{item}</div>
                        ))}
                    </div>
                )}
            </section>

            {insights.length > 0 && (
                <div className="ai-section fade-up">
                    <div className="section-header">
                        <div className="section-title-wrap">
                            <div className="ai-badge">
                                <Rocket size={16} color="var(--warning)" />
                            </div>
                            <div>
                                <h3 className="section-title">تفاصيل التحليل الذكي</h3>
                                <p className="section-sub">رؤى مختصرة من بيانات التشغيل الحالية</p>
                            </div>
                        </div>
                        {aiData?.generatedAt && (
                            <span className="section-timestamp">
                                آخر تحديث: {new Date(aiData.generatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>

                    <div className="insights-grid">
                        {insights.map((ins: any, i: number) => <InsightCard key={i} ins={ins} />)}
                    </div>
                </div>
            )}

            {/* Top Debtors */}
            {aiData?.overdueClients?.length > 0 && (
                <div className="debtors-section fade-up">
                    <div className="section-header">
                        <div className="section-title-wrap">
                            <div className="section-icon-wrap">
                                <AlertTriangle size={16} color="var(--danger)" />
                            </div>
                            <div>
                                <h3 className="section-title">العملاء المتأخرون</h3>
                                <p className="section-sub">مرتّبون حسب قيمة الدين — يحتاجون متابعة فورية</p>
                            </div>
                        </div>
                        <button className="btn btn-sm btn-outline" onClick={() => router.push('/dashboard/customers')}>
                            عرض الكل
                        </button>
                    </div>
                    <div className="debtors-list">
                        {aiData.overdueClients.slice(0, 8).map((c: any, i: number) => (
                            <div key={i} className={`debtor-row ${c.days_overdue > 90 ? 'debtor-high' : c.days_overdue > 60 ? 'debtor-med' : 'debtor-low'}`}>
                                <div className="debtor-rank">{i + 1}</div>
                                <div className="debtor-avatar">{(c.full_name || '؟')[0]}</div>
                                <div className="debtor-info">
                                    <div className="debtor-name">{c.full_name}</div>
                                    <div className="debtor-days">متأخر {c.days_overdue} يوم</div>
                                </div>
                                <div className="debtor-amount">{parseFloat(c.debt).toLocaleString('en-US')} ﷼</div>
                                <div className="debtor-actions">
                                    {c.mobile_number && (
                                        <a href={`https://wa.me/${c.mobile_number.replace(/\D/g, '').replace(/^0/, '966')}`}
                                            target="_blank" rel="noopener noreferrer" className="debtor-wa-btn" title="تواصل واتساب">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        </a>
                                    )}
                                    <div className={`risk-pill ${c.days_overdue > 90 ? 'risk-pill-high' : c.days_overdue > 60 ? 'risk-pill-med' : 'risk-pill-low'}`}>
                                        {c.days_overdue > 90 ? 'عالي' : c.days_overdue > 60 ? 'متوسط' : 'متابعة'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


        </>
    );
}
