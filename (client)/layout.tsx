"use client";

import { Home, Car, PlusCircle, Inbox } from "lucide-react";
import { RoleShell, type NavItem } from "@/components/nav/role-shell";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Requests", icon: Home },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/requests/new", label: "New", icon: PlusCircle },
  { href: "/requests/outbox", label: "Outbox", icon: Inbox },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleShell tone="client" roleLabel="Client" navItems={nav} layout="bottom">
      {children}
    </RoleShell>
  );
}
