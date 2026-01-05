/**
 * Webshop - Customer-facing storefront
 * Requirements: Mobile-first customer shopping experience with real Supabase data
 */

import { useState, useCallback } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { createSupabaseClient, type Env, type Database } from '~/lib/supabase.server';
import { resolveTenantFromRequest } from '~/lib/tenant';
import { BottomDock, useDockItems } from '~/components/ui/BottomDock';
import { SearchPalette, useSearchPalette } from '~/components/ui/SearchPalette';
import { ProductGrid } from '~/components/inventory/ProductGrid';
import { CartDrawer, type CartItem } from '~/components/cart/CartDrawer';
import type { SearchResult } from '~/hooks/useInventorySearch';
import type { ProductCardItem } from '~/components/inventory/ProductCard';
import { ShoppingBag, AlertCircle } from 'lucide-react';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const tenantName = data?.tenant?.name || 'Shop';
  return [
    { title: `${tenantName} - ClubeeShopMkt` },
    { name: 'description', content: `Browse and order products from ${tenantName}` },
  ];
};

interface LoaderData {
  products: ProductCardItem[];
  categories: string[];
  tenant: { id: string; name: string; subdomain: string } | null;
  error?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs): Promise<ReturnType<typeof json<LoaderData>>> {
  const env = context.cloudflare.env as Env;
  const supabase = createSupabaseClient(env);

  // Resolve tenant from request (subdomain or path)
  const tenant = await resolveTenantFromRequest(request, supabase);
  
  if (!tenant) {
    // Return empty state if no tenant found - could be localhost dev
    return json<LoaderData>({
      products: [],
      categories: [],
      tenant: null,
      error: 'No tenant found. Access via subdomain (e.g., demo.yoursite.com) or create a tenant.',
    });
  }

  // Fetch inventory for this tenant (public catalog - no auth required)
  const { data: inventory, error } = await supabase
    .from('inventory')
    .select('id, barcode, name, category, stock, price, image_url')
    .eq('tenant_id', tenant.id)
    .gt('stock', 0) // Only show in-stock items for shop
    .order('category')
    .order('name')
    .limit(100);

  if (error) {
    console.error('Failed to fetch inventory:', error);
    return json<LoaderData>({
      products: [],
      categories: [],
      tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
      error: 'Failed to load products',
    });
  }

  // Transform to ProductCardItem format
  const products: ProductCardItem[] = (inventory || []).map((item) => ({
    id: item.id,
    barcode: item.barcode,
    name: item.name,
    category: item.category || 'Uncategorized',
    stock: item.stock,
    price: item.price,
    image_url: item.image_url,
  }));

  // Extract unique categories
  const categories = [...new Set(products.map(p => p.category))].sort();

  return json<LoaderData>({
    products,
    categories,
    tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
  });
}

export default function ShopPage() {
  const { products: initialProducts, categories, tenant, error } = useLoaderData<typeof loader>();
  const [products] = useState<ProductCardItem[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Search palette
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchPalette();

  // Filter products by category
  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products;

  // Handle add to cart
  const handleAddToCart = useCallback((product: ProductCardItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.inventoryId === product.id);
      if (existing) {
        return prev.map(item =>
          item.inventoryId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: `cart-${product.id}-${Date.now()}`,
        inventoryId: product.id,
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: product.image_url,
        maxStock: product.stock,
      }];
    });
  }, []);

  // Handle search result selection
  const handleSearchSelect = useCallback((result: SearchResult) => {
    const product = products.find(p => p.id === result.id);
    if (product) {
      handleAddToCart(product);
    }
    setSearchOpen(false);
  }, [products, handleAddToCart, setSearchOpen]);

  // Cart operations
  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    setCart(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  const handleCheckout = useCallback(() => {
    // TODO: Implement checkout flow
    console.log('Checkout:', cart);
    alert('Checkout functionality coming soon!');
  }, [cart]);

  // Calculate cart count for dock badge
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const dockItems = useDockItems(cartCount);

  // Error state
  if (error && !tenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Shop Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{tenant?.name || 'Shop'}</h1>
              <p className="text-sm text-muted-foreground">Fresh products delivered</p>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={`Cart with ${cartCount} items`}
            >
              <ShoppingBag className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground rounded-full">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Search bar */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full mt-3 px-4 py-2.5 text-left text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            Search products... (⌘K)
          </button>
        </div>
      </header>

      {/* Categories */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <main className="container mx-auto px-4 pb-6">
        {filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No products available</p>
          </div>
        ) : (
          <ProductGrid
            products={filteredProducts}
            onAddToCart={handleAddToCart}
          />
        )}
      </main>

      {/* Search Palette */}
      <SearchPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleSearchSelect}
      />

      {/* Cart Drawer */}
      <CartDrawer
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        items={cart}
        onQuantityChange={handleQuantityChange}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onCheckout={handleCheckout}
      />

      {/* Bottom Navigation */}
      <BottomDock items={dockItems} />
    </div>
  );
}
