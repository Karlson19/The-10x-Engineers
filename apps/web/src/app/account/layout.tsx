import { RequireAuth } from "@/components/auth/require-auth";
import { AppHeader } from "@/components/shared/app-header";

/**
 * Account details sit outside /dashboard because everybody has an account, not
 * only customers. When this lived under the customer area a technician who
 * opened it landed in the customer navigation, and management could not reach
 * it at all without being bounced.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="flex-1">
        <RequireAuth>{children}</RequireAuth>
      </main>
    </div>
  );
}
