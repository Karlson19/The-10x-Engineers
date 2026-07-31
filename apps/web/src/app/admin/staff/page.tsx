import type { Metadata } from "next";
import { StaffManager } from "@/components/admin/staff-manager";

export const metadata: Metadata = {
  title: "Technicians",
};

export default function AdminStaffPage() {
  return <StaffManager />;
}
