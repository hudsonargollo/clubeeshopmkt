/**
 * Test User Creation Route
 * For testing purposes - creates a user and tenant directly
 */

import { useState } from 'react';
import type { MetaFunction, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useActionData, Form } from '@remix-run/react';
import { createSupabaseClient, type Env } from '~/lib/supabase.server';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { TestTube, AlertCircle, CheckCircle } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [{ title: 'Test User Creation - ClubeeShopMkt' }];
};

interface ActionData {
  error?: string;
  success?: boolean;
  message?: string;
  userDetails?: {
    email: string;
    userId: string;
    tenantId: string;
    subdomain: string;
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare?.env as Env | undefined;
  
  if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) {
    return json<ActionData>({ 
      error: 'Missing Supabase environment variables' 
    }, { status: 500 });
  }
  
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;
    
    if (action === 'create-test-user') {
      const email = (formData.get('email') as string)?.trim();
      const password = (formData.get('password') as string)?.trim();
      const shopName = (formData.get('shopName') as string)?.trim() || 'Test Shop';
      const subdomain = (formData.get('subdomain') as string)?.trim().toLowerCase() || 'testshop';

      if (!email || !password) {
        return json<ActionData>({ error: 'Email and password are required' }, { status: 400 });
      }

      if (password.length < 6) {
        return json<ActionData>({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      // Create user with email/password (this should work with anon key)
      const supabase = createSupabaseClient(env);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Test user creation error:', authError);
        return json<ActionData>({ error: authError.message }, { status: 400 });
      }

      if (!authData.user) {
        return json<ActionData>({ error: 'Failed to create user' }, { status: 400 });
      }

      // Note: We can't create tenant/user_tenant relationships here due to RLS policies
      // This test user will need to go through the onboarding flow to create a tenant
      
      return json<ActionData>({
        success: true,
        message: 'Test user created successfully! Use the onboarding flow to create a tenant.',
        userDetails: {
          email: authData.user.email || email,
          userId: authData.user.id,
          tenantId: 'none',
          subdomain: 'none',
        },
      });
    }

    return json<ActionData>({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Test user creation error:', error);
    return json<ActionData>({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export default function TestUserPage() {
  const actionData = useActionData<typeof action>();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('testpass123');
  const [shopName, setShopName] = useState('Test Shop');
  const [subdomain, setSubdomain] = useState('testshop');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white shadow-lg">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mx-auto mb-4">
              <TestTube className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">Create Test User</CardTitle>
            <CardDescription>
              Create a test user with tenant for development/testing
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {actionData?.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{actionData.message}</span>
                </div>
                
                {actionData.userDetails && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <h3 className="font-semibold">User Details:</h3>
                    <p><strong>Email:</strong> {actionData.userDetails.email}</p>
                    <p><strong>User ID:</strong> {actionData.userDetails.userId}</p>
                    <p><strong>Tenant ID:</strong> {actionData.userDetails.tenantId}</p>
                    <p><strong>Subdomain:</strong> {actionData.userDetails.subdomain}.clubemkt.digital</p>
                  </div>
                )}

                <div className="space-y-2">
                  <a
                    href="/login"
                    className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700"
                  >
                    Go to Login
                  </a>
                  <a
                    href="/backoffice"
                    className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded hover:bg-green-700"
                  >
                    Go to Backoffice
                  </a>
                </div>
              </div>
            ) : (
              <Form method="post" className="space-y-4">
                <input type="hidden" name="action" value="create-test-user" />
                
                {actionData?.error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{actionData.error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11"
                  />
                </div>

                <div>
                  <label htmlFor="shopName" className="block text-sm font-medium mb-1">
                    Shop Name
                  </label>
                  <Input
                    id="shopName"
                    name="shopName"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div>
                  <label htmlFor="subdomain" className="block text-sm font-medium mb-1">
                    Subdomain
                  </label>
                  <Input
                    id="subdomain"
                    name="subdomain"
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {subdomain}.clubemkt.digital
                  </p>
                </div>

                <Button type="submit" className="w-full h-11">
                  Create Test User & Tenant
                </Button>
              </Form>
            )}

            <div className="text-center text-sm text-gray-500">
              <p>⚠️ For development/testing only</p>
              <a href="/" className="text-blue-600 hover:underline">
                ← Back to Home
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}