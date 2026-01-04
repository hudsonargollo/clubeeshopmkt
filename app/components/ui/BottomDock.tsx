/**
 * Bottom Dock Navigation Component
 * Requirements: 11.1 - Bottom Dock pattern with 48px minimum touch targets
 * 
 * Mobile-first navigation positioned in the thumb zone for one-handed use
 */

import { useLocation, Link } from '@remix-run/react';
import { Scan, Search, ShoppingCart, Package } from 'lucide-react';
import { cn } from '~/lib/utils';

export interface DockItem {
  /** Icon component from lucide-react */
  icon: React.ComponentType<{ className?: string }>;
  /** Accessible label for the item */
  label: string;
  /** Route path to navigate to */
  route: string;
  /** Optional badge count (e.g., cart items, pending orders) */
  badge?: number;
}

export interface BottomDockProps {
  /** Custom dock items (defaults to standard navigation) */
  items?: DockItem[];
  /** Optional CSS class name */
  className?: string;
  /** Whether to show labels below icons */
  showLabels?: boolean;
}

/**
 * Default navigation items for the retail platform
 */
const DEFAULT_ITEMS: DockItem[] = [
  { icon: Scan, label: 'Scan', route: '/scan' },
  { icon: Search, label: 'Search', route: '/search' },
  { icon: ShoppingCart, label: 'Cart', route: '/cart' },
  { icon: Package, label: 'Orders', route: '/orders' },
];

/**
 * BottomDock - Mobile navigation bar positioned at bottom of screen
 * 
 * Follows mobile-first design principles:
 * - Positioned in natural thumb reach zone
 * - Minimum 48px touch targets per WCAG guidelines
 * - Primary action (Scan) positioned for easy access
 * - Badge support for cart count and notifications
 * 
 * @example
 * ```tsx
 * // In root layout
 * <div className="min-h-screen pb-16">
 *   <Outlet />
 *   <BottomDock />
 * </div>
 * ```
 */
export function BottomDock({
  items = DEFAULT_ITEMS,
  className = '',
  showLabels = true,
}: BottomDockProps) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-sm border-t",
        "safe-area-inset-bottom", // iOS safe area support
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-2">
        {items.map((item) => {
          const isActive = location.pathname === item.route || 
                          location.pathname.startsWith(`${item.route}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.route}
              to={item.route}
              className={cn(
                // Base styles - minimum 48px touch target
                "flex flex-col items-center justify-center",
                "min-h-[48px] min-w-[48px] px-3 py-2",
                "transition-colors duration-200",
                // Active/inactive states
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                // Touch feedback
                "active:scale-95 active:opacity-80"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Icon with optional badge */}
              <div className="relative">
                <Icon 
                  className={cn(
                    "h-6 w-6",
                    isActive && "stroke-[2.5px]"
                  )} 
                />
                
                {/* Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1",
                      "min-w-[18px] h-[18px] px-1",
                      "flex items-center justify-center",
                      "text-[10px] font-bold",
                      "bg-destructive text-destructive-foreground",
                      "rounded-full"
                    )}
                    aria-label={`${item.badge} items`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              {showLabels && (
                <span 
                  className={cn(
                    "text-[10px] mt-1 font-medium",
                    isActive && "font-semibold"
                  )}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Hook to get dock items with dynamic badge counts
 */
export function useDockItems(cartCount?: number, orderCount?: number): DockItem[] {
  return [
    { icon: Scan, label: 'Scan', route: '/scan' },
    { icon: Search, label: 'Search', route: '/search' },
    { icon: ShoppingCart, label: 'Cart', route: '/cart', badge: cartCount },
    { icon: Package, label: 'Orders', route: '/orders', badge: orderCount },
  ];
}

export default BottomDock;
