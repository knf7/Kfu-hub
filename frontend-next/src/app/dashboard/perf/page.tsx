'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { perfAPI } from '@/lib/api';
import './perf.css';

type PerfTiming = {
  id: string;
  path: string;
  status: number;
  ms: number;
};

const LABELS: Record<string, string> = {
  reports_dashboard: 'الداشبورد الرئيسي',
  reports_analytics: 'التحليلات',
  customers_light: 'العملاء',
  loans: 'القروض',
  najiz: 'قضايا ناجز',
};

const formatMs = (value: number) => `${value.toLocaleString('en-US')} ms`;

export default function PerfPage() {
  const [loading, setLoading] = useState(false);
  const [timings, setTimings] = useState<PerfTiming[]>([]);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [measuredAt, setMeasuredAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await perfAPI.getDashboard();
      const data = res.data || {};
      setTimings(data.timings || []);
      setTotalMs(Number(data.totalMs || 0));
      setMeasuredAt(data.measuredAt || null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('انتهت الجلسة. الرجاء تسجيل الدخول من جديد.');
      } else if (status === 403) {
        setError('غير مصرح. تأكد من صلاحيات الحساب.');
      } else {
        setError('تعذر القياس. حاول مرة أخرى بعد قليل.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const slowItems = useMemo(
    () => timings.filter((t) => t.ms >= 2000 || t.status >= 400),
    [timings]
  );

  return (
    <div className="perf-page">
      <div className="perf-header">
        <div>
          <h1>قياس أداء الصفحات</h1>
          <p>يقيس سرعة أهم واجهات الداشبورد بدون عرض أي بيانات حساسة.</p>
        </div>
        <button className="perf-btn" onClick={runCheck} disabled={loading}>
          {loading ? 'جاري القياس...' : 'ابدأ القياس'}
        </button>
      </div>

      {error && <div className="perf-alert perf-alert-error">{error}</div>}

      <div className="perf-card">
        <div className="perf-summary">
          <div>
            <div className="perf-label">الإجمالي</div>
            <div className="perf-value">{totalMs !== null ? formatMs(totalMs) : '—'}</div>
          </div>
          <div>
            <div className="perf-label">آخر قياس</div>
            <div className="perf-value">{measuredAt ? new Date(measuredAt).toLocaleString('ar-SA') : '—'}</div>
          </div>
          <div>
            <div className="perf-label">النقاط الحرجة</div>
            <div className={`perf-value ${slowItems.length ? 'perf-warn' : 'perf-ok'}`}>
              {slowItems.length}
            </div>
          </div>
        </div>

        <div className="perf-table">
          {timings.length === 0 && !loading && (
            <div className="perf-empty">اضغط &quot;ابدأ القياس&quot; لعرض النتائج.</div>
          )}
          {timings.map((item) => (
            <div key={item.id} className="perf-row">
              <div className="perf-name">{LABELS[item.id] || item.id}</div>
              <div className="perf-path">{item.path}</div>
              <div className={`perf-status ${item.status >= 400 ? 'bad' : 'ok'}`}>
                {item.status || '—'}
              </div>
              <div className={`perf-ms ${item.ms >= 2000 ? 'slow' : 'fast'}`}>
                {formatMs(item.ms)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
