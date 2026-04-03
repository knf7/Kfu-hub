'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  Info,
  Plus,
  Rocket,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { appToast } from '@/components/ui/sonner';
import { loansAPI, reportsAPI, DASHBOARD_DIRTY_KEY } from '@/lib/api';
import { useDataSync } from '@/hooks/useDataSync';
import './dashboard-refactored.css';

type DashboardMetrics = {
  totalDebt?: number | string;
  totalProfit?: number | string;
  activeCustomers?: number | string;
  totalCustomers?: number | string;
  loansThisMonth?: number | string;
  overdueCustomers?: number | string;
  collectionRate?: number | string;
  raisedCount?: number | string;
  najizRaisedAmount?: number | string;
  najizCollectedAmount?: number | string;
  najizRemainingAmount?: number | string;
};

type NajizSummary = {
  totalCases?: number;
  activeCases?: number;
  paidCases?: number;
};

type NajizDetail = {
  id?: number | string;
  customer_name?: string;
  national_id?: string;
  najiz_case_number?: string;
  najiz_case_amount?: number | string;
  najiz_collected_amount?: number | string;
  amount?: number | string;
  status?: string;
  najiz_status?: string;
};

type DashboardSummary = {
  metrics?: DashboardMetrics;
  najizSummary?: NajizSummary | null;
  najizDetails?: NajizDetail[];
};

type AnalyticsRow = {
  month?: string;
  total?: number | string;
  loan_count?: number | string;
};

type AnalyticsResponse = {
  debtTrend?: AnalyticsRow[];
};

type AIInsight = {
  type?: 'success' | 'warning' | 'danger' | 'info' | string;
  category?: string;
  title?: string;
  detail?: string;
  action?: string;
};

type OverdueClient = {
  full_name?: string;
  days_overdue?: number | string;
  debt?: number | string;
  mobile_number?: string;
};

type AIResponse = {
  summary?: {
    growthRate?: number;
    riskSegmentation?: {
      highRisk?: number;
    };
  };
  insights?: AIInsight[];
  recommendations?: string[];
  overdueClients?: OverdueClient[];
  generatedAt?: string;
};

type ChartPoint = {
  label: string;
  amount: number;
  count: number;
};

type KpiItem = {
  id: string;
  label: string;
  value: string;
  sub: string;
  accent: 'coral' | 'success' | 'warning' | 'danger';
  icon: React.ComponentType<{ size?: number }>;
  trend?: string;
};

const MONTH_NAMES: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

const CHART_INTERVALS: Array<{ id: 'week' | 'month'; label: string }> = [
  { id: 'week', label: 'أسبوعي' },
  { id: 'month', label: 'شهري' },
];

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (value: unknown) => `${toNumber(value).toLocaleString('en-US')} ﷼`;
const formatCount = (value: unknown) => toNumber(value).toLocaleString('en-US');

