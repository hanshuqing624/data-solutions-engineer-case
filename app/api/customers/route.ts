import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { classifyCustomer } from "@/lib/classification";

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
    const result = await pool.query(`
      WITH agg_alltime AS (
        SELECT 
          merchant_id,
          SUM(transaction_amount_eur) as total_volume,
          EXTRACT(EPOCH FROM (MAX(transaction_timestamp) - MIN(transaction_timestamp))) / (30.44 * 24 * 3600) as months_span
        FROM fct_transactions
        GROUP BY merchant_id
      ),
      agg_30d AS (
        SELECT 
          merchant_id,
          SUM(transaction_amount_eur) as volume_30d,
          COUNT(*)::bigint as txn_count_30d
        FROM fct_transactions
        WHERE transaction_timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY merchant_id
      ),
      agg_90d AS (
        SELECT 
          merchant_id,
          SUM(transaction_amount_eur) as volume_90d,
          COUNT(*)::bigint as txn_count_90d,
          MAX(transaction_timestamp) as last_transaction_timestamp
        FROM fct_transactions
        WHERE transaction_timestamp >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY merchant_id
      ),
      agg_prior_30d AS (
        SELECT 
          merchant_id,
          SUM(transaction_amount_eur) as volume_prior_30d
        FROM fct_transactions
        WHERE transaction_timestamp >= CURRENT_DATE - INTERVAL '60 days'
          AND transaction_timestamp < CURRENT_DATE - INTERVAL '30 days'
        GROUP BY merchant_id
      )
      SELECT 
        c.merchant_id as "merchantId",
        c.company_name as "companyName",
        c.country,
        c.merchant_segment as "merchantSegment",
        (aa.total_volume / NULLIF(GREATEST(aa.months_span, 1), 0))::bigint as "avgMonthlyVolumeEur",
        COALESCE(a90.volume_90d, 0)::bigint as "volume90d",
        COALESCE(a90.txn_count_90d, 0)::bigint as "transactionCount90d",
        a90.last_transaction_timestamp as "lastTransactionTimestamp",
        COALESCE(a30.volume_30d, 0)::bigint as "volume30d",
        COALESCE(ap30.volume_prior_30d, 0)::bigint as "volumePrior30d"
      FROM dim_customer c
      LEFT JOIN agg_alltime aa ON c.merchant_id = aa.merchant_id
      LEFT JOIN agg_90d a90 ON c.merchant_id = a90.merchant_id
      LEFT JOIN agg_30d a30 ON c.merchant_id = a30.merchant_id
      LEFT JOIN agg_prior_30d ap30 ON c.merchant_id = ap30.merchant_id
      ORDER BY a90.last_transaction_timestamp DESC NULLS LAST
    `);

    const now = new Date();
    type Row = {
      merchantId: number;
      companyName: string | null;
      country: string | null;
      merchantSegment: string | null;
      avgMonthlyVolumeEur: string | null;
      volume90d: string;
      transactionCount90d: string;
      lastTransactionTimestamp: string | null;
      volume30d: string;
      volumePrior30d: string;
    };
    const customersRaw: CustomerOverview[] = result.rows.map((row: Row) => {
      const lastTs = row.lastTransactionTimestamp
        ? new Date(row.lastTransactionTimestamp)
        : null;
      const daysSinceLast =
        lastTs !== null
          ? Math.floor(
              (now.getTime() - lastTs.getTime()) / (1000 * 60 * 60 * 24)
            )
          : null;

      const avgMonthly =
        row.avgMonthlyVolumeEur != null
          ? parseFloat(row.avgMonthlyVolumeEur)
          : null;

      const { status, reason } = classifyCustomer({
        daysSinceLastTransaction: daysSinceLast,
        transactionCount90d: Number(row.transactionCount90d),
        volume30d: Number(row.volume30d),
        volumePrior30d: Number(row.volumePrior30d),
        avgMonthlyVolumeEur: avgMonthly,
        merchantSegment: row.merchantSegment,
      });

      return {
        merchantId: row.merchantId,
        companyName: row.companyName,
        country: row.country,
        merchantSegment: row.merchantSegment,
        volume90d: Number(row.volume90d),
        transactionCount90d: Number(row.transactionCount90d),
        daysSinceLastTransaction: daysSinceLast,
        status,
        risk_reason: reason,
      };
    });

    // Sort by churn risk: Inactive first, then At Risk, then Active.
    // Within each group: higher days_since_last = more urgent.
    const statusOrder = { Inactive: 0, "At Risk": 1, Active: 2 };
    const customers = customersRaw.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      const daysA = a.daysSinceLastTransaction ?? 9999;
      const daysB = b.daysSinceLastTransaction ?? 9999;
      return daysB - daysA; // higher days first (more urgent)
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
