"use client";

import { useState } from "react";
import type { InventoryItem } from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useReceiveStock } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";

/**
 * Booking in a delivery.
 *
 * The price is required, not optional. Recording a quantity without what was
 * paid is what left the workshop unable to answer what a part costs or whether
 * a supplier had put prices up, and it is the whole reason the ledger exists.
 */
export function ReceiveStockDialog({
  item,
  open,
  onClose,
}: {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const receive = useReceiveStock();
  const { showToast } = useToast();

  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function reset(): void {
    setQuantity("");
    setUnitCost("");
    setSupplier("");
    setReference("");
    setFieldErrors({});
    setFormError(null);
  }

  async function handleSave(): Promise<void> {
    if (!item) {
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      setFieldErrors({ quantity: "Enter how many arrived." });
      return;
    }

    try {
      await receive.mutateAsync({
        id: item.id,
        input: {
          quantity: parsedQuantity,
          unitCost: unitCost.trim(),
          supplier: supplier.trim() || undefined,
          reference: reference.trim() || undefined,
        },
      });

      showToast({
        tone: "success",
        title: "Stock received",
        body: `${parsedQuantity} of ${item.name} booked in at ${formatCurrency(unitCost.trim())} each.`,
      });
      reset();
      onClose();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.details).length > 0) {
        setFieldErrors(error.details);
        setFormError(error.message);
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not book that in. Check your connection and try again.",
      );
    }
  }

  const parsedQuantity = Number.parseInt(quantity, 10);
  const parsedCost = Number.parseFloat(unitCost);
  const lineTotal =
    Number.isFinite(parsedQuantity) && Number.isFinite(parsedCost)
      ? parsedQuantity * parsedCost
      : null;

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={item ? `Book in ${item.name}` : "Book in stock"}
      description="What arrived and what it cost. The price is kept against this delivery, so the history shows what the part has cost over time."
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={() => void handleSave()}
            isPending={receive.isPending}
            pendingLabel="Booking in"
          >
            Book it in
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? (
          <Alert tone="error" title="Could not book that in">
            {formError}
          </Alert>
        ) : null}

        {item ? (
          <p className="text-base text-muted-foreground">
            {item.quantityInStock} on the shelf now, valued at{" "}
            <span className="font-mono">{formatCurrency(item.unitCost)}</span> each.
          </p>
        ) : null}

        <FormField id="receiveQuantity" label="How many arrived" error={fieldErrors.quantity}>
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

        <FormField
          id="receiveUnitCost"
          label="Price paid for each one"
          error={fieldErrors.unitCost}
          hint="In cedis, for example 185.00. What the supplier charged, not what you sell it for."
        >
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              placeholder="185.00"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
            />
          )}
        </FormField>

        <FormField id="receiveSupplier" label="Supplier" error={fieldErrors.supplier}>
          {(field) => (
            <Input
              {...field}
              value={supplier}
              placeholder="Adum Auto Spares"
              onChange={(event) => setSupplier(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          id="receiveReference"
          label="Invoice number"
          error={fieldErrors.reference}
          hint="Optional. Makes this delivery findable against the supplier's paperwork."
        >
          {(field) => (
            <Input
              {...field}
              value={reference}
              placeholder="INV-4821"
              onChange={(event) => setReference(event.target.value)}
            />
          )}
        </FormField>

        {lineTotal !== null ? (
          <div className="flex items-baseline justify-between border-t-2 border-foreground/85 pt-3">
            <span className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Delivery total
            </span>
            <span className="font-mono text-lg text-foreground">{formatCurrency(lineTotal)}</span>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