const toMonthLabel = (raw: string | undefined, interval: 'week' | 'month') => {
  if (!raw) return '-';
  if (interval === 'week') {
    const [mm, dd] = raw.split('-');
    if (mm && dd) return `${dd}/${mm}`;
    return raw;
  }
  if (interval === 'month') {
    const parts = raw.split('-');
    if (parts.length === 2) return `أسبوع ${parts[1]}`;
    if (parts.length === 3) {
      const month = MONTH_NAMES[parts[1]] || parts[1];
      return `${month} ${parts[0]}`;
    }
  }
  return raw;
};

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [chartInterval, setChartInterval] = useState<'week' | 'month'>('week');
  const [refreshToken, setRefreshToken] = useState(0);
  const notifiedRef = useRef({ summaryError: false, analyticsError: false, aiError: false, overdue: false });

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const merchantName = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const merchant = JSON.parse(localStorage.getItem('merchant') || '{}') as { store_name?: string };
      return merchant?.store_name || '';
    } catch {
      return '';
    }
  }, []);

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', refreshToken],
    queryFn: async () => {
      const response = await reportsAPI.getDashboard(refreshToken ? { _t: refreshToken } : {});
      return ((response as { data?: DashboardSummary })?.data ?? response) as DashboardSummary;
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const analyticsQuery = useQuery<AnalyticsResponse>({
    queryKey: ['dashboard', 'analytics', chartInterval, refreshToken],
    queryFn: async () => {
      const response = await reportsAPI.getAnalytics({ interval: chartInterval, _t: refreshToken || undefined });
      return ((response as { data?: AnalyticsResponse })?.data ?? response) as AnalyticsResponse;
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const aiQuery = useQuery<AIResponse>({
    queryKey: ['dashboard', 'ai', refreshToken],
    queryFn: async () => {
      const response = await reportsAPI.getAIAnalysis(refreshToken ? { _t: refreshToken } : {});
      return ((response as { data?: AIResponse })?.data ?? response) as AIResponse;
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useDataSync(
    () => {
      const token = Date.now();
      setRefreshToken(token);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void summaryQuery.refetch();
    },
    { scopes: ['dashboard', 'reports', 'loans', 'customers', 'najiz'], debounceMs: 250 }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const dirty = localStorage.getItem(DASHBOARD_DIRTY_KEY);
      if (!dirty) return;
      localStorage.removeItem(DASHBOARD_DIRTY_KEY);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void summaryQuery.refetch();
      void analyticsQuery.refetch();
      void aiQuery.refetch();
    } catch {
      // ignore localStorage failures
    }
  }, [aiQuery, analyticsQuery, queryClient, summaryQuery]);

  useEffect(() => {
    if (summaryQuery.isError && !notifiedRef.current.summaryError) {
      appToast.error('تعذر تحديث ملخص الداشبورد حالياً.');
      notifiedRef.current.summaryError = true;
    }
    if (analyticsQuery.isError && !notifiedRef.current.analyticsError) {
      appToast.warning('تعذر تحميل منحنى الأداء، يتم عرض البيانات الأساسية فقط.');
      notifiedRef.current.analyticsError = true;
    }
    if (aiQuery.isError && !notifiedRef.current.aiError) {
      appToast.info('الرؤى الذكية غير متاحة الآن، سيتم المحاولة تلقائياً لاحقاً.');
      notifiedRef.current.aiError = true;
    }
  }, [summaryQuery.isError, analyticsQuery.isError, aiQuery.isError]);

  const metrics = useMemo<DashboardMetrics>(() => summaryQuery.data?.metrics ?? {}, [summaryQuery.data?.metrics]);
  const najizSummary = summaryQuery.data?.najizSummary ?? null;
  const najizDetails = summaryQuery.data?.najizDetails ?? [];
  const insights = aiQuery.data?.insights ?? [];
  const recommendations = aiQuery.data?.recommendations ?? [];
  const overdueClients = aiQuery.data?.overdueClients ?? [];
  const highRiskCount = toNumber(aiQuery.data?.summary?.riskSegmentation?.highRisk);

  useEffect(() => {
    if (overdueClients.length > 0 && !notifiedRef.current.overdue) {
      appToast.warning(`يوجد ${overdueClients.length} عميل متأخر يحتاج متابعة.`);
      notifiedRef.current.overdue = true;
    }
  }, [overdueClients.length]);

  const collectionRate = toNumber(metrics.collectionRate);
  const totalDebt = toNumber(metrics.totalDebt);
  const totalProfit = toNumber(metrics.totalProfit);
  const activeCustomers = toNumber(metrics.activeCustomers);
  const totalCustomers = toNumber(metrics.totalCustomers);
  const overdueCount = toNumber(metrics.overdueCustomers);
  const loansThisMonth = toNumber(metrics.loansThisMonth);

  const monthlyDigest = useMemo(() => {
    const tone: 'excellent' | 'good' | 'attention' =
      collectionRate >= 80 && overdueCount === 0
        ? 'excellent'
        : collectionRate >= 65
          ? 'good'
          : 'attention';

    const title =
      tone === 'excellent'
        ? 'الأداء هذا الشهر ممتاز والتحصيل أعلى من المعتاد.'
        : tone === 'good'
          ? 'الأداء مستقر مع فرصة واضحة لرفع التحصيل.'
          : 'الشهر يحتاج متابعة أقوى لحالات التعثر.';

    return {
      tone,
      title,
      lead: `تمت إضافة ${loansThisMonth.toLocaleString('en-US')} قرض خلال الشهر الحالي، ونسبة التحصيل الحالية ${collectionRate.toLocaleString('en-US', {
        maximumFractionDigits: 1,
      })}%.`,
      bullets: [
        `الأرباح المتحققة: ${totalProfit.toLocaleString('en-US')} ﷼`,
        `إجمالي المحفظة النشطة: ${totalDebt.toLocaleString('en-US')} ﷼`,
        overdueCount > 0
          ? `حالات متأخرة (+30 يوم): ${overdueCount.toLocaleString('en-US')}`
          : 'لا توجد حالات متأخرة (+30 يوم).',
        `العملاء النشطون: ${activeCustomers.toLocaleString('en-US')} من ${totalCustomers.toLocaleString('en-US')}`,
      ],
    };
  }, [activeCustomers, collectionRate, loansThisMonth, overdueCount, totalCustomers, totalDebt, totalProfit]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const rows = analyticsQuery.data?.debtTrend ?? [];
    return rows.map((row) => ({
      label: toMonthLabel(row.month, chartInterval),
      amount: toNumber(row.total),
      count: toNumber(row.loan_count),
    }));
  }, [analyticsQuery.data?.debtTrend, chartInterval]);

  const kpis = useMemo<KpiItem[]>(() => {
    const growthRate = Number(aiQuery.data?.summary?.growthRate);
    const growthTrend = Number.isFinite(growthRate)
      ? `${growthRate > 0 ? '+' : ''}${growthRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
      : undefined;

    return [
      {
        id: 'total-debt',
        label: 'إجمالي المحفظة النشطة',
        value: formatCurrency(metrics.totalDebt),
        sub: 'قيمة الديون الحالية',
        icon: Wallet,
        accent: 'coral',
      },
      {
        id: 'total-profit',
        label: 'الأرباح المتحققة',
        value: formatCurrency(metrics.totalProfit),
        sub: 'عوائد محققة حتى الآن',
        icon: BadgeDollarSign,
        accent: 'success',
        trend: growthTrend,
      },
      {
        id: 'active-customers',
        label: 'العملاء النشطون',
        value: formatCount(metrics.activeCustomers),
        sub: `من أصل ${formatCount(metrics.totalCustomers)} عميل`,
        icon: Users,
        accent: 'warning',
      },
      {
        id: 'collection-rate',
        label: 'نسبة التحصيل',
        value: `${collectionRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`,
        sub: `${formatCount(metrics.overdueCustomers)} عميل متأخر`,
        icon: CheckCircle2,
        accent: 'danger',
      },
    ];
  }, [aiQuery.data?.summary?.growthRate, collectionRate, metrics]);

  const handleRefresh = useCallback(() => {
    const token = Date.now();
    setRefreshToken(token);
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void summaryQuery.refetch();
    void analyticsQuery.refetch();
    void aiQuery.refetch();
    appToast.success('تم تحديث لوحة التحكم.');
  }, [aiQuery, analyticsQuery, queryClient, summaryQuery]);

  const handleExportCSV = useCallback(async () => {
    try {
      const response = await loansAPI.getAll({ limit: 9999 });
      const payload = ((response as { data?: { loans?: Array<Record<string, unknown>> } })?.data ?? response) as {
        loans?: Array<Record<string, unknown>>;
      };
      const loans = Array.isArray(payload?.loans) ? payload.loans : [];

      if (loans.length === 0) {
        appToast.warning('لا توجد بيانات لتصديرها.');
        return;
      }

      const headers = ['الاسم', 'رقم الهوية', 'الجوال', 'المبلغ', 'الحالة', 'تاريخ المعاملة'];
      const rows = loans.map((loan) => [
        String(loan.customer_name ?? ''),
        String(loan.national_id ?? ''),
        String(loan.mobile_number ?? ''),
        String(loan.amount ?? 0),
        String(loan.status ?? ''),
        loan.transaction_date ? new Date(String(loan.transaction_date)).toLocaleDateString('en-GB') : '',
      ]);

      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const value = String(cell ?? '');
              const escaped = value.replace(/"/g, '""');
              return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
            })
            .join(',')
        )
        .join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `loans-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);

      appToast.success(`تم تصدير ${loans.length} سجل بنجاح.`);
    } catch {
      appToast.error('فشل تصدير البيانات.');
    }
  }, []);

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return (
      <div className="dbx-loading">
        <div className="dbx-spinner" />
        <p>جاري تجهيز لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <div className="dbx-page">
      <header className="dbx-header">
        <div className="dbx-header-content">
          <div className="dbx-breadcrumb">
            <span>الرئيسية</span>
            <i>/</i>
            <span>لوحة التحكم</span>
          </div>
          <h1 className="dbx-title">لوحة التحكم</h1>
          <p className="dbx-subtitle">
            {todayLabel}
            {merchantName ? <span className="dbx-store"> • {merchantName}</span> : null}
          </p>
        </div>

        <div className="dbx-header-actions">
          <button className="dbx-btn dbx-btn-secondary" onClick={handleRefresh}>
            <TrendingUp size={17} /> تحديث
          </button>
          <button className="dbx-btn dbx-btn-secondary" onClick={handleExportCSV}>
            <Download size={17} /> تصدير CSV
          </button>
          <button className="dbx-btn dbx-btn-secondary" onClick={() => router.push('/dashboard/monthly-report')}>
            <BarChart3 size={17} /> التقرير الشهري
          </button>
          <button className="dbx-btn dbx-btn-primary" onClick={() => router.push('/dashboard/loans/new')}>
            <Plus size={17} /> إضافة قرض
          </button>
        </div>
      </header>

      <section className="dbx-kpi-section">
        <div className="dbx-kpi-grid">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <article key={kpi.id} className={`dbx-kpi-card dbx-kpi-${kpi.accent}`}>
                <div className={`dbx-kpi-icon dbx-kpi-icon-${kpi.accent}`}>
                  <Icon size={21} />
                </div>
                <p className="dbx-kpi-label">{kpi.label}</p>
                <strong className="dbx-kpi-value">{kpi.value}</strong>
                <p className="dbx-kpi-sub">{kpi.sub}</p>
                {kpi.trend ? <span className="dbx-kpi-trend">{kpi.trend}</span> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="dbx-grid-2">
        <article className="dbx-card">
          <div className="dbx-card-head">
            <h2>الإجراءات السريعة</h2>
            <p>اختصارات تشغيل يومية</p>
          </div>
          <div className="dbx-quick-grid">
            <button className="dbx-quick-item" onClick={() => router.push('/dashboard/quick-entry')}>
              <Rocket size={20} />
              <strong>Rabbit الإدخال السريع</strong>
              <span>إدخال قرض أو عميل عبر الشات</span>
            </button>
            <button className="dbx-quick-item" onClick={() => router.push('/dashboard/loans/new')}>
              <Plus size={20} />
              <strong>إضافة قرض</strong>
              <span>نموذج مباشر</span>
            </button>
            <button className="dbx-quick-item" onClick={() => router.push('/dashboard/najiz')}>
              <Shield size={20} />
              <strong>متابعة ناجز</strong>
              <span>الحالات النشطة والتحصيل</span>
            </button>
            <button className="dbx-quick-item" onClick={() => router.push('/dashboard/monthly-report')}>
              <BarChart3 size={20} />
              <strong>التقرير الشهري</strong>
              <span>تحليل ملخص وتنفيذي</span>
            </button>
          </div>
        </article>

        <article className="dbx-card">
          <div className="dbx-card-head">
            <h2>صورة الأداء الآن</h2>
            <p>قراءة سريعة قابلة للتنفيذ</p>
          </div>
          <div className={`dbx-digest dbx-digest-${monthlyDigest.tone}`}>
            <h3>{monthlyDigest.title}</h3>
            <p>{monthlyDigest.lead}</p>
            <ul>
              {monthlyDigest.bullets.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="dbx-mini-stats">
            <div>
              <small>قروض هذا الشهر</small>
              <strong>{loansThisMonth.toLocaleString('en-US')}</strong>
            </div>
            <div>
              <small>عملاء متأخرون</small>
              <strong>{overdueCount.toLocaleString('en-US')}</strong>
            </div>
            <div>
              <small>نسبة التحصيل</small>
              <strong>{collectionRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}%</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="dbx-card dbx-chart-card">
        <div className="dbx-card-head dbx-chart-head">
          <div>
            <h2>حركة المبالغ</h2>
            <p>الصرف والتحصيل عبر الزمن</p>
          </div>
          <div className="dbx-intervals">
            {CHART_INTERVALS.map((interval) => (
              <button
                key={interval.id}
                type="button"
                className={chartInterval === interval.id ? 'active' : ''}
                onClick={() => setChartInterval(interval.id)}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dbx-chart-area">
          {chartData.length === 0 ? (
            <div className="dbx-empty">
              <BarChart3 size={34} />
              <p>لا توجد بيانات رسم لهذا النطاق.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dbxArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="var(--coral)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.28)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.94)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: 12,
                    color: '#f8fafc',
                    fontSize: 12,
                  }}
                  formatter={(value: number | string | undefined) => [
                    `${toNumber(value).toLocaleString('en-US')} ﷼`,
                    'القيمة',
                  ]}
                />
                <Area
                  dataKey="amount"
                  type="monotone"
                  stroke="var(--coral)"
                  strokeWidth={2.5}
                  fill="url(#dbxArea)"
                  dot={{ r: 3, fill: 'var(--coral)' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="dbx-grid-2">
        <article className="dbx-card">
          <div className="dbx-card-head">
            <h2>الرؤى الذكية</h2>
            <p>أهم الإشارات من بيانات الشهر</p>
          </div>
          {insights.length === 0 ? (
            <div className="dbx-empty">
              <Info size={30} />
              <p>لا توجد رؤى كافية حالياً، ستظهر عند توفر بيانات إضافية.</p>
            </div>
          ) : (
            <div className="dbx-insights-list">
              {insights.slice(0, 4).map((insight, index) => (
                <div key={`${insight.title || 'insight'}-${index}`} className={`dbx-insight dbx-insight-${insight.type || 'info'}`}>
                  <div className="dbx-insight-head">
                    <strong>{insight.title || 'رؤية'}</strong>
                    <span>{insight.category || 'تحليل'}</span>
                  </div>
                  <p>{insight.detail || 'لا يوجد وصف إضافي.'}</p>
                </div>
              ))}
              {recommendations.length > 0 ? (
                <ul className="dbx-recommendations">
                  {recommendations.slice(0, 3).map((item) => (
                    <li key={item}>
                      <ArrowUpRight size={15} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </article>

        <article className="dbx-card">
          <div className="dbx-card-head dbx-card-head-inline">
            <div>
              <h2>ملخص ناجز</h2>
              <p>الحالات النشطة والتحصيل المتراكم</p>
            </div>
            <button className="dbx-btn dbx-btn-outline" onClick={() => router.push('/dashboard/najiz')}>
              فتح ناجز
            </button>
          </div>

          <div className="dbx-najiz-mini">
            <div>
              <small>إجمالي القضايا</small>
              <strong>{formatCount(najizSummary?.totalCases)}</strong>
            </div>
            <div>
              <small>قضايا نشطة</small>
              <strong>{formatCount(najizSummary?.activeCases)}</strong>
            </div>
            <div>
              <small>المتبقي</small>
              <strong>{formatCurrency(metrics.najizRemainingAmount)}</strong>
            </div>
          </div>

          {najizDetails.length === 0 ? (
            <div className="dbx-empty">
              <Shield size={30} />
              <p>لا توجد حالات ناجز معروضة حالياً.</p>
            </div>
          ) : (
            <div className="dbx-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>رقم القضية</th>
                    <th>المتبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {najizDetails.slice(0, 6).map((item) => {
                    const raised = toNumber(item.najiz_case_amount ?? item.amount);
                    const collected =
                      item.status === 'Paid'
                        ? toNumber(item.najiz_collected_amount ?? item.najiz_case_amount)
                        : toNumber(item.najiz_collected_amount);
                    const remaining = Math.max(raised - collected, 0);
                    return (
                      <tr key={String(item.id ?? `${item.customer_name}-${item.najiz_case_number}`)}>
                        <td>
                          <strong>{item.customer_name || 'غير محدد'}</strong>
                        </td>
                        <td>{item.najiz_case_number || '—'}</td>
                        <td className="dbx-danger">{remaining.toLocaleString('en-US')} ﷼</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="dbx-alerts-section">
        <h2>التنبيهات الحرجة</h2>
        <div className="dbx-alerts-grid">
          <article className="dbx-alert dbx-alert-warning">
            <div className="dbx-alert-icon">
              <Clock3 size={20} />
            </div>
            <div>
              <h3>تأخر السداد</h3>
              <p>{overdueCount > 0 ? `يوجد ${overdueCount} عميل متأخر (+30 يوم).` : 'لا توجد حالات تأخر حرجة حالياً.'}</p>
            </div>
          </article>

          <article className="dbx-alert dbx-alert-danger">
            <div className="dbx-alert-icon">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3>مؤشر مخاطر مرتفع</h3>
              <p>{highRiskCount > 0 ? `${highRiskCount} عميل في شريحة المخاطر العالية.` : 'شريحة المخاطر العالية تحت السيطرة.'}</p>
            </div>
          </article>

          <article className="dbx-alert dbx-alert-info">
            <div className="dbx-alert-icon">
              <Info size={20} />
            </div>
            <div>
              <h3>أعلى المديونيات</h3>
              <p>
                {overdueClients.length > 0
                  ? `أعلى عميل متأخر: ${overdueClients[0]?.full_name || 'غير محدد'} بقيمة ${toNumber(overdueClients[0]?.debt).toLocaleString('en-US')} ﷼.`
                  : 'لا توجد قائمة متأخرات كافية حتى الآن.'}
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
