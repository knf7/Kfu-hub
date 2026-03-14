-- Performance indexes for Najiz cases + analytics time-series
CREATE INDEX IF NOT EXISTS idx_loans_merchant_najiz_created_active
    ON loans (merchant_id, is_najiz_case, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_loans_merchant_transaction_active
    ON loans (merchant_id, transaction_date DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_loans_merchant_active_transaction_active
    ON loans (merchant_id, transaction_date DESC)
    WHERE deleted_at IS NULL AND status = 'Active';

CREATE INDEX IF NOT EXISTS idx_loans_merchant_paid_updated_active
    ON loans (merchant_id, updated_at DESC)
    WHERE deleted_at IS NULL AND status = 'Paid';
