"use client";

import { useState } from "react";
import { Boxes, TriangleAlert } from "lucide-react";
import type { InventoryItem } from "@chrysmec/shared";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useInventory } from "@/hooks/use-inventory";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Stacked cards on a phone, a table on a wide screen. Never a horizontal
 * scroll, because these are read standing at a parts shelf.
 */
function StockRow({ item, action }: { item: InventoryItem; action?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-2 border-b border-border py-4",
        "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_auto] md:items-center",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-base text-foreground">{item.name}</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.sku}</p>
      </div>

      <p className="font-mono text-sm text-muted-foreground md:text-left">
        {formatCurrency(item.unitCost)}
      </p>

      <p className="font-mono text-base text-foreground md:text-right">
        <span className="text-muted-foreground md:hidden">In stock: </span>
        {item.quantityInStock}
      </p>

      <div className="md:w-36 md:text-right">
        {item.isLowStock ? (
          <Badge tone="stopped" icon={TriangleAlert}>
            Reorder
          </Badge>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">
            Reorder at {item.reorderLevel}
          </span>
        )}
      </div>

      {action ? <div className="md:text-right">{action}</div> : null}
    </div>
  );
}

export function InventoryTable({
  section,
  title,
  standfirst,
  renderAction,
}: {
  section?: InventoryItem["section"];
  title: string;
  standfirst: string;
  renderAction?: (item: InventoryItem) => React.ReactNode;
}) {
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const inventory = useInventory({ section, lowStock: lowStockOnly });

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="eyebrow">Stock</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">{title}</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">{standfirst}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {[
          { value: false, label: "Everything" },
          { value: true, label: "Needs reordering" },
        ].map((filter) => (
          <button
            key={String(filter.value)}
            type="button"
            aria-pressed={lowStockOnly === filter.value}
            onClick={() => setLowStockOnly(filter.value)}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-sm transition-colors",
              lowStockOnly === filter.value
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {inventory.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Loading stock</span>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-14" />
            ))}
          </div>
        ) : null}

        {inventory.isError ? (
          <ErrorState
            body="We could not load the stock list. Check your connection and try again."
            onRetry={() => void inventory.refetch()}
            isRetrying={inventory.isRefetching}
          />
        ) : null}

        {inventory.isSuccess && inventory.data.data.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={lowStockOnly ? "Nothing needs reordering" : "No parts listed"}
            body={
              lowStockOnly
                ? "Every part is above its reorder level."
                : "Once parts are added they will show here with live counts."
            }
          />
        ) : null}

        {inventory.isSuccess && inventory.data.data.length > 0 ? (
          <>
            <div className="hidden border-b-2 border-foreground/85 pb-3 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_auto] md:gap-x-6">
              <span>Part</span>
              <span>Unit cost</span>
              <span className="text-right">In stock</span>
              <span className="w-36 text-right">Level</span>
              {renderAction ? <span className="text-right">Action</span> : null}
            </div>
            {inventory.data.data.map((item) => (
              <StockRow key={item.id} item={item} action={renderAction?.(item)} />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
