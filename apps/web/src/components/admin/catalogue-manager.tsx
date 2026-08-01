"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Pencil, Plus, Tags } from "lucide-react";
import {
  SECTION_LABELS,
  SECTIONS,
  type Section,
  type ServiceCatalogItem,
} from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  useCreateCatalogueItem,
  useManagedCatalogue,
  useRetireCatalogueItem,
  useUpdateCatalogueItem,
} from "@/hooks/use-catalogue";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { motionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Draft = {
  name: string;
  description: string;
  section: Section;
  basePrice: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  section: "MECHANICAL",
  basePrice: "",
};

/**
 * The price list, which is now public on the shopfront, so a wrong figure here
 * is a wrong figure a customer reads. Retiring keeps the row, because past
 * bookings point at it and a customer's history should still say what they
 * asked for.
 */
export function CatalogueManager() {
  const catalogue = useManagedCatalogue();
  const createItem = useCreateCatalogueItem();
  const updateItem = useUpdateCatalogueItem();
  const retireItem = useRetireCatalogueItem();
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [editing, setEditing] = useState<ServiceCatalogItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRetire, setPendingRetire] = useState<ServiceCatalogItem | null>(null);

  const isOpen = isAdding || editing !== null;
  const isSaving = createItem.isPending || updateItem.isPending;

  function openAdd(): void {
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setFormError(null);
    setIsAdding(true);
  }

  function openEdit(item: ServiceCatalogItem): void {
    setDraft({
      name: item.name,
      description: item.description,
      section: item.section,
      basePrice: item.basePrice,
    });
    setFieldErrors({});
    setFormError(null);
    setEditing(item);
  }

  function close(): void {
    setIsAdding(false);
    setEditing(null);
  }

  async function handleSave(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const input = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      section: draft.section,
      basePrice: draft.basePrice.trim(),
    };

    try {
      if (editing) {
        await updateItem.mutateAsync({ id: editing.id, input });
        showToast({ tone: "success", title: "Service updated", body: `${input.name} saved.` });
      } else {
        await createItem.mutateAsync({ ...input, isActive: true });
        showToast({
          tone: "success",
          title: "Service added",
          body: `${input.name} is now bookable and shows on the price list.`,
        });
      }
      close();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.details).length > 0) {
        setFieldErrors(error.details);
        setFormError(error.message);
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not save that service. Check your connection and try again.",
      );
    }
  }

  async function handleRetire(): Promise<void> {
    if (!pendingRetire) {
      return;
    }

    try {
      await retireItem.mutateAsync(pendingRetire.id);
      showToast({
        tone: "info",
        title: "Service retired",
        body: `${pendingRetire.name} has come off the price list. Past bookings still show it.`,
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not retire that service",
        body: error instanceof ApiError ? error.message : "Check your connection and try again.",
      });
    } finally {
      setPendingRetire(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Management</p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">
            Service catalogue
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            What customers can ask for when they book, and the starting price shown to them on the
            public price list.
          </p>
        </div>

        {/* The empty state carries this action when the catalogue is bare. */}
        {catalogue.data && catalogue.data.data.length > 0 ? (
          <Button variant="accent" onClick={openAdd}>
            <Plus aria-hidden size={18} />
            Add a service
          </Button>
        ) : null}
      </div>

      <div className="mt-10">
        {catalogue.isPending ? (
          <div className="space-y-2" aria-busy="true">
            <span className="sr-only">Loading the catalogue</span>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="border-b border-border py-5">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="mt-2 h-4 w-72" />
              </div>
            ))}
          </div>
        ) : catalogue.isError ? (
          <ErrorState
            body="We could not load the catalogue. Check your connection and try again."
            onRetry={() => void catalogue.refetch()}
            isRetrying={catalogue.isRefetching}
          />
        ) : catalogue.data.data.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No services yet"
            body="Add the work you offer with a starting price, and customers can pick it when they book."
            action={
              <Button variant="accent" onClick={openAdd}>
                <Plus aria-hidden size={18} />
                Add a service
              </Button>
            }
          />
        ) : (
          // Grouped by section, because that is how the workshop is organised
          // and how the booking wizard offers them.
          <div className="space-y-12">
            {SECTIONS.map((section) => {
              const items = catalogue.data.data.filter((item) => item.section === section);

              if (items.length === 0) {
                return null;
              }

              return (
                <section key={section}>
                  <div className="flex items-baseline justify-between gap-4 border-b-2 border-foreground/85 pb-3">
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      {SECTION_LABELS[section]}
                    </h2>
                    <span className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
                      {items.length} {items.length === 1 ? "service" : "services"}
                    </span>
                  </div>

                  <ul>
                    {items.map((item, index) => (
                      <motion.li
                        key={item.id}
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: motionTokens.base,
                          ease: motionTokens.easeOut,
                          delay: prefersReducedMotion ? 0 : Math.min(index, 8) * 0.03,
                        }}
                        className={cn(
                          "flex flex-col gap-3 border-b border-border py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
                          !item.isActive && "opacity-65",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <p className="text-lg font-medium text-foreground">{item.name}</p>
                            {item.isActive ? null : <Badge tone="stopped">Retired</Badge>}
                          </div>
                          <p className="mt-1 max-w-2xl text-base text-muted-foreground">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                          <span className="font-mono text-lg text-foreground">
                            {formatCurrency(item.basePrice)}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                              <Pencil aria-hidden size={16} />
                              Edit
                            </Button>
                            {item.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPendingRetire(item)}
                              >
                                Retire
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={isOpen}
        onClose={close}
        title={editing ? "Edit this service" : "Add a service"}
        description={
          editing
            ? "Changing the price here changes what new customers are quoted. Bookings already made keep the price they were given."
            : "This appears in the booking wizard and on the public price list."
        }
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => void handleSave()}
              isPending={isSaving}
              pendingLabel="Saving"
            >
              {editing ? "Save changes" : "Add service"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <Alert tone="error" title="Could not save that service">
              {formError}
            </Alert>
          ) : null}

          <FormField id="serviceName" label="Name" error={fieldErrors.name}>
            {(field) => (
              <Input
                {...field}
                value={draft.name}
                placeholder="Full engine service"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            )}
          </FormField>

          <FormField id="serviceDescription" label="Description" error={fieldErrors.description}>
            {(field) => (
              <Textarea
                {...field}
                value={draft.description}
                placeholder="What is included, in a sentence a customer would understand."
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            )}
          </FormField>

          <FormField id="serviceSection" label="Section" error={fieldErrors.section}>
            {(field) => (
              <Select
                {...field}
                value={draft.section}
                onChange={(event) =>
                  setDraft({ ...draft, section: event.target.value as Section })
                }
              >
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {SECTION_LABELS[section]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField
            id="serviceBasePrice"
            label="Starting price"
            error={fieldErrors.basePrice}
            hint="In cedis, for example 450.00. Shown to customers as a price to start from."
          >
            {(field) => (
              <Input
                {...field}
                inputMode="decimal"
                value={draft.basePrice}
                placeholder="450.00"
                onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })}
              />
            )}
          </FormField>
        </div>
      </Dialog>

      <ConfirmDialog
        open={pendingRetire !== null}
        onClose={() => setPendingRetire(null)}
        onConfirm={() => void handleRetire()}
        title="Retire this service?"
        description={
          pendingRetire
            ? `${pendingRetire.name} comes off the booking wizard and the public price list. Bookings that already asked for it are not affected.`
            : ""
        }
        confirmLabel="Retire it"
        isPending={retireItem.isPending}
        pendingLabel="Retiring"
      />
    </div>
  );
}
