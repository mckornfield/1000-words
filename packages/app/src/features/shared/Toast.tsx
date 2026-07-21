import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { StarIcon } from "./icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "xp";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  icon?: ReactNode;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  showXp: (amount: number, reason?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<ToastMessage & { exiting?: boolean }>>([]);

  const dismiss = useCallback((id: string) => {
    // Mark as exiting first, then remove after animation
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 260);
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = toast.durationMs ?? 3500;
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]); // max 5 visible
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const showXp = useCallback((amount: number, reason?: string) => {
    showToast({
      type: "xp",
      title: `+${amount} XP`,
      message: reason ?? "Keep it up!",
      icon: <StarIcon size="1.1em" />,
      durationMs: 3000,
    });
  }, [showToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    showToast({ type: "success", title, message, icon: "✓" });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({ type: "error", title, message, icon: "✗", durationMs: 5000 });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({ type: "info", title, message, icon: "ℹ" });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showXp, showSuccess, showError, showInfo }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite" aria-atomic="false">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type}${toast.exiting ? " toast-exit" : ""}`}
              role="alert"
              onClick={() => dismiss(toast.id)}
            >
              {toast.icon && (
                <span className="toast-icon" aria-hidden="true">{toast.icon}</span>
              )}
              <div className="toast-body">
                <div className="toast-title">{toast.title}</div>
                {toast.message && (
                  <div className="toast-message">{toast.message}</div>
                )}
              </div>
              <button
                className="toast-dismiss"
                onClick={(e) => { e.stopPropagation(); dismiss(toast.id); }}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
