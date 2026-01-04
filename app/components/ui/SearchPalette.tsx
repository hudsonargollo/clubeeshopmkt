/**
 * Search Palette Component (Command Palette)
 * Requirements: 10.3, 10.4, 10.5 - Global search with keyboard navigation
 * 
 * Uses CMDK for command palette functionality with inventory search integration
 */

import * as React from 'react';
import { Command } from 'cmdk';
import { Search, X, Package, Barcode } from 'lucide-react';
import { useInventorySearch, type SearchResult } from '~/hooks/useInventorySearch';
import { cn } from '~/lib/utils';

export interface SearchPaletteProps {
  /** Whether the palette is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when an item is selected */
  onSelect?: (item: SearchResult) => void;
  /** Callback when a barcode is scanned while palette is open */
  onBarcodeScan?: (barcode: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Highlight matching text in search results
 * Requirements: 10.3 - Highlight matching text portions
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/**
 * SearchPalette - Global search command palette
 * 
 * Features:
 * - Keyboard navigation (arrow keys, Enter)
 * - Text highlighting in results
 * - Barcode scan detection while open
 * - Debounced search (300ms via useInventorySearch)
 * 
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * 
 * // Open with CMD+K
 * useEffect(() => {
 *   const handler = (e: KeyboardEvent) => {
 *     if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
 *       e.preventDefault();
 *       setOpen(true);
 *     }
 *   };
 *   document.addEventListener('keydown', handler);
 *   return () => document.removeEventListener('keydown', handler);
 * }, []);
 * 
 * <SearchPalette
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSelect={(item) => navigate(`/inventory/${item.id}`)}
 * />
 * ```
 */
export function SearchPalette({
  open,
  onOpenChange,
  onSelect,
  onBarcodeScan,
  placeholder = 'Search inventory...',
  className = '',
}: SearchPaletteProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clear,
  } = useInventorySearch({ enabled: open });

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      clear();
    }
  }, [open, clear]);

  // Handle keyboard shortcut to open (CMD+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Detect barcode scan while palette is open
  // Requirements: 10.5 - Handle barcode scan while search is open
  React.useEffect(() => {
    if (!open || !onBarcodeScan) return;

    // Check if query looks like a barcode (all digits, 8-13 chars)
    const trimmedQuery = query.trim();
    if (/^\d{8,13}$/.test(trimmedQuery)) {
      // Likely a barcode scan - trigger callback
      onBarcodeScan(trimmedQuery);
      onOpenChange(false);
    }
  }, [query, open, onBarcodeScan, onOpenChange]);

  const handleSelect = React.useCallback((item: SearchResult) => {
    onSelect?.(item);
    onOpenChange(false);
  }, [onSelect, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div
        className={cn(
          "fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          className
        )}
      >
        <Command
          className="rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden"
          shouldFilter={false} // We handle filtering via API
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {query && (
              <button
                onClick={() => clear()}
                className="p-1 hover:bg-muted rounded"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 opacity-50" />
              </button>
            )}
          </div>

          {/* Results */}
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {/* Loading state */}
            {isLoading && (
              <Command.Loading className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </Command.Loading>
            )}

            {/* Error state */}
            {error && (
              <div className="py-6 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && query && results.length === 0 && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </Command.Empty>
            )}

            {/* Results list */}
            {results.length > 0 && (
              <Command.Group heading="Products">
                {results.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer",
                      "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      "hover:bg-accent/50"
                    )}
                  >
                    {/* Product image or icon */}
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {highlightMatch(item.name, query)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{highlightMatch(item.category, query)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {highlightMatch(item.barcode, query)}
                        </span>
                      </div>
                    </div>

                    {/* Price and stock */}
                    <div className="text-right shrink-0">
                      <p className="font-medium">{formatPrice(item.price)}</p>
                      <p className={cn(
                        "text-xs",
                        item.stock > 10 ? "text-green-600" :
                        item.stock > 0 ? "text-yellow-600" :
                        "text-red-600"
                      )}>
                        {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                      </p>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Keyboard hints */}
            {!query && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                <p>Type to search products by name, category, or barcode</p>
                <p className="mt-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                  {' '}to navigate{' '}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                  {' '}to select{' '}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                  {' '}to close
                </p>
              </div>
            )}
          </Command.List>
        </Command>
      </div>
    </>
  );
}

/**
 * Hook to manage search palette state with keyboard shortcut
 */
export function useSearchPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}

export default SearchPalette;
