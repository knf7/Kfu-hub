'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  X,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { appToast } from '@/components/ui/sonner';
import { dashboardAPI, DASHBOARD_DIRTY_KEY } from '@/lib/dashboard-api';
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
  accent: 'coral' | 'success' | 'warning' | 'danger' | 'primary';
  icon: React.ComponentType<{ size?: number }>;
  trend?: string;
};

const MONTH_NAMES: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

const CHART_INTERVALS: Array<{ id: 'week' | 'month'; label: string }> = [
  { id: 'week', label: 'أسبوعي' },
  { id: 'month', label: 'شهري' },
];

const DashboardChartSection = dynamic(() => import('./components/DashboardChartSection'), {
  ssr: false,
  loading: () => (
    <section className="dbx-card dbx-loader-box">
      <div className="text-[#64748b]">جاري تحميل البيانات المالية...</div>
    </section>
  ),
});

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
  const [loadHeavySections, setLoadHeavySections] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
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

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', refreshToken],
    queryFn: async () => {
      const response = await dashboardAPI.getDashboard<DashboardSummary>(refreshToken ? { _t: refreshToken } : {});
      return ((response as { data?: DashboardSummary })?.data ?? response) as DashboardSummary;
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const analyticsQuery = useQuery<AnalyticsResponse>({
    queryKey: ['dashboard', 'analytics', chartInterval, refreshToken],
    queryFn: async () => {
      const response = await dashboardAPI.getAnalytics<AnalyticsResponse>({ interval: chartInterval, _t: refreshToken || undefined });
      return ((response as { data?: AnalyticsResponse })?.data ?? response) as AnalyticsResponse;
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: loadHeavySections,
  });

  const aiQuery = useQuery<AIResponse>({
    queryKey: ['dashboard', 'ai', refreshToken],
    queryFn: async () => {
      const response = await dashboardAPI.getAIAnalysis<AIResponse>(refreshToken ? { _t: refreshToken } : {});
      return ((response as { data?: AIResponse })?.data ?? response) as AIResponse;
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: loadHeavySections,
  });

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
      // ignore
    }
  }, [aiQuery, analyticsQuery, queryClient, summaryQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lazyLoad = () => setLoadHeavySections(true);
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(lazyLoad, { timeout: 900 });
      return () => {
        if (typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(idleId);
      };
    }
    const timeoutId = window.setTimeout(lazyLoad, 350);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      const seen = localStorage.getItem('dashboard-onboarding-seen');
      if (!seen) setShowOnboarding(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const metrics = useMemo<DashboardMetrics>(() => summaryQuery.data?.metrics ?? {}, [summaryQuery.data?.metrics]);
  const najizSummary = summaryQuery.data?.najizSummary ?? null;
  const najizDetails = summaryQuery.data?.najizDetails ?? [];
  const overdueClients = aiQuery.data?.overdueClients ?? [];

  const collectionRate = toNumber(metrics.collectionRate);
  const totalDebt = toNumber(metrics.totalDebt);
  const totalProfit = toNumber(metrics.totalProfit);
  const activeCustomers = toNumber(metrics.activeCustomers);
  const totalCustomers = toNumber(metrics.totalCustomers);
  const overdueCount = toNumber(metrics.overdueCustomers);
  const loansThisMonth = toNumber(metrics.loansThisMonth);

  const chartData = useMemo<ChartPoint[]>(() => {
    const rows = analyticsQuery.data?.debtTrend ?? [];
    return rows.map((row) => ({
      label: toMonthLabel(row.month, chartInterval),
      amount: toNumber(row.total),
      count: toNumber(row.loan_count),
    }));
  }, [analyticsQuery.data?.debtTrend, chartInterval]);

  const kpis = useMemo<KpiItem[]>(() => {
    return [
      {
        id: 'total-debt',
        label: 'المحفظة النشطة',
        value: formatCurrency(metrics.totalDebt),
        sub: 'قيمة الديون القائمة',
        icon: Wallet,
        accent: 'primary',
      },
      {
        id: 'total-profit',
        label: 'الأرباح المتحققة',
        value: formatCurrency(metrics.totalProfit),
        sub: 'عوائد محققة فعلياً',
        icon: BadgeDollarSign,
        accent: 'success',
      },
      {
        id: 'collection-rate',
        label: 'معدل التحصيل',
        value: `${collectionRate.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`,
        sub: `${formatCount(metrics.overdueCustomers)} حالة متأخرة`,
        icon: CheckCircle2,
        accent: 'warning',
      },
      {
        id: 'active-customers',
        label: 'العملاء النشطون',
        value: formatCount(metrics.activeCustomers),
        sub: `من إجمالي ${formatCount(metrics.totalCustomers)} عميل`,
        icon: Users,
        accent: 'coral',
      },
    ];
  }, [collectionRate, metrics]);

  const handleRefresh = useCallback(() => {
    const token = Date.now();
    setRefreshToken(token);
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void summaryQuery.refetch();
    void analyticsQuery.refetch();
    void aiQuery.refetch();
    appToast.success('تم تحديث البيانات المالية.');
  }, [aiQuery, analyticsQuery, queryClient, summaryQuery]);

  const handleExportCSV = useCallback(async () => {
    try {
      const response = await dashboardAPI.getLoans<{ loans?: Array<Record<string, unknown>> }>({ limit: 9999 });
      const payload = ((response as { data?: { loans?: Array<Record<string, unknown>> } })?.data ?? response) as {
        loans?: Array<Record<string, unknown>>;
      };
      const loans = Array.isArray(payload?.loans) ? payload.loans : [];

      if (loans.length === 0) {
        appToast.warning('لا توجد بيانات قروض للتصدير.');
        return;
      }

      const headers = ['العميل', 'رقم الهوية', 'الجوال', 'المبلغ', 'الحالة', 'تاريخ المعاملة'];
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
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-loans-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      appToast.success(`تم تصدير ${loans.length.toLocaleString('en-US')} سجل بنجاح.`);
    } catch {
      appToast.error('فشل تصدير CSV. حاول مرة أخرى.');
    }
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-onboarding-seen', '1');
    }
  }, []);

  const isSummaryLoading = summaryQuery.isLoading && !summaryQuery.data;

  if (summaryQuery.isError && !summaryQuery.data) {
    return (
      <div className="dbx-empty">
        <AlertTriangle size={34} className="text-[#ef4444]" />
        <h2 className="text-[1.25rem] font-bold text-[#0f1c33] dark:text-white">تعذر تحميل لوحة التحكم</h2>
        <p className="text-[#64748b]">حدث خلل أثناء جلب البيانات الأساسية.</p>
        <button type="button" className="dbx-btn dbx-btn-primary" onClick={handleRefresh}>
           إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="dbx-page">
      <header className="dbx-header">
        <div className="dbx-header-content">
          <h1 className="dbx-title">المركز المالي</h1>
          <p className="dbx-subtitle">{todayLabel}</p>
        </div>

        <div className="dbx-header-actions">
          <button className="dbx-btn dbx-btn-secondary" onClick={handleRefresh}>
            <TrendingUp size={16} /> <span className="hidden sm:inline">تحديث</span>
          </button>
          <button className="dbx-btn dbx-btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> <span className="hidden sm:inline">تصدير CSV</span>
          </button>
          <button className="dbx-btn dbx-btn-primary" onClick={() => router.push('/dashboard/loans/new')}>
            <Plus size={16} /> إضافة قرض
          </button>
        </div>
      </header>

      {showOnboarding && (
        <section className="dbx-card border-blue-100 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[1.1rem] font-bold text-[#0f1c33] dark:text-white">دليل سريع للمستخدم الجديد</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                ابدأ بهذه الخطوات الثلاث لتشغيل النظام مباشرة.
              </p>
              <div className="mt-4 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                <div>1. أدخل القروض أو العملاء عبر <strong>الإدخال السريع</strong> أو <strong>مركز الاستيراد</strong>.</div>
                <div>2. راقب التحصيل والمتأخرات من <strong>لوحة التحكم</strong> و <strong>قضايا ناجز</strong>.</div>
                <div>3. حمّل <strong>التقرير الشهري</strong> لمراجعة الأداء ومشاركة النتائج.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              aria-label="إغلاق الدليل السريع"
            >
              <X size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Level 1: KPIs (4x1 Grid) */}
      <section className="dbx-card" style={{ padding: '0' }}>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[#e5e7eb] dark:divide-[#1e293b]">
           {kpis.map((kpi) => {
             const Icon = kpi.icon;
             return (
               <div key={kpi.id} className={`p-6 flex flex-col gap-2 ${isSummaryLoading ? 'opacity-50' : 'opacity-100'}`}>
                 <div className="flex items-center gap-3 mb-1">
                   <div className={`dbx-kpi-icon-box kpi-accent-${kpi.accent}`}>
                     <Icon size={18} />
                   </div>
                   <h3 className="dbx-kpi-label">{kpi.label}</h3>
                 </div>
                 <div className="dbx-kpi-value t-num">{kpi.value}</div>
                 <div className="dbx-kpi-sub">{kpi.sub}</div>
               </div>
             )
           })}
         </div>
      </section>

      {/* Level 2: Trends and Quick Actions (3x1 or Split Grid) */}
      <section className="grid lg:grid-cols-3 gap-6">
        <article className="dbx-card lg:col-span-2">
          <div className="dbx-card-head">
            <h2>الأداء المالي (الاتجاهات)</h2>
            <p>تحليل مسار الديون والتحصيل زمنياً</p>
          </div>
          {loadHeavySections ? (
            <DashboardChartSection
              chartData={chartData}
              chartInterval={chartInterval}
              intervals={CHART_INTERVALS}
              onIntervalChange={setChartInterval}
            />
          ) : (
            <div className="dbx-loader-box">جاري تحميل المؤشرات...</div>
          )}
        </article>

        <article className="dbx-card flex flex-col">
          <div className="dbx-card-head">
            <h2>إجراءات سريعة</h2>
            <p>عمليات النظام المباشرة</p>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            <button className="dbx-action-card" onClick={() => router.push('/dashboard/quick-entry')}>
              <div className="flex items-center gap-2 mb-1">
                <Rocket size={16} />
                <strong>إدخال سريع (Rabbit)</strong>
              </div>
              <span>إنشاء عميل وقرض فوراً</span>
            </button>
            <button className="dbx-action-card" onClick={() => router.push('/dashboard/najiz')}>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={16} className="text-[#10b981] dark:text-[#34d399]" />
                <strong>مزامنة ناجز</strong>
              </div>
              <span>التحقق من حالة القضايا</span>
            </button>
            <button className="dbx-action-card" onClick={() => router.push('/dashboard/monthly-report')}>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-[#8b5cf6] dark:text-[#a78bfa]" />
                <strong>تقرير ختامي</strong>
              </div>
              <span>توليد التقرير الشهري</span>
            </button>
            <button className="dbx-action-card" onClick={() => router.push('/dashboard/loans/import')}>
              <div className="flex items-center gap-2 mb-1">
                <Download size={16} className="text-[#2563eb]" />
                <strong>مركز الاستيراد</strong>
              </div>
              <span>استيراد ملفات القروض أو العملاء</span>
            </button>
          </div>
        </article>
      </section>

      {/* Level 3: Tables (Najiz Details and Overview) */}
      <section className="grid lg:grid-cols-2 gap-6">
        <article className="dbx-card">
          <div className="dbx-card-head dbx-card-head-inline">
            <div>
              <h2>ملخص قضايا ناجز</h2>
              <p>آخر التحديثات للمطالبات المسجلة</p>
            </div>
            <button className="dbx-btn dbx-btn-secondary h-8 px-3 text-[0.8rem]" onClick={() => router.push('/dashboard/najiz')}>عرض الكل</button>
          </div>

          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-[#e2e8f0] dark:border-[#1e293b]">
            <div className="flex-1">
               <div className="text-[0.8rem] text-[#64748b] font-medium mb-1">قضايا نشطة</div>
               <div className="text-[1.5rem] font-black t-num text-[#0f1c33] dark:text-[#f8fafc]">{formatCount(najizSummary?.activeCases)}</div>
            </div>
            <div className="flex-1">
               <div className="text-[0.8rem] text-[#64748b] font-medium mb-1">إجمالي المتبقي للتحصيل</div>
               <div className="text-[1.5rem] font-black t-num text-[#ef4444] dark:text-[#fca5a5]">{formatCurrency(metrics.najizRemainingAmount)}</div>
            </div>
          </div>

          {najizDetails.length === 0 ? (
            <div className="dbx-empty">
              <Shield size={24} />
              <p>لا توجد مطالبات نشطة مسجلة بالنظام.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="dbx-table">
                <thead>
                  <tr>
                    <th>اسم العميل</th>
                    <th>رقم القضية</th>
                    <th>متبقي</th>
                  </tr>
                </thead>
                <tbody>
                  {najizDetails.slice(0, 5).map((item) => {
                    const raised = toNumber(item.najiz_case_amount ?? item.amount);
                    const collected =
                      item.status === 'Paid'
                        ? toNumber(item.najiz_collected_amount ?? item.najiz_case_amount)
                        : toNumber(item.najiz_collected_amount);
                    const remaining = Math.max(raised - collected, 0);
                    return (
                      <tr key={String(item.id ?? `${item.customer_name}-${item.najiz_case_number}`)}>
                        <td className="font-semibold text-[#0f1c33] dark:text-[#f8fafc]">{item.customer_name || 'غير محدد'}</td>
                        <td className="t-num">{item.najiz_case_number || '—'}</td>
                        <td className="text-[#ef4444] font-bold t-num">{remaining.toLocaleString('en-US')} ﷼</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="dbx-card">
          <div className="dbx-card-head dbx-card-head-inline">
            <div>
              <h2>التنبيهات والمخاطر</h2>
              <p>حالات تتطلب اتخاذ إجراء فوري</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
             {overdueCount > 0 ? (
               <div className="flex items-start gap-4 p-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] dark:border-[#7f1d1d] dark:bg-[#450a0a]">
                 <div className="w-10 h-10 shrink-0 bg-[#ef4444] text-white rounded-full flex items-center justify-center">
                    <AlertTriangle size={18} />
                 </div>
                 <div>
                    <h3 className="font-bold text-[#991b1b] dark:text-[#fca5a5] text-[1.05rem] mb-1">تأخر في التحصيل</h3>
                    <p className="text-[#b91c1c] dark:text-[#fecaca] text-[0.9rem] font-medium leading-relaxed">
                       يوجد <span className="font-black t-num">{overdueCount}</span> عميل تجاوزوا فترة السداد المتفق عليها بأكثر من 30 يوماً.
                    </p>
                 </div>
               </div>
             ) : (
               <div className="flex items-start gap-4 p-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] dark:border-[#064e3b] dark:bg-[#022c22]">
                 <div className="w-10 h-10 shrink-0 bg-[#10b981] text-white rounded-full flex items-center justify-center">
                    <CheckCircle2 size={18} />
                 </div>
                 <div>
                    <h3 className="font-bold text-[#166534] dark:text-[#6ee7b7] text-[1.05rem] mb-1">محفظة سليمة</h3>
                    <p className="text-[#15803d] dark:text-[#a7f3d0] text-[0.9rem] font-medium leading-relaxed">
                       جميع الدفعات مجدولة بشكل صحيح، ولا توجد أي التزامات متأخرة حالياً.
                    </p>
                 </div>
               </div>
             )}

             {overdueClients.length > 0 && (
                <div className="mt-2 border border-[#e2e8f0] dark:border-[#1e293b] rounded-xl overflow-hidden">
                   <div className="bg-[#f8fafc] dark:bg-[#0f172a] p-3 text-[0.85rem] font-bold text-[#64748b] border-b border-[#e2e8f0] dark:border-[#1e293b]">
                      أعلى المتأخرين تصنيفاً
                   </div>
                   <div className="p-4 flex flex-col gap-3">
                      {overdueClients.slice(0, 3).map((client, idx) => (
                         <div key={idx} className="flex items-center justify-between">
                            <div className="font-semibold text-[#0f1c33] dark:text-[#f8fafc] text-[0.95rem]">{client.full_name}</div>
                            <div className="text-[#ef4444] font-black t-num">{toNumber(client.debt).toLocaleString('en-US')} ﷼</div>
                         </div>
                      ))}
                   </div>
                </div>
             )}
          </div>
        </article>
      </section>
    </div>
  );
}
