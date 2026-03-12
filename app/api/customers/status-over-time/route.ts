import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { classifyCustomer } from "@/lib/classification";

export type StatusOverTimeWeek = {
  week: string;
  weekLabel: string;
  active: number;
  atRisk: number;
  inactive: number;
  total: number;
};

/** Compute merchant status counts for a given date (as-of date for classification) */
async function getStatusCountsAsOf(asOfDate: Date): Promise<{
  active: number;
  atRisk: number;
  inactive: number;
}> {
  const asOfStr = asOfDate.toISOString().slice(0, 10);

  const result = await pool.query(
    `
    WITH agg_alltime AS (
      SELECT 
        merchant_id,
        SUM(transaction_amount_eur) as total_volume,
        EXTRACT(EPOCH FROM (MAX(transaction_timestamp) - MIN(transaction_timestamp))) / (30.44 * 24 * 3600) as months_span
      FROM fct_transactions
      WHERE transaction_timestamp <= $1::date + INTERVAL '1 day'
      GROUP BY merchant_id
    ),
    agg_30d AS (
      SELECT 
        merchant_id,
        SUM(transaction_amount_eur) as volume_30d,
        COUNT(*)::bigint as txn_count_30d
      FROM fct_transactions
      WHERE transaction_timestamp >= $1::date - INTERVAL '30 days'
        AND transaction_timestamp <= $1::date + INTERVAL '1 day'
      GROUP BY merchant_id
    ),
    agg_90d AS (
      SELECT 
        merchant_id,
        COUNT(*)::bigint as txn_count_90d,
        MAX(transaction_timestamp) as last_transaction_timestamp
      FROM fct_transactions
      WHERE transaction_timestamp >= $1::date - INTERVAL '90 days'
        AND transaction_timestamp <= $1::date + INTERVAL '1 day'
      GROUP BY merchant_id
    ),
    agg_prior_30d AS (
      SELECT 
        merchant_id,
        SUM(transaction_amount_eur) as volume_prior_30d
      FROM fct_transactions
      WHERE transaction_timestamp >= $1::date - INTERVAL '60 days'
        AND transaction_timestamp < $1::date - INTERVAL '30 days'
      GROUP BY merchant_id
    )
    SELECT 
      c.merchant_id,
      c.merchant_segment,
      (aa.total_volume / NULLIF(GREATEST(aa.months_span, 1), 0))::bigint as avg_monthly,
      COALESCE(a90.txn_count_90d, 0)::bigint as txn_count_90d,
      a90.last_transaction_timestamp,
      COALESCE(a30.volume_30d, 0)::bigint as volume_30d,
      COALESCE(ap30.volume_prior_30d, 0)::bigint as volume_prior_30d
    FROM dim_customer c
    LEFT JOIN agg_alltime aa ON c.merchant_id = aa.merchant_id
    LEFT JOIN agg_90d a90 ON c.merchant_id = a90.merchant_id
    LEFT JOIN agg_30d a30 ON c.merchant_id = a30.merchant_id
    LEFT JOIN agg_prior_30d ap30 ON c.merchant_id = ap30.merchant_id
    WHERE (c.merchant_created_at IS NULL OR c.merchant_created_at <= $1::date + INTERVAL '1 day')
    `,
    [asOfStr]
  );

  const counts = { active: 0, atRisk: 0, inactive: 0 };
  const asOfTime = asOfDate.getTime();

  for (const row of result.rows) {
    const lastTs = row.last_transaction_timestamp
      ? new Date(row.last_transaction_timestamp)
      : null;
    const daysSinceLast =
      lastTs !== null
        ? Math.floor(
            (asOfTime - lastTs.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

    const { status } = classifyCustomer({
      daysSinceLastTransaction: daysSinceLast,
      transactionCount90d: Number(row.txn_count_90d),
      volume30d: Number(row.volume_30d),
      volumePrior30d: Number(row.volume_prior_30d),
      avgMonthlyVolumeEur: row.avg_monthly != null ? Number(row.avg_monthly) : null,
      merchantSegment: row.merchant_segment,
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
