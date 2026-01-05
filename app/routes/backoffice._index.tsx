/**
 * Backoffice Dashboard - Staff Inventory Manager
 * Requirements: Multi-tenant backoffice for inventory management with real Supabase data
 */

import { useState, useCallback, useEffect } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useRevalidator, useNavigate } from '@remix-run/react';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { BottomDock } from '~/components/ui/BottomDock';
import { SearchPalette, useSearchPalette } from '~/components/ui/SearchPalette';
import { ProductGrid } from '~/components/inventory/ProductGrid';
import { InventoryEditDrawer, type InventoryItem } from '~/components/inventory/InventoryEditDrawer';
import { DeliveryDashboard } from '~/components/orders/DeliveryDashboard';
import { useUnifiedScanner } from '~/hooks/useUnifiedScanner';
import { useAuth, authFetch } from '~/hooks/useAuth';
import type { SearchResult } from '~/hooks/useInventorySearch';
import type { ProductCardItem } from '~/components/inventory/ProductCard';
import type { Order, OrderItem } from '~/lib/orderUtils';
import { Scan, Package, Truck, Settings, AlertCircle, LogIn, LogOut, Loader2 } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Backoffice - ClubeeShopMkt' },
    { name: 'description', content: 'Staff inventory management dashboard' },
  ];
};

