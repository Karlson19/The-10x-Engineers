"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarPlus, Car, ClipboardList, House, type LucideIcon } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/book", label: "Book", icon: CalendarPlus },
  { href: "/dashboard/requests", label: "Requests", icon: ClipboardList },
  { href: "/dashboard/vehicles", label: "Vehicles", icon: Car },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

/**
 * A row of links under the header on a wide screen. The pill slides between
 * positions with layoutId rather than fading, so the eye can follow it.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="hidden border-b border-border md:block">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 px-5 sm:px-8">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 items-center gap-2 px-3 text-base transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon aria-hidden size={18} />
                {item.label}
                {active ? (
                  <motion.span
                    layoutId="desktop-nav-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                    transition={motionTokens.spring}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bottom tab bar on a phone, which is where the thumb already is. */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="tab-bar-indicator"
                    className="absolute top-0 h-0.5 w-10 rounded-full bg-accent"
                    transition={motionTokens.spring}
                  />
                ) : null}
                <item.icon aria-hidden size={20} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
