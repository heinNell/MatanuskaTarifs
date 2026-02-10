-- Migration: ensure clients.currency is NOT NULL and defaults to 'ZAR' for existing NULLs
BEGIN;
UPDATE clients SET currency = 'ZAR' WHERE currency IS NULL;
ALTER TABLE clients ALTER COLUMN currency SET NOT NULL;
COMMIT;
