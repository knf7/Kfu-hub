import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getResetPasswordRedirectUrl, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

type ApiError = {
    response?: {
        status?: number;
        data?: {
            error?: string;
        };
    };
    message?: string;
};

export function useAuth() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Login Mutation
    const loginMutation = useMutation({
        mutationFn: async (credentials: {
            identifier: string;
            password: string;
            rememberMe?: boolean;
        }) => {
            const identifier = String(credentials.identifier || '').trim();
            const password = String(credentials.password || '');
            const rememberMe = Boolean(credentials.rememberMe);
            const isEmailLogin = identifier.includes('@');

            // Prefer Supabase for email login when configured.
            // If backend does not accept Supabase tokens yet, we fallback to backend login.
            if (isSupabaseConfigured && isEmailLogin) {
                const supabase = getSupabaseClient();
                const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
                    email: identifier.toLowerCase(),
                    password,
                });

                if (!supaError && supaData.session?.access_token) {
                    try {
                        localStorage.setItem('token', supaData.session.access_token);
                        if (rememberMe) {
                            localStorage.setItem('remembered_user', identifier);
                        } else {
                            localStorage.removeItem('remembered_user');
                        }

                        // Fetch merchant profile from backend using Supabase token.
                        const meResponse = await api.get('/auth/me');
                        const merchant = meResponse.data || {};
                        localStorage.setItem('merchant', JSON.stringify(merchant));
                        localStorage.setItem('user', JSON.stringify(merchant));
                        if (merchant?.id) {
                            localStorage.setItem('merchant_id', merchant.id);
                        }
                        return { mode: 'supabase', user: merchant };
                    } catch {
                        // Backend likely doesn't accept Supabase JWT yet - fallback below.
                        localStorage.removeItem('token');
                        try { await supabase.auth.signOut(); } catch { /* ignore */ }
                    }
                }
            }

            // Fallback to backend login (supports username + legacy accounts).
            const { data } = await api.post('/auth/login', { identifier, password, rememberMe });
            return { mode: 'backend', ...data };
        },
        onSuccess: (data) => {
            if (data.requiresOTP) {
                toast('OTP Required. Please check your email.');
                return;
            }

            if (data.mode === 'backend') {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
                if (data.user) {
                    localStorage.setItem('merchant', JSON.stringify(data.user));
                    localStorage.setItem('user', JSON.stringify(data.user));
                    if (data.user?.id) {
                        localStorage.setItem('merchant_id', data.user.id);
                    }
                }
            }
            toast.success('تم تسجيل الدخول بنجاح.');
            queryClient.invalidateQueries({ queryKey: ['user'] });
            router.push('/dashboard');
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const message =
                apiError.response?.data?.error ||
                (apiError.response?.status ? `فشل تسجيل الدخول (HTTP ${apiError.response.status}).` : '') ||
                apiError.message ||
                'فشل تسجيل الدخول. تحقق من بياناتك.';
            toast.error(message);
        },
    });

    // Register Mutation
    const registerMutation = useMutation({
        mutationFn: async (userData: {
            businessName: string;
            username: string;
            email: string;
            mobile: string;
            password: string;
        }) => {
            const normalized = {
                businessName: String(userData.businessName || '').trim(),
                username: String(userData.username || '').trim(),
                email: String(userData.email || '').trim().toLowerCase(),
                mobile: String(userData.mobile || '').trim(),
                password: String(userData.password || ''),
            };

            // Keep backend registration as source of merchant/business records.
            const backend = await api.post('/auth/register', normalized);
            let supabaseWarning: string | null = null;

            if (isSupabaseConfigured) {
                const supabase = getSupabaseClient();
                const { error } = await supabase.auth.signUp({
                    email: normalized.email,
                    password: normalized.password,
                    options: {
                        data: {
                            businessName: normalized.businessName,
                            username: normalized.username,
                            mobile: normalized.mobile,
                        },
                        emailRedirectTo: getResetPasswordRedirectUrl(),
                    },
                });
                if (error && !/already|registered|exists/i.test(error.message || '')) {
                    supabaseWarning = error.message || 'تعذر إنشاء مستخدم Supabase.';
                }
            }

            return { ...backend.data, supabaseWarning };
        },
        onSuccess: (data) => {
            if (data?.supabaseWarning) {
                toast.warning(`تم إنشاء الحساب، لكن Supabase أرجع تنبيه: ${data.supabaseWarning}`);
            } else {
                toast.success('تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.');
            }
            router.push('/login');
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const message =
                apiError.response?.data?.error ||
                (apiError.response?.status ? `فشل إنشاء الحساب (HTTP ${apiError.response.status}).` : '') ||
                apiError.message ||
                'فشل إنشاء الحساب.';
            toast.error(message);
        },
    });

    const forgotPasswordMutation = useMutation({
        mutationFn: async (payload: { email: string }) => {
            const email = String(payload.email || '').trim().toLowerCase();

            if (isSupabaseConfigured) {
                const supabase = getSupabaseClient();
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: getResetPasswordRedirectUrl(),
                });
                if (!error) {
                    return { message: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني.' };
                }
            }

            // Fallback to backend password-reset flow.
            const { data } = await api.post('/auth/forgot-password', { email });
            return data;
        },
        onSuccess: (data) => {
            const message = data?.message || 'إذا كان البريد مسجلاً لدينا فسيتم إرسال رابط إعادة التعيين.';
            toast.success(message);
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const message =
                apiError.response?.data?.error ||
                (apiError.response?.status ? `تعذر إرسال الطلب (HTTP ${apiError.response.status}).` : '') ||
                apiError.message ||
                'تعذر إرسال رابط إعادة التعيين.';
            toast.error(message);
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async (payload: { token?: string; newPassword: string }) => {
            const token = payload.token?.trim();
            const newPassword = String(payload.newPassword || '');

            if (token) {
                const { data } = await api.post('/auth/reset-password', { token, newPassword });
                return data;
            }

            if (!isSupabaseConfigured) {
                throw new Error('رابط إعادة التعيين غير صالح.');
            }

            const supabase = getSupabaseClient();
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                throw new Error('جلسة إعادة التعيين غير متوفرة أو منتهية.');
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                throw new Error(error.message || 'تعذر تحديث كلمة المرور.');
            }
            return { message: 'تم تغيير كلمة المرور بنجاح' };
        },
        onSuccess: (data) => {
            const message = data?.message || 'تم تغيير كلمة المرور بنجاح.';
            toast.success(message);
            router.push('/login');
        },
        onError: (error: unknown) => {
            const apiError = error as ApiError;
            const message =
                apiError.response?.data?.error ||
                (apiError.response?.status ? `تعذر إعادة التعيين (HTTP ${apiError.response.status}).` : '') ||
                apiError.message ||
                'فشلت عملية إعادة تعيين كلمة المرور.';
            toast.error(message);
        },
    });

    return {
        login: loginMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        loginData: loginMutation.data,
        register: registerMutation.mutate,
        isRegistering: registerMutation.isPending,
        forgotPassword: forgotPasswordMutation.mutate,
        isSubmittingForgotPassword: forgotPasswordMutation.isPending,
        resetPassword: resetPasswordMutation.mutate,
        isResettingPassword: resetPasswordMutation.isPending,
    };
}
