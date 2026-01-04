/**
 * Sync Indicator Component
 * Requirements: 12.2 - Display subtle syncing indicator while awaiting server confirmation
 * 
 * Visual indicator showing that an optimistic update is pending server confirmation
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Cloud, CloudOff, Check } from 'lucide-react';
import { cn } from '~/lib/utils';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncIndicatorProps {
  /** Current sync status */
  status: SyncStatus;
  /** Whether to show the indicator (can be used to hide when idle) */
  show?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Position variant for absolute positioning */
  position?: 'inline' | 'top-right' | 'bottom-right' | 'overlay';
  /** Custom label text */
  label?: string;
  /** Whether to show the label */
  showLabel?: boolean;
  /** Optional CSS class name */
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const containerSizeClasses = {
  sm: 'text-xs gap-1 px-1.5 py-0.5',
  md: 'text-sm gap-1.5 px-2 py-1',
  lg: 'text-base gap-2 px-3 py-1.5',
};

const positionClasses = {
  inline: '',
  'top-right': 'absolute top-2 right-2',
  'bottom-right': 'absolute bottom-2 right-2',
  overlay: 'absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm',
};

const statusConfig: Record<SyncStatus, {
  icon: typeof Cloud;
  color: string;
  bgColor: string;
  label: string;
  animate?: boolean;
}> = {
  idle: {
    icon: Cloud,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    label: 'Saved',
  },
  syncing: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Syncing...',
    animate: true,
  },
  synced: {
    icon: Check,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Saved',
  },
  error: {
    icon: CloudOff,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Sync failed',
  },
};

/**
 * SyncIndicator - Visual feedback for optimistic update status
 * 
 * Shows a subtle indicator while awaiting server confirmation,
 * with different states for syncing, synced, and error.
 */
export function SyncIndicator({
  status,
  show = true,
  size = 'sm',
  position = 'inline',
  label,
  showLabel = false,
  className = '',
}: SyncIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  // Don't render if not showing or idle without explicit show
  if (!show && status === 'idle') {
    return null;
  }

  const isOverlay = position === 'overlay';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'flex items-center rounded-full',
            !isOverlay && config.bgColor,
            !isOverlay && containerSizeClasses[size],
            positionClasses[position],
            className
          )}
        >
          <motion.div
            animate={config.animate ? { rotate: 360 } : {}}
            transition={
              config.animate
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            <Icon className={cn(sizeClasses[size], config.color)} />
          </motion.div>
          
          {showLabel && (
            <span className={cn('font-medium', config.color)}>
              {displayLabel}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * SyncOverlay - Full overlay version of sync indicator
 * 
 * Used to overlay a component while it's being synced
 */
export interface SyncOverlayProps {
  /** Whether syncing is in progress */
  isSyncing: boolean;
  /** Optional label */
  label?: string;
  /** Optional CSS class name */
  className?: string;
  /** Children to overlay */
  children?: React.ReactNode;
}

export function SyncOverlay({
  isSyncing,
  label = 'Syncing...',
  className = '',
  children,
}: SyncOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-inherit"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg shadow-lg border">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * useSyncStatus - Hook to manage sync status with auto-reset
 * 
 * Automatically transitions from 'synced' back to 'idle' after a delay
 */
export function useSyncStatus(autoResetDelay = 2000) {
  const [status, setStatus] = React.useState<SyncStatus>('idle');
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const setSyncing = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus('syncing');
  }, []);

  const setSynced = React.useCallback(() => {
    setStatus('synced');
    timeoutRef.current = setTimeout(() => {
      setStatus('idle');
    }, autoResetDelay);
  }, [autoResetDelay]);

  const setError = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus('error');
  }, []);

  const reset = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    isSyncing: status === 'syncing',
    isSynced: status === 'synced',
    isError: status === 'error',
    setSyncing,
    setSynced,
    setError,
    reset,
  };
}

export default SyncIndicator;
