"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { fetchInventory } from "@/lib/api";
import { Card, Select } from "@/components/ui/primitives";
import { formatGHS, cn } from "@/lib/utils";
import type { Section } from "@/lib/types";

export default function ManagementInventoryPage() {
  const [section, setSection] = useState<string>("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["inventory", "all"], queryFn: () => fetchInventory() });

  const filtered = (data ?? []).filter((i) => section === "ALL" || i.section === (section as Section));
  const lowStockCount = (data ?? []).filter((i) => i.quantityInStock <= i.reorderLevel).length;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="label-eyebrow">Sales, stock &amp; finance tracking</div>
          <h1 className="mt-1 font-display text-2xl">Inventory</h1>
        </div>
        <Select value={section} onChange={(e) => setSection(e.target.value)} className="w-44">
          <option value="ALL">All sections</option>
          <option value="MECHANICAL">Mechanical</option>
          <option value="ELECTRICAL">Electrical</option>
        </Select>
      </div>

      {lowStockCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-rust/30 bg-rust-soft px-4 py-2.5 text-sm text-rust">
          <AlertTriangle size={15} />
          {lowStockCount} item{lowStockCount > 1 ? "s" : ""} at or below reorder level
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading && <div className="h-40 animate-pulse bg-paper-dim/60" />}
        {data && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="p-3 font-medium">Item</th>
                <th className="p-3 font-medium">Section</th>
                <th className="p-3 text-right font-medium">In stock</th>
                <th className="p-3 text-right font-medium">Reorder at</th>
                <th className="p-3 text-right font-medium">Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const low = i.quantityInStock <= i.reorderLevel;
                return (
                  <tr key={i.id} className="border-b border-paper-line last:border-0">
                    <td className="p-3">
                      <div className="font-medium text-ink">{i.name}</div>
                      <div className="font-mono text-xs text-ink-faint">{i.sku}</div>
                    </td>
                    <td className="p-3 text-ink-soft">{i.section}</td>
                    <td className={cn("p-3 text-right", low && "font-semibold text-rust")}>
                      {i.quantityInStock}
                    </td>
                    <td className="p-3 text-right text-ink-faint">{i.reorderLevel}</td>
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
