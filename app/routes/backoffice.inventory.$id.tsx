/**
 * Edit Product/Service Page - Backoffice
 * Requirements: 6.4, 6.5 - Edit existing products and services
 * 
 * Form for editing inventory items with type toggle
 */

import { useState, useCallback } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, useParams, Link } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { jwtMiddleware, getTenantIdFromPayload } from '~/lib/jwt.server';
import { ProductForm, type ProductFormData, type ProductItem } from '~/components/inventory/ProductForm';
import { Button } from '~/components/ui/button';
import { ArrowLeft, Package, Trash2, Loader2 } from 'lucide-react';
import { useAuth, authFetch } from '~/hooks/useAuth';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const productName = data?.product?.name || 'Edit Item';
  return [
    { title: `${productName} - ClubeeShopMkt Backoffice` },
    { name: 'description', content: 'Edit product or service details' },
  ];
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface LoaderData {
  product: ProductItem | null;
  categories: Category[];
  authenticated: boolean;
  error?: string;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const productId = params.id;

  if (!productId) {
    return json<LoaderData>({
      product: null,
      categories: [],
      authenticated: true,
      error: 'Product ID required',
    });
  }

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) {
    return json<LoaderData>({
      product: null,
      categories: [],
      authenticated: false,
      error: 'Authentication required',
    });
  }

  if (!payload) {
    return json<LoaderData>({
      product: null,
      categories: [],
      authenticated: false,
      error: 'Please log in',
    });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<LoaderData>({
      product: null,
      categories: [],
      authenticated: true,
      error: 'No tenant assigned',
    });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // Fetch product
  const { data: productData, error: productError } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', productId)
    .eq('tenant_id', tenantId)
    .single();

  if (productError || !productData) {
    return json<LoaderData>({
      product: null,
      categories: [],
      authenticated: true,
      error: 'Product not found',
    });
  }

  // Fetch categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('tenant_id', tenantId)
    .order('name');

  const product: ProductItem = {
    id: productData.id,
    tenant_id: productData.tenant_id,
    type: productData.type || 'physical',
    barcode: productData.barcode || '',
    name: productData.name,
    description: productData.description || '',
    category: productData.category || '',
    category_id: productData.category_id || '',
    stock: productData.stock,
    price: productData.price,
    image_url: productData.image_url,
    created_at: productData.created_at,
    updated_at: productData.updated_at,
  };

  return json<LoaderData>({
    product,
    categories: categoriesData || [],
    authenticated: true,
  });
}

export default function EditProductPage() {
  const { product, categories, authenticated, error: loaderError } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const params = useParams();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = useCallback(async (data: ProductFormData, imageFile?: File) => {
    if (!product) return;
    
    setIsSubmitting(true);
    setError(null);
    setFieldError(null);

    try {
      let imageUrl = data.image_url;

      // Upload new image if provided
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

      // Update product
      const response = await authFetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          ...data,
          image_url: imageUrl,
        }),
      });

      const result = await response.json() as { success: boolean; error?: string; field?: string };

      if (!response.ok) {
        if (result.field) {
          setFieldError({ field: result.field, message: result.error || 'Validation error' });
        } else {
          setError(result.error || 'Failed to update item');
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
  }, [product, navigate]);

  const handleDelete = useCallback(async () => {
    if (!product) return;
    
    setIsDeleting(true);
    setError(null);

    try {
      const response = await authFetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id }),
      });

      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || 'Failed to delete item');
      }

      // Success - navigate to inventory list
      navigate('/backoffice/inventory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }, [product, navigate]);

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

  if (loaderError || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Package className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Not Found</h1>
          <p className="text-muted-foreground mb-4">{loaderError || 'Product not found'}</p>
          <Link
            to="/backoffice/inventory"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Back to Inventory
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/backoffice/inventory">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Edit Item</h1>
                <p className="text-sm text-muted-foreground">{product.name}</p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
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
            initialData={product}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
            error={error}
            fieldError={fieldError}
          />
        </motion.div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-xl border p-6 max-w-md w-full shadow-xl"
          >
            <h2 className="text-lg font-semibold mb-2">Delete Item?</h2>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete "{product.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
