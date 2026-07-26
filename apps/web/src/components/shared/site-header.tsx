import Link from "next/link";
import { HeaderShell } from "@/components/shared/header-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Public pages. It links straight to /login rather than reading the session,
 * which keeps the query client and the session request off the landing page.
 * Anyone already signed in is sent onward from the sign in screen.
 */
export function SiteHeader() {
  return (
    <HeaderShell
      actions={
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-3")}
        >
          Sign in
        </Link>
      }
    />
  );
}
