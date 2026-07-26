"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { homeForRole } from "@/lib/auth/routes";

/**
 * Fixed width in every state, including while the session is being restored,
 * so the header does not jump when the answer arrives.
 */
export function AccountNav() {
  const { user, status } = useAuth();

  if (status === "loading") {
    return (
      <div
        aria-hidden
        className="h-11 w-28 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
      />
    );
  }

  const label = user ? "My account" : "Sign in";
  const href = user ? homeForRole(user.role) : "/login";

  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-28 px-3")}
    >
      {label}
    </Link>
  );
}
