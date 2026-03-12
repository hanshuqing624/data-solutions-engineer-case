import prisma from "@/lib/db";
import { classifyCustomer } from "@/lib/classification-defaults";
import type { ClassificationThresholds } from "@/lib/classification-defaults";
import {
  getMerchantMetricsAsOf,
  getMerchantMetricsFor,
} from "@/lib/customer-metrics";
import type {
  CustomerDetailResponse,
  CustomerOverview,
  MerchantMetrics,
  StatusOverTimeWeek,
} from "@/lib/types";
import { daysSinceLastTransaction } from "@/lib/risk-assessment-utils";
import { aggregateMonthlyVolume } from "@/lib/aggregations";

const DEFAULT_METRICS: MerchantMetrics = {
  volume90d: 0,
  transactionCount90d: 0,
  lastTransactionTimestamp: null,
  volume30d: 0,
  volumePrior30d: 0,
  avgMonthlyVolumeEur: null,
};

function computeCustomerOverview(
  merchantId: bigint,
  companyName: string | null,
  country: string | null,
  merchantSegment: string | null,
  metrics: MerchantMetrics,
  asOf: Date
): CustomerOverview {
  const daysSinceLast = daysSinceLastTransaction(
    metrics.lastTransactionTimestamp,
    asOf
  );
  const { status, reason } = classifyCustomer({
    daysSinceLastTransaction: daysSinceLast,
    transactionCount90d: metrics.transactionCount90d,
    volume30d: metrics.volume30d,
    volumePrior30d: metrics.volumePrior30d,
    avgMonthlyVolumeEur: metrics.avgMonthlyVolumeEur,
    merchantSegment,
  });
  return {
    merchantId: Number(merchantId),
    companyName,
    country,
    merchantSegment,
    volume90d: metrics.volume90d,
    transactionCount90d: metrics.transactionCount90d,
    daysSinceLastTransaction: daysSinceLast,
    status,
    risk_reason: reason,
    volume30d: metrics.volume30d,
    volumePrior30d: metrics.volumePrior30d,
    avgMonthlyVolumeEur: metrics.avgMonthlyVolumeEur,
  };
}

const STATUS_ORDER = { Inactive: 0, "At Risk": 1, Active: 2 };

function sortByChurnRisk(customers: CustomerOverview[]): CustomerOverview[] {
  return [...customers].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    const daysA = a.daysSinceLastTransaction ?? 9999;
    const daysB = b.daysSinceLastTransaction ?? 9999;
    return daysB - daysA;
  });
}

/** Get all customer overviews with classification, sorted by churn risk */
export async function getCustomerOverviews(): Promise<CustomerOverview[]> {
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

  const overviews = customers.map((c) =>
    computeCustomerOverview(
      c.merchant_id,
      c.company_name,
      c.country,
      c.merchant_segment,
      metricsMap.get(c.merchant_id) ?? DEFAULT_METRICS,
      now
    )
  );

  return sortByChurnRisk(overviews);
}

/** Get status counts (active, atRisk, inactive) as of a given date */
export async function getStatusCountsAsOf(
  asOfDate: Date,
  thresholds?: ClassificationThresholds
): Promise<{
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
    const m = metricsMap.get(c.merchant_id) ?? DEFAULT_METRICS;
    const daysSinceLast = daysSinceLastTransaction(
      m.lastTransactionTimestamp,
      asOfDate
    );
    const { status } = classifyCustomer(
      {
        daysSinceLastTransaction: daysSinceLast,
        transactionCount90d: m.transactionCount90d,
        volume30d: m.volume30d,
        volumePrior30d: m.volumePrior30d,
        avgMonthlyVolumeEur: m.avgMonthlyVolumeEur,
        merchantSegment: c.merchant_segment,
      },
      thresholds
    );
    counts[status === "Active" ? "active" : status === "At Risk" ? "atRisk" : "inactive"]++;
  }

  return counts;
}

/** Get status-over-time data for the last N weeks */
export async function getStatusOverTimeData(
  weeks: number,
  thresholds?: ClassificationThresholds
): Promise<StatusOverTimeWeek[]> {
  const clampedWeeks = Math.min(Math.max(weeks, 1), 26);
  const now = new Date();
  const data: StatusOverTimeWeek[] = [];

  for (let i = clampedWeeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const counts = await getStatusCountsAsOf(weekEnd, thresholds);

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

  return data;
}

/** Get full customer detail for a single merchant */
export async function getCustomerDetail(
  merchantId: number
): Promise<CustomerDetailResponse | null> {
  const merchantIdBigInt = BigInt(merchantId);
  const twentyFourMonthsAgo = new Date();
  twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);

  const [customer, metrics, transactions, transactionsForMonthly, retentionCalls] =
    await Promise.all([
      prisma.dim_customer.findUnique({
        where: { merchant_id: merchantIdBigInt },
      }),
      getMerchantMetricsFor(merchantId),
      prisma.fct_transactions.findMany({
        where: { merchant_id: merchantIdBigInt },
        orderBy: { transaction_timestamp: "desc" },
        take: 500,
        select: {
          transaction_id: true,
          transaction_timestamp: true,
          transaction_amount_eur: true,
          currency: true,
          card_type: true,
        },
      }),
      prisma.fct_transactions.findMany({
        where: {
          merchant_id: merchantIdBigInt,
          transaction_timestamp: { gte: twentyFourMonthsAgo },
        },
        select: {
          transaction_timestamp: true,
          transaction_amount_eur: true,
        },
      }),
      prisma.retention_calls.findMany({
        where: { customer_id: merchantIdBigInt },
        orderBy: { call_timestamp: "desc" },
      }),
    ]);

  if (!customer || !metrics) return null;

  const now = new Date();
  const daysSinceLast = daysSinceLastTransaction(
    metrics.lastTransactionTimestamp,
    now
  );
  const { status, reason } = classifyCustomer({
    daysSinceLastTransaction: daysSinceLast,
    transactionCount90d: metrics.transactionCount90d,
    volume30d: metrics.volume30d,
    volumePrior30d: metrics.volumePrior30d,
    avgMonthlyVolumeEur: metrics.avgMonthlyVolumeEur,
    merchantSegment: customer.merchant_segment,
  });

  return {
    customer: {
      merchantId: Number(customer.merchant_id),
      companyName: customer.company_name,
      contactPerson: customer.contact_person,
      phoneNumber: customer.phone_number,
      address: customer.address,
      country: customer.country,
      productType: customer.product_type,
      merchantSegment: customer.merchant_segment,
      merchantCreatedAt: customer.merchant_created_at,
      volume90d: metrics.volume90d,
      transactionCount90d: metrics.transactionCount90d,
      daysSinceLastTransaction: daysSinceLast,
      status,
      risk_reason: reason,
    },
    transactions: transactions.map((t) => ({
      transactionId: t.transaction_id,
      transactionTimestamp: t.transaction_timestamp,
      transactionAmountEur: Number(t.transaction_amount_eur ?? 0),
      currency: t.currency,
      cardType: t.card_type,
    })),
    monthlyVolume: aggregateMonthlyVolume(transactionsForMonthly),
    retentionCalls: retentionCalls.map((r) => ({
      id: r.id,
      customerId: Number(r.customer_id),
      callTimestamp: r.call_timestamp,
      outcome: r.outcome,
      notes: r.notes,
    })),
  };
}
