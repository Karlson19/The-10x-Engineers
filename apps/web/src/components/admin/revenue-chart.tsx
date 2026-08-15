"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "motion/react";
import { ChartSpline } from "lucide-react";
import type { MonthlyPoint } from "@chrysmec/shared";
import { EmptyState } from "@/components/ui/states";
import { formatCurrency } from "@/lib/format";

function monthDate(month: string): Date {
  const [year, monthPart] = month.split("-");
  return new Date(Number(year), Number(monthPart) - 1, 1);
}

/** "Feb", for a chart axis where the year is already in the caption. */
function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(monthDate(month));
}

/** "Feb 2026", for the table underneath, which is read on its own. */
function monthAndYear(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(
    monthDate(month),
  );
}

type ChartPoint = { month: string; label: string; revenue: number; expenses: number };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-sm shadow-none">
      <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex justify-between gap-6">
            <span className="text-muted-foreground">
              {entry.dataKey === "revenue" ? "Revenue" : "Parts cost"}
            </span>
            <span className="font-mono text-popover-foreground">
              {formatCurrency(Number(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Revenue against the cost of parts, over six months. The lines draw left to
 * right on first mount only, never on a refetch.
 */
export function RevenueChart({ data }: { data: readonly MonthlyPoint[] }) {
  const prefersReducedMotion = useReducedMotion();

  const points: ChartPoint[] = data.map((point) => ({
    month: point.month,
    label: monthLabel(point.month),
    revenue: Number.parseFloat(point.revenue),
    expenses: Number.parseFloat(point.expenses),
  }));

  /*
    A chart of nothing is worse than no chart. Six months of flat zeroes drawn
    against a full axis reads as a broken graph rather than as a quiet period,
    and that is exactly what a new workshop sees on its first day.
  */
  const hasAnything = points.some((point) => point.revenue > 0 || point.expenses > 0);

  if (!hasAnything) {
    return (
      <EmptyState
        icon={ChartSpline}
        title="No money has moved yet"
        body="Once a job is finished and paid for, the revenue against what the parts cost will be plotted here across six months."
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className="h-0.5 w-5 rounded-full bg-primary" />
          Revenue
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className="h-0.5 w-5 rounded-full bg-accent" />
          Parts cost
        </span>
      </div>

      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={56}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={700}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={700}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* The same figures as a table, for anyone not reading the chart. */}
      <table className="sr-only">
        <caption>Revenue and parts cost by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Revenue</th>
            <th scope="col">Parts cost</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{monthAndYear(point.month)}</th>
              <td>{formatCurrency(point.revenue)}</td>
              <td>{formatCurrency(point.expenses)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
