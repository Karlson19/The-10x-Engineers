"use client";

import dynamic from "next/dynamic";
import type { MonthlyPoint } from "@chrysmec/shared";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts is around 100kB. Splitting it out means the metric cards paint
 * first and the chart arrives a moment later, which matters a great deal more
 * on a phone over 3G than it does on the office desktop.
 */
const RevenueChart = dynamic(
  () => import("@/components/admin/revenue-chart").then((module) => module.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div aria-busy="true">
        <span className="sr-only">Loading the chart</span>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    ),
  },
);

export function LazyRevenueChart({ data }: { data: readonly MonthlyPoint[] }) {
  return <RevenueChart data={data} />;
}
