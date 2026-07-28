"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
};

const TONE = {
  success: { icon: CircleCheck, accent: "bg-success" },
  error: { icon: CircleAlert, accent: "bg-destructive" },
  info: { icon: Info, accent: "bg-accent" },
} as const;

const DISMISS_AFTER_MS = 4000;

type ToastContextValue = {
  showToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Bottom of the screen on a phone, where the thumb is and where it does not
 * cover the header. Top right on a desktop. Auto dismisses after four seconds
 * with a hairline counting down, and can always be closed by hand.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      nextId.current += 1;
      const id = nextId.current;

      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        // Announced politely so a screen reader hears it without being
        // interrupted mid-sentence.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:top-4 sm:right-4 sm:bottom-auto sm:left-auto sm:items-end sm:px-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, accent } = TONE[toast.tone];

            return (
              <motion.div
                key={toast.id}
                layout
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
                className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg border border-border bg-popover p-4"
              >
                <div className="flex gap-3">
                  <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-popover-foreground">{toast.title}</p>
                    {toast.body ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{toast.body}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss"
                    className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X aria-hidden size={16} />
                  </button>
                </div>

                {/* The countdown, as a hairline rather than a spinner. */}
                <motion.span
                  aria-hidden
                  className={cn("absolute bottom-0 left-0 h-0.5 w-full origin-left", accent)}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: DISMISS_AFTER_MS / 1000, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider.");
  }
  return context;
}
