/**
 * New Product/Service Page - Backoffice
 * Requirements: 6.4, 6.5 - Create new products and services
 * 
 * Form for creating new inventory items with type toggle
 */

import { useState, useCallback } from 'react';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, useActionData, Form, useNavigation } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { jwtMiddleware, getTenantIdFromPayload } from '~/lib/jwt.server';
import { ProductForm, type ProductFormData } from '~/components/inventory/ProductForm';
import { Button } from '~/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { Link } from '@remix-run/react';
import { useAuth, authFetch } from '~/hooks/useAuth';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Item - ClubeeShopMkt Backoffice' },
    { name: 'description', content: 'Add a new product or service to your catalog' },
  ];
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface LoaderData {
  categories: Category[];
  authenticated: boolean;
  error?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) {
    return json<LoaderData>({
      categories: [],
      authenticated: false,
      error: 'Authentication required',
    });
  }

  if (!payload) {
    return json<LoaderData>({
      categories: [],
      authenticated: false,
      error: 'Please log in',
    });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<LoaderData>({
      categories: [],
      authenticated: true,
      error: 'No tenant assigned',
    });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // Fetch categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('tenant_id', tenantId)
    .order('name');

  return json<LoaderData>({
    categories: categoriesData || [],
    authenticated: true,
  });
}

export default function NewProductPage() {
  const { categories, authenticated, error: loaderError } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const handleSubmit = useCallback(async (data: ProductFormData, imageFile?: File) => {
    setIsSubmitting(true);
    setError(null);
    setFieldError(null);

    try {
      let imageUrl = data.image_url;

      // Upload image if provided
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadResponse = await authFetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json() as { error?: string };
          throw new Error(uploadError.error || 'Failed to upload image');
        }

        const uploadResult = await uploadResponse.json() as { url: string };
        imageUrl = uploadResult.url;
      }

      // Create product
      const response = await authFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          image_url: imageUrl,
        }),
      });

      const result = await response.json() as { success: boolean; error?: string; field?: string };

      if (!response.ok) {
        if (result.field) {
          setFieldError({ field: result.field, message: result.error || 'Validation error' });
        } else {
          setError(result.error || 'Failed to create item');
        }
        return;
      }

      // Success - navigate to inventory list
      navigate('/backoffice/inventory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate]);

  const handleCancel = useCallback(() => {
    navigate('/backoffice/inventory');
  }, [navigate]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Login Required</h1>
          <p className="text-muted-foreground mb-4">{loaderError}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/backoffice/inventory">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">New Item</h1>
              <p className="text-sm text-muted-foreground">Add a product or service</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border p-6"
        >
          <ProductForm
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
            error={error}
            fieldError={fieldError}
          />
        </motion.div>
      </main>
    </div>
  );
}
