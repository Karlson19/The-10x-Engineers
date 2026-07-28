"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import type { LineType, Section } from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useInventory } from "@/hooks/use-inventory";
import { useAddWorkLogEntry, useRemoveWorkLogEntry, useWorkLog } from "@/hooks/use-jobs";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DEFAULT_LABOUR_RATE = "80.00";

/**
 * Parts come out of stock as they are logged, so the picker shows live counts
 * and the running total moves as lines land. This is where a job turns into a
 * bill, so it has to be quick to use with oily hands on a phone.
 */
export function WorkLogEditor({
  jobId,
  section,
  isLocked,
}: {
  jobId: string;
  section: Section;
  isLocked: boolean;
}) {
  const workLog = useWorkLog(jobId);
  const inventory = useInventory({ section });
  const addEntry = useAddWorkLogEntry(jobId);
  const removeEntry = useRemoveWorkLogEntry(jobId);

  const [lineType, setLineType] = useState<LineType>("PART");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState(DEFAULT_LABOUR_RATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const items = inventory.data?.data ?? [];
  const selectedItem = items.find((item) => item.id === inventoryItemId);

  function reset(): void {
    setInventoryItemId("");
    setDescription("");
    setQuantity("1");
    setErrors({});
  }

  async function handleAdd(): Promise<void> {
    setErrors({});
    setFormError(null);

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      setErrors({ quantity: "Enter at least one." });
      return;
    }

    try {
      await addEntry.mutateAsync(
        lineType === "PART"
          ? { lineType: "PART", inventoryItemId, quantity: parsedQuantity }
          : {
              lineType: "LABOUR",
              description,
              quantity: parsedQuantity,
              unitCost,
            },
      );
      reset();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.details).length > 0) {
        setErrors(error.details);
        setFormError(error.message);
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not add that line. Check your connection and try again.",
      );
    }
  }

  if (workLog.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        <span className="sr-only">Loading the work log</span>
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (workLog.isError) {
    return (
      <ErrorState
        body="We could not load the work log. Check your connection and try again."
        onRetry={() => void workLog.refetch()}
        isRetrying={workLog.isRefetching}
      />
    );
  }

  const entries = workLog.data.data;

  return (
    <div>
      <div className="flex items-baseline justify-between border-b-2 border-foreground/85 pb-3">
        <h2 className="font-display text-xl font-semibold text-foreground">Work log</h2>
        <motion.span
          key={workLog.data.total}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
          className="font-mono text-lg text-foreground"
        >
          {formatCurrency(workLog.data.total)}
        </motion.span>
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-base text-muted-foreground">
          Nothing logged yet. Add the parts you fit and the hours you spend as you go.
        </p>
      ) : (
        <ul>
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
                className="flex items-center gap-4 border-b border-border py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-foreground">{entry.description}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {entry.lineType === "PART" ? "Part" : "Labour"} | {entry.quantity} x{" "}
                    {formatCurrency(entry.unitCost)}
                  </p>
                </div>

                <span className="font-mono text-base text-foreground">
                  {formatCurrency(entry.lineTotal)}
                </span>

                {isLocked ? null : (
                  <button
                    type="button"
                    aria-label={`Remove ${entry.description}`}
                    onClick={() => void removeEntry.mutateAsync(entry.id)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 aria-hidden size={18} />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {isLocked ? (
        <p className="mt-6 text-base text-muted-foreground">
          This job is finished, so the work log is closed.
        </p>
      ) : (
        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <h3 className="font-display text-lg font-semibold text-card-foreground">Add a line</h3>

          {formError ? (
            <Alert tone="error" title="Could not add that line" className="mt-4">
              {formError}
            </Alert>
          ) : null}

          <div className="mt-4 flex gap-2">
            {(["PART", "LABOUR"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={lineType === option}
                onClick={() => {
                  setLineType(option);
                  setErrors({});
                }}
                className={cn(
                  "min-h-11 flex-1 rounded-lg border px-4 text-sm transition-colors",
                  lineType === option
                    ? "border-foreground bg-foreground text-background"
                    : "border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
              >
                {option === "PART" ? "Part from stock" : "Labour"}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {lineType === "PART" ? (
              <FormField id="inventoryItemId" label="Part" error={errors.inventoryItemId}>
                {(field) => (
                  <Select
                    {...field}
                    value={inventoryItemId}
                    onChange={(event) => setInventoryItemId(event.target.value)}
                    disabled={inventory.isPending}
                  >
                    <option value="">Choose a part</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id} disabled={item.quantityInStock === 0}>
                        {item.name} ({item.quantityInStock} in stock)
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            ) : (
              <FormField id="description" label="What was done" error={errors.description}>
                {(field) => (
                  <Input
                    {...field}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Brake strip and rebuild"
                  />
                )}
              </FormField>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="quantity"
                label={lineType === "PART" ? "How many" : "Hours"}
                error={errors.quantity}
              >
                {(field) => (
                  <Input
                    {...field}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                )}
              </FormField>

              {lineType === "LABOUR" ? (
                <FormField id="unitCost" label="Hourly rate" error={errors.unitCost}>
                  {(field) => (
                    <Input
                      {...field}
                      inputMode="decimal"
                      value={unitCost}
                      onChange={(event) => setUnitCost(event.target.value)}
                    />
                  )}
                </FormField>
              ) : (
                <div className="flex flex-col justify-end">
                  <p className="text-sm text-muted-foreground">
                    {selectedItem
                      ? `${formatCurrency(selectedItem.unitCost)} each, ${selectedItem.quantityInStock} in stock`
                      : "Priced at what the part costs the workshop."}
                  </p>
                </div>
              )}
            </div>

            {selectedItem && selectedItem.isLowStock ? (
              <p className="flex items-center gap-2 text-sm text-warning">
                <TriangleAlert aria-hidden size={16} />
                This part is at or below its reorder level.
              </p>
            ) : null}

            <Button
              variant="accent"
              onClick={() => void handleAdd()}
              isPending={addEntry.isPending}
              pendingLabel="Adding"
            >
              <Plus aria-hidden size={18} />
              Add line
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
