import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classifyCustomer } from "@/lib/classification";
import { getMerchantMetricsAsOf } from "@/lib/customer-metrics";

export type CustomerOverview = {
  merchantId: number;
  companyName: string | null;
  country: string | null;
  merchantSegment: string | null;
  volume90d: number;
  transactionCount90d: number;
  daysSinceLastTransaction: number | null;
  status: "Active" | "At Risk" | "Inactive";
  risk_reason: string;
};

export async function GET() {
  try {
    const now = new Date();
    const [customers, metricsMap] = await Promise.all([
      prisma.dim_customer.findMany({
        select: {
          merchant_id: true,
          company_name: true,
          country: true,
          merchant_segment: true,
        },
      }),
      getMerchantMetricsAsOf(now),
    ]);

    const customersRaw: CustomerOverview[] = customers.map((c) => {
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
              (now.getTime() - lastTs.getTime()) / (1000 * 60 * 60 * 24)
            )
          : null;

      const { status, reason } = classifyCustomer({
        daysSinceLastTransaction: daysSinceLast,
        transactionCount90d: m.transactionCount90d,
        volume30d: m.volume30d,
        volumePrior30d: m.volumePrior30d,
        avgMonthlyVolumeEur: m.avgMonthlyVolumeEur,
        merchantSegment: c.merchant_segment,
      });

      return {
        merchantId: Number(c.merchant_id),
        companyName: c.company_name,
        country: c.country,
        merchantSegment: c.merchant_segment,
        volume90d: m.volume90d,
        transactionCount90d: m.transactionCount90d,
        daysSinceLastTransaction: daysSinceLast,
        status,
        risk_reason: reason,
      };
    });

    const statusOrder = { Inactive: 0, "At Risk": 1, Active: 2 };
    const customersSorted = customersRaw.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const daysA = a.daysSinceLastTransaction ?? 9999;
      const daysB = b.daysSinceLastTransaction ?? 9999;
      return daysB - daysA;
    });

    return NextResponse.json({ customers: customersSorted });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
