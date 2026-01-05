/**
 * Login Page
 * Handles user authentication for backoffice access
 * Requirements: 2.1, 2.2 - Google OAuth authentication
 */

import { useState } from 'react';
import type { MetaFunction, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useActionData, useNavigation, Form } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Login - ClubeeShopMkt' },
    { name: 'description', content: 'Staff login for backoffice access' },
  ];
};

interface ActionData {
  error?: string;
  success?: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return json<ActionData>({ error: 'Email and password are required' }, { status: 400 });
  }

  const supabase = createSupabaseClient(env);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return json<ActionData>({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (!data.session) {
    return json<ActionData>({ error: 'Authentication failed' }, { status: 401 });
  }

  // Return session tokens to be stored client-side
  return json<ActionData>({
    success: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
}

/**
 * Google OAuth Sign In Component
 * Initiates OAuth flow via Supabase client
 */
function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Import dynamically to avoid SSR issues
      const { signInWithGoogle } = await import('~/lib/auth');
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full h-11 gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [showPassword, setShowPassword] = useState(false);

  // If login successful, store token and redirect
  if (actionData?.success && actionData.session) {
    // Store in localStorage for client-side auth
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb-access-token', actionData.session.access_token);
      localStorage.setItem('sb-refresh-token', actionData.session.refresh_token);
      window.location.href = '/backoffice';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
      </div>

      <ClientOnly fallback={
        <div className="w-full max-w-sm relative z-10">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mx-auto mb-4">
                <LogIn className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>Sign in to access the backoffice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-11 bg-slate-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      }>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm relative z-10"
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
              <LogIn className="h-8 w-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to access the backoffice</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Google OAuth Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GoogleSignInButton />
            </motion.div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 dark:bg-slate-900/80 px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <Form method="post" className="space-y-4">
              {actionData?.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{actionData.error}</span>
                </motion.div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="h-11"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-11 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </Form>
          </CardContent>
        </Card>

        {/* Footer links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-4 space-y-2"
        >
          <p>
            Don't have an account?{' '}
            <a href="/signup" className="text-primary hover:underline">
              Sign up
            </a>
          </p>
          <p>
            <a href="/" className="hover:underline">
              ← Back to Home
            </a>
          </p>
        </motion.div>
        </motion.div>
      </ClientOnly>
    </div>
  );
}
