// UI Components
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

export { Input } from './input';
export type { InputProps } from './input';

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from './drawer';

export { ToastProvider, useToast, toast, ToastContainer, ToastItem } from './toast';
export type { Toast, ToastType } from './toast';

export { BottomDock, useDockItems } from './BottomDock';
export type { BottomDockProps, DockItem } from './BottomDock';

export { SearchPalette, useSearchPalette } from './SearchPalette';
export type { SearchPaletteProps } from './SearchPalette';

export { AnimatedOutlet } from './AnimatedOutlet';
export type { AnimatedOutletProps } from './AnimatedOutlet';

export { SyncIndicator, SyncOverlay, useSyncStatus } from './SyncIndicator';
export type { SyncIndicatorProps, SyncOverlayProps, SyncStatus } from './SyncIndicator';

// Micro-interactions
export {
  AnimatedButton,
  AnimatedCard,
  ScanSuccess,
  ShakeContainer,
  useShake,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  Pulse,
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from './micro-interactions';
export type {
  AnimatedButtonProps,
  AnimatedCardProps,
  ScanSuccessProps,
  ShakeContainerProps,
  SkeletonProps,
  PulseProps,
  FadeInProps,
  StaggerContainerProps,
} from './micro-interactions';
