-- =====================================================
-- FIX RLS POLICIES FOR ANONYMOUS ACCESS
-- Run this in the Supabase SQL Editor to allow unauthenticated access
-- =====================================================

-- Option 1: Add policies for anonymous (anon) access
-- This allows the app to work without requiring user login

-- Drop existing policies that only allow authenticated users
DROP POLICY IF EXISTS "Allow authenticated read access to diesel_prices" ON diesel_prices;
DROP POLICY IF EXISTS "Allow authenticated insert to diesel_prices" ON diesel_prices;
DROP POLICY IF EXISTS "Allow authenticated update to diesel_prices" ON diesel_prices;
DROP POLICY IF EXISTS "Allow authenticated read access to clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated all access to clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated read access to routes" ON routes;
DROP POLICY IF EXISTS "Allow authenticated all access to routes" ON routes;
DROP POLICY IF EXISTS "Allow authenticated read access to client_routes" ON client_routes;
DROP POLICY IF EXISTS "Allow authenticated all access to client_routes" ON client_routes;
DROP POLICY IF EXISTS "Allow authenticated read access to tariff_history" ON tariff_history;
DROP POLICY IF EXISTS "Allow authenticated insert to tariff_history" ON tariff_history;
DROP POLICY IF EXISTS "Allow authenticated read access to master_control_settings" ON master_control_settings;
DROP POLICY IF EXISTS "Allow authenticated all access to master_control_settings" ON master_control_settings;
DROP POLICY IF EXISTS "Allow authenticated read access to documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated all access to documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated read access to document_types" ON document_types;
DROP POLICY IF EXISTS "Allow authenticated read access to audit_log" ON audit_log;

-- =====================================================
-- DIESEL PRICES POLICIES
-- =====================================================
CREATE POLICY "Allow all access to diesel_prices"
ON diesel_prices FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================
CREATE POLICY "Allow all access to clients"
ON clients FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- ROUTES POLICIES
-- =====================================================
CREATE POLICY "Allow all access to routes"
ON routes FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- CLIENT_ROUTES POLICIES
-- =====================================================
CREATE POLICY "Allow all access to client_routes"
ON client_routes FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- TARIFF_HISTORY POLICIES
-- =====================================================
CREATE POLICY "Allow all access to tariff_history"
ON tariff_history FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- MASTER_CONTROL_SETTINGS POLICIES
-- =====================================================
CREATE POLICY "Allow all access to master_control_settings"
ON master_control_settings FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- DOCUMENTS POLICIES
-- =====================================================
CREATE POLICY "Allow all access to documents"
ON documents FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- DOCUMENT_TYPES POLICIES
-- =====================================================
CREATE POLICY "Allow all access to document_types"
ON document_types FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- AUDIT_LOG POLICIES
-- =====================================================
CREATE POLICY "Allow all access to audit_log"
ON audit_log FOR ALL
USING (true)
WITH CHECK (true);

-- Verify policies are created
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
