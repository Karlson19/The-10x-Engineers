import type { Metadata } from "next";
import { AccountPanel } from "@/components/auth/account-panel";
import { RequireAuth } from "@/components/auth/require-auth";
import { AppHeader } from "@/components/shared/app-header";

export const metadata: Metadata = {
  title: "My account",
};

/**
 * The signed-in home. Phase 3 turns this into the client dashboard with the
 * active request card, vehicles and booking call to action.
 */
export default function DashboardPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1">
        <RequireAuth>
          <AccountPanel />
        </RequireAuth>
      </main>
    </div>
  );
}
