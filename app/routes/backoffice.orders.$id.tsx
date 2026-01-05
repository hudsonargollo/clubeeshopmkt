/**
 * Order Detail Page - Backoffice
 * Requirements: 9.1 - Order detail view with status management
 * 
 * Displays order details and allows status updates
 */

import { useState, useCallback } from 'react';
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, Link, useFetcher } from '@remix-run/react';
import { motion } from 'framer-motion';
import { createSupabaseClientFromRequest, type Env } from '~/lib/supabase.server';
import { jwtMiddleware, getTenantIdFromPayload } from '~/lib/jwt.server';
import { OrderDetailDrawer } from '~/components/orders';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Card } from '~/components/ui/card';
import type { Order } from '~/lib/orderUtils';
import { formatCurrency, formatDateTime, formatPickupCode } from '~/lib/orderUtils';
import {
  transition,
  getValidNextStatuses,
  getNextHappyPathStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  canCancel,
  isTerminalStatus,
  type OrderStatus,
} from '~/lib/orderStateMachine';
import { OrderQRCode } from '~/components/orders/OrderQRCode';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Truck, 
  Clock, 
  MapPin, 
  Package,
  ChevronRight,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from '~/components/ui/toast';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const orderId = data?.order?.id?.slice(0, 8) || 'Unknown';
  return [
    { title: `Order #${orderId} - ClubeeShopMkt Backoffice` },
    { name: 'description', content: 'View and manage order details' },
  ];
};

interface LoaderData {
  order: Order | null;
  authenticated: boolean;
  error?: string;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const orderId = params.id;

