-- =====================================================
-- MATANUSKA TARIFF MANAGEMENT SYSTEM
-- Supabase Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION
IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DIESEL PRICE HISTORY TABLE
-- Tracks monthly diesel prices for rate calculations
-- =====================================================
CREATE TABLE diesel_prices
(
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    price_date DATE NOT NULL UNIQUE,
    price_per_liter DECIMAL(10, 4) NOT NULL,
    previous_price DECIMAL(10, 4),
    percentage_change DECIMAL(8, 4),
    notes TEXT,
    created_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    (),
    updated_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    (),
    created_by UUID REFERENCES auth.users
    (id)
);

    -- Index for date-based queries
    CREATE INDEX idx_diesel_prices_date ON diesel_prices(price_date DESC);

    -- =====================================================
    -- CLIENTS TABLE
    -- Master client information
    -- =====================================================
    CREATE TABLE clients
    (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        client_code VARCHAR(20) UNIQUE NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        trading_name VARCHAR(255),
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(20),
        vat_number VARCHAR(50),
        registration_number VARCHAR(50),
        payment_terms INTEGER DEFAULT 30,
        credit_limit DECIMAL(15, 2),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP
        WITH TIME ZONE DEFAULT NOW
        (),
    updated_at TIMESTAMP
        WITH TIME ZONE DEFAULT NOW
        (),
    created_by UUID REFERENCES auth.users
        (id)
);

        -- Index for client lookups
        CREATE INDEX idx_clients_code ON clients(client_code);
        CREATE INDEX idx_clients_active ON clients(is_active);

        -- =====================================================
        -- ROUTES TABLE
        -- Defines transportation routes
        -- =====================================================
        CREATE TABLE routes
        (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            route_code VARCHAR(50) UNIQUE NOT NULL,
            origin VARCHAR(255) NOT NULL,
            destination VARCHAR(255) NOT NULL,
            distance_km DECIMAL(10, 2),
            estimated_hours DECIMAL(6, 2),
            route_description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP
            WITH TIME ZONE DEFAULT NOW
            (),
    updated_at TIMESTAMP
            WITH TIME ZONE DEFAULT NOW
            ()
);

            -- Index for route lookups
            CREATE INDEX idx_routes_code ON routes(route_code);
            CREATE INDEX idx_routes_origin_dest ON routes(origin, destination);

            -- =====================================================
            -- CLIENT ROUTES TABLE
            -- Links clients to their specific routes with pricing
            -- =====================================================
            CREATE TABLE client_routes
            (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
                base_rate DECIMAL(12, 2) NOT NULL,
                current_rate DECIMAL(12, 2) NOT NULL,
                rate_type VARCHAR(50) DEFAULT 'per_ton',
                minimum_charge DECIMAL(12, 2),
                effective_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT true,
                notes TEXT,
                created_at TIMESTAMP
                WITH TIME ZONE DEFAULT NOW
                (),
    updated_at TIMESTAMP
                WITH TIME ZONE DEFAULT NOW
                (),
    UNIQUE
                (client_id, route_id, effective_date)
);

                -- Indexes for client route lookups
                CREATE INDEX idx_client_routes_client ON client_routes(client_id);
                CREATE INDEX idx_client_routes_route ON client_routes(route_id);
                CREATE INDEX idx_client_routes_effective ON client_routes(effective_date DESC);

                -- =====================================================
                -- TARIFF HISTORY TABLE
                -- Maintains historical record of all tariff changes
                -- =====================================================
                CREATE TABLE tariff_history
                (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    client_route_id UUID REFERENCES client_routes(id) ON DELETE CASCADE,
                    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
                    period_month DATE NOT NULL,
                    previous_rate DECIMAL(12, 2),
                    new_rate DECIMAL(12, 2) NOT NULL,
                    diesel_price_at_change DECIMAL(10, 4),
                    diesel_percentage_change DECIMAL(8, 4),
                    adjustment_percentage DECIMAL(8, 4),
                    adjustment_reason TEXT,
                    approved_by UUID REFERENCES auth.users(id),
                    approved_at TIMESTAMP
                    WITH TIME ZONE,
    created_at TIMESTAMP
                    WITH TIME ZONE DEFAULT NOW
                    ()
);

                    -- Indexes for tariff history queries
                    CREATE INDEX idx_tariff_history_client ON tariff_history(client_id);
                    CREATE INDEX idx_tariff_history_route ON tariff_history(client_route_id);
                    CREATE INDEX idx_tariff_history_period ON tariff_history(period_month DESC);

                    -- =====================================================
                    -- MASTER CONTROL SETTINGS TABLE
                    -- System-wide settings for tariff calculations
                    -- =====================================================
                    CREATE TABLE master_control_settings
                    (
                        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                        setting_key VARCHAR(100) UNIQUE NOT NULL,
                        setting_value TEXT NOT NULL,
                        setting_type VARCHAR(50) DEFAULT 'string',
                        description TEXT,
                        updated_at TIMESTAMP
                        WITH TIME ZONE DEFAULT NOW
                        (),
    updated_by UUID REFERENCES auth.users
                        (id)
);

                        -- Insert default settings
                        INSERT INTO master_control_settings
                            (setting_key, setting_value, setting_type, description)
                        VALUES
                            ('base_diesel_price', '21.50', 'decimal', 'Base diesel price for calculations (ZAR per liter)'),
                            ('diesel_impact_percentage', '35', 'decimal', 'Percentage of diesel cost impact on tariffs'),
                            ('auto_adjust_threshold', '2.5', 'decimal', 'Minimum diesel price change (%) to trigger auto-adjustment'),
                            ('max_monthly_increase', '10', 'decimal', 'Maximum allowed monthly rate increase (%)'),
                            ('rounding_precision', '2', 'integer', 'Decimal places for rate calculations'),
                            ('effective_day_of_month', '1', 'integer', 'Day of month when new rates become effective');

                        -- =====================================================
                        -- DOCUMENTS TABLE
                        -- Secure document storage metadata
                        -- =====================================================
                        CREATE TABLE documents
                        (
                            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                            client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                            document_type VARCHAR(50) NOT NULL,
                            document_name VARCHAR(255) NOT NULL,
                            file_path TEXT NOT NULL,
                            file_size INTEGER,
                            mime_type VARCHAR(100),
                            version INTEGER DEFAULT 1,
                            is_current BOOLEAN DEFAULT true,
                            expiry_date DATE,
                            notes TEXT,
                            uploaded_at TIMESTAMP
                            WITH TIME ZONE DEFAULT NOW
                            (),
    uploaded_by UUID REFERENCES auth.users
                            (id)
);

                            -- Indexes for document queries
                            CREATE INDEX idx_documents_client ON documents(client_id);
                            CREATE INDEX idx_documents_type ON documents(document_type);
                            CREATE INDEX idx_documents_current ON documents(is_current);

                            -- =====================================================
                            -- DOCUMENT TYPES REFERENCE TABLE
                            -- =====================================================
                            CREATE TABLE document_types
                            (
                                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                                type_code VARCHAR(50) UNIQUE NOT NULL,
                                type_name VARCHAR(100) NOT NULL,
                                description TEXT,
                                is_required BOOLEAN DEFAULT false,
                                valid_for_days INTEGER,
                                created_at TIMESTAMP
                                WITH TIME ZONE DEFAULT NOW
                                ()
);

                                -- Insert default document types
                                INSERT INTO document_types
                                    (type_code, type_name, description, is_required)
                                VALUES
                                    ('SLA', 'Service Level Agreement', 'Service level agreement between company and client', true),
                                    ('CREDIT_APP', 'Credit Application', 'Client credit application form', true),
                                    ('RATE_CARD', 'Rate Card', 'Official rate card document', true),
                                    ('CONTRACT', 'Contract', 'Master service contract', true),
                                    ('INSURANCE', 'Insurance Certificate', 'Proof of insurance coverage', false),
                                    ('TAX_CERT', 'Tax Clearance Certificate', 'SARS tax clearance certificate', false),
                                    ('BEE_CERT', 'BEE Certificate', 'Broad-Based Black Economic Empowerment certificate', false),
                                    ('OTHER', 'Other Document', 'Miscellaneous documents', false);

                                -- =====================================================
                                -- AUDIT LOG TABLE
                                -- Tracks all significant changes in the system
                                -- =====================================================
                                CREATE TABLE audit_log
                                (
                                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                                    table_name VARCHAR(100) NOT NULL,
                                    record_id UUID NOT NULL,
                                    action VARCHAR(50) NOT NULL,
                                    old_values JSONB,
                                    new_values JSONB,
                                    user_id UUID REFERENCES auth.users(id),
                                    ip_address INET,
                                    user_agent TEXT,
                                    created_at TIMESTAMP
                                    WITH TIME ZONE DEFAULT NOW
                                    ()
);

                                    -- Index for audit queries
                                    CREATE INDEX idx_audit_log_table ON audit_log(table_name);
                                    CREATE INDEX idx_audit_log_record ON audit_log(record_id);
                                    CREATE INDEX idx_audit_log_user ON audit_log(user_id);
                                    CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

                                    -- =====================================================
                                    -- FUNCTIONS AND TRIGGERS
                                    -- =====================================================

                                    -- Function to update updated_at timestamp
                                    CREATE OR REPLACE FUNCTION update_updated_at_column
                                    ()
