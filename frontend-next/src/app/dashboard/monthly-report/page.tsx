'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { reportsAPI } from '@/lib/api';
import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconClipboard,
  IconDownload,
  IconMoney,
  IconRefresh,
  IconTrend,
  IconTrendDown,
  IconUsers,
} from '@/components/layout/icons';
import './monthly-report.css';

type MonthlyReportPayload = {
  period?: {
    year: number;
    month: number;
    monthName: string;
    startDate: string;
    endDate: string;
  };
  summary?: {
    totalLoans: number;
    totalDisbursed: number;
    totalCollected: number;
    activeAmount: number;
    raisedAmount: number;
    uniqueCustomers: number;
    activeCustomers: number;
    collectionRate: number;
    activeSharePercent: number;
    averageLoanAmount: number;
    growth: {
      disbursedChangePercent: number;
      loanCountChangePercent: number;
      collectedChangePercent: number;
    };
  };
  statusBreakdown?: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  weeklyTrend?: Array<{
    weekKey: string;
    weekStart: string;
    loansCount: number;
    totalAmount: number;
  }>;
  topCustomers?: Array<{
    id: string;
    fullName: string;
    mobileNumber: string;
    loansCount: number;
    totalAmount: number;
    paidAmount: number;
  }>;
  insights?: Array<{
    type: 'success' | 'warning' | 'danger' | 'info' | string;
    priority: number;
    title: string;
    detail: string;
  }>;
  recommendations?: string[];
  generatedAt?: string;
};

const STATUS_LABELS: Record<string, string> = {
  Active: 'نشط',
  Paid: 'مسدد',
  Cancelled: 'ملغي',
  Overdue: 'متأخر',
  Raised: 'مرفوع',
};

const STATUS_COLORS: Record<string, string> = {
  Active: '#f59e0b',
  Paid: '#0ea5e9',
  Cancelled: '#94a3b8',
  Overdue: '#ef4444',
  Raised: '#8b5cf6',
};

const formatMoney = (value: number | null | undefined) => {
  const safe = Number(value || 0);
  return `${safe.toLocaleString('en-US')} ر.س`;
};

const defaultPeriod = () => {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (month === 0) {
    year -= 1;
    month = 12;
  }
  return { year, month };
};

