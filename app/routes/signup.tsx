/**
 * Signup Page
 * Allows new staff members to create an account
 */

import { useState } from 'react';
import type { MetaFunction, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useActionData, useNavigation, Form } from '@remix-run/react';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { UserPlus, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Sign Up - ClubeeShopMkt' },
    { name: 'description', content: 'Create a staff account' },
  ];
};

interface ActionData {
  error?: string;
  success?: boolean;
  message?: string;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const formData = await request.formData();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password) {
    return json<ActionData>({ error: 'Email and password are required' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return json<ActionData>({ error: 'Passwords do not match' }, { status: 400 });
  }

  if (password.length < 6) {
    return json<ActionData>({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const supabase = createSupabaseClient(env);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return json<ActionData>({ error: error.message }, { status: 400 });
  }

  if (data.user?.identities?.length === 0) {
    return json<ActionData>({ error: 'An account with this email already exists' }, { status: 400 });
  }

  return json<ActionData>({
    success: true,
    message: 'Account created! You can now log in.',
  });
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-1">Sign up for backoffice access</p>
        </div>

        {actionData?.success ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 text-green-600 rounded-lg mb-4">
              <CheckCircle className="h-5 w-5" />
              <span>{actionData.message}</span>
            </div>
            <a
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Go to Login
            </a>
          </div>
        ) : (
          <Form method="post" className="space-y-4">
            {actionData?.error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{actionData.error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </Form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
