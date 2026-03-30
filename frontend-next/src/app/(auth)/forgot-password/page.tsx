'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
    const { forgotPassword, isSubmittingForgotPassword } = useAuth();
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedEmail = email.trim();
        if (!normalizedEmail) return;
        forgotPassword({ email: normalizedEmail });
    };

    return (
        <section className="glass-card auth-card">
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight dark:text-slate-50">استعادة كلمة المرور</h1>
            <p className="text-slate-700 mb-8 font-semibold dark:text-slate-200">
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-6" noValidate>
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-bold text-slate-800 mr-2 dark:text-slate-100">البريد الإلكتروني</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="name@company.com"
                        required
                        autoComplete="email"
                        className="field-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmittingForgotPassword}
                    />
                </div>

                <button
                    type="submit"
                    className="btn-premium-primary action-btn w-full text-lg justify-center mt-4"
                    disabled={isSubmittingForgotPassword}
                    aria-busy={isSubmittingForgotPassword}
                >
                    {isSubmittingForgotPassword ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
                </button>
            </form>

            <div className="mt-6 text-sm text-center text-slate-700 dark:text-slate-200 font-semibold">
                <Link href="/login" className="text-coral underline underline-offset-4">العودة لتسجيل الدخول</Link>
            </div>
        </section>
    );
}
