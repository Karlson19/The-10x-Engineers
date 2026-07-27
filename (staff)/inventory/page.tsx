"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { fetchInventory } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { Card } from "@/components/ui/primitives";
import { formatGHS, cn } from "@/lib/utils";

export default function StaffInventoryPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", user?.section],
    queryFn: () => fetchInventory(user?.section ?? undefined),
    enabled: !!user,
  });

  return (
    <div>
      <div className="label-eyebrow">Check before you travel</div>
      <h1 className="mt-1 font-display text-2xl">Stock — {user?.section}</h1>

      <Card className="mt-5 overflow-hidden">
        {isLoading && <div className="h-40 animate-pulse bg-paper-dim/60" />}
        {data && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-3 font-medium">Item</th>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 text-right font-medium">In stock</th>
                <th className="p-3 text-right font-medium">Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => {
                const low = i.quantityInStock <= i.reorderLevel;
                return (
                  <tr key={i.id} className="border-b border-paper-line last:border-0">
                    <td className="p-3 font-medium text-ink">{i.name}</td>
                    <td className="p-3 font-mono text-xs text-ink-faint">{i.sku}</td>
                    <td className={cn("p-3 text-right", low && "font-semibold text-rust")}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        {low && <AlertTriangle size={13} />}
                        {i.quantityInStock}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{formatGHS(i.unitCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
