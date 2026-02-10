/**
 * Onboarding Page
 * Allows new users to create their shop (tenant) after OAuth signup
 * Requirements: 3.2, 3.3, 3.4, 3.5, 11.2
 */

import { useState, useEffect } from 'react';
import type { MetaFunction, ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useActionData, useNavigation, Form, useLoaderData, useFetcher } from '@remix-run/react';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { Store, AlertCircle, Globe } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Crie Sua Loja - ClubeeShopMkt' },
    { name: 'description', content: 'Configure sua loja em segundos' },
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
    fieldErrors.shopName = 'O nome da loja deve ter pelo menos 2 caracteres';
  } else if (shopName.length > 50) {
    fieldErrors.shopName = 'O nome da loja deve ter menos de 50 caracteres';
  }

  if (!subdomain || subdomain.length < 3) {
    fieldErrors.subdomain = 'O subdomínio deve ter pelo menos 3 caracteres';
  } else if (subdomain.length > 30) {
    fieldErrors.subdomain = 'O subdomínio deve ter menos de 30 caracteres';
  } else if (!/^[a-z0-9-]+$/.test(subdomain)) {
    fieldErrors.subdomain = 'Apenas letras minúsculas, números e hífens são permitidos';
  } else if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    fieldErrors.subdomain = 'O subdomínio não pode começar ou terminar com hífen';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return json<ActionData>({ fieldErrors }, { status: 400 });
  }

  // Get auth header from request
  const authHeader = request.headers.get('Authorization');
  
  console.log('Onboarding - Auth header present:', !!authHeader);
  console.log('Onboarding - Auth header length:', authHeader?.length || 0);
  
  if (!authHeader) {
    console.error('Onboarding auth error: No Authorization header provided');
    return json<ActionData>({ error: 'Sua sessão expirou. Faça login novamente.' }, { status: 401 });
  }

  // Create Supabase client with the provided token
  const supabase = createSupabaseClient(env, authHeader);

  // Try to get user from the token
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  console.log('Onboarding - User validation result:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    error: userError?.message
  });
  
  if (userError || !user) {
    console.error('Onboarding auth error:', userError);
    
    // If token validation fails, try to refresh it or provide more specific error
    if (userError?.message?.includes('invalid') || userError?.message?.includes('expired')) {
      return json<ActionData>({ 
        error: 'Sua sessão expirou. Faça login novamente.' 
      }, { status: 401 });
    }
    
    return json<ActionData>({ 
      error: 'Erro de autenticação. Tente fazer login novamente.' 
    }, { status: 401 });
  }

  // Check subdomain uniqueness first
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .single();

  if (existingTenant) {
    return json<ActionData>({
      fieldErrors: { subdomain: 'Este subdomínio já está em uso' },
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
    return json<ActionData>({ error: 'Falha ao criar loja. Tente novamente.' }, { status: 500 });
  }

  // Create service role client for user_tenant creation
  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseClient(env, null, true); // Use service role
  } catch (error) {
    console.error('Service role client creation failed:', error);
    return json<ActionData>({ 
      error: 'Configuração do servidor incompleta. O administrador precisa configurar a chave de serviço.' 
    }, { status: 500 });
  }

  // Check if service role key is available
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
    return json<ActionData>({ 
      error: 'Configuração do servidor incompleta. Entre em contato com o suporte técnico.' 
    }, { status: 500 });
  }

  // Create user_tenant relationship with service role
  const { error: userTenantError } = await supabaseAdmin
    .from('user_tenants')
    .insert({
      user_id: user.id,
      tenant_id: tenant.id,
      role: 'owner',
    });

  if (userTenantError) {
    console.error('User tenant creation error:', userTenantError);
    
    // Clean up tenant if user_tenant creation failed
    await supabase.from('tenants').delete().eq('id', tenant.id);
    
    return json<ActionData>({ 
      error: `Falha ao configurar propriedade da loja: ${userTenantError.message}` 
    }, { status: 500 });
  }

  console.log('Onboarding successful for user:', user.id, 'tenant:', tenant.id);

  return json<ActionData>({ success: true });
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
  console.log('OnboardingPage component loaded');
  
  const { baseDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher<typeof action>();
  
  const [shopName, setShopName] = useState('');
  const [subdomain, setSubdomain] = useState('');

  const isSubmitting = navigation.state === 'submitting' || fetcher.state === 'submitting';

  console.log('Component state:', { shopName, subdomain, isSubmitting });

  // Handle successful form submission
  useEffect(() => {
    if (fetcher.data?.success) {
      window.location.href = '/backoffice';
    }
  }, [fetcher.data]);

  // Auto-generate subdomain from shop name
  useEffect(() => {
    if (shopName) {
      setSubdomain(generateSlug(shopName));
    }
  }, [shopName]);

  // Handle form submission with proper Authorization header
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    console.log('handleSubmit called!');
    e.preventDefault();
    
    const accessToken = localStorage.getItem('sb-access-token');
    console.log('Access token found:', accessToken ? 'Yes' : 'No');
    console.log('Access token length:', accessToken?.length || 0);
    
    if (!accessToken) {
      console.log('No access token, redirecting to home');
      alert('Nenhum token de acesso encontrado. Por favor, faça login novamente.');
      window.location.href = '/';
      return;
    }

    // Try to decode token to check if it's valid
    try {
      const payload = accessToken.split('.')[1];
      const decodedToken = JSON.parse(atob(payload));
      const isExpired = Date.now() / 1000 > decodedToken.exp;
      
      console.log('Token info:', {
        userId: decodedToken.sub,
        email: decodedToken.email,
        isExpired,
        expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      });
      
      if (isExpired) {
        console.log('Token is expired, redirecting to home');
        alert('Seu token de acesso expirou. Por favor, faça login novamente.');
        localStorage.removeItem('sb-access-token');
        localStorage.removeItem('sb-refresh-token');
        window.location.href = '/';
        return;
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      alert('Token de acesso inválido. Por favor, faça login novamente.');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      window.location.href = '/';
      return;
    }

    const formData = new FormData(e.currentTarget);
    console.log('Submitting onboarding form...');
    console.log('Form data:', Object.fromEntries(formData.entries()));
    
    // Add a small delay to ensure any pending token storage operations complete
    setTimeout(() => {
      fetcher.submit(formData, {
        method: 'post',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10">
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-4">
              <Store className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Crie Sua Loja</CardTitle>
            <CardDescription>
              Configure sua loja online em segundos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} method="post" className="space-y-6">
              {(actionData?.error || fetcher.data?.error) && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{actionData?.error || fetcher.data?.error}</span>
                </div>
              )}
              
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium mb-2">
                  Nome da Loja
                </label>
                <Input
                  id="shopName"
                  name="shopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Minha Loja Incrível"
                  required
                  minLength={2}
                  maxLength={50}
                  className="h-11"
                />
                {(actionData?.fieldErrors?.shopName || fetcher.data?.fieldErrors?.shopName) && (
                  <p className="text-sm text-red-600 mt-1">
                    {actionData?.fieldErrors?.shopName || fetcher.data?.fieldErrors?.shopName}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="subdomain" className="block text-sm font-medium mb-2">
                  Subdomínio
                </label>
                <Input
                  id="subdomain"
                  name="subdomain"
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="minhaloja"
                  required
                  minLength={3}
                  maxLength={30}
                  className="h-11"
                />
                <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{subdomain || 'sualoja'}.{baseDomain}</span>
                </div>
                {(actionData?.fieldErrors?.subdomain || fetcher.data?.fieldErrors?.subdomain) && (
                  <p className="text-sm text-red-600 mt-1">
                    {actionData?.fieldErrors?.subdomain || fetcher.data?.fieldErrors?.subdomain}
                  </p>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium"
              >
                {isSubmitting ? 'Criando sua loja...' : 'Criar Loja'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-gray-600 mt-4">
          Passo 1 de 1 • Você estará pronto em segundos
        </p>
      </div>
    </div>
  );
}
