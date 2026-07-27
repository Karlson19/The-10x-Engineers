import { RequireAuth } from "@/components/auth/require-auth";
import { AppProviders } from "@/components/providers/app-providers";
import { AppHeader } from "@/components/shared/app-header";
import { BottomTabBar, DesktopNav } from "@/components/shared/client-nav";

/**
 * Everything under /dashboard is behind the session. RequireAuth keeps people
 * out of screens that would only error, but the API checks every request as
 * well, because a client side guard protects nothing on its own.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <DesktopNav />
        {/* Room for the tab bar so it never sits on top of the last row. */}
        <main className="flex-1 pb-20 md:pb-0">
          <RequireAuth>{children}</RequireAuth>
        </main>
        <BottomTabBar />
      </div>
    </AppProviders>
  );
}
