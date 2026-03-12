import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classifyCustomer } from "@/lib/classification";
import { getMerchantMetricsAsOf } from "@/lib/customer-metrics";

export type StatusOverTimeWeek = {
  week: string;
  weekLabel: string;
  active: number;
  atRisk: number;
  inactive: number;
  total: number;
};

async function getStatusCountsAsOf(asOfDate: Date): Promise<{
  active: number;
  atRisk: number;
  inactive: number;
}> {
  const asOfEnd = new Date(asOfDate);
  asOfEnd.setHours(23, 59, 59, 999);

  const [customers, metricsMap] = await Promise.all([
    prisma.dim_customer.findMany({
      where: {
        OR: [
          { merchant_created_at: null },
          { merchant_created_at: { lte: asOfEnd } },
        ],
      },
      select: { merchant_id: true, merchant_segment: true },
    }),
    getMerchantMetricsAsOf(asOfDate),
  ]);

  const counts = { active: 0, atRisk: 0, inactive: 0 };
  const asOfTime = asOfDate.getTime();

  for (const c of customers) {
    const m = metricsMap.get(c.merchant_id) ?? {
      volume90d: 0,
      transactionCount90d: 0,
      lastTransactionTimestamp: null as Date | null,
      volume30d: 0,
      volumePrior30d: 0,
      avgMonthlyVolumeEur: null as number | null,
    };

    const lastTs = m.lastTransactionTimestamp;
    const daysSinceLast =
      lastTs !== null
        ? Math.floor(
            (asOfTime - lastTs.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

    const { status } = classifyCustomer({
      daysSinceLastTransaction: daysSinceLast,
      transactionCount90d: m.transactionCount90d,
      volume30d: m.volume30d,
      volumePrior30d: m.volumePrior30d,
      avgMonthlyVolumeEur: m.avgMonthlyVolumeEur,
      merchantSegment: c.merchant_segment,
    });

    counts[status === "Active" ? "active" : status === "At Risk" ? "atRisk" : "inactive"]++;
  }

  return counts;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weeksParam = parseInt(searchParams.get("weeks") ?? "12", 10);
    const weeks = Math.min(Math.max(weeksParam, 1), 26);

    const data: StatusOverTimeWeek[] = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);

      const counts = await getStatusCountsAsOf(weekEnd);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const weekLabel = `${weekStart.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })} – ${weekEnd.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })}`;

      data.push({
        week: weekEnd.toISOString().slice(0, 10),
        weekLabel,
        active: counts.active,
        atRisk: counts.atRisk,
        inactive: counts.inactive,
        total: counts.active + counts.atRisk + counts.inactive,
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch status over time:", error);
    return NextResponse.json(
      { error: "Failed to fetch status over time" },
      { status: 500 }
    );
  }
}
