/**
 * Presence Hook for Edit Collision Prevention
 * Requirements: 15.1, 15.2, 15.4
 * 
 * This hook manages presence state for collaborative editing scenarios,
 * broadcasting join/leave events when users open/close edit forms.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/**
 * Presence state for a single user
 */
export interface PresenceUser {
  /** Unique user identifier */
  userId: string;
  /** Display name for the user */
  displayName: string;
  /** When the user joined the channel */
  joinedAt: string;
  /** Optional: what the user is currently editing */
  editingField?: string;
}

/**
 * Configuration for the presence hook
 */
export interface UsePresenceConfig {
  /** Supabase URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** Channel name for presence (e.g., "inventory:item-123") */
  channelName: string;
  /** Current user's ID */
  userId: string;
  /** Current user's display name */
  displayName: string;
  /** Optional JWT token for authenticated presence */
  accessToken?: string;
  /** Whether presence is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return type for the usePresence hook
 */
export interface UsePresenceReturn {
  /** List of users currently present in the channel */
  presentUsers: PresenceUser[];
  /** Whether the current user is connected to presence */
  isConnected: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Broadcast a join event (called when opening edit form) */
  join: (editingField?: string) => void;
  /** Broadcast a leave event (called when closing edit form) */
  leave: () => void;
  /** Update what field the current user is editing */
  updateEditingField: (field: string | undefined) => void;
  /** Check if another user is currently editing */
  isBeingEditedByOther: boolean;
  /** Get the user currently editing (if any, excluding self) */
  editingUser: PresenceUser | null;
}

/**
 * usePresence - React hook for collaborative presence management
 * 
 * This hook enables real-time presence tracking for edit collision prevention.
 * When a user opens an edit form, they broadcast a join event. Other users
 * see who is currently editing and can avoid conflicts.
 * 
 * Requirements implemented:
 * - 15.1: Broadcast join event on edit form open
 * - 15.2: Display visual indicator showing which users are editing
 * - 15.4: Broadcast leave event on edit form close
 * 
 * @param config - Presence configuration options
 * @returns Presence state and control functions
 * 
 * @example
 * ```tsx
 * function InventoryEditForm({ itemId }: { itemId: string }) {
 *   const { presentUsers, isBeingEditedByOther, editingUser, join, leave } = usePresence({
 *     supabaseUrl: env.SUPABASE_URL,
 *     supabaseAnonKey: env.SUPABASE_ANON_KEY,
 *     channelName: `inventory:${itemId}`,
 *     userId: currentUser.id,
 *     displayName: currentUser.name,
 *   });
 * 
 *   useEffect(() => {
 *     join('all'); // Join when form opens
 *     return () => leave(); // Leave when form closes
 *   }, [join, leave]);
 * 
 *   return (
 *     <div>
 *       {isBeingEditedByOther && (
 *         <Alert>
 *           {editingUser?.displayName} is currently editing this item
 *         </Alert>
 *       )}
 *       <form>...</form>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePresence(config: UsePresenceConfig): UsePresenceReturn {
  const {
    supabaseUrl,
    supabaseAnonKey,
    channelName,
    userId,
    displayName,
    accessToken,
    enabled = true,
  } = config;

  // State
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for cleanup
  const clientRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasJoinedRef = useRef(false);

  /**
   * Transform Supabase presence state to our PresenceUser format
   */
  const transformPresenceState = useCallback((presenceState: Record<string, unknown[]>): PresenceUser[] => {
    const users: PresenceUser[] = [];
    
    for (const [_key, presences] of Object.entries(presenceState)) {
      for (const presence of presences) {
        const p = presence as Record<string, unknown>;
        if (p.userId && p.displayName) {
          users.push({
            userId: p.userId as string,
            displayName: p.displayName as string,
            joinedAt: p.joinedAt as string || new Date().toISOString(),
            editingField: p.editingField as string | undefined,
          });
        }
      }
    }
    
    return users;
  }, []);

  /**
   * Subscribe to presence channel
   */
  const subscribe = useCallback(() => {
    if (!supabaseUrl || !supabaseAnonKey || !channelName) {
      setError(new Error('Missing required configuration'));
      return;
    }

    // Create Supabase client
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

    // Create presence channel
    const channel = client.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Handle presence sync (initial state and updates)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = transformPresenceState(state);
      setPresentUsers(users);
    });

    // Handle user join events (Requirement 15.1)
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log(`User ${key} joined`, newPresences);
    });

    // Handle user leave events (Requirement 15.4)
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log(`User ${key} left`, leftPresences);
    });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError(new Error('Failed to subscribe to presence channel'));
      } else if (status === 'TIMED_OUT') {
        setIsConnected(false);
        setError(new Error('Presence subscription timed out'));
      } else if (status === 'CLOSED') {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;
  }, [supabaseUrl, supabaseAnonKey, channelName, userId, accessToken, transformPresenceState]);

  /**
   * Unsubscribe and cleanup
   */
  const unsubscribe = useCallback(async () => {
    if (channelRef.current) {
      // Leave presence before unsubscribing
      if (hasJoinedRef.current) {
        await channelRef.current.untrack();
        hasJoinedRef.current = false;
      }
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (clientRef.current) {
      await clientRef.current.removeAllChannels();
      clientRef.current = null;
    }
    setIsConnected(false);
    setPresentUsers([]);
  }, []);

  /**
   * Broadcast join event (Requirement 15.1)
   * Called when user opens an edit form
   */
  const join = useCallback((editingField?: string) => {
    if (!channelRef.current || !isConnected) {
      return;
    }

    const presenceData: PresenceUser = {
      userId,
      displayName,
      joinedAt: new Date().toISOString(),
      editingField,
    };

    channelRef.current.track(presenceData);
    hasJoinedRef.current = true;
  }, [isConnected, userId, displayName]);

  /**
   * Broadcast leave event (Requirement 15.4)
   * Called when user closes an edit form
   */
  const leave = useCallback(async () => {
    if (!channelRef.current) {
      return;
    }

    await channelRef.current.untrack();
    hasJoinedRef.current = false;
  }, []);

  /**
   * Update the field being edited
   */
  const updateEditingField = useCallback((field: string | undefined) => {
    if (!channelRef.current || !isConnected || !hasJoinedRef.current) {
      return;
    }

    const presenceData: PresenceUser = {
      userId,
      displayName,
      joinedAt: new Date().toISOString(),
      editingField: field,
    };

    channelRef.current.track(presenceData);
  }, [isConnected, userId, displayName]);

  // Setup subscription on mount
  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  // Computed: check if another user is editing (Requirement 15.2)
  const otherUsers = presentUsers.filter(u => u.userId !== userId);
  const isBeingEditedByOther = otherUsers.length > 0;
  const editingUser = otherUsers[0] || null;

  return {
    presentUsers,
    isConnected,
    error,
    join,
    leave,
    updateEditingField,
    isBeingEditedByOther,
    editingUser,
  };
}

export default usePresence;
