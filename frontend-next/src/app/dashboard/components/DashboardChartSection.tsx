'use client';

import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';

type ChartInterval = 'week' | 'month';

type ChartPoint = {
  label: string;
  amount: number;
  count: number;
};

type IntervalOption = {
  id: ChartInterval;
  label: string;
};

type DashboardChartSectionProps = {
  chartData: ChartPoint[];
  chartInterval: ChartInterval;
  intervals: IntervalOption[];
  onIntervalChange: (value: ChartInterval) => void;
};

const toNumber = (value: number | string | undefined) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export default function DashboardChartSection({
  chartData,
  chartInterval,
  intervals,
  onIntervalChange,
}: DashboardChartSectionProps) {
  return (
    <section className="dbx-card dbx-chart-card">
      <div className="dbx-card-head dbx-chart-head">
        <div>
          <h2>حركة المبالغ</h2>
          <p>الصرف والتحصيل عبر الزمن</p>
        </div>
        <div className="dbx-intervals">
          {intervals.map((interval) => (
            <button
              key={interval.id}
              type="button"
              className={chartInterval === interval.id ? 'active' : ''}
              onClick={() => onIntervalChange(interval.id)}
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
  );
}
