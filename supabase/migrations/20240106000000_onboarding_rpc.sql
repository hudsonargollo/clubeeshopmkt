-- Migration: Onboarding RPC Function
-- Allows authenticated users to create their first tenant and user_tenant relationship

-- ============================================
-- ONBOARDING RPC FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_user_tenant(
  p_tenant_name TEXT,
  p_subdomain TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  current_user_id UUID;
  new_tenant_id UUID;
  existing_tenant_count INT;
  result JSON;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if user already has tenants (prevent multiple tenant creation)
  SELECT COUNT(*) INTO existing_tenant_count
  FROM user_tenants
  WHERE user_id = current_user_id;

  IF existing_tenant_count > 0 THEN
    RAISE EXCEPTION 'User already has a tenant';
  END IF;

  -- Validate inputs
  IF p_tenant_name IS NULL OR LENGTH(TRIM(p_tenant_name)) < 2 THEN
    RAISE EXCEPTION 'Tenant name must be at least 2 characters';
  END IF;

  IF p_subdomain IS NULL OR LENGTH(TRIM(p_subdomain)) < 3 THEN
    RAISE EXCEPTION 'Subdomain must be at least 3 characters';
  END IF;

  IF NOT p_subdomain ~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Subdomain can only contain lowercase letters, numbers, and hyphens';
  END IF;

  -- Check subdomain uniqueness
  IF EXISTS (SELECT 1 FROM tenants WHERE subdomain = LOWER(TRIM(p_subdomain))) THEN
    RAISE EXCEPTION 'Subdomain already exists';
  END IF;

  -- Create tenant
  INSERT INTO tenants (name, subdomain, settings)
  VALUES (TRIM(p_tenant_name), LOWER(TRIM(p_subdomain)), '{}')
  RETURNING id INTO new_tenant_id;

  -- Create user_tenant relationship (this bypasses RLS because function is SECURITY DEFINER)
  INSERT INTO user_tenants (user_id, tenant_id, role)
  VALUES (current_user_id, new_tenant_id, 'owner');

  -- Update user's JWT with tenant_id
  PERFORM refresh_user_tenant_claim(current_user_id);

  -- Return success result
  result := json_build_object(
    'success', true,
    'tenant_id', new_tenant_id,
    'subdomain', LOWER(TRIM(p_subdomain)),
    'message', 'Tenant created successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Clean up tenant if user_tenant creation failed
    DELETE FROM tenants WHERE id = new_tenant_id;
    
    -- Return error result
    result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    
    RETURN result;
END;
$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_tenant(TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION create_user_tenant IS 'Creates a new tenant and associates the current user as owner. Can only be called once per user.';