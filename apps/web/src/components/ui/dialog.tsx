"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Sits under the title and is tied to the dialog with aria-describedby. */
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * A dialog asking someone to commit to something destructive should not close
   * because they tapped slightly outside it.
   */
  dismissOnBackdrop?: boolean;
  className?: string;
};

/**
 * A modal dialog. Focus moves in on open, is trapped while it is open, and
 * returns to whatever opened it on close. Escape always closes.
 *
 * On a phone it is a bottom sheet, because that is where the thumb is. From the
 * small breakpoint up it is a centred panel.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissOnBackdrop = true,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const prefersReducedMotion = useReducedMotion();

  /**
   * Focus moves into the panel on open and back to whatever opened it on close.
   *
   * Both halves live here rather than in the panel's ref callback, because a
   * ref callback runs before this effect and would take focus first, leaving
   * nothing to hand back.
   *
   * Focus lands on the panel itself rather than the first control so a screen
   * reader reads the title and description before reaching the buttons.
   */
  useEffect(() => {
    if (open) {
      const active = document.activeElement;
      openerRef.current =
        active instanceof HTMLElement && active !== document.body ? active : null;

      panelRef.current?.focus();
      return;
    }

    const opener = openerRef.current;
    openerRef.current = null;

    if (opener?.isConnected) {
      opener.focus();
    }
  }, [open]);

  // The page behind must not scroll while a sheet is over it.
  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at both ends so focus can never escape to the page underneath.
      // Focus starts on the panel itself, so shift-tab from there has to be
      // caught too or it would step backwards out of the dialog.
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
          <motion.div
            aria-hidden
            onClick={dismissOnBackdrop ? onClose : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.fast, ease: motionTokens.ease }}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            initial={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
            className={cn(
              "relative z-10 max-h-[90dvh] w-full overflow-y-auto border border-border bg-card p-6",
              "rounded-t-xl sm:max-w-lg sm:rounded-xl",
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-display text-2xl font-semibold text-card-foreground"
                >
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-2 text-base text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden size={20} />
              </button>
            </div>

            {children ? <div className="mt-5">{children}</div> : null}

            {footer ? (
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive confirmations get the destructive button and no backdrop dismiss. */
  tone?: "destructive" | "primary" | "accent";
  isPending?: boolean;
  pendingLabel?: string;
  children?: React.ReactNode;
};

/** The shape every "are you sure" takes, so they all behave the same way. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep it",
  tone = "destructive",
  isPending = false,
  pendingLabel,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      dismissOnBackdrop={tone !== "destructive"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone}
            onClick={onConfirm}
            isPending={isPending}
            pendingLabel={pendingLabel ?? confirmLabel}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