RETURNS TRIGGER AS $$
                                    BEGIN
    NEW.updated_at = NOW
                                    ();
                                    RETURN NEW;
                                    END;
$$ language 'plpgsql';

                                    -- Apply updated_at trigger to relevant tables
                                    CREATE TRIGGER update_diesel_prices_updated_at
    BEFORE
                                    UPDATE ON diesel_prices
    FOR EACH ROW
                                    EXECUTE FUNCTION update_updated_at_column
                                    ();

                                    CREATE TRIGGER update_clients_updated_at
    BEFORE
                                    UPDATE ON clients
    FOR EACH ROW
                                    EXECUTE FUNCTION update_updated_at_column
                                    ();

                                    CREATE TRIGGER update_routes_updated_at
    BEFORE
                                    UPDATE ON routes
    FOR EACH ROW
                                    EXECUTE FUNCTION update_updated_at_column
                                    ();

                                    CREATE TRIGGER update_client_routes_updated_at
    BEFORE
                                    UPDATE ON client_routes
    FOR EACH ROW
                                    EXECUTE FUNCTION update_updated_at_column
                                    ();

                                    CREATE TRIGGER update_master_control_updated_at
    BEFORE
                                    UPDATE ON master_control_settings
    FOR EACH ROW
                                    EXECUTE FUNCTION update_updated_at_column
                                    ();

                                    -- Function to calculate percentage change for diesel prices
                                    CREATE OR REPLACE FUNCTION calculate_diesel_percentage_change
                                    ()