export default function MonthlyReportPage() {
  const initial = useMemo(() => defaultPeriod(), []);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | 'json' | 'yearly' | null>(null);
  const [report, setReport] = useState<MonthlyReportPayload | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_v, i) => current - i);
  }, []);

  const maxStatusCount = useMemo(() => {
    const counts = (report?.statusBreakdown || []).map((row) => Number(row.count || 0));
    return counts.length ? Math.max(...counts, 1) : 1;
  }, [report?.statusBreakdown]);

  const fetchReport = async (force = false) => {
    setLoading(true);
    try {
      const response = await reportsAPI.getMonthlySummary({
        year,
        month,
        ...(force ? { _t: Date.now() } : {}),
      });
      const payload: MonthlyReportPayload = response?.data || response;
      setReport(payload);
    } catch {
      toast.error('تعذر تحميل التقرير الشهري.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const fileStamp = `${year}-${String(month).padStart(2, '0')}`;

  const getExportWindow = () => {
    const start = report?.period?.startDate
      ? new Date(`${report.period.startDate}T00:00:00.000Z`)
      : new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = report?.period?.endDate
      ? new Date(`${report.period.endDate}T23:59:59.999Z`)
      : new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  const downloadTextFile = (content: string, fileName: string, mimeType: string, withBom = false) => {
    const data = withBom ? `\uFEFF${content}` : content;
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const toCsvCell = (value: unknown) => {
    const raw = String(value ?? '');
    const escaped = raw.replace(/"/g, '""');
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const handleExportXlsx = async () => {
    setExporting('xlsx');
    try {
      const { startDate, endDate } = getExportWindow();
      await reportsAPI.exportMonthlyLoansXlsx({
        startDate,
        endDate,
        fileName: `monthly-report-${fileStamp}.xlsx`,
      });
      toast.success('تم تنزيل ملف Excel بنجاح.');
    } catch {
      toast.error('تعذر تصدير ملف Excel حالياً.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportCsv = () => {
    if (!report) {
      toast.error('لا توجد بيانات للتصدير.');
      return;
    }
    setExporting('csv');
    try {
      const rows: Array<Array<string | number>> = [];
      rows.push(['التقرير الشهري الذكي', report?.period?.monthName || '', fileStamp]);
      rows.push(['فترة التقرير', report?.period?.startDate || '', report?.period?.endDate || '']);
      rows.push([]);

      rows.push(['الملخص']);
      rows.push(['إجمالي القروض', Number(report?.summary?.totalLoans || 0)]);
      rows.push(['إجمالي الصرف', Number(report?.summary?.totalDisbursed || 0)]);
      rows.push(['إجمالي التحصيل', Number(report?.summary?.totalCollected || 0)]);
      rows.push(['عملاء الشهر', Number(report?.summary?.uniqueCustomers || 0)]);
      rows.push(['نسبة التحصيل', `${Number(report?.summary?.collectionRate || 0)}%`]);
      rows.push([]);

      rows.push(['توزيع الحالات']);
      rows.push(['الحالة', 'العدد', 'المبلغ']);
      (report?.statusBreakdown || []).forEach((item) => {
        rows.push([
          STATUS_LABELS[item.status] || item.status,
          Number(item.count || 0),
          Number(item.amount || 0),
        ]);
      });
      rows.push([]);

      rows.push(['أفضل العملاء']);
      rows.push(['الاسم', 'الجوال', 'عدد القروض', 'إجمالي المبلغ', 'المحصل']);
      (report?.topCustomers || []).forEach((item) => {
        rows.push([
          item.fullName || '-',
          item.mobileNumber || '-',
          Number(item.loansCount || 0),
          Number(item.totalAmount || 0),
          Number(item.paidAmount || 0),
        ]);
      });
      rows.push([]);

      rows.push(['توصيات']);
      (report?.recommendations || []).forEach((item) => rows.push([item]));

      const csv = rows.map((row) => row.map(toCsvCell).join(',')).join('\n');
      downloadTextFile(csv, `monthly-report-${fileStamp}.csv`, 'text/csv;charset=utf-8;', true);
      toast.success('تم تنزيل ملف CSV بنجاح.');
    } catch {
      toast.error('تعذر تصدير ملف CSV حالياً.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportJson = () => {
    if (!report) {
      toast.error('لا توجد بيانات للتصدير.');
      return;
    }
    setExporting('json');
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        selectedPeriod: { year, month },
        report,
      };
      downloadTextFile(
        JSON.stringify(payload, null, 2),
        `monthly-report-${fileStamp}.json`,
        'application/json;charset=utf-8;'
      );
      toast.success('تم تنزيل ملف JSON بنجاح.');
    } catch {
      toast.error('تعذر تصدير ملف JSON حالياً.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportYearlyWorkbook = async () => {
    setExporting('yearly');
    try {
      await reportsAPI.exportYearlyWorkbookXlsx(year);
      toast.success('تم تنزيل ملف Excel السنوي (Sheets شهرية) بنجاح.');
    } catch {
      toast.error('تعذر تصدير ملف Excel السنوي حالياً.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mr-page">
      <header className="mr-hero">
        <div>
          <h1>التقرير الشهري الذكي</h1>
          <p>ملخص تشغيلي للشهر المنصرم يساعدك على فهم الأداء، المخاطر، وخطوات المتابعة القادمة.</p>
          {report?.generatedAt && (
            <span className="mr-generated-at">
              آخر توليد: {new Date(report.generatedAt).toLocaleString('ar-SA')}
            </span>
          )}
        </div>

        <div className="mr-controls">
          <label>
            السنة
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {years.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            الشهر
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {Array.from({ length: 12 }, (_v, index) => (
                <option key={index + 1} value={index + 1}>{index + 1}</option>
              ))}
            </select>
          </label>
          <button type="button" className="mr-refresh-btn" onClick={() => fetchReport(true)} disabled={loading || exporting !== null}>
            <IconRefresh size={15} />
            <span>{loading ? 'جاري التوليد...' : 'توليد التقرير'}</span>
          </button>
          <div className="mr-export-buttons">
            <button type="button" className="mr-export-btn" onClick={handleExportXlsx} disabled={loading || exporting !== null}>
              <IconDownload size={14} />
              <span>{exporting === 'xlsx' ? 'جاري التصدير...' : 'Excel'}</span>
            </button>
            <button type="button" className="mr-export-btn" onClick={handleExportCsv} disabled={loading || exporting !== null}>
              <IconDownload size={14} />
              <span>{exporting === 'csv' ? 'جاري التصدير...' : 'CSV'}</span>
            </button>
            <button type="button" className="mr-export-btn" onClick={handleExportJson} disabled={loading || exporting !== null}>
              <IconDownload size={14} />
              <span>{exporting === 'json' ? 'جاري التصدير...' : 'JSON'}</span>
            </button>
            <button type="button" className="mr-export-btn yearly" onClick={handleExportYearlyWorkbook} disabled={loading || exporting !== null}>
              <IconDownload size={14} />
              <span>{exporting === 'yearly' ? 'جاري التصدير...' : `Workbook ${year}`}</span>
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="mr-loading">
          <div className="mr-spinner" />
          <p>جاري تجهيز التقرير الشهري...</p>
        </div>
      ) : (
        <>
          <section className="mr-kpis">
            <article>
              <header><IconClipboard size={16} /><span>إجمالي القروض</span></header>
              <strong>{Number(report?.summary?.totalLoans || 0).toLocaleString('en-US')}</strong>
            </article>
            <article>
              <header><IconMoney size={16} /><span>إجمالي الصرف</span></header>
              <strong>{formatMoney(report?.summary?.totalDisbursed)}</strong>
            </article>
            <article>
              <header><IconCheck size={16} /><span>إجمالي التحصيل</span></header>
              <strong>{formatMoney(report?.summary?.totalCollected)}</strong>
            </article>
            <article>
              <header><IconUsers size={16} /><span>عملاء الشهر</span></header>
              <strong>{Number(report?.summary?.uniqueCustomers || 0).toLocaleString('en-US')}</strong>
            </article>
            <article>
              <header><IconActivity size={16} /><span>نسبة التحصيل</span></header>
              <strong>{Number(report?.summary?.collectionRate || 0)}%</strong>
            </article>
          </section>

          <section className="mr-grid">
            <article className="mr-card">
              <h2>التغير عن الشهر السابق</h2>
              <div className="mr-growth">
                <div>
                  {(report?.summary?.growth?.disbursedChangePercent || 0) >= 0 ? <IconTrend size={16} /> : <IconTrendDown size={16} />}
                  <span>الصرف: {report?.summary?.growth?.disbursedChangePercent || 0}%</span>
                </div>
                <div>
                  {(report?.summary?.growth?.collectedChangePercent || 0) >= 0 ? <IconTrend size={16} /> : <IconTrendDown size={16} />}
                  <span>التحصيل: {report?.summary?.growth?.collectedChangePercent || 0}%</span>
                </div>
                <div>
                  {(report?.summary?.growth?.loanCountChangePercent || 0) >= 0 ? <IconTrend size={16} /> : <IconTrendDown size={16} />}
                  <span>عدد القروض: {report?.summary?.growth?.loanCountChangePercent || 0}%</span>
                </div>
              </div>
            </article>

            <article className="mr-card">
              <h2>توزيع الحالات</h2>
              <div className="mr-status-list">
                {(report?.statusBreakdown || []).map((row) => {
                  const width = Math.max(8, Math.round((Number(row.count || 0) / maxStatusCount) * 100));
                  return (
                    <div key={row.status} className="mr-status-row">
                      <div className="mr-status-label">
                        <span>{STATUS_LABELS[row.status] || row.status}</span>
                        <small>{Number(row.count || 0).toLocaleString('en-US')}</small>
                      </div>
                      <div className="mr-status-track">
                        <i
                          style={{
                            width: `${width}%`,
                            background: STATUS_COLORS[row.status] || '#64748b',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="mr-card tall">
              <h2>أبرز العملاء في الشهر</h2>
              <div className="mr-customers">
                {(report?.topCustomers || []).length === 0 && <p className="mr-empty">لا توجد بيانات عملاء لهذا الشهر.</p>}
                {(report?.topCustomers || []).map((customer) => (
                  <div key={customer.id} className="mr-customer-row">
                    <div>
                      <strong>{customer.fullName || '—'}</strong>
                      <span>{customer.mobileNumber || 'بدون جوال'}</span>
                    </div>
                    <div>
                      <small>{customer.loansCount} قرض</small>
                      <b>{formatMoney(customer.totalAmount)}</b>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="mr-card tall">
              <h2>قراءة ذكية</h2>
              <div className="mr-insights">
                {(report?.insights || []).map((insight, index) => (
                  <div key={`${insight.title}-${index}`} className={`mr-insight ${insight.type || 'info'}`}>
                    <strong>{insight.title}</strong>
                    <p>{insight.detail}</p>
                  </div>
                ))}
              </div>
              <h3>توصيات تنفيذية</h3>
              <ul>
                {(report?.recommendations || []).map((recommendation, index) => (
                  <li key={`${recommendation}-${index}`}>
                    <IconAlertTriangle size={14} />
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="mr-card wide">
              <h2>إيقاع الأسابيع داخل الشهر</h2>
              <div className="mr-weeks">
                {(report?.weeklyTrend || []).length === 0 && <p className="mr-empty">لا توجد حركة أسبوعية مسجلة.</p>}
                {(report?.weeklyTrend || []).map((week) => (
                  <div key={week.weekKey} className="mr-week-row">
                    <div>
                      <strong>{week.weekKey}</strong>
                      <span>{week.weekStart ? new Date(week.weekStart).toLocaleDateString('ar-SA') : '-'}</span>
                    </div>
                    <b>{week.loansCount} قروض</b>
                    <em>{formatMoney(week.totalAmount)}</em>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
