import type { Metadata } from "next";
import { ClientHome } from "@/components/requests/client-home";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <ClientHome />;
}