  if (!orderId) {
    return json<LoaderData>({
      order: null,
      authenticated: true,
      error: 'Order ID is required',
    });
  }

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) {
    return json<LoaderData>({
      order: null,
      authenticated: false,
      error: 'Authentication required',
    });
  }

  if (!payload) {
    return json<LoaderData>({
      order: null,
      authenticated: false,
      error: 'Please log in to access this page',
    });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json<LoaderData>({
      order: null,
      authenticated: true,
      error: 'No tenant assigned to your account',
    });
  }

  const supabase = createSupabaseClientFromRequest(request, env);

  // Fetch order with items
  const { data: orderData, error: orderError } = await supabase
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
    `)
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .single();

  if (orderError || !orderData) {
    console.error('Failed to fetch order:', orderError);
    return json<LoaderData>({
      order: null,
      authenticated: true,
      error: 'Order not found',
    });
  }

  // Transform to Order format
  const order: Order = {
    id: orderData.id,
    tenant_id: orderData.tenant_id,
    type: orderData.type as 'takeout' | 'delivery',
    status: orderData.status as OrderStatus,
    fulfillment_data: orderData.fulfillment_data || {},
    pickup_code: orderData.pickup_code,
    total: orderData.total,
    created_at: orderData.created_at,
    updated_at: orderData.updated_at,
    items: (orderData.order_items || []).map((item: {
      id: string;
      inventory_id: string;
      quantity: number;
      unit_price: number;
      inventory: { name: string }[] | { name: string } | null;
    }) => {
      const inventoryName = Array.isArray(item.inventory) 
        ? item.inventory[0]?.name 
        : item.inventory?.name;
      return {
        id: item.id,
        order_id: orderData.id,
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        name: inventoryName || 'Unknown Item',
      };
    }),
  };

  return json<LoaderData>({
    order,
    authenticated: true,
  });
}


// Action for status updates
export async function action({ request, context, params }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  const orderId = params.id;

  if (!orderId) {
    return json({ success: false, error: 'Order ID is required' }, { status: 400 });
  }

  // Validate JWT
  const { response: authError, payload } = await jwtMiddleware(request, env);
  if (authError) return authError;
  if (!payload) {
    return json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const tenantId = getTenantIdFromPayload(payload);
  if (!tenantId) {
    return json({ success: false, error: 'Tenant not found' }, { status: 403 });
  }

  const formData = await request.formData();
  const action = formData.get('_action');
  const newStatus = formData.get('status') as OrderStatus;

  const supabase = createSupabaseClientFromRequest(request, env);

  // Get current order status
  const { data: currentOrder, error: fetchError } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !currentOrder) {
    return json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  // Validate transition
  const transitionResult = transition(currentOrder.status as OrderStatus, newStatus);
  if (!transitionResult.success) {
    return json({ success: false, error: transitionResult.error }, { status: 400 });
  }

  // Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  if (updateError) {
    console.error('Failed to update order status:', updateError);
    return json({ success: false, error: 'Failed to update status' }, { status: 500 });
  }

  return json({ success: true, newStatus });
}

function getStatusColorClass(status: OrderStatus): string {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };
  const color = STATUS_COLORS[status] || 'gray';
  return colorMap[color] || colorMap.gray;
}

export default function OrderDetailPage() {
  const { order, authenticated, error } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  
  const isUpdating = fetcher.state !== 'idle';

  // Handle status update
  const handleStatusUpdate = useCallback((newStatus: OrderStatus) => {
    fetcher.submit(
      { _action: 'updateStatus', status: newStatus },
      { method: 'post' }
    );
  }, [fetcher]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    fetcher.submit(
      { _action: 'updateStatus', status: 'cancelled' },
      { method: 'post' }
    );
  }, [fetcher]);

  // Show toast on fetcher completion
  if (fetcher.data && !isUpdating) {
    const data = fetcher.data as { success: boolean; error?: string; newStatus?: string };
    if (data.success) {
      toast.success(`Status updated to ${STATUS_LABELS[data.newStatus as OrderStatus] || data.newStatus}`);
    } else if (data.error) {
      toast.error(data.error);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-semibold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || 'The order could not be found.'}</p>
          <Link to="/backoffice/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isDelivery = order.type === 'delivery';
  const isTakeout = order.type === 'takeout';
  const isTerminal = isTerminalStatus(order.status);
  const validNextStatuses = getValidNextStatuses(order.status);
  const nextHappyPathStatus = getNextHappyPathStatus(order.status);
  const canCancelOrder = canCancel(order.status);

  // Extract fulfillment data
  const deliveryData = isDelivery ? (order.fulfillment_data as { address?: { street: string; city: string; postal_code: string }; delivery_notes?: string }) : null;
  const takeoutData = isTakeout ? (order.fulfillment_data as { pickup_time?: string }) : null;

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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {isDelivery ? (
                  <Truck className="h-5 w-5 text-blue-500" />
                ) : (
                  <ShoppingBag className="h-5 w-5 text-green-500" />
                )}
                <h1 className="text-xl font-bold">Order #{order.id.slice(0, 8)}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(order.created_at)}
              </p>
            </div>
            
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColorClass(order.status)}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* QR Code for Takeout */}
            {isTakeout && order.pickup_code && (
              <Card className="p-6">
                <div className="flex flex-col items-center">
                  <OrderQRCode orderId={order.id} size={150} />
                  <p className="mt-4 text-2xl font-mono font-bold">
                    {formatPickupCode(order.pickup_code)}
                  </p>
                  <p className="text-sm text-muted-foreground">Pickup Code</p>
                </div>
              </Card>
            )}

            {/* Delivery Address */}
            {isDelivery && deliveryData?.address && (
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-medium mb-1">Delivery Address</h3>
                    <p className="text-muted-foreground">
                      {deliveryData.address.street}
                    </p>
                    <p className="text-muted-foreground">
                      {deliveryData.address.city}, {deliveryData.address.postal_code}
                    </p>
                    {deliveryData.delivery_notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        Note: {deliveryData.delivery_notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Pickup Time */}
            {isTakeout && takeoutData?.pickup_time && (
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Pickup Time</h3>
                    <p className="text-muted-foreground">{takeoutData.pickup_time}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Order Items */}
            <Card className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items ({order.items?.length || 0})
              </h3>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name || 'Unknown Item'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium ml-4">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Total */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold">{formatCurrency(order.total)}</span>
              </div>
            </Card>
          </div>

          {/* Right Column - Status Management */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="p-6">
              <h3 className="font-medium mb-4">Order Status</h3>
              
              {!isTerminal ? (
                <div className="space-y-4">
                  {/* Status Dropdown */}
                  <Select
                    value={order.status}
                    onValueChange={(value) => handleStatusUpdate(value as OrderStatus)}
                    disabled={isUpdating || validNextStatuses.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={order.status} disabled>
                        {STATUS_LABELS[order.status]} (current)
                      </SelectItem>
                      {validNextStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="flex items-center gap-2">
                            <ChevronRight className="h-3 w-3" />
                            {STATUS_LABELS[status]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Quick Advance Button */}
                  {nextHappyPathStatus && (
                    <Button
                      className="w-full"
                      onClick={() => handleStatusUpdate(nextHappyPathStatus)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      Advance to {STATUS_LABELS[nextHappyPathStatus]}
                    </Button>
                  )}

                  {/* Cancel Button */}
                  {canCancelOrder && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleCancel}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Cancel Order
                    </Button>
                  )}
                </div>
              ) : (
                <div className={`p-4 rounded-lg text-center ${
                  order.status === 'completed' 
                    ? "bg-green-50 dark:bg-green-900/20" 
                    : "bg-red-50 dark:bg-red-900/20"
                }`}>
                  <p className="font-medium">
                    {order.status === 'completed' 
                      ? '✓ Order Completed' 
                      : '✕ Order Cancelled'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDateTime(order.updated_at)}
                  </p>
                </div>
              )}
            </Card>

            {/* Order Timeline */}
            <Card className="p-6">
              <h3 className="font-medium mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Created</span>
                  <span className="ml-auto">{formatDateTime(order.created_at)}</span>
                </div>
                {order.updated_at !== order.created_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="ml-auto">{formatDateTime(order.updated_at)}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
