"use client";

import { Boxes, ClipboardList } from "lucide-react";
import { SectionDesktopNav, SectionTabBar, type NavItem } from "@/components/shared/section-nav";

/**
 * The items live inside the client boundary on purpose. Icons are components,
 * and a component cannot be handed from a server layout to a client one.
 */
const ITEMS: readonly NavItem[] = [
  { href: "/staff", label: "Job queue", icon: ClipboardList },
  { href: "/staff/inventory", label: "Stock", icon: Boxes },
];

export function StaffDesktopNav() {
  return <SectionDesktopNav items={ITEMS} rootHref="/staff" layoutId="staff-nav" />;
}

export function StaffTabBar() {
  return <SectionTabBar items={ITEMS} rootHref="/staff" layoutId="staff-tabs" />;
}
