/**
 * Inventory Search Hook with 300ms Debounce
 * Requirements: 10.2 - Debounce search queries by 300ms
 * 
 * Client-side hook that debounces search input before making API calls
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface SearchResult {
  id: string;
  barcode: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  image_url: string | null;
}

interface UseInventorySearchOptions {
  debounceMs?: number;
  limit?: number;
  enabled?: boolean;
}

interface UseInventorySearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 20;

/**
 * Hook for searching inventory with automatic debouncing
 * Implements 300ms debounce per Requirements 10.2
 */
export function useInventorySearch(
  options: UseInventorySearchOptions = {}
): UseInventorySearchReturn {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    limit = DEFAULT_LIMIT,
    enabled = true,
  } = options;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest request to avoid race conditions
  const latestRequestRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!enabled) return;

    const trimmedQuery = debouncedQuery.trim();

    // Clear results for empty query
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      return;
    }

    const requestId = ++latestRequestRef.current;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: trimmedQuery,
          limit: limit.toString(),
        });

        const response = await fetch(`/api/inventory/search?${params}`);
        
        // Check if this is still the latest request
        if (requestId !== latestRequestRef.current) {
          return;
        }

        const data = await response.json() as { success: boolean; results?: SearchResult[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Search failed");
        }

        setResults(data.results || []);
      } catch (err) {
        // Only update error if this is still the latest request
        if (requestId === latestRequestRef.current) {
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (requestId === latestRequestRef.current) {
          setIsLoading(false);
        }
      }
    };

    performSearch();
  }, [debouncedQuery, limit, enabled]);

  // Manual search function (bypasses debounce)
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    setDebouncedQuery(searchQuery); // Immediate search
  }, []);

  // Clear search state
  const clear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search,
    clear,
  };
}

export type { SearchResult, UseInventorySearchOptions, UseInventorySearchReturn };
