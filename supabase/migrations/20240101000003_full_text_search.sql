-- Migration: Full-Text Search Index on Inventory
-- Requirements: 10.1

-- ============================================
-- ADD FTS TSVECTOR GENERATED COLUMN
-- ============================================
-- This column automatically updates when name, category, or barcode changes
ALTER TABLE inventory ADD COLUMN fts tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    COALESCE(barcode, '')
  )
) STORED;

-- ============================================
-- CREATE GIN INDEX FOR FAST FTS QUERIES
-- ============================================
CREATE INDEX idx_inventory_fts ON inventory USING GIN (fts);

-- ============================================
-- HELPER FUNCTION: Search inventory with FTS
-- ============================================
CREATE OR REPLACE FUNCTION search_inventory(
  search_query TEXT,
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  barcode TEXT,
  name TEXT,
  category TEXT,
  stock INTEGER,
  price DECIMAL(10, 2),
  image_url TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.tenant_id,
    i.barcode,
    i.name,
    i.category,
    i.stock,
    i.price,
    i.image_url,
    ts_rank(i.fts, plainto_tsquery('english', search_query)) AS rank
  FROM inventory i
  WHERE i.tenant_id = p_tenant_id
    AND i.fts @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
