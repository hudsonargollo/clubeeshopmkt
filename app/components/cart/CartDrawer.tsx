/**
 * Cart Drawer Component
 * Requirements: 11.2 - Use bottom-sheet Drawers for mobile editing
 * 
 * Mobile-friendly drawer for viewing and managing shopping cart
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '~/lib/orderUtils';
import { cn } from '~/lib/utils';

export interface CartItem {
  id: string;
  inventoryId: string;
  barcode: string | null;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  maxStock?: number;
}

export interface CartDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Cart items */
  items: CartItem[];
  /** Callback when item quantity changes */
  onQuantityChange: (itemId: string, quantity: number) => void;
  /** Callback when item is removed */
  onRemoveItem: (itemId: string) => void;
  /** Callback when checkout is initiated */
  onCheckout: () => void;
  /** Callback to clear the entire cart */
  onClearCart?: () => void;
  /** Whether checkout is in progress */
  isCheckingOut?: boolean;
}

/**
 * CartDrawer - Mobile drawer for shopping cart
 * 
 * Features:
 * - Animated item list with Framer Motion
 * - Quantity adjustment controls
 * - Item removal with swipe gesture support
 * - Order total calculation
 * - Checkout action
 */
export function CartDrawer({
  open,
  onOpenChange,
  items,
  onQuantityChange,
  onRemoveItem,
  onCheckout,
  onClearCart,
  isCheckingOut = false,
}: CartDrawerProps) {
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuantityChange = (item: CartItem, delta: number) => {
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      onRemoveItem(item.id);
    } else if (!item.maxStock || newQuantity <= item.maxStock) {
      onQuantityChange(item.id, newQuantity);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart
            {itemCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {itemCount}
              </span>
            )}
          </DrawerTitle>
          <DrawerDescription>
            {items.length === 0
              ? 'Your cart is empty'
              : `${items.length} item${items.length !== 1 ? 's' : ''} in cart`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-2 overflow-y-auto flex-1">
          {/* Empty state */}
          {items.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No items in your cart</p>
              <p className="text-sm mt-1">Scan products to add them</p>
            </div>
          )}

          {/* Cart items */}
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 py-3 border-b last:border-0"
              >
                {/* Product image */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-14 w-14 rounded object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded bg-muted flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.price)} each
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(item, -1)}
                  >
                    {item.quantity === 1 ? (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <span className="w-8 text-center font-medium">
                    {item.quantity}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleQuantityChange(item, 1)}
                    disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Item total */}
                <div className="w-20 text-right">
                  <p className="font-medium">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer with totals and actions */}
        {items.length > 0 && (
          <DrawerFooter className="border-t">
            {/* Subtotal */}
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-xl font-bold">{formatCurrency(subtotal)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {onClearCart && (
                <Button
                  variant="outline"
                  onClick={onClearCart}
                  disabled={isCheckingOut}
                  className="text-destructive hover:text-destructive"
                >
                  Clear Cart
                </Button>
              )}
              
              <div className="flex-1" />
              
              <DrawerClose asChild>
                <Button variant="outline" disabled={isCheckingOut}>
                  Continue Shopping
                </Button>
              </DrawerClose>
              
              <Button
                onClick={onCheckout}
                disabled={isCheckingOut || items.length === 0}
                className="min-w-[120px]"
              >
                {isCheckingOut ? 'Processing...' : 'Checkout'}
              </Button>
            </div>
          </DrawerFooter>
        )}

        {/* Empty cart footer */}
        {items.length === 0 && (
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Start Shopping
              </Button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default CartDrawer;
