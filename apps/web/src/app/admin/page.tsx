import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminPage() {
  return <AnalyticsDashboard />;
}
