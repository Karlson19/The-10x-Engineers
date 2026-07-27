"use client";

import { Check, ClipboardList } from "lucide-react";
import type { Section } from "@chrysmec/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCatalogue } from "@/hooks/use-service-requests";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Optional. Someone who knows they need a full service can say so, and someone
 * who has no idea can skip the whole step. Prices are indicative and the real
 * estimate comes from the technician after diagnosis.
 */
export function StepServices({
  section,
  selectedIds,
  onChange,
}: {
  section: Section | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const catalogue = useCatalogue(section);

  if (catalogue.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        <span className="sr-only">Loading services</span>
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (catalogue.isError) {
    return (
      <ErrorState
        body="We could not load the service list. You can skip this step and we will work it out on inspection."
        onRetry={() => void catalogue.refetch()}
        isRetrying={catalogue.isRefetching}
      />
    );
  }

  const items = catalogue.data.data;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nothing listed for this section"
        body="Skip this step. A technician will work out what is needed on inspection."
      />
    );
  }

  function toggle(id: string): void {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  const total = items
    .filter((item) => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + Number.parseFloat(item.basePrice), 0);

  return (
    <div>
      <p className="mb-4 text-base text-muted-foreground">
        Optional. Pick anything you already know you want. Prices are a guide, and the real estimate
        comes after a technician has looked at the vehicle.
      </p>

      <div role="group" className="grid gap-2">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <label
              key={item.id}
              className={cn(
                "flex cursor-pointer items-start gap-3.5 rounded-lg border px-4 py-3.5",
                "transition-[border-color,background-color,transform] duration-150",
                "hover:border-foreground/30 active:scale-[0.99]",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                "motion-reduce:transition-none motion-reduce:active:scale-100",
                isSelected
                  ? "border-accent bg-accent-subtle dark:bg-accent/15"
                  : "border-input bg-card",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => toggle(item.id)}
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] border-2",
                  isSelected ? "border-accent bg-accent text-accent-foreground" : "border-input",
                )}
              >
                {isSelected ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {formatCurrency(item.basePrice)}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      {selectedIds.length > 0 ? (
        <div className="mt-5 flex items-baseline justify-between border-t-2 border-foreground/85 pt-3">
          <span className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Indicative total
          </span>
          <span className="font-mono text-lg text-foreground">{formatCurrency(total)}</span>
        </div>
      ) : null}
    </div>
  );
}
