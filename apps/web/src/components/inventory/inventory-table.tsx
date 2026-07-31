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
/**
 * How full the shelf is, as a bar. A row of numbers all reads the same at a
 * glance; a bar that is nearly empty does not, which is the whole point of a
 * stock list somebody scans while standing at the shelf.
 *
 * The scale is three times the reorder level, so the mark where reordering
 * starts sits a third of the way along on every line and they can be compared
 * against each other.
 */
function StockBar({ item }: { item: InventoryItem }) {
  const ceiling = Math.max(item.reorderLevel * 3, item.quantityInStock, 1);
  const filled = Math.min(item.quantityInStock / ceiling, 1);
  const reorderAt = Math.min(item.reorderLevel / ceiling, 1);
  const isOut = item.quantityInStock <= 0;

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted md:w-28">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
          isOut ? "bg-destructive" : item.isLowStock ? "bg-warning" : "bg-primary",
        )}
        style={{ width: `${Math.max(filled * 100, isOut ? 0 : 3)}%` }}
      />
      {/* Where reordering starts, so the bar can be read without the number. */}
      <span
        aria-hidden
        className="absolute inset-y-0 w-px bg-foreground/30"
        style={{ left: `${reorderAt * 100}%` }}
      />
    </div>
  );
}

function StockRow({ item, action }: { item: InventoryItem; action?: React.ReactNode }) {
  const isOut = item.quantityInStock <= 0;

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

      <div className="md:w-32 md:text-right">
        <p
          className={cn(
            "font-mono text-base",
            isOut ? "font-medium text-destructive" : "text-foreground",
          )}
        >
          <span className="text-muted-foreground md:hidden">In stock: </span>
          {isOut ? "None left" : item.quantityInStock}
        </p>
        <StockBar item={item} />
      </div>

      <div className="md:w-36 md:text-right">
        {item.isLowStock ? (
          <Badge tone="stopped" icon={TriangleAlert}>
            {isOut ? "Out of stock" : "Reorder"}
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
