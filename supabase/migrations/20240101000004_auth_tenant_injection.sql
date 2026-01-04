-- Migration: Auth Trigger for Tenant ID Injection into JWT
-- Requirements: 1.3, 13.1, 13.2

-- ============================================
-- FUNCTION: Inject tenant_id into JWT app_metadata on login
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_login()
RETURNS TRIGGER AS $$
DECLARE
  user_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO user_tenant_id
  FROM public.user_tenants
  WHERE user_id = NEW.id
  ORDER BY created_at ASC
  LIMIT 1;

  IF user_tenant_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('tenant_id', user_tenant_id::text)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Execute on user sign-in
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_auth_user_login();

-- ============================================
-- FUNCTION: Handle new user registration
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Refresh user tenant claim
-- ============================================

CREATE OR REPLACE FUNCTION public.refresh_user_tenant_claim(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO user_tenant_id
  FROM public.user_tenants
  WHERE user_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF user_tenant_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('tenant_id', user_tenant_id::text)
    WHERE id = p_user_id;
  ELSE
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) - 'tenant_id'
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-refresh tenant claim
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_user_tenant_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_user_tenant_claim(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.refresh_user_tenant_claim(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_tenant_change ON public.user_tenants;

CREATE TRIGGER on_user_tenant_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_tenant_change();

GRANT EXECUTE ON FUNCTION public.refresh_user_tenant_claim(UUID) TO authenticated;
