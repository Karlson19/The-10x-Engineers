"use client";

import { ListChecks, Boxes } from "lucide-react";
import { RoleShell, type NavItem } from "@/components/nav/role-shell";

const nav: NavItem[] = [
  { href: "/queue", label: "Job queue", icon: ListChecks },
  { href: "/inventory", label: "Inventory", icon: Boxes },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell tone="staff" roleLabel="Staff · Mechanical" navItems={nav} layout="sidebar">
      {children}
    </RoleShell>
  );
}
