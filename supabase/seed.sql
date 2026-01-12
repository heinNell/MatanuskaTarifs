-- =====================================================
-- SAMPLE DATA FOR MATANUSKA TARIFF MANAGEMENT SYSTEM
-- =====================================================

-- Sample Diesel Prices (12 months of historical data)
INSERT INTO diesel_prices
    (price_date, price_per_liter, notes)
VALUES
    ('2025-01-01', 21.50, 'January 2025 - Base price'),
    ('2025-02-01', 21.85, 'February 2025 - Slight increase'),
    ('2025-03-01', 22.10, 'March 2025 - Continued increase'),
    ('2025-04-01', 21.95, 'April 2025 - Minor decrease'),
    ('2025-05-01', 22.30, 'May 2025 - Upward trend'),
    ('2025-06-01', 22.75, 'June 2025 - Summer demand'),
    ('2025-07-01', 23.10, 'July 2025 - Peak summer'),
    ('2025-08-01', 22.90, 'August 2025 - Slight decrease'),
    ('2025-09-01', 22.65, 'September 2025 - Stabilizing'),
    ('2025-10-01', 22.80, 'October 2025 - Minor increase'),
    ('2025-11-01', 23.15, 'November 2025 - Winter approach'),
    ('2025-12-01', 23.45, 'December 2025 - Year end'),
    ('2026-01-01', 23.75, 'January 2026 - New year adjustment');

-- Sample Routes
INSERT INTO routes
    (route_code, origin, destination, distance_km, estimated_hours, route_description)
VALUES
    ('JHB-CPT', 'Johannesburg', 'Cape Town', 1400, 16, 'Main N1 highway route'),
    ('JHB-DBN', 'Johannesburg', 'Durban', 580, 6, 'N3 highway route'),
    ('JHB-PE', 'Johannesburg', 'Port Elizabeth', 1050, 11, 'Via N10 highway'),
    ('JHB-BFN', 'Johannesburg', 'Bloemfontein', 400, 4, 'N1 south route'),
    ('CPT-PE', 'Cape Town', 'Port Elizabeth', 750, 8, 'N2 coastal route'),
    ('DBN-PE', 'Durban', 'Port Elizabeth', 930, 10, 'N2 coastal highway'),
    ('JHB-PTR', 'Johannesburg', 'Pretoria', 60, 1, 'N1 north short haul'),
    ('CPT-GRJ', 'Cape Town', 'George', 430, 5, 'N2 Garden Route'),
    ('JHB-NEL', 'Johannesburg', 'Nelspruit', 330, 4, 'N4 east route'),
    ('DBN-JHB', 'Durban', 'Johannesburg', 580, 6, 'N3 return route');

-- Sample Clients
INSERT INTO clients
    (client_code, company_name, trading_name, contact_person, email, phone, address, city, province, postal_code, vat_number, payment_terms, credit_limit)
VALUES
    ('CLI001', 'ABC Manufacturing (Pty) Ltd', 'ABC Manufacturing', 'John Smith', 'john@abcmfg.co.za', '+27 11 555 1234', '123 Industrial Road', 'Johannesburg', 'Gauteng', '2000', '4123456789', 30, 500000.00),
    ('CLI002', 'Cape Foods International', 'Cape Foods', 'Sarah Johnson', 'sarah@capefoods.co.za', '+27 21 555 5678', '45 Harbour Street', 'Cape Town', 'Western Cape', '8001', '4234567890', 30, 750000.00),
    ('CLI003', 'Durban Chemical Supplies', 'DCS', 'Mike Williams', 'mike@dcs.co.za', '+27 31 555 9012', '78 Port Road', 'Durban', 'KwaZulu-Natal', '4001', '4345678901', 45, 1000000.00),
    ('CLI004', 'Eastern Province Distributors', 'EP Distributors', 'Lisa Brown', 'lisa@epdist.co.za', '+27 41 555 3456', '234 Main Street', 'Port Elizabeth', 'Eastern Cape', '6001', '4456789012', 30, 350000.00),
    ('CLI005', 'Gauteng Steel Works', 'GSW', 'David Miller', 'david@gsw.co.za', '+27 12 555 7890', '567 Steel Avenue', 'Pretoria', 'Gauteng', '0001', '4567890123', 60, 2000000.00),
    ('CLI006', 'Free State Agri Holdings', 'FS Agri', 'Emma Davis', 'emma@fsagri.co.za', '+27 51 555 2345', '89 Farm Road', 'Bloemfontein', 'Free State', '9300', '4678901234', 30, 600000.00),
    ('CLI007', 'Lowveld Timber Products', 'LTP', 'James Wilson', 'james@ltp.co.za', '+27 13 555 6789', '12 Forest Lane', 'Nelspruit', 'Mpumalanga', '1200', '4789012345', 30, 450000.00),
    ('CLI008', 'Garden Route Retail Group', 'GR Retail', 'Anna Thompson', 'anna@grretail.co.za', '+27 44 555 0123', '56 George Street', 'George', 'Western Cape', '6530', '4890123456', 30, 300000.00);

