-- Migration: Auth Trigger for Tenant ID Injection into JWT
-- Requirements: 1.3, 13.1, 13.2

-- ============================================
-- FUNCTION: Inject tenant_id into JWT app_metadata on login
-- This function is called by Supabase Auth after successful authentication
-- It looks up the user's tenant assignment and injects it into the JWT
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_login()
RETURNS TRIGGER AS $
DECLARE
  user_tenant_id UUID;
BEGIN
  -- Look up the user's primary tenant from user_tenants table
  -- If user belongs to multiple tenants, we take the first one
  -- (In a more complex system, you might want to let users select)
  SELECT tenant_id INTO user_tenant_id
  FROM public.user_tenants
  WHERE user_id = NEW.id
  ORDER BY created_at ASC
  LIMIT 1;

  -- If user has a tenant assignment, inject it into app_metadata
  IF user_tenant_id IS NOT NULL THEN
    -- Update the user's raw_app_meta_data with tenant_id
    -- This will be included in the JWT on next token refresh
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('tenant_id', user_tenant_id::text)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Execute on user sign-in (last_sign_in_at update)
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

-- Create trigger that fires when last_sign_in_at is updated (i.e., on login)
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_auth_user_login();

-- ============================================
-- FUNCTION: Handle new user registration
-- Optionally assign to a default tenant or leave unassigned
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  -- New users start without a tenant assignment
  -- They must be explicitly added to a tenant by an admin
  -- or through an invitation flow
  
  -- If you want to assign new users to a default tenant, uncomment:
  -- INSERT INTO public.user_tenants (user_id, tenant_id, role)
  -- SELECT NEW.id, id, 'member'
  -- FROM public.tenants
  -- WHERE subdomain = 'default'
  -- LIMIT 1;

  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Execute on new user creation
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Update tenant_id in JWT when user's tenant changes
-- Call this when adding/removing user from tenant
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_user_tenant_claim(p_user_id UUID)
RETURNS VOID AS $
DECLARE
  user_tenant_id UUID;
BEGIN
  -- Get the user's current primary tenant
  SELECT tenant_id INTO user_tenant_id
  FROM public.user_tenants
  WHERE user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- Update the user's app_metadata
  IF user_tenant_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('tenant_id', user_tenant_id::text)
    WHERE id = p_user_id;
  ELSE
    -- Remove tenant_id if user has no tenant assignments
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) - 'tenant_id'
    WHERE id = p_user_id;
  END IF;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-refresh tenant claim when user_tenants changes
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_user_tenant_change()
RETURNS TRIGGER AS $
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_user_tenant_claim(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_user_tenant_claim(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_tenant_change ON public.user_tenants;

-- Create trigger for user_tenants changes
CREATE TRIGGER on_user_tenant_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_tenant_change();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Allow authenticated users to call refresh function (for self-service tenant switching)
GRANT EXECUTE ON FUNCTION public.refresh_user_tenant_claim(UUID) TO authenticated;
