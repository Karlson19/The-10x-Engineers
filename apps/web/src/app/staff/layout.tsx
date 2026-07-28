import { RequireAuth } from "@/components/auth/require-auth";
import { AppProviders } from "@/components/providers/app-providers";
import { AppHeader } from "@/components/shared/app-header";
import { StaffDesktopNav, StaffTabBar } from "@/components/shared/staff-nav";

/**
 * The workshop floor. Management can see it too, because they cover the desk
 * when a technician is under a car.
 */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <StaffDesktopNav />
        <main className="flex-1 pb-20 md:pb-0">
          <RequireAuth allowedRoles={["STAFF", "MANAGEMENT"]}>{children}</RequireAuth>
        </main>
        <StaffTabBar />
      </div>
    </AppProviders>
  );
}
