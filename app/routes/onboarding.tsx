/**
 * Onboarding Page
 * Allows new users to create their shop (tenant) after OAuth signup
 * Requirements: 3.2, 3.3, 3.4, 3.5, 11.2
 */

import { useState, useEffect, useCallback } from 'react';
import type { MetaFunction, ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useActionData, useNavigation, Form, useLoaderData } from '@remix-run/react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Store, Loader2, AlertCircle, CheckCircle, Globe } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Create Your Shop - ClubeeShopMkt' },
    { name: 'description', content: 'Set up your shop in seconds' },
  ];
};

interface LoaderData {
  baseDomain: string;
}

interface ActionData {
  error?: string;
  fieldErrors?: {
    shopName?: string;
    subdomain?: string;
  };
  success?: boolean;
}

/**
 * Loader to get base domain for subdomain preview
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const baseDomain = url.hostname.replace(/^[^.]+\./, '') || 'clubeeshop.com';
  
  return json<LoaderData>({
    baseDomain: baseDomain === 'localhost' ? 'clubeeshop.com' : baseDomain,
  });
}

/**
 * Action to create tenant and user_tenant records
 * Requirements: 3.6, 3.7, 3.8, 3.9, 11.3
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();
  
  const shopName = (formData.get('shopName') as string)?.trim();
  const subdomain = (formData.get('subdomain') as string)?.trim().toLowerCase();

  // Validation
  const fieldErrors: ActionData['fieldErrors'] = {};
  
  if (!shopName || shopName.length < 2) {
    fieldErrors.shopName = 'Shop name must be at least 2 characters';
  } else if (shopName.length > 50) {
    fieldErrors.shopName = 'Shop name must be less than 50 characters';
  }

  if (!subdomain || subdomain.length < 3) {
    fieldErrors.subdomain = 'Subdomain must be at least 3 characters';
  } else if (subdomain.length > 30) {
    fieldErrors.subdomain = 'Subdomain must be less than 30 characters';
  } else if (!/^[a-z0-9-]+$/.test(subdomain)) {
    fieldErrors.subdomain = 'Only lowercase letters, numbers, and hyphens allowed';
  } else if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    fieldErrors.subdomain = 'Subdomain cannot start or end with a hyphen';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json<ActionData>({ fieldErrors }, { status: 400 });
  }

  // Get auth header from request
  const authHeader = request.headers.get('Authorization');
  const supabase = createSupabaseClient(env, authHeader);

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return json<ActionData>({ error: 'Please sign in to continue' }, { status: 401 });
  }

  // Check subdomain uniqueness
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single();

  if (existingTenant) {
    return json<ActionData>({
      fieldErrors: { subdomain: 'This subdomain is already taken' },
    }, { status: 409 });
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: shopName,
      subdomain: subdomain,
      settings: {},
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    console.error('Tenant creation error:', tenantError);
    return json<ActionData>({ error: 'Failed to create shop. Please try again.' }, { status: 500 });
  }

  // Create user_tenant record with 'owner' role
  const { error: userTenantError } = await supabase
    .from('user_tenants')
    .insert({
      user_id: user.id,
      tenant_id: tenant.id,
      role: 'owner',
    });

  if (userTenantError) {
    console.error('User tenant creation error:', userTenantError);
    // Rollback tenant creation
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return json<ActionData>({ error: 'Failed to set up shop ownership. Please try again.' }, { status: 500 });
  }

  // Refresh the user's JWT to include the new tenant_id
  // This is handled by the database trigger, but we need to refresh the session
  await supabase.rpc('refresh_user_tenant_claim', { p_user_id: user.id });

  return redirect('/backoffice');
}

/**
 * Generates a slug from shop name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
}

export default function OnboardingPage() {
  const { baseDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [shopName, setShopName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);

  // Auto-generate subdomain from shop name if not manually edited
  useEffect(() => {
    if (!subdomainTouched && shopName) {
      setSubdomain(generateSlug(shopName));
    }
  }, [shopName, subdomainTouched]);

  // Real-time subdomain validation (debounced)
  const checkSubdomainAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    setIsCheckingSubdomain(true);
    try {
      const response = await fetch(`/api/check-subdomain?subdomain=${encodeURIComponent(value)}`);
      const data = await response.json() as { available: boolean };
      setSubdomainAvailable(data.available);
    } catch {
      setSubdomainAvailable(null);
    } finally {
      setIsCheckingSubdomain(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (subdomain && subdomain.length >= 3) {
        checkSubdomainAvailability(subdomain);
      }
    }, 500); // 500ms debounce for real-time validation (Requirement 11.2)

    return () => clearTimeout(timer);
  }, [subdomain, checkSubdomainAvailability]);

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(value);
    setSubdomainTouched(true);
    setSubdomainAvailable(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Glassmorphism Card */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-4"
            >
              <Store className="h-8 w-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl">Create Your Shop</CardTitle>
            <CardDescription>
              Set up your online store in seconds
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form method="post" className="space-y-6">
              <AnimatePresence mode="wait">
                {actionData?.error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{actionData.error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Shop Name Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label htmlFor="shopName" className="block text-sm font-medium mb-2">
                  Shop Name
                </label>
                <Input
                  id="shopName"
                  name="shopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="My Awesome Shop"
                  required
                  minLength={2}
                  maxLength={50}
                  className="h-11"
                  aria-describedby={actionData?.fieldErrors?.shopName ? 'shopName-error' : undefined}
                />
                {actionData?.fieldErrors?.shopName && (
                  <p id="shopName-error" className="text-sm text-destructive mt-1">
                    {actionData.fieldErrors.shopName}
                  </p>
                )}
              </motion.div>

              {/* Subdomain Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label htmlFor="subdomain" className="block text-sm font-medium mb-2">
                  Subdomain
                </label>
                <div className="relative">
                  <Input
                    id="subdomain"
                    name="subdomain"
                    type="text"
                    value={subdomain}
                    onChange={handleSubdomainChange}
                    placeholder="myshop"
                    required
                    minLength={3}
                    maxLength={30}
                    className="h-11 pr-10"
                    aria-describedby="subdomain-preview subdomain-error"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingSubdomain && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!isCheckingSubdomain && subdomainAvailable === true && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {!isCheckingSubdomain && subdomainAvailable === false && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                
                {/* Subdomain Preview */}
                <div
                  id="subdomain-preview"
                  className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>
                    {subdomain || 'yourshop'}.{baseDomain}
                  </span>
                </div>

                {/* Subdomain Errors */}
                {actionData?.fieldErrors?.subdomain && (
                  <p id="subdomain-error" className="text-sm text-destructive mt-1">
                    {actionData.fieldErrors.subdomain}
                  </p>
                )}
                {!isCheckingSubdomain && subdomainAvailable === false && !actionData?.fieldErrors?.subdomain && (
                  <p className="text-sm text-destructive mt-1">
                    This subdomain is already taken
                  </p>
                )}
              </motion.div>

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={isSubmitting || subdomainAvailable === false}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium"
                >
                  <motion.span
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating your shop...
                      </>
                    ) : (
                      'Create Shop'
                    )}
                  </motion.span>
                </Button>
              </motion.div>
            </Form>
          </CardContent>
        </Card>

        {/* Progress indicator */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-4"
        >
          Step 1 of 1 • You'll be ready to go in seconds
        </motion.p>
      </motion.div>
    </div>
  );
}
