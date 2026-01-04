-- Migration: Atomic Stock Management RPCs
-- Requirements: 5.1, 5.2, 5.3, 5.4

-- ============================================
-- DECREMENT_STOCK RPC FUNCTION
-- Atomically decrements stock if sufficient quantity exists
-- Returns TRUE if successful, FALSE if insufficient stock
-- ============================================
CREATE OR REPLACE FUNCTION decrement_stock(
  p_item_id UUID,
  p_quantity INT,
  p_tenant_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate quantity is positive
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  -- Atomic check-and-update: only succeeds if stock >= quantity
  UPDATE inventory
  SET stock = stock - p_quantity,
      updated_at = NOW()
  WHERE id = p_item_id
    AND tenant_id = p_tenant_id
    AND stock >= p_quantity;
  
  -- FOUND is TRUE if the UPDATE affected any rows
  RETURN FOUND;
END;
$$;

-- ============================================
-- INCREMENT_STOCK RPC FUNCTION
-- Atomically increments stock for an inventory item
-- Returns TRUE if successful, FALSE if item not found
-- ============================================
CREATE OR REPLACE FUNCTION increment_stock(
  p_item_id UUID,
  p_quantity INT,
  p_tenant_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate quantity is positive
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  -- Atomic increment
  UPDATE inventory
  SET stock = stock + p_quantity,
      updated_at = NOW()
  WHERE id = p_item_id
    AND tenant_id = p_tenant_id;
  
  -- FOUND is TRUE if the UPDATE affected any rows
  RETURN FOUND;
END;
$$;

-- ============================================
-- SET_STOCK RPC FUNCTION
-- Atomically sets stock to a specific value
-- Returns TRUE if successful, FALSE if item not found
-- ============================================
CREATE OR REPLACE FUNCTION set_stock(
  p_item_id UUID,
  p_quantity INT,
  p_tenant_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate quantity is non-negative
  IF p_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;

  -- Atomic set
  UPDATE inventory
  SET stock = p_quantity,
      updated_at = NOW()
  WHERE id = p_item_id
    AND tenant_id = p_tenant_id;
  
  -- FOUND is TRUE if the UPDATE affected any rows
  RETURN FOUND;
END;
$$;

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- Allow authenticated users to call these functions
-- ============================================
GRANT EXECUTE ON FUNCTION decrement_stock(UUID, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_stock(UUID, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_stock(UUID, INT, UUID) TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON FUNCTION decrement_stock IS 'Atomically decrements inventory stock. Returns TRUE if successful, FALSE if insufficient stock or item not found.';
COMMENT ON FUNCTION increment_stock IS 'Atomically increments inventory stock. Returns TRUE if successful, FALSE if item not found.';
COMMENT ON FUNCTION set_stock IS 'Atomically sets inventory stock to a specific value. Returns TRUE if successful, FALSE if item not found.';
