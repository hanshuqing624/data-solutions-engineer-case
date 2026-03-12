import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { classifyCustomer } from "@/lib/classification";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const merchantId = parseInt(id, 10);
  if (isNaN(merchantId)) {
    return NextResponse.json({ error: "Invalid merchant ID" }, { status: 400 });
  }

  try {
    // 1. Customer info + metrics for classification
    const customerResult = await pool.query(
      `
      WITH agg_alltime AS (
        SELECT 
          merchant_id,
          SUM(transaction_amount_eur) as total_volume,
          EXTRACT(EPOCH FROM (MAX(transaction_timestamp) - MIN(transaction_timestamp))) / (30.44 * 24 * 3600) as months_span
        FROM fct_transactions
        WHERE merchant_id = $1
        GROUP BY merchant_id
      ),
      agg_30d AS (
        SELECT merchant_id, SUM(transaction_amount_eur) as volume_30d
        FROM fct_transactions
        WHERE merchant_id = $1 AND transaction_timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY merchant_id
      ),
      agg_90d AS (
        SELECT 
          merchant_id,
          SUM(transaction_amount_eur) as volume_90d,
          COUNT(*)::bigint as txn_count_90d,
          MAX(transaction_timestamp) as last_transaction_timestamp
        FROM fct_transactions
        WHERE merchant_id = $1 AND transaction_timestamp >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY merchant_id
      ),
      agg_prior_30d AS (
        SELECT merchant_id, SUM(transaction_amount_eur) as volume_prior_30d
        FROM fct_transactions
        WHERE merchant_id = $1
          AND transaction_timestamp >= CURRENT_DATE - INTERVAL '60 days'
          AND transaction_timestamp < CURRENT_DATE - INTERVAL '30 days'
        GROUP BY merchant_id
      )
      SELECT 
        c.merchant_id as "merchantId",
        c.company_name as "companyName",
        c.contact_person as "contactPerson",
        c.phone_number as "phoneNumber",
        c.address,
        c.country,
        c.product_type as "productType",
        c.merchant_segment as "merchantSegment",
        c.merchant_created_at as "merchantCreatedAt",
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
      WHERE c.merchant_id = $1
    `,
      [merchantId]
    );

    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const row = customerResult.rows[0];
    const now = new Date();
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
        ? Number(row.avgMonthlyVolumeEur)
        : null;

    const { status, reason } = classifyCustomer({
      daysSinceLastTransaction: daysSinceLast,
      transactionCount90d: Number(row.transactionCount90d),
      volume30d: Number(row.volume30d),
      volumePrior30d: Number(row.volumePrior30d),
      avgMonthlyVolumeEur: avgMonthly,
      merchantSegment: row.merchantSegment,
    });

    const customer = {
      merchantId: row.merchantId,
      companyName: row.companyName,
      contactPerson: row.contactPerson,
      phoneNumber: row.phoneNumber,
      address: row.address,
      country: row.country,
      productType: row.productType,
      merchantSegment: row.merchantSegment,
      merchantCreatedAt: row.merchantCreatedAt,
      volume90d: Number(row.volume90d),
      transactionCount90d: Number(row.transactionCount90d),
      daysSinceLastTransaction: daysSinceLast,
      status,
      risk_reason: reason,
    };

    // 2. Full transaction history (paginated - last 500)
    const transactionsResult = await pool.query(
      `
      SELECT 
        transaction_id as "transactionId",
        transaction_timestamp as "transactionTimestamp",
        transaction_amount_eur as "transactionAmountEur",
        currency,
        card_type as "cardType"
      FROM fct_transactions
      WHERE merchant_id = $1
      ORDER BY transaction_timestamp DESC
      LIMIT 500
    `,
      [merchantId]
    );

    const transactions = transactionsResult.rows.map((r: Record<string, unknown>) => ({
      transactionId: r.transactionId,
      transactionTimestamp: r.transactionTimestamp,
      transactionAmountEur: Number(r.transactionAmountEur),
      currency: r.currency,
      cardType: r.cardType,
    }));

    // 3. Aggregated monthly transaction volume
    const monthlyResult = await pool.query(
      `
      SELECT 
        DATE_TRUNC('month', transaction_timestamp)::date as "month",
        SUM(transaction_amount_eur)::bigint as "volume",
        COUNT(*)::bigint as "transactionCount"
      FROM fct_transactions
      WHERE merchant_id = $1
      GROUP BY DATE_TRUNC('month', transaction_timestamp)
      ORDER BY "month" DESC
      LIMIT 24
    `,
      [merchantId]
    );

    const monthlyVolume = monthlyResult.rows.map((r: Record<string, unknown>) => ({
      month: r.month,
      volume: Number(r.volume),
      transactionCount: Number(r.transactionCount),
    }));

    // 4. Retention calls history
    const callsResult = await pool.query(
      `
      SELECT 
        id,
        customer_id as "customerId",
        call_timestamp as "callTimestamp",
        outcome,
        notes
      FROM retention_calls
      WHERE customer_id = $1
      ORDER BY call_timestamp DESC
    `,
      [merchantId]
    );

    const retentionCalls = callsResult.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      customerId: r.customerId,
      callTimestamp: r.callTimestamp,
      outcome: r.outcome,
      notes: r.notes,
    }));

    return NextResponse.json({
      customer,
      transactions,
      monthlyVolume,
      retentionCalls,
    });
  } catch (error) {
    console.error("Failed to fetch customer detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer detail" },
      { status: 500 }
    );
  }
}