RETURNS TRIGGER AS $$
                                    DECLARE
    prev_price DECIMAL
                                    (10, 4);
                                    BEGIN
                                        SELECT price_per_liter
                                        INTO prev_price
                                        FROM diesel_prices
                                        WHERE price_date < NEW.price_date
                                        ORDER BY price_date DESC
    LIMIT 1;
    
    IF prev_price
                                        IS NOT NULL THEN
        NEW.previous_price = prev_price;
                                    NEW.percentage_change =
                                    ((NEW.price_per_liter - prev_price) / prev_price) * 100;
                                    END
                                    IF;
    
    RETURN NEW;
                                    END;
$$ language 'plpgsql';

                                    CREATE TRIGGER calculate_diesel_change
    BEFORE
                                    INSERT ON
                                    diesel_prices
                                    FOR
                                    EACH
                                    ROW
                                    EXECUTE FUNCTION calculate_diesel_percentage_change
                                    ();

                                    -- Function to calculate adjusted rate based on diesel price change
                                    CREATE OR REPLACE FUNCTION calculate_adjusted_rate
                                    (
    base_rate DECIMAL,
    diesel_change_percent DECIMAL,
    diesel_impact_percent DECIMAL DEFAULT 35
)
RETURNS DECIMAL AS $$
                                    BEGIN
                                        RETURN base_rate * (1 + (diesel_change_percent / 100) * (diesel_impact_percent / 100));
                                    END;
                                    $$ LANGUAGE plpgsql;

                                    -- =====================================================
                                    -- ROW LEVEL SECURITY (RLS) POLICIES
                                    -- =====================================================

                                    -- Enable RLS on all tables
                                    ALTER TABLE diesel_prices ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE client_routes ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE tariff_history ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE master_control_settings ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
                                    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

                                    -- Policies for authenticated users (adjust based on your auth requirements)
                                    CREATE POLICY "Allow authenticated read access to diesel_prices"
    ON diesel_prices FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated insert to diesel_prices"
    ON diesel_prices FOR
                                    INSERT
    TO authenticated
    WITH CHECK (
                                    true);

                                    CREATE POLICY "Allow authenticated update to diesel_prices"
    ON diesel_prices FOR
                                    UPDATE
    TO authenticated
    USING (true);

                                    CREATE POLICY "Allow authenticated read access to clients"
    ON clients FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated all access to clients"
    ON clients FOR ALL
    TO authenticated
    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated read access to routes"
    ON routes FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated all access to routes"
    ON routes FOR ALL
    TO authenticated
    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated read access to client_routes"
    ON client_routes FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated all access to client_routes"
    ON client_routes FOR ALL
    TO authenticated
    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated read access to tariff_history"
    ON tariff_history FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated insert to tariff_history"
    ON tariff_history FOR
                                    INSERT
    TO authenticated
    WITH CHECK (
                                    true);

                                    CREATE POLICY "Allow authenticated read access to master_control_settings"
    ON master_control_settings FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated update to master_control_settings"
    ON master_control_settings FOR
                                    UPDATE
    TO authenticated
    USING (true);

                                    CREATE POLICY "Allow authenticated read access to documents"
    ON documents FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated all access to documents"
    ON documents FOR ALL
    TO authenticated
    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated read access to document_types"
    ON document_types FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated read access to audit_log"
    ON audit_log FOR
                                    SELECT
                                        TO authenticated
                                    USING
                                    (true);

                                    CREATE POLICY "Allow authenticated insert to audit_log"
    ON audit_log FOR
                                    INSERT
    TO authenticated
    WITH CHECK (
                                    true);

                                    -- =====================================================
                                    -- STORAGE BUCKET SETUP (Run in Supabase Dashboard)
                                    -- =====================================================
                                    -- Note: Storage buckets should be created via Supabase Dashboard or API
                                    -- Bucket name: 'documents'
                                    -- Policy: Authenticated users can read/write their organization's documents

                                    -- =====================================================
                                    -- VIEWS FOR REPORTING
                                    -- =====================================================

                                    -- View: Current client rates with route details
                                    CREATE OR REPLACE VIEW v_current_client_rates AS
                                    SELECT
                                        c.id AS client_id,
                                        c.client_code,
                                        c.company_name,
                                        r.id AS route_id,
                                        r.route_code,
                                        r.origin,
                                        r.destination,
                                        r.distance_km,
                                        cr.id AS client_route_id,
                                        cr.base_rate,
                                        cr.current_rate,
                                        cr.rate_type,
                                        cr.minimum_charge,
                                        cr.effective_date,
                                        cr.is_active
                                    FROM clients c
                                        JOIN client_routes cr ON c.id = cr.client_id
                                        JOIN routes r ON cr.route_id = r.id
                                    WHERE cr.is_active = true AND c.is_active = true;

                                    -- View: Diesel price trend analysis
                                    CREATE OR REPLACE VIEW v_diesel_price_trend AS
                                    SELECT
                                        price_date,
                                        price_per_liter,
                                        previous_price,
                                        percentage_change,
                                        AVG(price_per_liter) OVER (ORDER BY price_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg_3m,
                                        AVG(price_per_liter) OVER (ORDER BY price_date ROWS BETWEEN 5 PRECEDING AND CURRENT ROW) AS moving_avg_6m
                                    FROM diesel_prices
                                    ORDER BY price_date DESC;

                                    -- View: Client document status
                                    CREATE OR REPLACE VIEW v_client_document_status AS
                                    SELECT
                                        c.id AS client_id,
                                        c.client_code,
                                        c.company_name,
                                        dt.type_code,
                                        dt.type_name,
                                        dt.is_required,
                                        d.id AS document_id,
                                        d.document_name,
                                        d.uploaded_at,
                                        d.expiry_date,
                                        CASE 
        WHEN d.id IS NULL AND dt.is_required THEN 'Missing'
        WHEN d.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN d.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS status
                                    FROM clients c
CROSS JOIN document_types dt
                                        LEFT JOIN documents d ON c.id = d.client_id AND dt.type_code = d.document_type AND d.is_current = true
                                    WHERE c.is_active = true;
