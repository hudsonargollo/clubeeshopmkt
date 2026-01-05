/**
 * POS Interface Component
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8 - Manual order creation
 * 
 * Point-of-Sale interface for staff to create orders for walk-in customers
 */

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Package, 
  Wrench,
  Truck,
  ShoppingBag,
  X,
  Loader2,
  ScanLine
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card } from '~/components/ui/card';
import { formatCurrency } from '~/lib/orderUtils';
import type { OrderType } from '~/lib/orderStateMachine';
import { cn } from '~/lib/utils';

export type InventoryType = 'physical' | 'service';

/**
 * Product item from inventory
 */
export interface POSProduct {
  id: string;
  type: InventoryType;
  barcode: string | null;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  stock: number;
  image_url?: string | null;
}

/**
 * Cart item with quantity
 */
export interface POSCartItem {
  inventory_id: string;
  name: string;
  price: number;
  quantity: number;
  type: InventoryType;
  available_stock: number;
  image_url?: string | null;
}

/**
 * Props for POSInterface component
 */
export interface POSInterfaceProps {
  /** Available products to search/add */
  products: POSProduct[];
  /** Callback when checkout is initiated */
  onCheckout: (items: POSCartItem[], type: OrderType) => Promise<void>;
  /** Callback when barcode is scanned (from scanner hook) */
  onBarcodeScan?: (barcode: string) => void;
  /** Whether checkout is in progress */
  isProcessing?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Success message to display */
  success?: string | null;
}


/**
 * POSInterface - Point-of-Sale interface for manual order creation
 * 
 * Features:
 * - Product search by name or barcode (Requirement 8.2)
 * - Barcode scanner integration (Requirement 8.3)
 * - Cart management with quantity adjustment (Requirements 8.4, 8.5, 8.6)
 * - Running total display (Requirement 8.7)
 * - Fulfillment type selection (Requirement 8.8)
 */
