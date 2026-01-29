-- Add route_description column to client_routes table
-- This allows each client-route assignment to have its own comments/description
-- separate from the route's generic description

ALTER TABLE client_routes 
ADD COLUMN
IF NOT EXISTS route_description TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN client_routes.route_description IS 'Client-specific route description/comments that override or supplement the route default description';

-- Remove the unique constraint on (client_id, route_id, effective_date) to allow multiple routes with different descriptions
-- First drop the existing constraint
ALTER TABLE client_routes DROP CONSTRAINT IF EXISTS client_routes_client_id_route_id_effective_date_key;

-- Note: If you want to keep some uniqueness, you could add a new constraint that includes route_description
-- But for flexibility, we're leaving it without a unique constraint for now
