"use client";

import { useState } from "react";
import type { InventoryItem } from "@chrysmec/shared";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRestockInventoryItem } from "@/hooks/use-inventory";

/** Inline restocking, because that is the job that actually gets done here. */
function RestockControl({ item }: { item: InventoryItem }) {
  const restock = useRestockInventoryItem();
  const [quantity, setQuantity] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" className="px-3" onClick={() => setIsOpen(true)}>
        Restock
      </Button>
    );
  }

  const parsed = Number.parseInt(quantity, 10);

  return (
    <div className="flex items-center justify-end gap-2">
      <label htmlFor={`restock-${item.id}`} className="sr-only">
        How many of {item.name} arrived
      </label>
      <Input
        id={`restock-${item.id}`}
        type="number"
        inputMode="numeric"
        min={1}
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        className="w-24"
      />
      <Button
        size="sm"
        variant="accent"
        isPending={restock.isPending}
        pendingLabel="Adding"
        onClick={async () => {
          if (!Number.isFinite(parsed) || parsed < 1) {
            return;
          }
          await restock.mutateAsync({ id: item.id, quantity: parsed });
          setQuantity("");
          setIsOpen(false);
        }}
      >
        Add
      </Button>
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <InventoryTable
      title="Inventory"
      standfirst="Every part across both sections, with live counts. Anything at or below its reorder level is flagged."
      renderAction={(item) => <RestockControl item={item} />}
    />
  );
}
