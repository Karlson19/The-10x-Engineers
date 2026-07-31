import { RequireAuth } from "@/components/auth/require-auth";
import { AdminDesktopNav, AdminTabBar } from "@/components/shared/admin-nav";
import { AppHeader } from "@/components/shared/app-header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <AdminDesktopNav />
      <main className="flex-1 pb-20 md:pb-0">
        <RequireAuth allowedRoles={["MANAGEMENT"]}>{children}</RequireAuth>
      </main>
      <AdminTabBar />
    </div>
  );
}
