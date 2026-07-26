"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { homeForRole } from "@/lib/auth/routes";

/**
 * Someone already signed in has no business on the sign in page. The header on
 * public pages links here unconditionally, which keeps the landing page free of
 * the session bootstrap, and this sends them onward.
 */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(homeForRole(user.role));
    }
  }, [status, user, router]);

  return <>{children}</>;
}
