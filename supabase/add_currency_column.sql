-- Migration: Add currency column to client_routes and tariff_history tables
-- This allows rates to be specified in either ZAR or USD

-- Add currency column to client_routes
ALTER TABLE client_routes
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR' NOT NULL;

-- Add currency column to tariff_history
ALTER TABLE tariff_history
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ZAR' NOT NULL;

-- Add constraint to ensure valid currency codes
ALTER TABLE client_routes
ADD CONSTRAINT chk_client_routes_currency CHECK (currency IN ('ZAR', 'USD'));

ALTER TABLE tariff_history
ADD CONSTRAINT chk_tariff_history_currency CHECK (currency IN ('ZAR', 'USD'));

-- Add a table to track monthly rate adjustments
CREATE TABLE IF NOT EXISTS monthly_adjustments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    adjustment_month DATE NOT NULL UNIQUE,
    diesel_percentage_change DECIMAL(8, 4) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by UUID REFERENCES auth.users(id),
    total_routes_adjusted INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for monthly adjustments
CREATE INDEX IF NOT EXISTS idx_monthly_adjustments_month ON monthly_adjustments(adjustment_month DESC);

-- Enable RLS on monthly_adjustments
ALTER TABLE monthly_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_adjustments
CREATE POLICY "Allow authenticated read access to monthly_adjustments"
    ON monthly_adjustments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated all access to monthly_adjustments"
    ON monthly_adjustments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
