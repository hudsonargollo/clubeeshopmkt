import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase.server';

/**
 * Inventory item type from database
 */
export type InventoryItem = Database['public']['Tables']['inventory']['Row'];

/**
 * Realtime payload for inventory changes
 */
export interface InventoryChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: InventoryItem | null;
  old: Partial<InventoryItem> | null;
}

/**
 * Configuration for the realtime inventory hook
 */
export interface UseRealtimeInventoryConfig {
  /** Supabase URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** Tenant ID for filtering events (Requirement 4.3) */
  tenantId: string;
  /** Optional JWT token for authenticated subscriptions */
  accessToken?: string;
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

/**
 * Return type for the useRealtimeInventory hook
 */
export interface UseRealtimeInventoryReturn {
  /** Current inventory items (local state) */
  inventory: InventoryItem[];
  /** Whether the subscription is connected */
  isConnected: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Manually update local inventory state */
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  /** Force reconnect the subscription */
  reconnect: () => void;
}

/**
 * useRealtimeInventory - React hook for real-time inventory synchronization
 * 
 * This hook subscribes to PostgreSQL UPDATE events on the inventory table
 * via Supabase Realtime, filtering by tenant_id to maintain tenant isolation.
 * 
 * Requirements implemented:
 * - 4.1: Subscribe to PostgreSQL UPDATE events on inventory table via Supabase Realtime
 * - 4.2: Broadcast changes to all subscribed clients within 500ms
 * - 4.3: Filter events by tenant_id to maintain tenant isolation
 * - 4.4: Update local state without requiring page refresh
 * 
 * @param config - Realtime configuration options
 * @returns Inventory state and subscription controls
 */
export function useRealtimeInventory(
  config: UseRealtimeInventoryConfig
): UseRealtimeInventoryReturn {
  const { supabaseUrl, supabaseAnonKey, tenantId, accessToken, enabled = true } = config;

  // Local inventory state (Requirement 4.4)
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup
  const clientRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /**
   * Handle inventory change events from Realtime
   * Updates local state based on event type (Requirement 4.4)
   */
  const handleInventoryChange = useCallback((payload: InventoryChangePayload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    setInventory((currentInventory) => {
      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            // Add new item to inventory
            return [...currentInventory, newRecord];
          }
          return currentInventory;

        case 'UPDATE':
          if (newRecord) {
            // Update existing item in inventory
            return currentInventory.map((item) =>
              item.id === newRecord.id ? newRecord : item
            );
          }
          return currentInventory;

        case 'DELETE':
          if (oldRecord?.id) {
            // Remove item from inventory
            return currentInventory.filter((item) => item.id !== oldRecord.id);
          }
          return currentInventory;

        default:
          return currentInventory;
      }
    });
  }, []);

  /**
   * Create Supabase client and subscribe to inventory changes
   */
  const subscribe = useCallback(() => {
    if (!supabaseUrl || !supabaseAnonKey || !tenantId) {
      setError(new Error('Missing required configuration: supabaseUrl, supabaseAnonKey, or tenantId'));
      return;
    }

    // Create Supabase client for realtime
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      ...(accessToken && {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }),
    });

    clientRef.current = client;

    // Subscribe to inventory table changes with tenant_id filter (Requirement 4.3)
    // Channel name includes tenant_id for isolation
    const channelName = `inventory:tenant_${tenantId}`;
    
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'inventory',
          filter: `tenant_id=eq.${tenantId}`, // Tenant isolation filter (Requirement 4.3)
        },
        (payload) => {
          // Transform payload to our interface
          const changePayload: InventoryChangePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as InventoryItem | null,
            old: payload.old as Partial<InventoryItem> | null,
          };
          handleInventoryChange(changePayload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(new Error('Failed to subscribe to inventory channel'));
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError(new Error('Subscription timed out'));
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
  }, [supabaseUrl, supabaseAnonKey, tenantId, accessToken, handleInventoryChange]);

  /**
   * Unsubscribe and cleanup
   */
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.removeAllChannels();
      clientRef.current = null;
    }
    setIsConnected(false);
  }, []);

  /**
   * Force reconnect the subscription
   */
  const reconnect = useCallback(() => {
    unsubscribe();
    subscribe();
  }, [unsubscribe, subscribe]);

  // Setup subscription on mount and cleanup on unmount
  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  // Reconnect when tenant changes
  useEffect(() => {
    if (enabled && tenantId) {
      reconnect();
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    inventory,
    isConnected,
    error,
    setInventory,
    reconnect,
  };
}

export default useRealtimeInventory;
