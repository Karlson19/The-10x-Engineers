"use client";

import { useState } from "react";
import { SECTION_LABELS } from "@chrysmec/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

const ROLE_LABELS = {
  CLIENT: "Customer",
  STAFF: "Technician",
  MANAGEMENT: "Management",
} as const;

export function AccountPanel() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  /**
   * No redirect here on purpose. Once the session is gone RequireAuth sends the
   * person to the sign in page with this route remembered, so two navigations
   * cannot race each other.
   */
  async function handleSignOut(): Promise<void> {
    setSignOutError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch {
      setSignOutError("Could not sign you out. Check your connection and try again.");
      setIsSigningOut(false);
    }
  }

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Name", value: user.fullName },
    { label: "Email", value: user.email, mono: true },
    { label: "Phone", value: user.phone, mono: true },
    { label: "Account type", value: ROLE_LABELS[user.role] },
    ...(user.section ? [{ label: "Section", value: SECTION_LABELS[user.section] }] : []),
    { label: "Member since", value: formatDate(user.createdAt) },
  ];

  return (
    <div className="rise-in mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">
        Welcome back, {user.fullName.split(" ")[0]}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Your account is set up. Booking a service and the vehicle status timeline arrive in the next
        release.
      </p>

      <section className="mt-12">
        <h2 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
          Account details
        </h2>
        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 border-b border-border py-4 sm:flex-row sm:items-baseline sm:gap-8"
            >
              <dt className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase sm:w-44 sm:shrink-0">
                {row.label}
              </dt>
              <dd className={row.mono ? "font-mono text-base break-all" : "text-base"}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {signOutError ? (
        <Alert tone="error" title="Could not sign out" className="mt-8">
          {signOutError}
        </Alert>
      ) : null}

      <Button
        variant="outline"
        className="mt-10"
        onClick={handleSignOut}
        isPending={isSigningOut}
        pendingLabel="Signing out"
      >
        Sign out
      </Button>
    </div>
  );
}
