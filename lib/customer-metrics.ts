import prisma from "@/lib/db";
import type { MerchantMetrics } from "@/lib/types";

const MONTH_SECONDS = 30.44 * 24 * 3600;

/** Get aggregated metrics for all merchants as of a given date */
export async function getMerchantMetricsAsOf(asOfDate: Date): Promise<
  Map<bigint, MerchantMetrics>
> {
  const asOfEnd = new Date(asOfDate);
  asOfEnd.setHours(23, 59, 59, 999);
  const ninetyDaysAgo = new Date(asOfEnd);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const thirtyDaysAgo = new Date(asOfEnd);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(asOfEnd);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [agg90d, agg30d, aggPrior30d, aggAlltime] = await Promise.all([
    prisma.fct_transactions.groupBy({
      by: ["merchant_id"],
      where: {
        merchant_id: { not: null },
        transaction_timestamp: {
          gte: ninetyDaysAgo,
          lte: asOfEnd,
        },
      },
      _sum: { transaction_amount_eur: true },
      _count: true,
      _max: { transaction_timestamp: true },
    }),
    prisma.fct_transactions.groupBy({
      by: ["merchant_id"],
      where: {
        merchant_id: { not: null },
        transaction_timestamp: {
          gte: thirtyDaysAgo,
          lte: asOfEnd,
        },
      },
      _sum: { transaction_amount_eur: true },
      _count: true,
    }),
    prisma.fct_transactions.groupBy({
      by: ["merchant_id"],
      where: {
        merchant_id: { not: null },
        transaction_timestamp: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
      _sum: { transaction_amount_eur: true },
    }),
    prisma.fct_transactions.groupBy({
      by: ["merchant_id"],
      where: {
        merchant_id: { not: null },
        transaction_timestamp: { lte: asOfEnd },
      },
      _sum: { transaction_amount_eur: true },
      _min: { transaction_timestamp: true },
      _max: { transaction_timestamp: true },
    }),
  ]);

  const map = new Map<bigint, MerchantMetrics>();

  const allMerchantIds = new Set<bigint>();
  for (const r of agg90d) if (r.merchant_id != null) allMerchantIds.add(r.merchant_id);
  for (const r of agg30d) if (r.merchant_id != null) allMerchantIds.add(r.merchant_id);
  for (const r of aggPrior30d) if (r.merchant_id != null) allMerchantIds.add(r.merchant_id);
  for (const r of aggAlltime) if (r.merchant_id != null) allMerchantIds.add(r.merchant_id);

  const by90 = new Map(agg90d.map((r) => [r.merchant_id!, r]));
  const by30 = new Map(agg30d.map((r) => [r.merchant_id!, r]));
  const byPrior = new Map(aggPrior30d.map((r) => [r.merchant_id!, r]));
  const byAll = new Map(aggAlltime.map((r) => [r.merchant_id!, r]));

  for (const mid of allMerchantIds) {
    const a90 = by90.get(mid);
    const a30 = by30.get(mid);
    const aPrior = byPrior.get(mid);
    const aAll = byAll.get(mid);

    let avgMonthly: number | null = null;
    if (aAll?._min?.transaction_timestamp && aAll?._max?.transaction_timestamp && aAll?._sum?.transaction_amount_eur != null) {
      const spanSec =
        (aAll._max.transaction_timestamp.getTime() - aAll._min.transaction_timestamp.getTime()) / 1000;
      const monthsSpan = spanSec / MONTH_SECONDS;
      if (monthsSpan >= 1) {
        avgMonthly = Number(aAll._sum.transaction_amount_eur) / monthsSpan;
      }
    }

    map.set(mid, {
      volume90d: Number(a90?._sum?.transaction_amount_eur ?? 0),
      transactionCount90d: a90?._count ?? 0,
      lastTransactionTimestamp: a90?._max?.transaction_timestamp ?? null,
      volume30d: Number(a30?._sum?.transaction_amount_eur ?? 0),
      volumePrior30d: Number(aPrior?._sum?.transaction_amount_eur ?? 0),
      avgMonthlyVolumeEur: avgMonthly,
    });
  }

  return map;
}

/** Get aggregated metrics for a single merchant */
export async function getMerchantMetricsFor(
  merchantId: number,
  asOfDate?: Date
): Promise<MerchantMetrics | null> {
  const asOf = asOfDate ?? new Date();
  const asOfEnd = new Date(asOf);
  asOfEnd.setHours(23, 59, 59, 999);
  const ninetyDaysAgo = new Date(asOfEnd);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const thirtyDaysAgo = new Date(asOfEnd);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(asOfEnd);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const merchantIdBigInt = BigInt(merchantId);

  const [agg90d, agg30d, aggPrior30d, aggAlltime] = await Promise.all([
    prisma.fct_transactions.aggregate({
      where: {
        merchant_id: merchantIdBigInt,
        transaction_timestamp: {
          gte: ninetyDaysAgo,
          lte: asOfEnd,
        },
      },
      _sum: { transaction_amount_eur: true },
      _count: true,
      _max: { transaction_timestamp: true },
    }),
    prisma.fct_transactions.aggregate({
      where: {
        merchant_id: merchantIdBigInt,
        transaction_timestamp: {
          gte: thirtyDaysAgo,
          lte: asOfEnd,
        },
      },
      _sum: { transaction_amount_eur: true },
      _count: true,
    }),
    prisma.fct_transactions.aggregate({
      where: {
        merchant_id: merchantIdBigInt,
        transaction_timestamp: {
          gte: sixtyDaysAgo,
          lt: thirtyDaysAgo,
        },
      },
      _sum: { transaction_amount_eur: true },
    }),
    prisma.fct_transactions.aggregate({
      where: { merchant_id: merchantIdBigInt },
      _sum: { transaction_amount_eur: true },
      _min: { transaction_timestamp: true },
      _max: { transaction_timestamp: true },
    }),
  ]);

  let avgMonthly: number | null = null;
  if (
    aggAlltime._min?.transaction_timestamp &&
    aggAlltime._max?.transaction_timestamp &&
    aggAlltime._sum?.transaction_amount_eur != null
  ) {
    const spanSec =
      (aggAlltime._max.transaction_timestamp.getTime() -
        aggAlltime._min.transaction_timestamp.getTime()) /
      1000;
    const monthsSpan = spanSec / MONTH_SECONDS;
    if (monthsSpan >= 1) {
      avgMonthly = Number(aggAlltime._sum.transaction_amount_eur) / monthsSpan;
    }
  }

  return {
    volume90d: Number(agg90d._sum?.transaction_amount_eur ?? 0),
    transactionCount90d: agg90d._count,
    lastTransactionTimestamp: agg90d._max?.transaction_timestamp ?? null,
    volume30d: Number(agg30d._sum?.transaction_amount_eur ?? 0),
    volumePrior30d: Number(aggPrior30d._sum?.transaction_amount_eur ?? 0),
    avgMonthlyVolumeEur: avgMonthly,
  };
}
