import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_PUBLIC_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase environment variables are missing.');
    }
    if (!supabaseClient) {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    }
    return supabaseClient;
};

export const getResetPasswordRedirectUrl = () => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/reset-password`;
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${appUrl.replace(/\/$/, '')}/reset-password`;
};

