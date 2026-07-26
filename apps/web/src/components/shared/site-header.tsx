import Link from "next/link";
import { BUSINESS } from "@chrysmec/shared";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-md">
          <span aria-hidden className="h-6 w-1 rounded-full bg-accent" />
          <span className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
            {BUSINESS.name}
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