interface LoaderData {
  products: ProductCardItem[];
  orders: Order[];
  tenantId: string | null;
  authenticated: boolean;
  error?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs): Promise<ReturnType<typeof json<LoaderData>>> {
  const env = context.cloudflare.env as Env;

  // Check for Authorization header (from client-side token)
  const authHeader = request.headers.get('Authorization');
  
  // If no auth header, return unauthenticated state (client will handle redirect)
  if (!authHeader) {
    return json<LoaderData>({
      products: [],
      orders: [],
      tenantId: null,
      authenticated: false,
      error: 'Please log in to access the backoffice',
    });
  }

  // Create authenticated Supabase client
  const supabase = createSupabaseClientFromRequest(request, env);

  // Verify the session is valid
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return json<LoaderData>({
      products: [],
      orders: [],
      tenantId: null,
      authenticated: false,
      error: 'Session expired. Please log in again.',
    });
  }

  // Get tenant_id from user metadata or user_tenants table
  let tenantId = user.app_metadata?.tenant_id as string | undefined;
  
  if (!tenantId) {
    // Try to get tenant from user_tenants table
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    
    tenantId = userTenant?.tenant_id;
  }

  if (!tenantId) {
    return json<LoaderData>({
      products: [],
      orders: [],
      tenantId: null,
      authenticated: true,
      error: 'No tenant assigned to your account',
    });
  }

  // Fetch inventory for this tenant
  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('id, barcode, name, category, stock, price, image_url')
    .eq('tenant_id', tenantId)
    .order('category')
    .order('name')
    .limit(200);

  if (invError) {
    console.error('Failed to fetch inventory:', invError);
  }

  // Fetch orders for this tenant
  const { data: ordersData, error: ordError } = await supabase
    .from('orders')
    .select(`
      id, tenant_id, type, status, fulfillment_data, pickup_code, total, created_at, updated_at,
      order_items (id, inventory_id, quantity, unit_price)
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'paid', 'processing', 'ready'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (ordError) {
    console.error('Failed to fetch orders:', ordError);
  }

  // Transform inventory to ProductCardItem format
  const products: ProductCardItem[] = (inventory || []).map((item) => ({
    id: item.id,
    barcode: item.barcode,
    name: item.name,
    category: item.category || 'Uncategorized',
    stock: item.stock,
    price: item.price,
    image_url: item.image_url,
  }));

  // Transform orders to Order format
  const orders: Order[] = (ordersData || []).map((order) => ({
    id: order.id,
    tenant_id: order.tenant_id,
    type: order.type,
    status: order.status,
    fulfillment_data: order.fulfillment_data as Record<string, unknown>,
    pickup_code: order.pickup_code,
    total: order.total,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: ((order as { order_items?: Array<{ id: string; inventory_id: string; quantity: number; unit_price: number }> }).order_items || []).map(item => ({
      id: item.id,
      order_id: order.id,
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  }));

  return json<LoaderData>({
    products,
    orders,
    tenantId,
    authenticated: true,
  });
}

type BackofficeView = 'inventory' | 'orders' | 'deliveries' | 'settings';

export default function BackofficeDashboard() {
  const { products: initialProducts, orders, tenantId, authenticated, error } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, logout, getAuthHeaders } = useAuth();
  
  const [currentView, setCurrentView] = useState<BackofficeView>('inventory');
  const [products, setProducts] = useState<ProductCardItem[]>(initialProducts);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Search palette
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchPalette();

  // Fetch data with auth token on client side
  useEffect(() => {
    if (!authLoading && isAuthenticated && !authenticated) {
      // We have a token but server didn't get it - refetch with auth header
      setIsLoadingData(true);
      authFetch('/backoffice?_data=routes%2Fbackoffice._index')
        .then(res => res.json() as Promise<LoaderData>)
        .then((data) => {
          if (data.products) {
            setProducts(data.products);
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
  
  // Scanner integration
  const { state: scannerState, handleScan } = useUnifiedScanner({
    onProductScan: (item) => {
      const product = products.find(p => p.barcode === item.barcode);
      if (product) {
        const inventoryItem: InventoryItem = {
          ...product,
          image_url: product.image_url ?? null,
        };
        setEditingItem(inventoryItem);
        setIsEditDrawerOpen(true);
      }
    },
    onOrderScan: () => {
      setCurrentView('orders');
    },
    onError: (err) => {
      console.error('Scan error:', err);
    },
  });

  // Handle search result selection
  const handleSearchSelect = useCallback((result: SearchResult) => {
    const product = products.find(p => p.id === result.id);
    if (product) {
      const inventoryItem: InventoryItem = {
        ...product,
        image_url: product.image_url ?? null,
      };
      setEditingItem(inventoryItem);
      setIsEditDrawerOpen(true);
    }
    setSearchOpen(false);
  }, [products, setSearchOpen]);

  // Handle product click
  const handleProductClick = useCallback((product: ProductCardItem) => {
    const inventoryItem: InventoryItem = {
      ...product,
      image_url: product.image_url ?? null,
    };
    setEditingItem(inventoryItem);
    setIsEditDrawerOpen(true);
  }, []);

  // Handle inventory save via API
  const handleSaveItem = useCallback(async (item: InventoryItem) => {
    setIsSaving(true);
    try {
      const response = await authFetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      
      if (response.ok) {
        setProducts(prev => prev.map(p => p.id === item.id ? item : p));
        setIsEditDrawerOpen(false);
        setEditingItem(null);
        revalidator.revalidate();
      } else {
        console.error('Failed to save item');
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [revalidator]);

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
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <LogIn className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Login Required</h1>
          <p className="text-muted-foreground mb-4">{error || 'Please log in to access the backoffice'}</p>
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
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Access Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Backoffice</h1>
              <p className="text-sm text-muted-foreground">Inventory Manager</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${scannerState.isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-xs text-muted-foreground">Scanner Ready</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
          
          {/* View tabs */}
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {(['inventory', 'orders', 'deliveries', 'settings'] as BackofficeView[]).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  currentView === view
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentView === 'inventory' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Products ({products.length})</h2>
              <button
                onClick={() => setSearchOpen(true)}
                className="px-4 py-2 text-sm bg-muted rounded-lg hover:bg-muted/80"
              >
                Search (⌘K)
              </button>
            </div>
            {products.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No products in inventory</p>
                <p className="text-sm mt-1">Add products to get started</p>
              </div>
            ) : (
              <ProductGrid products={products} onProductClick={handleProductClick} />
            )}
          </div>
        )}

        {currentView === 'orders' && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Order management</p>
            <p className="text-sm mt-1">{orders.length} active orders</p>
          </div>
        )}

        {currentView === 'deliveries' && (
          <DeliveryDashboard
            orders={orders}
            onOrderSelect={(order) => console.log('Selected order:', order)}
          />
        )}

        {currentView === 'settings' && (
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Settings coming soon</p>
          </div>
        )}
      </main>

      {/* Search Palette */}
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleSearchSelect}
        onBarcodeScan={handleScan}
      />

      {/* Inventory Edit Drawer */}
      <InventoryEditDrawer
        open={isEditDrawerOpen}
        onOpenChange={setIsEditDrawerOpen}
        item={editingItem}
        onSave={handleSaveItem}
        isSaving={isSaving}
      />

      {/* Bottom Navigation */}
      <BottomDock />
    </div>
  );
}
