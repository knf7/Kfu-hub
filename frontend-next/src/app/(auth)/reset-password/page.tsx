'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

function ResetPasswordForm() {
    const params = useSearchParams();
    const tokenFromUrl = params.get('token') || '';
    const { resetPassword, isResettingPassword } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState('');

    const hasToken = useMemo(() => tokenFromUrl.trim().length > 0, [tokenFromUrl]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (password.length < 8) {
            setLocalError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
            return;
        }
        if (password !== confirmPassword) {
            setLocalError('تأكيد كلمة المرور غير مطابق.');
            return;
        }

        resetPassword({
            token: hasToken ? tokenFromUrl : undefined,
            newPassword: password,
        });
    };

    return (
        <section className="glass-card auth-card">
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight dark:text-slate-50">إعادة تعيين كلمة المرور</h1>
            <p className="text-slate-700 mb-8 font-semibold dark:text-slate-200">
                اختر كلمة مرور جديدة لحسابك.
            </p>

            {!hasToken && (
                <div className="mb-5 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sky-700 text-sm font-semibold dark:border-sky-700/40 dark:bg-sky-950/30 dark:text-sky-200">
                    إذا وصلت من رابط البريد فستعمل إعادة التعيين تلقائيًا عبر Supabase.
                </div>
            )}

            {localError && (
                <div className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-semibold dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-200">
                    {localError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-6" noValidate>
                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-bold text-slate-800 mr-2 dark:text-slate-100">كلمة المرور الجديدة</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="field-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isResettingPassword}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-bold text-slate-800 mr-2 dark:text-slate-100">تأكيد كلمة المرور</label>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className="field-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isResettingPassword}
                    />
                </div>

                <button
                    type="submit"
                    className="btn-premium-primary action-btn w-full text-lg justify-center mt-4"
                    disabled={isResettingPassword}
                    aria-busy={isResettingPassword}
                >
                    {isResettingPassword ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
                </button>
            </form>

            <div className="mt-6 text-sm text-center text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-4">
                <Link href="/forgot-password" className="text-coral underline underline-offset-4">طلب رابط جديد</Link>
                <Link href="/login" className="text-coral underline underline-offset-4">تسجيل الدخول</Link>
            </div>
        </section>
    );
}

function ResetPasswordFallback() {
    return (
        <section className="glass-card auth-card">
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight dark:text-slate-50">إعادة تعيين كلمة المرور</h1>
            <p className="text-slate-700 mb-8 font-semibold dark:text-slate-200">جاري تحميل بيانات الرابط...</p>
        </section>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
