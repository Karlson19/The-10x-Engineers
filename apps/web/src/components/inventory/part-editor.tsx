"use client";

import { useState } from "react";
import type { InventoryItem, Section } from "@chrysmec/shared";
import { SECTIONS, SECTION_LABELS } from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCreateInventoryItem, useUpdateInventoryItem } from "@/hooks/use-inventory";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";

type Draft = {
  name: string;
  sku: string;
  section: Section;
  quantityInStock: string;
  unitCost: string;
  reorderLevel: string;
  imageUrl: string;
};

const EMPTY: Draft = {
  name: "",
  sku: "",
  section: "MECHANICAL",
  quantityInStock: "0",
  unitCost: "",
  reorderLevel: "5",
  imageUrl: "",
};

function draftFrom(item: InventoryItem): Draft {
  return {
    name: item.name,
    sku: item.sku,
    section: item.section,
    quantityInStock: String(item.quantityInStock),
    unitCost: item.unitCost,
    reorderLevel: String(item.reorderLevel),
    imageUrl: item.imageUrl ?? "",
  };
}

/**
 * Adding and editing a part. The API has always accepted both and there was no
 * way to do either from the app, so the only parts that existed were the ones
 * the seed had put there.
 */
export function PartEditor({
  item,
  open,
  onClose,
}: {
  /** Absent when adding. */
  item?: InventoryItem;
  open: boolean;
  onClose: () => void;
}) {
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<Draft>(item ? draftFrom(item) : EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(item?.id ?? null);

  // Reset the form when the dialog is pointed at a different part.
  const key = item?.id ?? "new";
  if (seededFor !== key) {
    setSeededFor(key);
    setDraft(item ? draftFrom(item) : EMPTY);
    setFieldErrors({});
    setFormError(null);
  }

  const isSaving = createItem.isPending || updateItem.isPending;

  async function save(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const quantity = Number.parseInt(draft.quantityInStock, 10);
    const reorder = Number.parseInt(draft.reorderLevel, 10);
    const problems: Record<string, string> = {};

    if (!Number.isFinite(quantity) || quantity < 0) {
      problems.quantityInStock = "Enter how many are on the shelf, or zero.";
    }
    if (!Number.isFinite(reorder) || reorder < 0) {
      problems.reorderLevel = "Enter the level at which to reorder.";
    }
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems);
      return;
    }

    const payload = {
      name: draft.name.trim(),
      sku: draft.sku.trim().toUpperCase(),
      section: draft.section,
      reorderLevel: reorder,
      imageUrl: draft.imageUrl.trim() || null,
    };

    try {
      if (item) {
        /*
          The count and the cost are not sent on an edit. They are the result of
          what has been received and used, so they are changed by booking a
          delivery in or posting a stock take correction, both of which leave a
          record. Typing over them here would put the shelf and its ledger out
          of step with nothing to explain why.
        */
        await updateItem.mutateAsync({ id: item.id, input: payload });
        showToast({ tone: "success", title: "Part updated", body: `${payload.name} saved.` });
      } else {
        // Creating does carry them: they become the opening receipt, which is
        // the first row of this part's ledger.
        await createItem.mutateAsync({
          ...payload,
          quantityInStock: quantity,
          unitCost: draft.unitCost.trim(),
        });
        showToast({
          tone: "success",
          title: "Part added",
          body: `${payload.name} is now on the stock list and can be logged against a job.`,
        });
      }
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
          : "Could not save that part. Check your connection and try again.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? "Edit this part" : "Add a part"}
      description={
        item
          ? "Changing the unit cost changes what future jobs are costed at. Work already logged keeps the price it was logged at."
          : "It becomes available to technicians in the section you choose."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={() => void save()}
            isPending={isSaving}
            pendingLabel="Saving"
          >
            {item ? "Save changes" : "Add part"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? (
          <Alert tone="error" title="Could not save that part">
            {formError}
          </Alert>
        ) : null}

        <FormField id="partName" label="Part name" error={fieldErrors.name}>
          {(field) => (
            <Input
              {...field}
              value={draft.name}
              placeholder="Front brake pad set"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          )}
        </FormField>

        <FormField
          id="partSku"
          label="Part code"
          error={fieldErrors.sku}
          hint="Your own reference, for example MEC-BRK-PADF. It has to be unique."
        >
          {(field) => (
            <Input
              {...field}
              value={draft.sku}
              placeholder="MEC-BRK-PADF"
              className="font-mono uppercase"
              onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
            />
          )}
        </FormField>

        <FormField id="partSection" label="Section" error={fieldErrors.section}>
          {(field) => (
            <Select
              {...field}
              value={draft.section}
              onChange={(event) => setDraft({ ...draft, section: event.target.value as Section })}
            >
              {SECTIONS.map((section) => (
                <option key={section} value={section}>
                  {SECTION_LABELS[section]}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {/*
          Opening stock, and only when the part is new. On an existing part
          these are the result of what has been received and used, so they are
          shown as figures rather than fields: changing them goes through
          booking a delivery in or a stock take, both of which leave a record of
          who did it and why.
        */}
        {item ? (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
              Stock and cost
            </p>
            <p className="mt-1.5 text-base text-foreground">
              {item.quantityInStock} on the shelf, worth{" "}
              <span className="font-mono">{formatCurrency(item.unitCost)}</span> each on average.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Book a delivery in to add stock at the price you paid, or post a stock take to
              correct the count. Both are kept on the history for this part.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="partCost"
              label="Price paid for each one"
              error={fieldErrors.unitCost}
            >
              {(field) => (
                <Input
                  {...field}
                  inputMode="decimal"
                  value={draft.unitCost}
                  placeholder="180.00"
                  onChange={(event) => setDraft({ ...draft, unitCost: event.target.value })}
                />
              )}
            </FormField>

            <FormField
              id="partQuantity"
              label="Opening stock"
              error={fieldErrors.quantityInStock}
            >
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.quantityInStock}
                  onChange={(event) =>
                    setDraft({ ...draft, quantityInStock: event.target.value })
                  }
                />
              )}
            </FormField>
          </div>
        )}

        <FormField
          id="partReorder"
          label="Reorder level"
          error={fieldErrors.reorderLevel}
          hint="Management is warned when stock reaches this number."
        >
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.reorderLevel}
              onChange={(event) => setDraft({ ...draft, reorderLevel: event.target.value })}
            />
          )}
        </FormField>

        <FormField
          id="partImage"
          label="Photograph"
          error={fieldErrors.imageUrl}
          hint="Optional. A link to a photo of the part, starting with https. Leave it empty and a diagram is drawn instead."
        >
          {(field) => (
            <Input
              {...field}
              type="url"
              inputMode="url"
              value={draft.imageUrl}
              placeholder="https://example.com/brake-pads.jpg"
              onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
            />
          )}
        </FormField>

        {draft.imageUrl.trim().length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.imageUrl.trim()}
            alt=""
            className="size-24 rounded-lg border border-border object-cover"
          />
        ) : null}
      </div>
    </Dialog>
  );
}
