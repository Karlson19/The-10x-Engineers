"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: LucideIcon };

function isActive(pathname: string, href: string, rootHref: string): boolean {
  return href === rootHref ? pathname === href : pathname.startsWith(href);
}

/**
 * A row of links under the header on a wide screen. The underline slides
 * between positions with layoutId rather than fading, so the eye can follow it.
 */
export function SectionDesktopNav({
  items,
  rootHref,
  layoutId,
}: {
  items: readonly NavItem[];
  rootHref: string;
  layoutId: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="hidden border-b border-border md:block">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 px-5 sm:px-8">
        {items.map((item) => {
          const active = isActive(pathname, item.href, rootHref);

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
                    layoutId={`${layoutId}-underline`}
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
export function SectionTabBar({
  items,
  rootHref,
  layoutId,
}: {
  items: readonly NavItem[];
  rootHref: string;
  layoutId: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {items.map((item) => {
          const active = isActive(pathname, item.href, rootHref);

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
                    layoutId={`${layoutId}-indicator`}
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
