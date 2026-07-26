import { AppProviders } from "@/components/providers/app-providers";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
