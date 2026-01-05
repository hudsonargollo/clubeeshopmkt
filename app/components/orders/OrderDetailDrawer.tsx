/**
 * Order Detail Drawer Component
 */

import * as React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '~/components/ui/drawer';
import { Button } from '~/components/ui/button';
import { OrderQRCode } from './OrderQRCode';
import type { Order, DeliveryData, TakeoutData } from '~/lib/orderUtils';
import { formatCurrency, formatDateTime, formatPickupCode } from '~/lib/orderUtils';
import {
  transition,
  getNextHappyPathStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  canCancel,
  type OrderStatus,
} from '~/lib/orderStateMachine';
import { cn } from '~/lib/utils';

export interface OrderDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onStatusUpdate?: (orderId: string, newStatus: OrderStatus) => void;
  onCancel?: (orderId: string) => void;
  isLoading?: boolean;
  showQRCode?: boolean;
}

function getStatusColorClass(status: OrderStatus): string {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
  };
  const color = STATUS_COLORS[status] || 'gray';
  return colorMap[color] || colorMap.gray;
}

export function OrderDetailDrawer({
  open,
  onOpenChange,
  order,
  onStatusUpdate,
  onCancel,
  isLoading = false,
  showQRCode = true,
}: OrderDetailDrawerProps) {
  if (!order) return null;

  const nextStatus = getNextHappyPathStatus(order.status);
  const canAdvance = nextStatus !== null;
  const canCancelOrder = canCancel(order.status);

  const handleAdvance = () => {
    if (nextStatus && onStatusUpdate) {
      const result = transition(order.status, nextStatus);
      if (result.success && result.newStatus) {
        onStatusUpdate(order.id, result.newStatus);
      }
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel(order.id);
    }
  };

  const isTakeout = order.type === 'takeout';
  const isDelivery = order.type === 'delivery';
  const fulfillment = order.fulfillment_data as TakeoutData | DeliveryData;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            Order #{order.id.slice(0, 8)}
            <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColorClass(order.status))}>
              {STATUS_LABELS[order.status]}
            </span>
          </DrawerTitle>
          <DrawerDescription>
            {order.type === 'takeout' ? 'Takeout' : 'Delivery'} - {formatDateTime(order.created_at)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-2 space-y-6 overflow-y-auto">
          {isTakeout && showQRCode && order.pickup_code && (
            <div className="flex justify-center py-4 bg-muted/30 rounded-lg">
              <OrderQRCode orderId={order.id} pickupCode={order.pickup_code} size={150} showPickupCode />
            </div>
          )}

          {isTakeout && order.pickup_code && !showQRCode && (
            <div className="text-center py-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Pickup Code</p>
              <p className="text-4xl font-mono font-bold tracking-wider">{formatPickupCode(order.pickup_code)}</p>
            </div>
          )}

          {isDelivery && (fulfillment as DeliveryData).address && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Delivery Address</h4>
              <p className="text-sm">{(fulfillment as DeliveryData).address.street}</p>
              <p className="text-sm text-muted-foreground">
                {(fulfillment as DeliveryData).address.city}, {(fulfillment as DeliveryData).address.postal_code}
              </p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-3">Items ({order.items.length})</h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium bg-muted px-2 py-1 rounded">{item.quantity}x</span>
                    <span className="text-sm">{item.name || 'Item ' + (idx + 1)}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold">{formatCurrency(order.total)}</span>
          </div>
        </div>

        <DrawerFooter>
          <div className="flex gap-2">
            {canCancelOrder && onCancel && (
              <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>Cancel Order</Button>
            )}
            <div className="flex-1" />
            <DrawerClose asChild>
              <Button variant="outline" disabled={isLoading}>Close</Button>
            </DrawerClose>
            {canAdvance && onStatusUpdate && (
              <Button onClick={handleAdvance} disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Mark as ' + STATUS_LABELS[nextStatus!]}
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default OrderDetailDrawer;
