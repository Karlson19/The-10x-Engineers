"use client";

import { useState } from "react";
import { History, Pencil, Plus, Truck } from "lucide-react";
import type { InventoryItem } from "@chrysmec/shared";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { PartEditor } from "@/components/inventory/part-editor";
import { ReceiveStockDialog } from "@/components/inventory/receive-stock-dialog";
import { StockHistoryDialog } from "@/components/inventory/stock-history-dialog";
import { Button } from "@/components/ui/button";

export default function AdminInventoryPage() {
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [receiving, setReceiving] = useState<InventoryItem | null>(null);
  const [viewingHistory, setViewingHistory] = useState<InventoryItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <>
      <InventoryTable
        title="Inventory"
        standfirst="Every part across both sections, with live counts and what each one is costing. Anything at or below its reorder level is flagged."
        headerAction={
          <Button variant="accent" onClick={() => setIsAdding(true)}>
            <Plus aria-hidden size={18} />
            Add a part
          </Button>
        }
        renderAction={(item) => (
          <div className="flex items-center justify-end gap-1">
            {/*
              Booking a delivery in is the job that actually gets done on this
              screen, so it is the labelled action. It used to take a quantity
              inline with nowhere to put the price, which is why none of the
              history below it existed.
            */}
            <Button variant="ghost" size="sm" className="px-3" onClick={() => setReceiving(item)}>
              <Truck aria-hidden size={16} />
              Book in
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-3"
              onClick={() => setViewingHistory(item)}
              aria-label={`Stock history for ${item.name}`}
            >
              <History aria-hidden size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-3"
              onClick={() => setEditing(item)}
              aria-label={`Edit ${item.name}`}
            >
              <Pencil aria-hidden size={16} />
            </Button>
          </div>
        )}
      />

      <PartEditor open={isAdding} onClose={() => setIsAdding(false)} />
      {editing ? <PartEditor item={editing} open onClose={() => setEditing(null)} /> : null}

      <ReceiveStockDialog
        item={receiving}
        open={receiving !== null}
        onClose={() => setReceiving(null)}
      />
      <StockHistoryDialog
        item={viewingHistory}
        open={viewingHistory !== null}
        onClose={() => setViewingHistory(null)}
      />
    </>
  );
}
