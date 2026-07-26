"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import type { Role } from "@chrysmec/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { homeForRole } from "@/lib/auth/routes";

function SessionSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-12 sm:px-6" aria-busy="true">
      <span className="sr-only">Checking your session</span>
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="h-44 w-full animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-11 w-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
    </div>
  );
}

/**
 * Client side gate. It keeps people out of screens that would only error, but
 * it is not the access control: every route this wraps is also checked on the
 * server, because hiding a page in a browser protects nothing.
 */
export function RequireAuth({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: readonly Role[];
}) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === "loading" || status === "unauthenticated") {
    return <SessionSkeleton />;
  }

  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6">
        <ShieldAlert aria-hidden className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
          This area is not open to your account
        </h1>
        <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
          You are signed in as {user.fullName}. Ask the workshop if you think you should have
          access.
        </p>
        <Button className="mt-6" onClick={() => router.replace(homeForRole(user.role))}>
          Go to my home page
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
