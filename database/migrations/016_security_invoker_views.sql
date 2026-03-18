-- Harden BI/auth views so they run with the caller's privileges
-- This keeps Supabase's security scanner from flagging security-definer-style views.

ALTER VIEW IF EXISTS public.auth_lookup_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.merchant_dashboard_metrics SET (security_invoker = true);
ALTER VIEW IF EXISTS public.customer_debt_summary SET (security_invoker = true);
