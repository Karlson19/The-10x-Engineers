import { Prisma } from "@prisma/client";
import type { AnalyticsSummary, MonthlyPoint, RequestStatus } from "@chrysmec/shared";
import { REQUEST_STATUSES } from "@chrysmec/shared";
import { prisma } from "../lib/prisma";
import { toInventoryItem } from "./mappers";

const { Decimal } = Prisma;

/** How many months the revenue against expenses chart covers. */
const CHART_MONTHS = 6;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parsePeriod(period: string | undefined): { key: string; start: Date; end: Date } {
  const now = new Date();
  const key = period ?? monthKey(now);
  const [yearPart, monthPart] = key.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { key, start, end };
}

type MonthlyTotalRow = { month: string; total: Prisma.Decimal | null };

/**
 * Revenue is money actually taken, so it comes from successful payments.
 * Expenses are the parts consumed, valued at what they cost the workshop.
 * Labour is staff time rather than a cash outlay, so it is not counted here.
 */
async function revenueByMonth(from: Date, to: Date): Promise<MonthlyPoint[]> {
  const [revenueRows, expenseRows] = await Promise.all([
    prisma.$queryRaw<MonthlyTotalRow[]>`
      SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
             SUM("amount") AS total
      FROM "Payment"
      WHERE "status" = 'SUCCESS' AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1
    `,
    prisma.$queryRaw<MonthlyTotalRow[]>`
      SELECT to_char(date_trunc('month', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
             SUM("unitCost" * "quantity") AS total
      FROM "WorkLogEntry"
      WHERE "lineType" = 'PART' AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1
    `,
  ]);

  const revenue = new Map(revenueRows.map((row) => [row.month, row.total ?? new Decimal(0)]));
  const expenses = new Map(expenseRows.map((row) => [row.month, row.total ?? new Decimal(0)]));

  // Every month in the window appears, including the quiet ones, so the chart
  // has an even x axis rather than gaps.
  const points: MonthlyPoint[] = [];
  const cursor = new Date(from);

  while (cursor < to) {
    const key = monthKey(cursor);
    points.push({
      month: key,
      revenue: (revenue.get(key) ?? new Decimal(0)).toFixed(2),
      expenses: (expenses.get(key) ?? new Decimal(0)).toFixed(2),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return points;
}

export async function getAnalyticsSummary(period: string | undefined): Promise<AnalyticsSummary> {
  const { key, start, end } = parsePeriod(period);

  const chartFrom = new Date(start);
  chartFrom.setUTCMonth(chartFrom.getUTCMonth() - (CHART_MONTHS - 1));

  const inPeriod = { createdAt: { gte: start, lt: end } };

  const [
    bookings,
    statusGroups,
    activeJobs,
    revenueAggregate,
    expenseRows,
    ratingAggregate,
    inventoryRows,
    topServiceRows,
    chart,
  ] = await Promise.all([
    prisma.serviceRequest.count({ where: inPeriod }),
    prisma.serviceRequest.groupBy({ by: ["status"], where: inPeriod, _count: { _all: true } }),
    prisma.job.count({ where: { status: { not: "COMPLETED" } } }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS", ...inPeriod },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<Array<{ total: Prisma.Decimal | null }>>`
      SELECT SUM("unitCost" * "quantity") AS total
      FROM "WorkLogEntry"
      WHERE "lineType" = 'PART' AND "createdAt" >= ${start} AND "createdAt" < ${end}
    `,
    prisma.feedback.aggregate({ where: inPeriod, _avg: { rating: true } }),
    prisma.inventoryItem.findMany({ orderBy: [{ section: "asc" }, { name: "asc" }] }),
    // Counted over the whole chart window rather than the single month, so the
    // list still says something useful in a quiet month.
    prisma.requestedService.groupBy({
      by: ["serviceCatalogItemId"],
      where: { serviceRequest: { createdAt: { gte: chartFrom, lt: end } } },
      _count: { _all: true },
      orderBy: { _count: { serviceCatalogItemId: "desc" } },
      take: 5,
    }),
    revenueByMonth(chartFrom, end),
  ]);

  const counts = new Map<RequestStatus, number>(
    statusGroups.map((group) => [group.status, group._count._all]),
  );
  const completed = counts.get("COMPLETED") ?? 0;
  const cancelled = counts.get("CANCELLED") ?? 0;

  const revenue = revenueAggregate._sum.amount ?? new Decimal(0);
  const expenses = expenseRows[0]?.total ?? new Decimal(0);

  const catalogueItems =
    topServiceRows.length === 0
      ? []
      : await prisma.serviceCatalogItem.findMany({
          where: { id: { in: topServiceRows.map((row) => row.serviceCatalogItemId) } },
        });

  const byId = new Map(catalogueItems.map((item) => [item.id, item]));
  const inventory = inventoryRows.map(toInventoryItem);
  const lowStockItems = inventory.filter((item) => item.isLowStock);

  return {
    period: key,
    bookings,
    completed,
    cancelled,
    activeJobs,
    revenue: revenue.toFixed(2),
    expenses: expenses.toFixed(2),
    net: revenue.sub(expenses).toFixed(2),
    conversionRate: bookings === 0 ? 0 : completed / bookings,
    averageRating: ratingAggregate._avg.rating ?? null,
    // Every status appears, so the breakdown does not reshape as data arrives.
    statusBreakdown: REQUEST_STATUSES.map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    })),
    revenueByMonth: chart,
    topServices: topServiceRows.flatMap((row) => {
      const item = byId.get(row.serviceCatalogItemId);
      return item
        ? [
            {
              id: item.id,
              name: item.name,
              section: item.section,
              bookings: row._count._all,
              basePrice: item.basePrice.toFixed(2),
            },
          ]
        : [];
    }),
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 8).map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      section: item.section,
      quantityInStock: item.quantityInStock,
      reorderLevel: item.reorderLevel,
    })),
  };
}