export function POSInterface({
  products,
  onCheckout,
  onBarcodeScan,
  isProcessing = false,
  error,
  success,
}: POSInterfaceProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Cart state
  const [cart, setCart] = useState<POSCartItem[]>([]);
  
  // Fulfillment type state (Requirement 8.8)
  const [fulfillmentType, setFulfillmentType] = useState<OrderType>('takeout');

  // Filter products based on search query (Requirement 8.2)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    return products.filter(product => 
      product.name.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.toLowerCase().includes(query)) ||
      product.category.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
  }, [products, searchQuery]);

  // Calculate cart total (Requirement 8.7)
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Calculate total items in cart
  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Add product to cart (Requirement 8.4)
  const addToCart = useCallback((product: POSProduct) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.inventory_id === product.id);
      
      if (existingItem) {
        // Check stock for physical products
        if (product.type === 'physical' && existingItem.quantity >= product.stock) {
          return prevCart; // Can't add more than available stock
        }
        
        return prevCart.map(item =>
          item.inventory_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      // Add new item
      return [...prevCart, {
        inventory_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        type: product.type,
        available_stock: product.stock,
        image_url: product.image_url,
      }];
    });
    
    // Clear search after adding
    setSearchQuery('');
    setIsSearchFocused(false);
  }, []);

  // Update item quantity (Requirement 8.5)
  const updateQuantity = useCallback((inventoryId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.inventory_id !== inventoryId) return item;
        
        const newQuantity = item.quantity + delta;
        
        // Remove if quantity becomes 0
        if (newQuantity <= 0) return null;
        
        // Check stock for physical products
        if (item.type === 'physical' && newQuantity > item.available_stock) {
          return item;
        }
        
        return { ...item, quantity: newQuantity };
      }).filter((item): item is POSCartItem => item !== null);
    });
  }, []);

  // Remove item from cart (Requirement 8.6)
  const removeFromCart = useCallback((inventoryId: string) => {
    setCart(prevCart => prevCart.filter(item => item.inventory_id !== inventoryId));
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Handle barcode scan (Requirement 8.3)
  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
    }
    onBarcodeScan?.(barcode);
  }, [products, addToCart, onBarcodeScan]);

  // Handle checkout (Requirement 8.9)
  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;
    await onCheckout(cart, fulfillmentType);
  }, [cart, fulfillmentType, onCheckout]);

  // Handle search input - check for barcode pattern
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Check if it looks like a barcode (all digits, 8-13 chars)
    if (/^\d{8,13}$/.test(value.trim())) {
      handleBarcodeScan(value.trim());
      setSearchQuery('');
    }
  }, [handleBarcodeScan]);

  // Handle search result selection
  const handleSelectProduct = useCallback((product: POSProduct) => {
    addToCart(product);
  }, [addToCart]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Panel - Product Search */}
      <div className="flex-1 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search products by name or scan barcode..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="pl-10 pr-10"
            aria-label="Search products"
            aria-describedby="search-hint"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Scanner indicator */}
        <div id="search-hint" className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          <span>Barcode scanner ready - scan or type to search</span>
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {isSearchFocused && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full max-w-xl bg-card border rounded-lg shadow-lg overflow-hidden"
            >
              {searchResults.map((product) => (
                <SearchResultItem
                  key={product.id}
                  product={product}
                  onSelect={handleSelectProduct}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Add Grid - Show popular/recent products */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.slice(0, 8).map((product) => (
            <QuickAddCard
              key={product.id}
              product={product}
              onAdd={addToCart}
              inCart={cart.some(item => item.inventory_id === product.id)}
            />
          ))}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-96 flex flex-col" role="region" aria-label="Shopping cart">
        <Card className="flex-1 flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart
                {cartItemCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Cart is empty</p>
                <p className="text-sm mt-1">Search or scan products to add</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.inventory_id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="p-4 border-t space-y-4">
              {/* Fulfillment Type Selector (Requirement 8.8) */}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Fulfillment Type</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Select fulfillment type">
                  <Button
                    variant={fulfillmentType === 'takeout' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setFulfillmentType('takeout')}
                    role="radio"
                    aria-checked={fulfillmentType === 'takeout'}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" aria-hidden="true" />
                    Takeout
                  </Button>
                  <Button
                    variant={fulfillmentType === 'delivery' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setFulfillmentType('delivery')}
                    role="radio"
                    aria-checked={fulfillmentType === 'delivery'}
                  >
                    <Truck className="h-4 w-4 mr-2" aria-hidden="true" />
                    Delivery
                  </Button>
                </div>
              </fieldset>

              {/* Total */}
              <div className="flex items-center justify-between py-2 border-t">
                <span className="text-lg font-medium">Total</span>
                <span className="text-2xl font-bold">{formatCurrency(cartTotal)}</span>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-500/10 text-green-600 text-sm rounded-lg">
                  {success}
                </div>
              )}

              {/* Checkout Button */}
              <Button
                className="w-full h-12 text-lg"
                onClick={handleCheckout}
                disabled={isProcessing || cart.length === 0}
                aria-busy={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                    Processing...
                  </>
                ) : (
                  <>
                    Create Order
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


/**
 * Search result item component
 */
interface SearchResultItemProps {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
}

function SearchResultItem({ product, onSelect }: SearchResultItemProps) {
  const isService = product.type === 'service';
  const isOutOfStock = !isService && product.stock <= 0;
  const TypeIcon = isService ? Wrench : Package;

  return (
    <button
      onClick={() => !isOutOfStock && onSelect(product)}
      disabled={isOutOfStock}
      className={cn(
        "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left",
        isOutOfStock && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Product image or icon */}
      {product.image_url ? (
        <img
          src={product.image_url}
          alt=""
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <div className={cn(
          "h-10 w-10 rounded flex items-center justify-center",
          isService ? "bg-purple-100 dark:bg-purple-900/30" : "bg-muted"
        )}>
          <TypeIcon className={cn(
            "h-5 w-5",
            isService ? "text-purple-500" : "text-muted-foreground"
          )} />
        </div>
      )}

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{product.name}</p>
        <p className="text-sm text-muted-foreground">
          {product.barcode && <span className="mr-2">{product.barcode}</span>}
          {product.category}
        </p>
      </div>

      {/* Price and stock */}
      <div className="text-right">
        <p className="font-medium">{formatCurrency(product.price)}</p>
        {!isService && (
          <p className={cn(
            "text-xs",
            isOutOfStock ? "text-destructive" : "text-muted-foreground"
          )}>
            {isOutOfStock ? "Out of stock" : `${product.stock} in stock`}
          </p>
        )}
        {isService && (
          <span className="text-xs text-purple-500">Service</span>
        )}
      </div>
    </button>
  );
}

/**
 * Quick add card for product grid
 */
interface QuickAddCardProps {
  product: POSProduct;
  onAdd: (product: POSProduct) => void;
  inCart: boolean;
}

function QuickAddCard({ product, onAdd, inCart }: QuickAddCardProps) {
  const isService = product.type === 'service';
  const isOutOfStock = !isService && product.stock <= 0;
  const TypeIcon = isService ? Wrench : Package;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={cn(
        "relative p-3 rounded-lg border bg-card text-left transition-colors",
        "hover:border-primary/50 hover:shadow-sm",
        isOutOfStock && "opacity-50 cursor-not-allowed",
        inCart && "border-primary bg-primary/5",
        isService && "border-l-4 border-l-purple-500"
      )}
    >
      {/* Type icon */}
      <div className={cn(
        "h-8 w-8 rounded flex items-center justify-center mb-2",
        isService ? "bg-purple-100 dark:bg-purple-900/30" : "bg-muted"
      )}>
        <TypeIcon className={cn(
          "h-4 w-4",
          isService ? "text-purple-500" : "text-muted-foreground"
        )} />
      </div>

      {/* Product name */}
      <p className="font-medium text-sm line-clamp-2 mb-1">{product.name}</p>

      {/* Price */}
      <p className={cn(
        "font-bold",
        isService && "text-purple-600 dark:text-purple-400"
      )}>
        {formatCurrency(product.price)}
      </p>

      {/* In cart indicator */}
      {inCart && (
        <div className="absolute top-2 right-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Service badge */}
      {isService && (
        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-medium rounded">
          Service
        </span>
      )}
    </motion.button>
  );
}

/**
 * Cart item row component
 */
interface CartItemRowProps {
  item: POSCartItem;
  onUpdateQuantity: (inventoryId: string, delta: number) => void;
  onRemove: (inventoryId: string) => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const isService = item.type === 'service';
  const TypeIcon = isService ? Wrench : Package;
  const canIncrease = isService || item.quantity < item.available_stock;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card/50",
        isService && "border-l-4 border-l-purple-500"
      )}
    >
      {/* Product icon */}
      <div className={cn(
        "h-10 w-10 rounded flex items-center justify-center flex-shrink-0",
        isService ? "bg-purple-100 dark:bg-purple-900/30" : "bg-muted"
      )}>
        {item.image_url ? (
          <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <TypeIcon className={cn(
            "h-5 w-5",
            isService ? "text-purple-500" : "text-muted-foreground"
          )} />
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(item.price)} each
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1" role="group" aria-label={`Quantity controls for ${item.name}`}>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.inventory_id, -1)}
          aria-label={item.quantity === 1 ? `Remove ${item.name} from cart` : `Decrease quantity of ${item.name}`}
        >
          {item.quantity === 1 ? (
            <Trash2 className="h-3 w-3 text-destructive" aria-hidden="true" />
          ) : (
            <Minus className="h-3 w-3" aria-hidden="true" />
          )}
        </Button>
        
        <span className="w-8 text-center font-medium text-sm" aria-label={`Quantity: ${item.quantity}`}>
          {item.quantity}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.inventory_id, 1)}
          disabled={!canIncrease}
          aria-label={`Increase quantity of ${item.name}`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
        </Button>
      </div>

      {/* Item total */}
      <div className="w-16 text-right">
        <p className="font-medium text-sm">
          {formatCurrency(item.price * item.quantity)}
        </p>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(item.inventory_id)}
        aria-label={`Remove ${item.name} from cart`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </motion.div>
  );
}

export default POSInterface;
