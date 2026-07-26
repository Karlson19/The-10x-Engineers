import Link from "next/link";
import { BUSINESS } from "@chrysmec/shared";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Hairline rule, generous height, the lockup on the left and one action on the
 * right. Deliberately imports nothing that touches the session, so a public
 * page built on it never pulls the auth bootstrap into its bundle.
 */
export function HeaderShell({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          aria-label={`${BUSINESS.name}, home`}
          className="min-w-0 rounded-md text-foreground"
        >
          <Logo />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
