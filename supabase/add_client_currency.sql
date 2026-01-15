-- Add currency column to clients table
-- This allows setting a client as a USD or ZAR client

-- Add currency column with default ZAR
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ZAR' CHECK (currency IN ('ZAR', 'USD'));

-- Update existing clients to have ZAR as default
UPDATE clients SET currency = 'ZAR' WHERE currency IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN clients.currency IS 'Client billing currency - ZAR (South African Rand) or USD (United States Dollar)';
