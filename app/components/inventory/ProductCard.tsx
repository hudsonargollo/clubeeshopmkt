/**
 * Product Card Component with Layout Animation
 * Requirements: 11.3 - Animate item "flying" to cart using Framer Motion layoutId
 * Requirements: 16.1, 16.2, 16.3, 16.4 - Visual distinction for services
 * 
 * Product display card that animates when added to cart
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Package, Wrench } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { formatCurrency } from '~/lib/orderUtils';
import { cn } from '~/lib/utils';

export type InventoryType = 'physical' | 'service';

export interface ProductCardItem {
  id: string;
  type?: InventoryType;
  barcode: string | null;
  name: string;
  description?: string | null;
  category: string;
  category_id?: string | null;
  price: number;
  stock: number;
  image_url?: string | null;
}

export interface ProductCardProps {
  /** Product data */
  product: ProductCardItem;
  /** Callback when add to cart is clicked */
  onAddToCart?: (product: ProductCardItem) => void;
  /** Callback when card is clicked */
  onClick?: (product: ProductCardItem) => void;
  /** Whether the product is being added to cart (shows animation) */
  isAddingToCart?: boolean;
  /** Whether to use layout animation */
  enableLayoutAnimation?: boolean;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Spring animation config for smooth, natural motion
 * Requirements: 11.3 - Configure spring physics (stiffness: 300, damping: 30)
 */
const springConfig = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

/**
 * ProductCard - Animated product display card
 * 
 * Features:
 * - Layout animation with layoutId for cart transitions
 * - Hover lift effect
 * - Stock status indicator
 * - Add to cart button with loading state
 */
export function ProductCard({
  product,
  onAddToCart,
  onClick,
  isAddingToCart = false,
  enableLayoutAnimation = true,
  className = '',
}: ProductCardProps) {
  const isService = product.type === 'service';
  const isOutOfStock = !isService && product.stock <= 0;
  const isLowStock = !isService && product.stock > 0 && product.stock <= 5;

  // Services are always "in stock" since they don't have inventory
  const canAddToCart = isService || !isOutOfStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canAddToCart && onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleClick = () => {
    onClick?.(product);
  };

  // Get the appropriate icon based on type
  const TypeIcon = isService ? Wrench : Package;

  const CardWrapper = enableLayoutAnimation ? motion.div : 'div';
  const cardProps = enableLayoutAnimation
    ? {
        layoutId: `product-${product.id}`,
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
        transition: springConfig,
        whileHover: { y: -4, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' },
        whileTap: { scale: 0.98 },
      }
    : {};

  return (
    <CardWrapper
      {...cardProps}
      className={cn(
        'group relative bg-card rounded-xl border overflow-hidden cursor-pointer',
        'transition-shadow duration-200',
        isOutOfStock && 'opacity-60',
        // Purple left border accent for services (Requirement 16.3)
        isService && 'border-l-4 border-l-purple-500',
        className
      )}
      onClick={handleClick}
    >
      {/* Product Image */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        {product.image_url ? (
          <motion.img
            layoutId={enableLayoutAnimation ? `product-image-${product.id}` : undefined}
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            transition={springConfig}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Type-specific icon (Requirements 16.1, 16.2) */}
            <TypeIcon className={cn(
              "h-12 w-12",
              isService ? "text-purple-400" : "text-muted-foreground/30"
            )} />
          </div>
        )}

        {/* Service badge (Requirement 16.3) */}
        {isService && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Service
            </span>
          </div>
        )}

        {/* Stock badge - only for physical products */}
        {!isService && isOutOfStock && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="px-3 py-1 bg-destructive text-destructive-foreground text-sm font-medium rounded-full">
              Out of Stock
            </span>
          </div>
        )}

        {isLowStock && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs font-medium rounded-full">
              Only {product.stock} left
            </span>
          </div>
        )}

        {/* Quick add button (appears on hover) */}
        {canAddToCart && onAddToCart && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Button
              size="icon"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className={cn(
                "h-10 w-10 rounded-full shadow-lg",
                isService && "bg-purple-500 hover:bg-purple-600"
              )}
            >
              {isAddingToCart ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <ShoppingCart className="h-5 w-5" />
                </motion.div>
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {/* Type icon in info section */}
          <TypeIcon className={cn(
            "h-3 w-3",
            isService ? "text-purple-500" : "text-muted-foreground"
          )} />
          <p className="text-xs text-muted-foreground">{product.category}</p>
        </div>
        <motion.h3
          layoutId={enableLayoutAnimation ? `product-name-${product.id}` : undefined}
          className="font-medium line-clamp-2 mb-2"
          transition={springConfig}
        >
          {product.name}
        </motion.h3>
        <div className="flex items-center justify-between">
          <motion.span
            layoutId={enableLayoutAnimation ? `product-price-${product.id}` : undefined}
            className={cn(
              "text-lg font-bold",
              isService && "text-purple-600 dark:text-purple-400"
            )}
            transition={springConfig}
          >
            {formatCurrency(product.price)}
          </motion.span>
          
          {/* Mobile add button */}
          {canAddToCart && onAddToCart && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className={cn(
                "md:hidden",
                isService && "border-purple-500 text-purple-600 hover:bg-purple-50"
              )}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </CardWrapper>
  );
}

/**
 * Animated cart icon that receives "flying" items
 */
export interface AnimatedCartIconProps {
  /** Number of items in cart */
  itemCount: number;
  /** Whether an item is currently being added */
  isReceiving?: boolean;
  /** Optional CSS class name */
  className?: string;
}

export function AnimatedCartIcon({
  itemCount,
  isReceiving = false,
  className = '',
}: AnimatedCartIconProps) {
  return (
    <motion.div
      className={cn('relative', className)}
      animate={isReceiving ? { scale: [1, 1.2, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <ShoppingCart className="h-6 w-6" />
      
      {/* Badge */}
      {itemCount > 0 && (
        <motion.span
          key={itemCount}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'absolute -top-2 -right-2',
            'min-w-[20px] h-5 px-1',
            'flex items-center justify-center',
            'text-xs font-bold',
            'bg-destructive text-destructive-foreground',
            'rounded-full'
          )}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </motion.span>
      )}

      {/* Pulse effect when receiving */}
      {isReceiving && (
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.div>
  );
}

export default ProductCard;
