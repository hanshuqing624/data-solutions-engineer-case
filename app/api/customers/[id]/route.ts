import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { classifyCustomer } from "@/lib/classification";
import { getMerchantMetricsFor } from "@/lib/customer-metrics";

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

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!metrics) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const now = new Date();
    const lastTs = metrics.lastTransactionTimestamp;
    const daysSinceLast =
      lastTs !== null
        ? Math.floor(
            (now.getTime() - lastTs.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

    const { status, reason } = classifyCustomer({
      daysSinceLastTransaction: daysSinceLast,
      transactionCount90d: metrics.transactionCount90d,
      volume30d: metrics.volume30d,
      volumePrior30d: metrics.volumePrior30d,
      avgMonthlyVolumeEur: metrics.avgMonthlyVolumeEur,
      merchantSegment: customer.merchant_segment,
    });

    const customerResponse = {
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
    };

    const transactionsResponse = transactions.map((t) => ({
      transactionId: t.transaction_id,
      transactionTimestamp: t.transaction_timestamp,
      transactionAmountEur: Number(t.transaction_amount_eur ?? 0),
      currency: t.currency,
      cardType: t.card_type,
    }));

    const byMonth = new Map<
      string,
      { volume: number; transactionCount: number }
    >();
    for (const t of transactionsForMonthly) {
      if (!t.transaction_timestamp) continue;
      const monthKey = `${t.transaction_timestamp.getFullYear()}-${String(t.transaction_timestamp.getMonth() + 1).padStart(2, "0")}`;
      const existing = byMonth.get(monthKey) ?? {
        volume: 0,
        transactionCount: 0,
      };
      existing.volume += Number(t.transaction_amount_eur ?? 0);
      existing.transactionCount += 1;
      byMonth.set(monthKey, existing);
    }
    const monthlyVolume = Array.from(byMonth.entries())
      .map(([monthStr, v]) => ({
        month: new Date(`${monthStr}-01`),
        volume: v.volume,
        transactionCount: v.transactionCount,
      }))
      .sort((a, b) => b.month.getTime() - a.month.getTime())
      .slice(0, 24);

    return NextResponse.json({
      customer: customerResponse,
      transactions: transactionsResponse,
      monthlyVolume,
      retentionCalls: retentionCalls.map((r) => ({
        id: r.id,
        customerId: Number(r.customer_id),
        callTimestamp: r.call_timestamp,
        outcome: r.outcome,
        notes: r.notes,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch customer detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer detail" },
      { status: 500 }
    );
  }
}
