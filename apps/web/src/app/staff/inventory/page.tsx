"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { InventoryTable } from "@/components/inventory/inventory-table";

/**
 * Read only for a technician. The section comes from their account, and the
 * API scopes it again regardless of what the browser asks for.
 */
export default function StaffInventoryPage() {
  const { user } = useAuth();

  return (
    <InventoryTable
      section={user?.section ?? undefined}
      title="Stock levels"
      standfirst="Live counts for your section. Parts come off this list as you log them against a job."
    />
  );
}
