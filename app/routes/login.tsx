/**
 * Login Page
 * Handles user authentication for backoffice access
 * Requirements: 2.1, 2.2 - Google OAuth authentication
 */

import { useState, useEffect } from 'react';
import type { MetaFunction, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useActionData, useNavigation, Form, Link } from '@remix-run/react';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { t } from '~/lib/i18n';

export const meta: MetaFunction = () => {
  return [
    { title: 'Login - ClubeeShopMkt' },
    { name: 'description', content: 'Acesso ao painel administrativo' },
  ];
};

interface ActionData {
  error?: string;
  success?: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
  };
  redirectTo?: string;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare?.env as Env | undefined;
  
  console.log('Login action - SUPABASE_URL:', env?.SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('Login action - SUPABASE_ANON_KEY:', env?.SUPABASE_ANON_KEY ? 'SET (length: ' + env?.SUPABASE_ANON_KEY?.length + ')' : 'MISSING');
  
  if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) {
    return json<ActionData>({ error: 'Erro de configuração do servidor' }, { status: 500 });
  }
  
  const formData = await request.formData();
  const action = formData.get('action') as string;
  
  const supabase = createSupabaseClient(env);

  // Handle Google OAuth
  if (action === 'google') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      return json<ActionData>({ error: error.message || 'Falha ao entrar com Google' }, { status: 400 });
    }

    if (data.url) {
      // Redirect to Google OAuth
      throw new Response(null, {
        status: 302,
        headers: { Location: data.url },
      });
    }

    return json<ActionData>({ error: 'Falha ao iniciar login com Google' }, { status: 400 });
  }

  // Handle email/password login
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return json<ActionData>({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Supabase auth error:', error.message, error.status, error.name);
    
    // Handle email not confirmed error
    if (error.message.includes('Email not confirmed')) {
      return json<ActionData>({ 
        error: 'Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.' 
      }, { status: 401 });
    }
    
    return json<ActionData>({ error: error.message || 'E-mail ou senha inválidos' }, { status: 401 });
  }

  if (!data.session) {
    return json<ActionData>({ error: 'Falha na autenticação' }, { status: 401 });
  }

  // Determine redirect path based on user role and tenant count
  const redirectTo = await (async () => {
    const { getPostAuthRedirect } = await import('~/lib/auth.server');
    return getPostAuthRedirect(supabase, data.user!.id, data.user!.email || '');
  })();

  return json<ActionData>({
    success: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    redirectTo,
  });
}

/**
 * Google OAuth Sign In Component
 */
function GoogleSignInButton() {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting' && navigation.formData?.get('action') === 'google';

  return (
    <Form method="post">
      <input type="hidden" name="action" value="google" />
      <Button
        type="submit"
        variant="outline"
        disabled={isLoading}
        className="w-full h-11 gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        Continuar com Google
      </Button>
    </Form>
  );
}


export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [showPassword, setShowPassword] = useState(false);

  // If login successful, store token and redirect
  useEffect(() => {
    if (actionData?.success && actionData.session) {
      const handleLogin = async () => {
        console.log('Login successful, storing tokens...');
        // Import storeTokens from auth.ts
        const { storeTokens } = await import('~/lib/auth');
        storeTokens(actionData.session.access_token, actionData.session.refresh_token);
        console.log('Tokens stored, redirecting to:', actionData.redirectTo || '/backoffice');
        // Small delay to ensure localStorage is written
        setTimeout(() => {
          window.location.href = actionData.redirectTo || '/backoffice';
        }, 100);
      };
      handleLogin();
    }
  }, [actionData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Glassmorphism Card */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-4">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
            <CardDescription>Entre para acessar o painel administrativo</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Google OAuth Button */}
            <GoogleSignInButton />

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 dark:bg-slate-900/80 px-2 text-muted-foreground">
                  Ou continue com e-mail
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <Form method="post" className="space-y-4">
              {actionData?.error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{actionData.error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  E-mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="voce@exemplo.com"
                  className="h-11"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-11 pr-20"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPassword(!showPassword);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground transition-colors z-10 cursor-pointer px-2 py-1.5 rounded hover:bg-muted/50"
                    tabIndex={-1}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-11">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </Form>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="text-center text-sm text-muted-foreground mt-4 space-y-2">
          <p>
            Não tem uma conta?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
          <p>
            <Link to="/" className="hover:underline">
              ← Voltar para Início
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
