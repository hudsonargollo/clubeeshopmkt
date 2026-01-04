-- Migration: Row Level Security Policies for Multi-Tenant Isolation
-- Requirements: 1.2, 1.4

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TENANT TABLES
-- ============================================
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get current user's tenant_id from JWT
-- ============================================
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INVENTORY TABLE RLS POLICIES
-- ============================================

-- Policy: Users can only SELECT inventory items from their tenant
CREATE POLICY "tenant_isolation_select" ON inventory
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- Policy: Users can only INSERT inventory items for their tenant
CREATE POLICY "tenant_isolation_insert" ON inventory
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Policy: Users can only UPDATE inventory items from their tenant
CREATE POLICY "tenant_isolation_update" ON inventory
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Policy: Users can only DELETE inventory items from their tenant
CREATE POLICY "tenant_isolation_delete" ON inventory
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());


-- ============================================
-- ORDERS TABLE RLS POLICIES
-- ============================================

-- Policy: Users can only SELECT orders from their tenant
CREATE POLICY "tenant_isolation_select" ON orders
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

-- Policy: Users can only INSERT orders for their tenant
CREATE POLICY "tenant_isolation_insert" ON orders
  FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Policy: Users can only UPDATE orders from their tenant
CREATE POLICY "tenant_isolation_update" ON orders
  FOR UPDATE
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- Policy: Users can only DELETE orders from their tenant
CREATE POLICY "tenant_isolation_delete" ON orders
  FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- ============================================
-- ORDER_ITEMS TABLE RLS POLICIES
-- Uses join to orders table to determine tenant
-- ============================================

-- Policy: Users can only SELECT order_items from orders in their tenant
CREATE POLICY "tenant_isolation_select" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = get_current_tenant_id()
    )
  );

-- Policy: Users can only INSERT order_items for orders in their tenant
CREATE POLICY "tenant_isolation_insert" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = get_current_tenant_id()
    )
  );

-- Policy: Users can only UPDATE order_items from orders in their tenant
CREATE POLICY "tenant_isolation_update" ON order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = get_current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = get_current_tenant_id()
    )
  );

-- Policy: Users can only DELETE order_items from orders in their tenant
CREATE POLICY "tenant_isolation_delete" ON order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.tenant_id = get_current_tenant_id()
    )
  );

-- ============================================
-- USER_TENANTS TABLE RLS POLICIES
-- ============================================

-- Policy: Users can only see their own tenant associations
CREATE POLICY "user_can_see_own_tenants" ON user_tenants
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Only allow inserts through service role (admin operations)
-- Regular users cannot add themselves to tenants
CREATE POLICY "service_role_insert" ON user_tenants
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Only allow updates through service role
CREATE POLICY "service_role_update" ON user_tenants
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Only allow deletes through service role
CREATE POLICY "service_role_delete" ON user_tenants
  FOR DELETE
  USING (auth.role() = 'service_role');
