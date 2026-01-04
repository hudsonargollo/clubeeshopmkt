/**
 * Delivery Dashboard Component
 * Requirements: 9.3, 9.4 - Delivery orders grouped by neighborhood/route
 * 
 * Displays delivery orders organized for efficient routing
 */

import { useMemo } from 'react';
import type { Order, DeliveryData } from '~/lib/orderUtils';
import { formatCurrency, formatDateTime } from '~/lib/orderUtils';
import { STATUS_LABELS, STATUS_COLORS } from '~/lib/orderStateMachine';

export interface DeliveryDashboardProps {
  /** List of delivery orders to display */
  orders: Order[];
  /** Callback when an order is selected */
  onOrderSelect?: (order: Order) => void;
  /** Callback when order status should be updated */
  onStatusUpdate?: (orderId: string, newStatus: Order['status']) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Group orders by neighborhood/area based on postal code prefix
 */
function groupOrdersByArea(orders: Order[]): Map<string, Order[]> {
  const groups = new Map<string, Order[]>();
  
  for (const order of orders) {
    if (order.type !== 'delivery') continue;
    
    const fulfillment = order.fulfillment_data as DeliveryData;
    const postalCode = fulfillment?.address?.postal_code || 'Unknown';
    // Group by first 3 digits of postal code (neighborhood level)
    const areaKey = postalCode.slice(0, 3) || 'Unknown';
    
    if (!groups.has(areaKey)) {
      groups.set(areaKey, []);
    }
    groups.get(areaKey)!.push(order);
  }
  
  return groups;
}

/**
 * Get status badge color class
 */
function getStatusColorClass(status: Order['status']): string {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  
  const color = STATUS_COLORS[status] || 'gray';
  return colorMap[color] || colorMap.gray;
}

/**
 * DeliveryDashboard - Displays delivery orders grouped by area
 * 
 * Orders are grouped by postal code prefix for efficient route planning.
 * Staff can view order details and update status from this dashboard.
 * 
 * @example
 * ```tsx
 * <DeliveryDashboard
 *   orders={deliveryOrders}
 *   onOrderSelect={(order) => openOrderDetail(order)}
 *   onStatusUpdate={(id, status) => updateOrderStatus(id, status)}
 * />
 * ```
 */
export function DeliveryDashboard({
  orders,
  onOrderSelect,
  onStatusUpdate,
  className = '',
}: DeliveryDashboardProps) {
  // Filter to only delivery orders and group by area
  const deliveryOrders = useMemo(
    () => orders.filter(o => o.type === 'delivery'),
    [orders]
  );
  
  const groupedOrders = useMemo(
    () => groupOrdersByArea(deliveryOrders),
    [deliveryOrders]
  );
  
  // Sort areas by number of orders (busiest first)
  const sortedAreas = useMemo(
    () => Array.from(groupedOrders.entries()).sort((a, b) => b[1].length - a[1].length),
    [groupedOrders]
  );

  // Stats
  const stats = useMemo(() => {
    const processing = deliveryOrders.filter(o => o.status === 'processing').length;
    const ready = deliveryOrders.filter(o => o.status === 'ready').length;
    const total = deliveryOrders.length;
    return { processing, ready, total };
  }, [deliveryOrders]);

  if (deliveryOrders.length === 0) {
    return (
      <div className={`p-8 text-center text-muted-foreground ${className}`}>
        <p>No delivery orders at the moment</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">Total Deliveries</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">Processing</p>
          <p className="text-2xl font-bold text-orange-600">{stats.processing}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">Ready for Delivery</p>
          <p className="text-2xl font-bold text-green-600">{stats.ready}</p>
        </div>
      </div>

      {/* Grouped Orders */}
      <div className="space-y-4">
        {sortedAreas.map(([area, areaOrders]) => (
          <div key={area} className="bg-card rounded-lg border overflow-hidden">
            {/* Area Header */}
            <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h3 className="font-semibold">Area {area}</h3>
                <span className="text-sm text-muted-foreground">
                  ({areaOrders.length} order{areaOrders.length !== 1 ? 's' : ''})
                </span>
              </div>
            </div>

            {/* Orders List */}
            <div className="divide-y">
              {areaOrders.map((order) => {
                const fulfillment = order.fulfillment_data as DeliveryData;
                
                return (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => onOrderSelect?.(order)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-muted-foreground">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColorClass(order.status)}`}>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </div>
                        
                        {/* Address */}
                        <p className="text-sm font-medium truncate">
                          {fulfillment?.address?.street}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {fulfillment?.address?.city}, {fulfillment?.address?.postal_code}
                        </p>
                        
                        {/* Delivery Notes */}
                        {fulfillment?.delivery_notes && (
                          <p className="mt-1 text-xs text-muted-foreground italic">
                            Note: {fulfillment.delivery_notes}
                          </p>
                        )}
                      </div>

                      {/* Order Total & Time */}
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.created_at)}
                        </p>
                        
                        {/* Quick Actions */}
                        {order.status === 'processing' && onStatusUpdate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusUpdate(order.id, 'ready');
                            }}
                            className="mt-2 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'ready' && onStatusUpdate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStatusUpdate(order.id, 'completed');
                            }}
                            className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-muted rounded"
                        >
                          {item.quantity}x {item.name || `Item ${idx + 1}`}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-muted-foreground">
                          +{order.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeliveryDashboard;
