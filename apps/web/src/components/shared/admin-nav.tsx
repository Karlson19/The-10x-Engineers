"use client";

import { Boxes, ChartColumn, ClipboardList, Receipt, Tags, Users } from "lucide-react";
import { SectionDesktopNav, SectionTabBar, type NavItem } from "@/components/shared/section-nav";

const ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: ChartColumn },
  { href: "/admin/requests", label: "Requests", icon: ClipboardList },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/catalogue", label: "Prices", icon: Tags },
];

export function AdminDesktopNav() {
  return <SectionDesktopNav items={ITEMS} rootHref="/admin" layoutId="admin-nav" />;
}

export function AdminTabBar() {
  return <SectionTabBar items={ITEMS} rootHref="/admin" layoutId="admin-tabs" />;
}
