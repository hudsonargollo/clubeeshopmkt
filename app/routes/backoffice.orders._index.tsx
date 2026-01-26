/**
 * Orders List Page - Backoffice
 * Requirements: 7.1, 7.6 - Order list view with sorting
 * 
 * Displays all orders with tabs, filters, and sorting by date (newest first)
 */

import { useState, useCallback } from 'react';
import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, Link } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { jwtMiddleware, getTenantIdFromPayload } from '~/lib/jwt.server';
import { OrderList, type OrderListFilters, type OrderTab } from '~/components/orders';
import { Button } from '~/components/ui/button';
import type { Order } from '~/lib/orderUtils';
import { Plus, ShoppingBag } from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Pedidos - ClubeeShopMkt Backoffice' },
    { name: 'description', content: 'Gerencie seus pedidos' },
  ];
};

interface LoaderData {
  orders: Order[];
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
      orders: [],
      total: 0,
      authenticated: false,
      error: 'Authentication required',
    });
  }

  if (!payload) {
    return json<LoaderData>({
      orders: [],
      total: 0,
      authenticated: false,
      error: 'Please log in to access orders',
    });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<LoaderData>({
      orders: [],
      total: 0,
      authenticated: true,
      error: 'No tenant assigned to your account',
    });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // Fetch orders with items - sorted by date (newest first)
  const { data: ordersData, error: ordersError, count } = await supabase
    .from('orders')
    .select(`
      id,
      tenant_id,
      type,
      status,
      fulfillment_data,
      pickup_code,
      total,
      created_at,
      updated_at,
      order_items (
        id,
        inventory_id,
        quantity,
        unit_price,
        inventory:inventory_id (
          name
        )
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (ordersError) {
    console.error('Failed to fetch orders:', ordersError);
    return json<LoaderData>({
      orders: [],
      total: 0,
      authenticated: true,
      error: 'Failed to load orders',
    });
  }

  // Transform to Order format
  const orders: Order[] = (ordersData || []).map((order) => ({
    id: order.id,
    tenant_id: order.tenant_id,
    type: order.type as 'takeout' | 'delivery',
    status: order.status as Order['status'],
    fulfillment_data: order.fulfillment_data || {},
    pickup_code: order.pickup_code,
    total: order.total,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: (order.order_items || []).map((item: {
      id: string;
      inventory_id: string;
      quantity: number;
      unit_price: number;
      inventory: { name: string }[] | { name: string } | null;
    }) => {
      // Handle both array and object formats from Supabase
      const inventoryName = Array.isArray(item.inventory) 
        ? item.inventory[0]?.name 
        : item.inventory?.name;
      return {
        id: item.id,
        order_id: order.id,
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        name: inventoryName || 'Unknown Item',
      };
    }),
  }));

  return json<LoaderData>({
    orders,
    total: count || 0,
    authenticated: true,
  });
}

export default function OrdersListPage() {
  const { orders, total, authenticated, error } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<OrderListFilters>({
    tab: 'active',
  });

  const handleFilterChange = useCallback((newFilters: OrderListFilters) => {
    setFilters(newFilters);
  }, []);

  const handleOrderSelect = useCallback((orderId: string) => {
    navigate(`/backoffice/orders/${orderId}`);
  }, [navigate]);

  // Count active orders
  const activeCount = orders.filter(o => 
    ['pending', 'paid', 'processing', 'ready'].includes(o.status)
  ).length;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">Login Necessário</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Erro</h1>
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
              <h1 className="text-xl font-bold">Pedidos</h1>
              <p className="text-sm text-muted-foreground">
                {total} total • {activeCount} ativos
              </p>
            </div>
            <Link to="/backoffice/orders/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            </Link>
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
          <OrderList
            orders={orders}
            filters={filters}
            onFilterChange={handleFilterChange}
            onOrderSelect={handleOrderSelect}
          />
        </motion.div>
      </main>
    </div>
  );
}
