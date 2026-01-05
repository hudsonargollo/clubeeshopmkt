-- Migration: SaaS Expansion - Categories Table and Inventory Updates
-- Requirements: 5.1, 5.2, 6.1, 6.2, 6.3

-- ============================================
-- CATEGORIES TABLE
-- ============================================
-- Requirements 5.1, 5.2: Categories table with tenant isolation
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT categories_tenant_slug_unique UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_categories_tenant_id ON categories(tenant_id);

-- ============================================
-- CATEGORIES RLS POLICIES
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT categories from their tenant
CREATE POLICY "tenant_isolation_select" ON categories
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- Policy: Users can only INSERT categories for their tenant
CREATE POLICY "tenant_isolation_insert" ON categories
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Policy: Users can only UPDATE categories from their tenant
CREATE POLICY "tenant_isolation_update" ON categories
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Policy: Users can only DELETE categories from their tenant
CREATE POLICY "tenant_isolation_delete" ON categories
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- ============================================
-- INVENTORY TABLE UPDATES
-- ============================================
-- Requirement 6.1: Add type column with CHECK constraint
ALTER TABLE inventory 
  ADD COLUMN type TEXT DEFAULT 'physical' 
  CHECK (type IN ('physical', 'service'));

-- Requirement 6.2: Add description column
ALTER TABLE inventory 
  ADD COLUMN description TEXT;

-- Requirement 6.3: Add category_id column with FK to categories
ALTER TABLE inventory 
  ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index on category_id for efficient joins
CREATE INDEX idx_inventory_category_id ON inventory(category_id);

-- ============================================
-- UPDATE FTS INDEX TO INCLUDE DESCRIPTION
-- ============================================
-- Drop existing FTS column and recreate with description included
ALTER TABLE inventory DROP COLUMN IF EXISTS fts;

ALTER TABLE inventory ADD COLUMN fts tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(barcode, '')
  )
) STORED;

-- Recreate GIN index for FTS
CREATE INDEX idx_inventory_fts ON inventory USING GIN (fts);

-- ============================================
-- UPDATE SEARCH FUNCTION TO INCLUDE NEW FIELDS
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
  description TEXT,
  type TEXT,
  category_id UUID,
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
    i.description,
    i.type,
    i.category_id,
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
