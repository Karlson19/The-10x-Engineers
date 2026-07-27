"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAnalytics } from "@/lib/api";
import { StatCard, Card } from "@/components/ui/primitives";
import { formatGHS } from "@/lib/utils";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["analytics"], queryFn: fetchAnalytics });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-card bg-paper-dim/60" />;

  const max = Math.max(...data.netByMonth.map((m) => m.net));

  return (
    <div>
      <div className="label-eyebrow">Monthly &amp; quarterly analytics</div>
      <h1 className="mt-1 font-display text-2xl">Reporting</h1>
      <p className="mt-1 max-w-xl text-sm text-ink-soft">
        Replaces the manual month-end notebook tally — every figure here is generated
        automatically from logged bookings, sales, and expenses (F-10, F-11).
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Profile views" value={data.profileViews.toLocaleString()} toneClass="text-mgmt" />
        <StatCard label="Contacts" value={data.contacts.toLocaleString()} />
        <StatCard label="Bookings" value={data.bookings.toLocaleString()} />
        <StatCard label="Conversion" value={`${Math.round(data.conversionRate * 100)}%`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <StatCard label="Revenue (month)" value={formatGHS(data.revenue)} toneClass="text-success" />
        <StatCard label="Expenses (month)" value={formatGHS(data.expenses)} toneClass="text-rust" />
        <StatCard label="Net (month)" value={formatGHS(data.revenue - data.expenses)} toneClass="text-mgmt" />
      </div>

      <Card className="mt-6 p-6">
        <div className="label-eyebrow">Net revenue by month</div>
        <div className="mt-6 flex h-40 items-end gap-4">
          {data.netByMonth.map((m) => (
            <div key={m.month} className="flex h-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t-md bg-mgmt/85"
                style={{ height: `${Math.max(6, Math.round((m.net / max) * 100))}%` }}
                title={formatGHS(m.net)}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-4">
          {data.netByMonth.map((m) => (
            <div key={m.month} className="flex-1 text-center">
              <div className="font-mono text-[11px] text-ink-faint">{formatGHS(m.net)}</div>
              <div className="text-xs font-medium text-ink-soft">{m.month}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