-- Sample Client Routes with Base Rates
-- ABC Manufacturing routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 4500.00, 4950.00, 'per_load', 2500.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI001' AND r.route_code = 'JHB-CPT';

INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 2200.00, 2420.00, 'per_load', 1500.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI001' AND r.route_code = 'JHB-DBN';

-- Cape Foods routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 4500.00, 4950.00, 'per_load', 2500.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI002' AND r.route_code = 'JHB-CPT';

INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 2800.00, 3080.00, 'per_load', 1800.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI002' AND r.route_code = 'CPT-PE';

-- Durban Chemical routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 2400.00, 2640.00, 'per_load', 1600.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI003' AND r.route_code = 'JHB-DBN';

INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 3500.00, 3850.00, 'per_load', 2000.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI003' AND r.route_code = 'DBN-PE';

-- EP Distributors routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 3800.00, 4180.00, 'per_load', 2200.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI004' AND r.route_code = 'JHB-PE';

INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 2800.00, 3080.00, 'per_load', 1800.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI004' AND r.route_code = 'CPT-PE';

-- Gauteng Steel Works routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 450.00, 495.00, 'per_ton', 5000.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI005' AND r.route_code = 'JHB-PTR';

INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 1500.00, 1650.00, 'per_ton', 8000.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI005' AND r.route_code = 'JHB-DBN';

-- Free State Agri routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 1600.00, 1760.00, 'per_load', 1200.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI006' AND r.route_code = 'JHB-BFN';

-- Lowveld Timber routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 1400.00, 1540.00, 'per_load', 1000.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI007' AND r.route_code = 'JHB-NEL';

-- Garden Route Retail routes
INSERT INTO client_routes
    (client_id, route_id, base_rate, current_rate, rate_type, minimum_charge, effective_date)
SELECT c.id, r.id, 1800.00, 1980.00, 'per_load', 1200.00, '2026-01-01'
FROM clients c, routes r
WHERE c.client_code = 'CLI008' AND r.route_code = 'CPT-GRJ';

-- Sample Tariff History
INSERT INTO tariff_history
    (client_route_id, client_id, route_id, period_month, previous_rate, new_rate, diesel_price_at_change, diesel_percentage_change, adjustment_percentage, adjustment_reason)
SELECT
    cr.id, cr.client_id, cr.route_id,
    '2025-07-01', cr.base_rate, cr.base_rate * 1.05,
    23.10, 3.5, 5.0, 'Monthly diesel price adjustment'
FROM client_routes cr
LIMIT 5;

INSERT INTO tariff_history
    (client_route_id, client_id, route_id, period_month, previous_rate, new_rate, diesel_price_at_change, diesel_percentage_change, adjustment_percentage, adjustment_reason)
SELECT
    cr.id, cr.client_id, cr.route_id,
    '2025-10-01', cr.base_rate * 1.05, cr.base_rate * 1.08,
    22.80, 2.2, 3.0, 'Quarterly rate review'
FROM client_routes cr
LIMIT 5;

INSERT INTO tariff_history
    (client_route_id, client_id, route_id, period_month, previous_rate, new_rate, diesel_price_at_change, diesel_percentage_change, adjustment_percentage, adjustment_reason)
SELECT
    cr.id, cr.client_id, cr.route_id,
    '2026-01-01', cr.base_rate * 1.08, cr.current_rate,
    23.75, 3.9, 2.0, 'Annual rate adjustment'
FROM client_routes cr
LIMIT 5;
