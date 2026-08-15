"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@chrysmec/shared";
import { buttonVariants } from "@/components/ui/button";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { formatRelativeTime } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The bell.
 *
 * The API has written a notification on every status change, job assignment,
 * low stock warning and rating since the beginning, and nothing in the app ever
 * read them. So a technician was never told an estimate had been approved, and
 * management was never told a part had run down. This is that, finally read.
 */
export function NotificationBell() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const unread = notifications.data?.unreadCount ?? 0;
  const items: readonly Notification[] = notifications.data?.data ?? [];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications, nothing unread"
        }
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
      >
        <Bell aria-hidden size={20} />

        {/* The count, not just a dot, because "three things happened" and "one
            thing happened" are different amounts of urgency. */}
        <AnimatePresence>
          {unread > 0 ? (
            <motion.span
              key={unread}
              aria-hidden
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
              transition={motionTokens.spring}
              className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[0.625rem] leading-4 text-accent-foreground"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
            /*
              On a phone this hangs from the header across the viewport. It
              cannot be anchored to the bell there: the bell sits inland of the
              account menu and the theme toggle, so a panel wide enough to read
              runs off the left edge of the screen. From the small breakpoint up
              there is room, and it hangs off the bell as you would expect.
            */
            className={cn(
              "fixed inset-x-3 top-[4.75rem] z-50 origin-top overflow-hidden rounded-xl border border-border bg-popover",
              "sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-88 sm:origin-top-right",
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="font-display text-base font-semibold text-popover-foreground">
                Notifications
              </p>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead.mutateAsync()}
                  disabled={markAllRead.isPending}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-mono text-xs tracking-[0.1em] text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-60"
                >
                  <CheckCheck aria-hidden size={14} />
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className="max-h-[min(24rem,60dvh)] overflow-y-auto">
              {notifications.isPending ? (
                <p className="px-4 py-8 text-center text-base text-muted-foreground">
                  Loading your notifications
                </p>
              ) : notifications.isError ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-base text-muted-foreground">
                    We could not load your notifications.
                  </p>
                  <button
                    type="button"
                    onClick={() => void notifications.refetch()}
                    className="mt-2 min-h-9 font-medium text-foreground underline decoration-accent-text decoration-2 underline-offset-4"
                  >
                    Try again
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell
                    aria-hidden
                    className="mx-auto size-7 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <p className="mt-3 text-base text-muted-foreground">
                    Nothing yet. We will tell you here when your vehicle moves on.
                  </p>
                </div>
              ) : (
                <ul>
                  {items.map((item) => {
                    const isUnread = item.readAt === null;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          disabled={!isUnread || markRead.isPending}
                          onClick={() => void markRead.mutateAsync(item.id)}
                          className={cn(
                            "flex w-full gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-b-0",
                            isUnread ? "bg-accent-subtle/40 hover:bg-accent-subtle/70" : "hover:bg-muted",
                          )}
                        >
                          {/* Unread is a dot and a weight, never colour alone. */}
                          <span
                            aria-hidden
                            className={cn(
                              "mt-2 size-2 shrink-0 rounded-full",
                              isUnread ? "bg-accent" : "bg-transparent",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block text-base text-popover-foreground",
                                isUnread ? "font-medium" : "font-normal",
                              )}
                            >
                              {item.title}
                            </span>
                            <span className="mt-0.5 block text-sm text-muted-foreground">
                              {item.body}
                            </span>
                            <span className="mt-1 block font-mono text-xs text-muted-foreground">
                              {formatRelativeTime(item.createdAt)}
                              {isUnread ? " | tap to mark read" : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
