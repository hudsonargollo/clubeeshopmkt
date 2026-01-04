-- Migration: Atomic Stock Management RPCs
-- Requirements: 5.1, 5.2, 5.3, 5.4

-- ============================================
-- DECREMENT_STOCK RPC FUNCTION
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
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  UPDATE inventory
  SET stock = stock - p_quantity,
      updated_at = NOW()
  WHERE id = p_item_id
    AND tenant_id = p_tenant_id
    AND stock >= p_quantity;
  
  RETURN FOUND;
END;
$$;

-- ============================================
-- INCREMENT_STOCK RPC FUNCTION
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
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  UPDATE inventory
  SET stock = stock + p_quantity,
      updated_at = NOW()
  WHERE id = p_item_id
    AND tenant_id = p_tenant_id;
  
  RETURN FOUND;
END;
$$;

-- ============================================
-- SET_STOCK RPC FUNCTION
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
  IF p_quantity < 0 THEN
    RAISE EXCEPTION 'Quantity cannot be negative';
  END IF;

  UPDATE inventory
  SET stock = p_quantity,
      updated_at = NOW()
  WHERE id = p_item_id
    AND tenant_id = p_tenant_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_stock(UUID, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_stock(UUID, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_stock(UUID, INT, UUID) TO authenticated;

COMMENT ON FUNCTION decrement_stock IS 'Atomically decrements inventory stock.';
COMMENT ON FUNCTION increment_stock IS 'Atomically increments inventory stock.';
COMMENT ON FUNCTION set_stock IS 'Atomically sets inventory stock.';
