/**
 * Toast Component
 * Simple toast notification system
 * Requirements: Error feedback via toast notifications
 */

import * as React from "react";
import { cn } from "~/lib/utils";

type ToastType = "default" | "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Convenience functions
export function toast(message: string) {
  // This will be set by the provider
  if (typeof window !== "undefined" && (window as unknown as { __toast?: (m: string, t?: ToastType) => void }).__toast) {
    (window as unknown as { __toast: (m: string, t?: ToastType) => void }).__toast(message, "default");
  }
}

toast.success = (message: string) => {
  if (typeof window !== "undefined" && (window as unknown as { __toast?: (m: string, t?: ToastType) => void }).__toast) {
    (window as unknown as { __toast: (m: string, t?: ToastType) => void }).__toast(message, "success");
  }
};

toast.error = (message: string) => {
  if (typeof window !== "undefined" && (window as unknown as { __toast?: (m: string, t?: ToastType) => void }).__toast) {
    (window as unknown as { __toast: (m: string, t?: ToastType) => void }).__toast(message, "error");
  }
};

toast.warning = (message: string) => {
  if (typeof window !== "undefined" && (window as unknown as { __toast?: (m: string, t?: ToastType) => void }).__toast) {
    (window as unknown as { __toast: (m: string, t?: ToastType) => void }).__toast(message, "warning");
  }
};

toast.info = (message: string) => {
  if (typeof window !== "undefined" && (window as unknown as { __toast?: (m: string, t?: ToastType) => void }).__toast) {
    (window as unknown as { __toast: (m: string, t?: ToastType) => void }).__toast(message, "info");
  }
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((message: string, type: ToastType = "default", duration = 4000) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Set global toast function
  React.useEffect(() => {
    (window as unknown as { __toast: typeof addToast }).__toast = addToast;
    return () => {
      delete (window as unknown as { __toast?: typeof addToast }).__toast;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const typeStyles: Record<ToastType, string> = {
    default: "bg-background border",
    success: "bg-green-600 text-white border-green-700",
    error: "bg-red-600 text-white border-red-700",
    warning: "bg-yellow-500 text-black border-yellow-600",
    info: "bg-blue-600 text-white border-blue-700",
  };

  const icons: Record<ToastType, string> = {
    default: "💬",
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right-full duration-300",
        typeStyles[toast.type]
      )}
      role="alert"
    >
      <span className="text-lg">{icons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

export { ToastContainer, ToastItem };
export type { Toast, ToastType };
