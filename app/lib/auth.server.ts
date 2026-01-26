/**
 * Server-side authentication utilities
 * Requirements: 5.2, 5.3, 5.4, 5.6
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * User tenant information
 */
export interface UserTenant {
  tenant_id: string;
  role: string;
}

/**
 * Determines the redirect path based on user's tenant count and role
 * Requirements: 5.2, 5.3, 5.4, 5.6
 * 
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID from authentication
 * @param userEmail - User email address
 * @returns Redirect path (/portal, /onboarding, or /backoffice)
 */
export async function getPostAuthRedirect(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<string> {
  try {
    console.log('Getting post-auth redirect for user:', userId, userEmail);
    
    // Check if user is superadmin (Requirement 5.2)
    const isSuperAdmin = userEmail === 'cavernacentral2@gmail.com';
    
    if (isSuperAdmin) {
      console.log('User is superadmin, redirecting to portal');
      return '/portal';
    }

    // For regular users, check their tenant assignments (Requirement 5.6)
    const { data: userTenants, error } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user tenants:', error);
      // If there's an error, send new users to onboarding (safe default)
      console.log('Database error, defaulting to onboarding');
      return '/onboarding';
    }

    const tenantCount = userTenants?.length ?? 0;
    console.log('User has', tenantCount, 'tenant assignments:', userTenants);

    // Requirement 5.3: New user with 0 tenants → /onboarding
    if (tenantCount === 0) {
      console.log('No tenants found, redirecting to onboarding');
      return '/onboarding';
    } else {
      // Requirement 5.4: User with 1+ tenants → /backoffice
      console.log('User has tenants, redirecting to backoffice');
      return '/backoffice';
    }
  } catch (error) {
    console.error('Unexpected error in getPostAuthRedirect:', error);
    return '/onboarding';
  }
}

/**
 * Determines redirect path based on tenant count (for testing)
 * This is a pure function version for easier unit testing
 * 
 * @param tenantCount - Number of tenants user has
 * @param userEmail - User email address
 * @returns Redirect path
 */
export function determineRedirectPath(
  tenantCount: number,
  userEmail: string
): string {
  // Check if superadmin
  if (userEmail === 'cavernacentral2@gmail.com') {
    return '/portal';
  }
  
  // Route based on tenant count
  if (tenantCount === 0) {
    return '/onboarding';
  } else {
    return '/backoffice';
  }
}
