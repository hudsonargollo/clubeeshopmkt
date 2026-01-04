import { Outlet, useLocation } from '@remix-run/react';
import { AnimatePresence, motion } from 'framer-motion';

export interface AnimatedOutletProps {
  className?: string;
}

/**
 * Animated wrapper for Remix Outlet with route transitions.
 * Uses location.pathname as key for AnimatePresence.
 */
export function AnimatedOutlet({ className }: AnimatedOutletProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className={className}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
