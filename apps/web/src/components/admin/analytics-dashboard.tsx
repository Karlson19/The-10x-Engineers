"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { SECTION_LABELS } from "@chrysmec/shared";
import { MetricCard } from "@/components/admin/metric-card";
import { LazyRevenueChart } from "@/components/admin/revenue-chart-lazy";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useAnalyticsSummary } from "@/hooks/use-analytics";
import { formatCurrency } from "@/lib/format";
import { STATUS_META, statusTone } from "@/lib/status";

/** The last twelve months, newest first, as YYYY-MM. */
function recentPeriods(): Array<{ value: string; label: string }> {
  const now = new Date();

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
    return { value, label };
  });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only">Loading the dashboard</span>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <Skeleton key={card} className="h-[7.5rem]" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const periods = recentPeriods();
  const [period, setPeriod] = useState(periods[0]?.value ?? "");
  const analytics = useAnalyticsSummary(period);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Management</p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">Dashboard</h1>
        </div>

        <div className="sm:w-56">
          <label htmlFor="period" className="sr-only">
            Period
          </label>
          <Select id="period" value={period} onChange={(event) => setPeriod(event.target.value)}>
            {periods.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-10">
        {analytics.isPending ? <DashboardSkeleton /> : null}

        {analytics.isError ? (
          <ErrorState
            body="We could not load the dashboard. Check your connection and try again."
            onRetry={() => void analytics.refetch()}
            isRetrying={analytics.isRefetching}
          />
        ) : null}

        {analytics.isSuccess ? (
          <div className="space-y-10">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                index={0}
                label="Bookings"
                value={analytics.data.bookings}
                format={(value) => String(Math.round(value))}
                hint={`${analytics.data.completed} completed, ${analytics.data.cancelled} cancelled`}
                icon={ClipboardList}
              />
              <MetricCard
                index={1}
                label="Revenue"
                value={Number.parseFloat(analytics.data.revenue)}
                format={formatCurrency}
                hint="Payments received"
                icon={Banknote}
              />
              <MetricCard
                index={2}
                label="Parts cost"
                value={Number.parseFloat(analytics.data.expenses)}
                format={formatCurrency}
                hint="Stock consumed at cost"
                icon={Wrench}
              />
              <MetricCard
                index={3}
                label="Net"
                value={Number.parseFloat(analytics.data.net)}
                format={formatCurrency}
                hint={`${Math.round(analytics.data.conversionRate * 100)} percent of bookings completed`}
                icon={TrendingUp}
                tone="accent"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                index={4}
                label="Jobs open"
                value={analytics.data.activeJobs}
                format={(value) => String(Math.round(value))}
                hint="Assigned or in progress right now"
                icon={CalendarCheck}
              />
              <MetricCard
                index={5}
                label="Needs reordering"
                value={analytics.data.lowStockCount}
                format={(value) => String(Math.round(value))}
                hint="Parts at or below their reorder level"
                icon={TriangleAlert}
                tone={analytics.data.lowStockCount > 0 ? "warning" : "default"}
              />
              <MetricCard
                index={6}
                label="Average rating"
                value={analytics.data.averageRating ?? 0}
                format={(value) =>
                  analytics.data.averageRating === null ? "No ratings" : `${value.toFixed(1)} / 5`
                }
                hint="From feedback left this period"
                icon={TrendingUp}
              />
            </div>

            <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold text-card-foreground">
                Revenue against parts cost
              </h2>
              <p className="mt-1 text-base text-muted-foreground">
                The six months ending {periods.find((item) => item.value === period)?.label ?? ""}.
              </p>
              <div className="mt-6">
                <LazyRevenueChart data={analytics.data.revenueByMonth} />
              </div>
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
                <h2 className="font-display text-xl font-semibold text-card-foreground">
                  Where bookings stand
                </h2>
                <dl className="mt-5">
                  {analytics.data.statusBreakdown.map((entry) => {
                    const meta = STATUS_META[entry.status];
                    const share =
                      analytics.data.bookings === 0
                        ? 0
                        : Math.round((entry.count / analytics.data.bookings) * 100);

                    return (
                      <div
                        key={entry.status}
                        className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
                      >
                        <dt className="flex min-w-0 flex-1 items-center gap-3">
                          <Badge tone={statusTone(entry.status)} icon={meta.icon}>
                            {meta.label}
                          </Badge>
                        </dt>
                        <dd className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground">{share}%</span>
                          <span className="font-mono text-base text-card-foreground tabular-nums">
                            {entry.count}
                          </span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
                <h2 className="font-display text-xl font-semibold text-card-foreground">
                  Most requested services
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Across the six months on the chart.
                </p>
                {analytics.data.topServices.length === 0 ? (
                  <p className="mt-5 text-base text-muted-foreground">
                    Nothing has been requested from the catalogue yet.
                  </p>
                ) : (
                  <ol className="mt-5">
                    {analytics.data.topServices.map((service, index) => (
                      <li
                        key={service.id}
                        className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
                      >
                        <span className="font-mono text-sm text-accent">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base text-card-foreground">
                            {service.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {SECTION_LABELS[service.section]} | {formatCurrency(service.basePrice)}
                          </span>
                        </span>
                        <span className="font-mono text-base text-card-foreground tabular-nums">
                          {service.bookings}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-card-foreground">
                  Low stock
                </h2>
                <Link
                  href="/admin/inventory"
                  className="text-base text-foreground underline decoration-accent decoration-2 underline-offset-[6px] hover:decoration-foreground"
                >
                  Open the stock list
                </Link>
              </div>

              {analytics.data.lowStockItems.length === 0 ? (
                <p className="mt-5 text-base text-muted-foreground">
                  Every part is above its reorder level.
                </p>
              ) : (
                <ul className="mt-5">
                  {analytics.data.lowStockItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base text-card-foreground">
                          {item.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.sku} | {SECTION_LABELS[item.section]}
                        </span>
                      </span>
                      <span className="font-mono text-base text-destructive tabular-nums">
                        {item.quantityInStock}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        of {item.reorderLevel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
