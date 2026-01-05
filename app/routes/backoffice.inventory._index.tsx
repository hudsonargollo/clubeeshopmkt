/**
 * Inventory List Page - Backoffice
 * Requirements: 6.4, 6.5 - Product/Service catalog list view
 * 
 * Displays all products and services with filtering and type distinction
 */

import { useState, useCallback, useEffect } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, Link } from '@remix-run/react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { jwtMiddleware, getTenantIdFromPayload } from '~/lib/jwt.server';
import { ProductGrid } from '~/components/inventory/ProductGrid';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '~/components/ui/select';
import type { ProductCardItem, InventoryType } from '~/components/inventory/ProductCard';
import { Plus, Search, Package, Wrench, Filter, Loader2 } from 'lucide-react';
import { cn } from '~/lib/utils';

export const meta: MetaFunction = () => {
  return [
    { title: 'Inventory - ClubeeShopMkt Backoffice' },
    { name: 'description', content: 'Manage your product and service catalog' },
  ];
};

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface LoaderData {
  products: ProductCardItem[];
  categories: Category[];
  total: number;
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
      categories: [],
      total: 0,
      authenticated: false,
      error: 'Authentication required',
    });
  }

  if (!payload) {
    return json<LoaderData>({
      products: [],
      categories: [],
      total: 0,
      authenticated: false,
      error: 'Please log in to access inventory',
    });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<LoaderData>({
      products: [],
      categories: [],
      total: 0,
      authenticated: true,
      error: 'No tenant assigned to your account',
    });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // Parse query params
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as InventoryType | null;
  const categoryId = url.searchParams.get('category');
  const search = url.searchParams.get('search');

  // Build inventory query
  let query = supabase
    .from('inventory')
    .select('id, type, barcode, name, description, category, category_id, stock, price, image_url', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (search) {
    query = query.textSearch('fts', search, { type: 'websearch' });
  }

  const { data: inventory, error: invError, count } = await query.limit(200);

  if (invError) {
    console.error('Failed to fetch inventory:', invError);
  }

  // Fetch categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('tenant_id', tenantId)
    .order('name');

  // Transform to ProductCardItem format
  const products: ProductCardItem[] = (inventory || []).map((item) => ({
    id: item.id,
    type: (item.type as InventoryType) || 'physical',
    barcode: item.barcode,
    name: item.name,
    description: item.description,
    category: item.category || 'Uncategorized',
    category_id: item.category_id,
    stock: item.stock,
    price: item.price,
    image_url: item.image_url,
  }));

  return json<LoaderData>({
    products,
    categories: categoriesData || [],
    total: count || 0,
    authenticated: true,
  });
}

type FilterType = 'all' | 'physical' | 'service';

export default function InventoryListPage() {
  const { products, categories, total, authenticated, error } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Filter products client-side for instant feedback
  const filteredProducts = products.filter((product) => {
    if (filterType !== 'all' && product.type !== filterType) return false;
    if (filterCategory && product.category_id !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleProductClick = useCallback((product: ProductCardItem) => {
    navigate(`/backoffice/inventory/${product.id}`);
  }, [navigate]);

  // Count by type
  const physicalCount = products.filter(p => p.type === 'physical').length;
  const serviceCount = products.filter(p => p.type === 'service').length;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Login Required</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Package className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Error</h1>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold">Inventory</h1>
              <p className="text-sm text-muted-foreground">
                {total} items • {physicalCount} products • {serviceCount} services
              </p>
            </div>
            <Link to="/backoffice/inventory/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products and services..."
                className="pl-9"
              />
            </div>

            {/* Type filter */}
            <div className="flex rounded-lg border p-1 bg-muted/50">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  filterType === 'all'
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('physical')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  filterType === 'physical'
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Package className="h-3.5 w-3.5" />
                Products
              </button>
              <button
                onClick={() => setFilterType('service')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  filterType === 'service'
                    ? "bg-purple-100 dark:bg-purple-900/30 shadow-sm text-purple-700 dark:text-purple-300"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
                Services
              </button>
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {filteredProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12 text-center text-muted-foreground"
            >
              {searchQuery || filterType !== 'all' || filterCategory ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No items match your filters</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                      setFilterCategory('');
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No products or services yet</p>
                  <p className="text-sm mt-1 mb-4">Add your first item to get started</p>
                  <Link to="/backoffice/inventory/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProductGrid
                products={filteredProducts}
                onProductClick={handleProductClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
