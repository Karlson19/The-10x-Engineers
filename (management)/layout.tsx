"use client";

import { LayoutDashboard, ClipboardList, Boxes, BarChart3 } from "lucide-react";
import { RoleShell, type NavItem } from "@/components/nav/role-shell";

const nav: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/requests", label: "All requests", icon: ClipboardList },
  { href: "/stock", label: "Inventory", icon: Boxes },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell tone="mgmt" roleLabel="Management" navItems={nav} layout="sidebar">
      {children}
    </RoleShell>
  );
}
