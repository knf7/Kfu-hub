-- ================================================================
-- Migration: Performance Indexes
-- Aseel SaaS — 2026-03-24
-- Purpose: Fix search timeouts + accelerate common list queries
-- Apply via Supabase SQL Editor (use CONCURRENTLY to avoid locks)
-- ================================================================

-- ── 1. customers: text search on name / national_id / mobile ────
-- Full-text search index: ILIKE '%name%' on full_name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cust_merchant_fullname_lower
  ON public.customers (merchant_id, lower(full_name) text_pattern_ops);

-- Prefix search index: national_id LIKE '1234%' and mobile LIKE '05%'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cust_national_id_prefix
  ON public.customers (merchant_id, national_id text_pattern_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cust_mobile_prefix
  ON public.customers (merchant_id, mobile_number text_pattern_ops);

-- Covering index for list query (avoids heap fetch)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cust_list_covering
  ON public.customers (merchant_id, created_at DESC)
  INCLUDE (id, full_name, national_id, mobile_number)
  WHERE deleted_at IS NULL;

-- ── 2. loans: search via customer JOIN (national_id / mobile) ───
-- When searching loans by national_id or mobile, the DB joins customers
-- This index accelerates the JOIN lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_cust_merchant_covering
  ON public.loans (merchant_id, customer_id, created_at DESC)
  INCLUDE (id, amount, status, is_najiz_case, najiz_collected_amount)
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_merchant_najiz_active
  ON public.loans (merchant_id, is_najiz_case, created_at DESC)
  WHERE is_najiz_case = TRUE AND deleted_at IS NULL;

-- Status-specific index for common filter patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_merchant_status_date
  ON public.loans (merchant_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── 3. loans: pagination sort optimization ───────────────────────
-- The list query sorts by created_at DESC — ensure this is covered
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_merchant_created_desc
  ON public.loans (merchant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ── 4. Update statistics so query planner uses new indexes ───────
ANALYZE public.customers;
ANALYZE public.loans;

-- ================================================================
-- Verification queries (run after applying to confirm index usage)
-- ================================================================
-- EXPLAIN (ANALYZE, BUFFERS) SELECT id, full_name, national_id, mobile_number
--   FROM customers WHERE merchant_id = 'YOUR_ID' AND full_name ILIKE '%احمد%'
--   ORDER BY created_at DESC LIMIT 15;
--
-- EXPLAIN (ANALYZE, BUFFERS) SELECT l.id FROM loans l
--   LEFT JOIN customers c ON l.customer_id = c.id
--   WHERE l.merchant_id = 'YOUR_ID' AND c.national_id LIKE '1234%'
--   AND l.deleted_at IS NULL ORDER BY l.created_at DESC LIMIT 20;
