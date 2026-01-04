/**
 * Product Grid Component with Layout Animations
 * Requirements: 11.3 - Layout animations for cart with Framer Motion
 * 
 * Grid display of products with animated add-to-cart transitions
 */

import * as React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { ProductCard, type ProductCardItem } from './ProductCard';
import { cn } from '~/lib/utils';

export interface ProductGridProps {
  /** Products to display */
  products: ProductCardItem[];
  /** Callback when add to cart is clicked */
  onAddToCart?: (product: ProductCardItem) => void;
  /** Callback when product card is clicked */
  onProductClick?: (product: ProductCardItem) => void;
  /** IDs of products currently being added to cart */
  addingToCartIds?: Set<string>;
  /** Whether to show loading skeleton */
  isLoading?: boolean;
  /** Number of skeleton items to show when loading */
  skeletonCount?: number;
  /** Grid columns configuration */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** Optional CSS class name */
  className?: string;
}

/**
 * Loading skeleton for product card
 */
function ProductSkeleton() {
  return (
    <div className="bg-card rounded-xl border overflow-hidden animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-6 bg-muted rounded w-1/4" />
      </div>
    </div>
  );
}

/**
 * ProductGrid - Animated grid of product cards
 * 
 * Features:
 * - Responsive grid layout
 * - Animated item entry/exit
 * - Layout animations when items are added to cart
 * - Loading skeleton state
 */
export function ProductGrid({
  products,
  onAddToCart,
  onProductClick,
  addingToCartIds = new Set(),
  isLoading = false,
  skeletonCount = 8,
  columns = { default: 2, sm: 2, md: 3, lg: 4 },
  className = '',
}: ProductGridProps) {
  // Generate grid column classes
  const gridCols = cn(
    `grid-cols-${columns.default || 2}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`
  );

  if (isLoading) {
    return (
      <div className={cn('grid gap-4', gridCols, className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No products found</p>
      </div>
    );
  }

  return (
    <LayoutGroup>
      <motion.div
        className={cn(
          'grid gap-4',
          'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          className
        )}
        layout
      >
        <AnimatePresence mode="popLayout">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onClick={onProductClick}
              isAddingToCart={addingToCartIds.has(product.id)}
              enableLayoutAnimation
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}

/**
 * Hook to manage add-to-cart animation state
 */
export function useAddToCartAnimation() {
  const [addingIds, setAddingIds] = React.useState<Set<string>>(new Set());
  const [isCartReceiving, setIsCartReceiving] = React.useState(false);

  const startAddAnimation = React.useCallback((productId: string) => {
    setAddingIds((prev) => new Set(prev).add(productId));
    setIsCartReceiving(true);

    // Clear animation state after animation completes
    setTimeout(() => {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }, 500);

    setTimeout(() => {
      setIsCartReceiving(false);
    }, 300);
  }, []);

  return {
    addingIds,
    isCartReceiving,
    startAddAnimation,
  };
}

export default ProductGrid;
