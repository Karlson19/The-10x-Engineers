"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Moving through a list that does not fit on one page.
 *
 * The counts are spelled out rather than left as bare arrows, because the
 * important thing is knowing there is more: a list that silently stopped at
 * whatever the first page held was hiding records from the person whose job it
 * is to know about them.
 */
export function Pagination({
  page,
  totalPages,
  total,
  label,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  /** Plural noun for what is being counted, for example "bookings". */
  label: string;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        {total} {total === 1 ? label.replace(/s$/, "") : label}
      </p>
    );
  }

  return (
    <nav
      aria-label={`${label} pages`}
      className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5"
    >
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}, {total} {label} in total
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft aria-hidden size={16} />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRight aria-hidden size={16} />
        </Button>
      </div>
    </nav>
  );
}
