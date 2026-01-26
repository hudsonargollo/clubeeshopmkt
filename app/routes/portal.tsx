/**
 * Shop Portal Page
 * Displays list of shops for users with multiple tenants
 * Requirements: 4.3, 4.4
 */

import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Store, ChevronRight, Loader2, Building2 } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Selecionar Loja - ClubeeShopMkt' },
    { name: 'description', content: 'Escolha qual loja gerenciar' },
  ];
};

interface Shop {
  tenant_id: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

interface LoaderData {
  shops: Shop[];
  userEmail: string | null;
}

/**
 * Loader to fetch user's shops
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const authHeader = request.headers.get('Authorization');
  const supabase = createSupabaseClient(env, authHeader);

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return redirect('/login');
  }

  // Fetch user's tenants with tenant details
  const { data: userTenants, error: tenantsError } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      role,
      tenant:tenants (
        id,
        name,
        subdomain
      )
    `)
    .eq('user_id', user.id);

  if (tenantsError) {
    console.error('Error fetching user tenants:', tenantsError);
    return json<LoaderData>({ shops: [], userEmail: user.email ?? null });
  }

  // If user has no tenants, redirect to onboarding
  if (!userTenants || userTenants.length === 0) {
    return redirect('/onboarding');
  }

  // If user has exactly one tenant, redirect to backoffice
  if (userTenants.length === 1) {
    return redirect('/backoffice');
  }

  // Transform the data to match our interface
  const shops: Shop[] = userTenants.map((ut) => ({
    tenant_id: ut.tenant_id,
    role: ut.role,
    tenant: ut.tenant as unknown as Shop['tenant'],
  }));

  return json<LoaderData>({
    shops,
    userEmail: user.email ?? null,
  });
}

/**
 * Action to select a shop and update session
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();
  const tenantId = formData.get('tenantId') as string;

  if (!tenantId) {
    return json({ error: 'Nenhuma loja selecionada' }, { status: 400 });
  }

  const authHeader = request.headers.get('Authorization');
  const supabase = createSupabaseClient(env, authHeader);

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return redirect('/login');
  }

  // Verify user has access to this tenant
  const { data: userTenant, error: accessError } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single();

  if (accessError || !userTenant) {
    return json({ error: 'Você não tem acesso a esta loja' }, { status: 403 });
  }

  // Update user's app_metadata with selected tenant_id
  // This is done via the database function
  const { error: updateError } = await supabase.rpc('refresh_user_tenant_claim', {
    p_user_id: user.id,
  });

  if (updateError) {
    console.error('Error updating tenant claim:', updateError);
  }

  // For now, we'll store the selected tenant in the session
  // The actual JWT update happens on next sign-in
  return redirect('/backoffice');
}

export default function PortalPage() {
  const { shops, userEmail } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const isSelecting = fetcher.state !== 'idle';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
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
        className="w-full max-w-lg relative z-10"
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
              <Building2 className="h-8 w-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl">Selecione uma Loja</CardTitle>
            <CardDescription>
              {userEmail && <span>Conectado como {userEmail}</span>}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {shops.map((shop) => (
                <motion.div key={shop.tenant_id} variants={itemVariants}>
                  <fetcher.Form method="post">
                    <input type="hidden" name="tenantId" value={shop.tenant_id} />
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSelecting}
                      className="w-full h-auto p-4 justify-between hover:bg-accent/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{shop.tenant.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {shop.tenant.subdomain}.clubeeshop.com
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                          {shop.role === 'owner' ? 'Proprietário' : 
                           shop.role === 'staff' ? 'Funcionário' : 
                           shop.role}
                        </span>
                        {isSelecting && fetcher.formData?.get('tenantId') === shop.tenant_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        )}
                      </div>
                    </Button>
                  </fetcher.Form>
                </motion.div>
              ))}
            </motion.div>

            {/* Create new shop link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 pt-4 border-t"
            >
              <a
                href="/onboarding"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Store className="h-4 w-4" />
                Criar uma nova loja
              </a>
            </motion.div>
          </CardContent>
        </Card>

        {/* Sign out link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-4"
        >
          <a href="/login" className="hover:underline">
            Sair
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
