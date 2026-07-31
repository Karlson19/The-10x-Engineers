import { RequireAuth } from "@/components/auth/require-auth";
import { AppHeader } from "@/components/shared/app-header";
import { BottomTabBar, DesktopNav } from "@/components/shared/client-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";

/**
 * The customer area, and customers only. A technician who wandered in here used
 * to get the booking wizard and a "could not load your vehicles" error, because
 * the API correctly refuses them; now they are turned away with an explanation.
 *
 * RequireAuth keeps people out of screens that would only error, but the API
 * checks every request as well, because a client side guard protects nothing on
 * its own. Account details live at /account, which every role can reach.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <AppHeader />
      <DesktopNav />
      {/* Room for the tab bar so it never sits on top of the last row. */}
      <main className="flex-1 pb-20 md:pb-0">
        <RequireAuth allowedRoles={["CLIENT"]}>{children}</RequireAuth>
      </main>
      <BottomTabBar />
    </div>
  );
}
