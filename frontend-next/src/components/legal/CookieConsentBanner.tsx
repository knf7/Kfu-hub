'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ConsentChoice = 'all' | 'necessary';

const CONSENT_KEY = 'aseel-cookie-consent-v1';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      const existing = localStorage.getItem(CONSENT_KEY);
      setVisible(!existing);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const timestamp = useMemo(() => new Date().toISOString(), []);

  const saveChoice = (choice: ConsentChoice) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        choice,
        acceptedAt: timestamp,
      })
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">نستخدم ملفات تعريف الارتباط لتحسين التجربة</p>
            <p className="mt-1 text-sm text-slate-600">
              يمكنك قبول جميع الكوكيز أو الاكتفاء بالضرورية فقط. التفاصيل في{' '}
              <Link href="/cookies-policy" className="font-semibold text-blue-600 hover:underline">
                سياسة الكوكيز
              </Link>.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => saveChoice('necessary')}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              الضرورية فقط
            </button>
            <button
              type="button"
              onClick={() => saveChoice('all')}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-700 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              قبول الكل
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
