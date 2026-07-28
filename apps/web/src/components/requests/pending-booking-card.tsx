"use client";

import { motion, useReducedMotion } from "motion/react";
import { CircleCheck, CloudUpload, TriangleAlert } from "lucide-react";
import {
  SECTION_LABELS,
  type CreateServiceRequest,
  getSymptomCategory,
  sectionSchema,
} from "@chrysmec/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OutboxEntry } from "@/lib/offline/db";
import { removeEntry } from "@/lib/offline/outbox";
import { formatDateTime } from "@/lib/format";
import { motionTokens } from "@/lib/motion";

/** Reads back the queued payload without trusting its shape blindly. */
function describe(entry: OutboxEntry): { section: string; category: string; when: string } | null {
  const payload = entry.payload as Partial<CreateServiceRequest> | null;

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const section = sectionSchema.safeParse(payload.section);
  const category = payload.symptomCategory
    ? getSymptomCategory(payload.symptomCategory)
    : undefined;

  return {
    section: section.success ? SECTION_LABELS[section.data] : "Service",
    category: category?.label ?? "",
    when: payload.preferredDateTime ? formatDateTime(payload.preferredDateTime) : "",
  };
}

/**
 * A booking that is on the phone but not yet at the workshop. This is the row
 * that makes the offline feature visible: the badge crossfades from pending to
 * synced when the queue drains, which is the moment worth showing on demo day.
 */
export function PendingBookingCard({ entry, onChanged }: { entry: OutboxEntry; onChanged: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const details = describe(entry);
  const isSynced = entry.status === "synced";
  const isFailed = entry.status === "failed";

  return (
    <motion.div
      layout
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.base, ease: motionTokens.easeOut }}
      className="border-b border-border py-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono text-sm text-muted-foreground">Not sent yet</span>

        <motion.span
          // Keyed on status so the badge crossfades rather than swapping.
          key={entry.status}
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: motionTokens.fast, ease: motionTokens.easeOut }}
        >
          {isSynced ? (
            <Badge tone="done" icon={CircleCheck}>
              Synced
            </Badge>
          ) : isFailed ? (
            <Badge tone="stopped" icon={TriangleAlert}>
              Did not send
            </Badge>
          ) : (
            <Badge tone="current" icon={CloudUpload}>
              Pending sync
            </Badge>
          )}
        </motion.span>
      </div>

      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">
        {details?.section ?? "Service"}
        {details?.category ? `, ${details.category.toLowerCase()}` : ""}
      </h3>

      <p className="mt-1 text-base text-muted-foreground">
        {isFailed
          ? (entry.lastError ?? "We could not send this one.")
          : isSynced
            ? "Sent to the workshop."
            : "Saved on this device. It will be sent as soon as you have signal."}
      </p>

      {details?.when ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">{details.when}</p>
      ) : null}

      {isFailed ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={async () => {
            if (entry.id !== undefined) {
              await removeEntry(entry.id);
              onChanged();
            }
          }}
        >
          Discard this booking
        </Button>
      ) : null}
    </motion.div>
  );
}
