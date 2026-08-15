"use client";

import { ArrowDownLeft, ArrowUpRight, ScrollText, SlidersHorizontal, Undo2 } from "lucide-react";
import {
  type InventoryItem,
  STOCK_MOVEMENT_LABELS,
  type StockMovementType,
} from "@chrysmec/shared";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useStockHistory } from "@/hooks/use-inventory";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const MOVEMENT = {
  RECEIPT: { icon: ArrowDownLeft, tone: "text-success" },
  CONSUMPTION: { icon: ArrowUpRight, tone: "text-muted-foreground" },
  RETURN: { icon: Undo2, tone: "text-primary" },
  ADJUSTMENT: { icon: SlidersHorizontal, tone: "text-warning" },
} as const satisfies Record<StockMovementType, unknown>;

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1.5 font-mono text-xl text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Where a part has been and what it has cost.
 *
 * This is the screen the old model could not produce at all: with a single
 * overwritten price there was no history to show, so a question as ordinary as
 * "are we paying more for brake pads than we were?" had no answer anywhere in
 * the system.
 */
export function StockHistoryDialog({
  item,
  open,
  onClose,
}: {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const history = useStockHistory(open && item ? item.id : null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? item.name : "Stock history"}
      description="Every movement in and out, and what each delivery cost."
      className="sm:max-w-2xl"
    >
      {history.isPending ? (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Loading the stock history</span>
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : history.isError ? (
        <ErrorState
          body="We could not load the history for this part."
          onRetry={() => void history.refetch()}
          isRetrying={history.isRefetching}
        />
      ) : (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Figure
              label="On the shelf"
              value={String(history.data.summary.onHand)}
              hint={`Worth ${formatCurrency(history.data.summary.valuation)}`}
            />
            <Figure
              label="Average cost"
              value={formatCurrency(history.data.summary.averageUnitCost)}
              hint="Weighted across what is held"
            />
            <Figure
              label="Last paid"
              value={
                history.data.summary.lastPaid
                  ? formatCurrency(history.data.summary.lastPaid)
                  : "Not bought yet"
              }
              hint={
                history.data.summary.lastReceivedAt
                  ? formatDateTime(history.data.summary.lastReceivedAt)
                  : undefined
              }
            />
            <Figure
              label="Bought in total"
              value={formatCurrency(history.data.summary.totalPurchased)}
              hint={`${history.data.summary.totalUnitsPurchased} units over time`}
            />
          </div>

          <h3 className="mt-8 border-b-2 border-foreground/85 pb-3 font-display text-lg font-semibold text-foreground">
            Movements
          </h3>

          {history.data.movements.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Nothing recorded yet"
              body="Book a delivery in and it will show here with the price you paid."
              className="mt-4"
            />
          ) : (
            <ul>
              {history.data.movements.map((movement) => {
                const { icon: Icon, tone } = MOVEMENT[movement.type];
                const isIn = movement.quantity > 0;

                return (
                  <li key={movement.id} className="flex gap-3.5 border-b border-border py-3.5">
                    <Icon aria-hidden size={18} className={cn("mt-1 shrink-0", tone)} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="text-base text-foreground">
                          {STOCK_MOVEMENT_LABELS[movement.type]}
                          {movement.supplier ? (
                            <span className="text-muted-foreground"> from {movement.supplier}</span>
                          ) : null}
                        </p>
                        <p className="font-mono text-sm text-foreground">
                          {isIn ? "+" : ""}
                          {movement.quantity} at {formatCurrency(movement.unitCost)}
                        </p>
                      </div>

                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {formatDateTime(movement.createdAt)} | left {movement.balanceAfter} on the
                        shelf
                        {movement.reference ? ` | ${movement.reference}` : ""}
                      </p>

                      {movement.note ? (
                        <p className="mt-1 text-sm text-muted-foreground">{movement.note}</p>
                      ) : null}

                      {movement.recordedBy ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Recorded by {movement.recordedBy.fullName}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Dialog>
  );
}
