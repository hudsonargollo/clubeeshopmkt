/**
 * New Order Page - POS Interface
 * Requirements: 8.1, 15.8 - Manual order creation with POS interface
 * 
 * Backoffice page for creating new orders via POS interface
 */

import { useState, useCallback, useEffect } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, Link } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { jwtMiddleware, getTenantIdFromPayload } from '~/lib/jwt.server';
import { POSInterface, type POSProduct, type POSCartItem } from '~/components/orders';
import { Button } from '~/components/ui/button';
import { useUnifiedScanner } from '~/hooks/useUnifiedScanner';
import { authFetch } from '~/hooks/useAuth';
import type { OrderType } from '~/lib/orderStateMachine';
import { ArrowLeft, ShoppingBag, CheckCircle } from 'lucide-react';
import { toast } from '~/components/ui/toast';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Order - ClubeeShopMkt Backoffice' },
    { name: 'description', content: 'Create a new order' },
  ];
};

interface LoaderData {
  products: POSProduct[];
  authenticated: boolean;
  error?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) {
    return json<LoaderData>({
      products: [],
      authenticated: false,
      error: 'Authentication required',
    });
  }

  if (!payload) {
    return json<LoaderData>({
      products: [],
      authenticated: false,
      error: 'Please log in to access this page',
    });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<LoaderData>({
      products: [],
      authenticated: true,
      error: 'No tenant assigned to your account',
    });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // Fetch all products for POS
  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('id, type, barcode, name, description, category, category_id, stock, price, image_url')
    .eq('tenant_id', tenantId)
    .order('name')
    .limit(500);

  if (invError) {
    console.error('Failed to fetch inventory:', invError);
    return json<LoaderData>({
      products: [],
      authenticated: true,
      error: 'Failed to load products',
    });
  }

  // Transform to POSProduct format
  const products: POSProduct[] = (inventory || []).map((item) => ({
    id: item.id,
    type: (item.type || 'physical') as 'physical' | 'service',
    barcode: item.barcode,
    name: item.name,
    description: item.description,
    category: item.category || 'Uncategorized',
    price: item.price,
    stock: item.stock,
    image_url: item.image_url,
  }));

  return json<LoaderData>({
    products,
    authenticated: true,
  });
}


export default function NewOrderPage() {
  const { products, authenticated, error: loaderError } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  // Scanner integration
  const { state: scannerState, handleScan } = useUnifiedScanner({
    onProductScan: (item) => {
      // Scanner found a product - POSInterface will handle adding to cart
      console.log('Scanned product:', item.name);
    },
    onError: (err) => {
      console.error('Scan error:', err);
      toast.error('Product not found');
    },
  });

  // Handle checkout
  const handleCheckout = useCallback(async (items: POSCartItem[], type: OrderType) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            inventory_id: item.inventory_id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            type: item.type,
          })),
          type,
        }),
      });

      const data = await response.json() as {
        success: boolean;
        order?: { id: string; pickup_code: string | null; total: number };
        unavailable_items?: Array<{ name: string; requested: number; available: number }>;
        error?: string;
      };

      if (!response.ok || !data.success) {
        // Handle stock validation errors (Requirement 8.11)
        if (data.unavailable_items && data.unavailable_items.length > 0) {
          const itemsList = data.unavailable_items
            .map(item => `${item.name} (requested: ${item.requested}, available: ${item.available})`)
            .join(', ');
          setError(`Insufficient stock: ${itemsList}`);
          toast.error('Some items are out of stock');
        } else {
          setError(data.error || 'Failed to create order');
          toast.error(data.error || 'Failed to create order');
        }
        return;
      }

      // Success!
      setLastOrderId(data.order?.id || null);
      const pickupCode = data.order?.pickup_code;
      
      if (pickupCode) {
        setSuccess(`Order created! Pickup code: ${pickupCode}`);
        toast.success(`Order created! Pickup code: ${pickupCode}`);
      } else {
        setSuccess('Order created successfully!');
        toast.success('Order created successfully!');
      }

      // Navigate to order detail after short delay
      setTimeout(() => {
        if (data.order?.id) {
          navigate(`/backoffice/orders/${data.order.id}`);
        } else {
          navigate('/backoffice/orders');
        }
      }, 2000);

    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to create order. Please try again.');
      toast.error('Failed to create order');
    } finally {
      setIsProcessing(false);
    }
  }, [navigate]);

  // Handle barcode scan from POSInterface
  const handleBarcodeScan = useCallback((barcode: string) => {
    handleScan(barcode);
  }, [handleScan]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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

  if (loaderError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground">{loaderError}</p>
        </div>
      </div>
    );
  }

  // Success state - show confirmation
  if (success && lastOrderId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">Order Created!</h1>
          <p className="text-muted-foreground mb-6">{success}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/backoffice/orders')}>
              View All Orders
            </Button>
            <Button onClick={() => {
              setSuccess(null);
              setLastOrderId(null);
            }}>
              Create Another
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/backoffice/orders">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">New Order</h1>
              <p className="text-sm text-muted-foreground">
                Create a new order for walk-in customers
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${scannerState.isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-xs text-muted-foreground">Scanner Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <POSInterface
            products={products}
            onCheckout={handleCheckout}
            onBarcodeScan={handleBarcodeScan}
            isProcessing={isProcessing}
            error={error}
            success={success}
          />
        </motion.div>
      </main>
    </div>
  );
}
