import * as React from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { cn } from '~/lib/utils';

/**
 * Micro-interactions for the retail platform.
 * Based on design doc specifications:
 * - Button press: Scale 0.95, 100ms
 * - Card hover: Subtle lift (translateY -2px), 150ms
 * - Scan success: Pulse + checkmark, 300ms
 * - Error shake: Horizontal oscillation, 400ms
 * - Loading: Skeleton shimmer, continuous
 */

// ============================================
// Button Press Animation
// ============================================

export interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
}

export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      className={className}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.button>
  )
);
AnimatedButton.displayName = 'AnimatedButton';

// ============================================
// Card Hover Lift Animation
// ============================================

export interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  enableHover?: boolean;
}

export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, enableHover = true, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
      whileHover={enableHover ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.div>
  )
);
AnimatedCard.displayName = 'AnimatedCard';


// ============================================
// Scan Success Animation (Pulse + Checkmark)
// ============================================

const scanSuccessVariants: Variants = {
  initial: { scale: 1, opacity: 0 },
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0, 1, 1, 0],
  },
  exit: { opacity: 0 },
};

export interface ScanSuccessProps {
  show: boolean;
  onComplete?: () => void;
  className?: string;
}

export function ScanSuccess({ show, onComplete, className }: ScanSuccessProps) {
  if (!show) return null;

  return (
    <motion.div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500"
        variants={scanSuccessVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.3, times: [0, 0.4, 0.7, 1] }}
        onAnimationComplete={onComplete}
      >
        <svg
          className="h-12 w-12 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Error Shake Animation
// ============================================

const shakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.4 },
  },
};

export interface ShakeContainerProps extends HTMLMotionProps<'div'> {
  shake: boolean;
  children: React.ReactNode;
}

export function ShakeContainer({ shake, children, className, ...props }: ShakeContainerProps) {
  return (
    <motion.div
      className={className}
      variants={shakeVariants}
      animate={shake ? 'shake' : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Hook for triggering shake animation
export function useShake() {
  const [isShaking, setIsShaking] = React.useState(false);

  const triggerShake = React.useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
  }, []);

  return { isShaking, triggerShake };
}

// ============================================
// Loading Skeleton Shimmer
// ============================================

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        className
      )}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// Skeleton variants for common use cases
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow', className)}>
      <Skeleton className="mb-4 h-32 w-full" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

// ============================================
// Pulse Animation (for notifications, badges)
// ============================================

export interface PulseProps {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
}

export function Pulse({ children, className, enabled = true }: PulseProps) {
  if (!enabled) return <>{children}</>;

  return (
    <motion.div
      className={className}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Fade In Animation
// ============================================

export interface FadeInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
}

export function FadeIn({ children, delay = 0, className, ...props }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Stagger Children Animation
// ============================================

export interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function StaggerContainer({ children, className, staggerDelay = 0.1, ...props }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      variants={{
        ...staggerContainer,
        show: {
          ...staggerContainer.show,
          transition: { staggerChildren: staggerDelay },
        },
      }}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: HTMLMotionProps<'div'> & { children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={staggerItem} {...props}>
      {children}
    </motion.div>
  );
}
