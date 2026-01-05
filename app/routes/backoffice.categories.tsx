/**
 * Categories Backoffice Page
 * Requirements: 5.3 - Category management page with CategoryManager component
 * 
 * Provides category management interface for shop owners
 */

import { useEffect, useState } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, Link } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { CategoryManager, type Category } from '~/components/inventory/CategoryManager';
import { useAuth, authFetch } from '~/hooks/useAuth';
import { FolderTree, ArrowLeft, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Categories - ClubeeShopMkt Backoffice' },
    { name: 'description', content: 'Manage product categories' },
  ];
};

interface LoaderData {
  categories: Category[];
  tenantId: string | null;
  authenticated: boolean;
  error?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs): Promise<ReturnType<typeof json<LoaderData>>> {
  const env = context.cloudflare.env as Env;

  // Check for Authorization header
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return json<LoaderData>({
      categories: [],
      tenantId: null,
      authenticated: false,
      error: 'Please log in to access categories',
    });
  }

  // Create authenticated Supabase client
  const supabase = createSupabaseClientFromRequest(request, env);

  // Verify the session is valid
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return json<LoaderData>({
      categories: [],
      tenantId: null,
      authenticated: false,
      error: 'Session expired. Please log in again.',
    });
  }

  // Get tenant_id from user metadata or user_tenants table
  let tenantId = user.app_metadata?.tenant_id as string | undefined;
  
  if (!tenantId) {
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    
    tenantId = userTenant?.tenant_id;
  }

  if (!tenantId) {
    return json<LoaderData>({
      categories: [],
      tenantId: null,
      authenticated: true,
      error: 'No tenant assigned to your account',
    });
  }

  // Fetch categories for this tenant
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (catError) {
    console.error('Failed to fetch categories:', catError);
    return json<LoaderData>({
      categories: [],
      tenantId,
      authenticated: true,
      error: 'Failed to load categories',
    });
  }

  return json<LoaderData>({
    categories: categories || [],
    tenantId,
    authenticated: true,
  });
}

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function CategoriesPage() {
  const { categories: initialCategories, tenantId, authenticated, error } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Fetch data with auth token on client side
  useEffect(() => {
    if (!authLoading && isAuthenticated && !authenticated) {
      setIsLoadingData(true);
      authFetch('/backoffice/categories?_data=routes%2Fbackoffice.categories')
        .then(res => res.json() as Promise<LoaderData>)
        .then((data) => {
          if (data.categories) {
            setCategories(data.categories);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingData(false));
    }
  }, [authLoading, isAuthenticated, authenticated]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Show loading state while checking auth
  if (authLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!authenticated && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <LogIn className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Login Required</h1>
          <p className="text-muted-foreground mb-4">{error || 'Please log in to access categories'}</p>
          <a
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Error state
  if (error && authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/backoffice"
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
              aria-label="Back to backoffice"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Categories</h1>
                <p className="text-sm text-muted-foreground">Organize your inventory</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          {/* Description */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Categories help you organize your products and services. 
              Products can be assigned to categories for easier browsing and filtering.
            </p>
          </div>

          {/* Category Manager */}
          <CategoryManager categories={categories} />
        </motion.div>
      </main>
    </motion.div>
  );
}
