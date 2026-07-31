"use client";

import { useQuery } from "@tanstack/react-query";
import {
  SECTION_LABELS,
  type Section,
  serviceCatalogueResponseSchema,
} from "@chrysmec/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";

/** How many services to show per section before the list gets long. */
const PER_SECTION = 4;

/**
 * The public price list. Real figures from the catalogue rather than invented
 * ones, because "from GHS 420.00" is the thing a customer actually wants to
 * know before they ring anybody.
 *
 * Fetched in the browser rather than on the server: the API sleeps on its free
 * plan and can take the better part of a minute to wake, and the shopfront must
 * never wait on that to paint.
 */
export function PriceList() {
  const catalogue = useQuery({
    queryKey: ["catalogue", "public"] as const,
    queryFn: () => apiRequest("/services/public", serviceCatalogueResponseSchema),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });

  if (catalogue.isError) {
    return null;
  }

  const bySection = (section: Section) =>
    (catalogue.data?.data ?? []).filter((item) => item.section === section).slice(0, PER_SECTION);

  return (
    <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
      {(["MECHANICAL", "ELECTRICAL"] as const).map((section) => {
        const items = bySection(section);

        return (
          <div key={section}>
            <h3 className="border-b-2 border-foreground/85 pb-3 font-display text-xl font-semibold text-foreground">
              {SECTION_LABELS[section]}
            </h3>

            {catalogue.isPending ? (
              <div className="mt-1 space-y-1" aria-busy="true">
                <span className="sr-only">Loading prices</span>
                {Array.from({ length: PER_SECTION }).map((_, index) => (
                  <div key={index} className="flex justify-between gap-6 border-b border-border py-4">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="py-4 text-base text-muted-foreground">
                Prices for this section are not listed yet. Ring the workshop and we will quote you.
              </p>
            ) : (
              <dl className="mt-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-baseline justify-between gap-6 border-b border-border py-4"
                  >
                    <dt className="text-base text-foreground">{item.name}</dt>
                    <dd className="shrink-0 font-mono text-sm text-muted-foreground">
                      from {formatCurrency(item.basePrice)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
