"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatVolumeCents, formatDate, formatDateTime } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { CustomerDetailHeader } from "@/components/CustomerDetailHeader";
import { LogRetentionCallForm } from "@/components/LogRetentionCallForm";
import { PaginatedTable } from "@/components/PaginatedTable";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import type { MonthlyVolume, RetentionCall, Transaction } from "@/lib/types";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const {
    customer,
    transactions,
    monthlyVolume,
    retentionCalls,
    loading,
    error,
    outcome,
    setOutcome,
    notes,
    setNotes,
    submitting,
    handleLogCall,
    PAGE_SIZE,
    pageMonthlyVolume,
    setPageMonthlyVolume,
    pageRetentionCalls,
    setPageRetentionCalls,
    pageTransactions,
    setPageTransactions,
  } = useCustomerDetail(id);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  if (loading || !id) return <div className="p-8">Loading...</div>;
  if (error || !customer)
    return (
      <div className="p-8">
        <p className="text-red-600">Error: {error ?? "Customer not found"}</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Back to overview
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Back to overview
        </Link>

        <CustomerDetailHeader customer={customer} />

        <PaginatedTable<MonthlyVolume>
          title="Monthly Transaction Volume"
          columns={[
            {
              key: "month",
              header: "Month",
              render: (m) => formatDate(m.month),
            },
            {
              key: "volume",
              header: "Volume",
              alignRight: true,
              render: (m) => formatVolumeCents(m.volume),
            },
            {
              key: "txns",
              header: "Txns",
              alignRight: true,
              render: (m) => String(m.transactionCount),
            },
          ]}
          data={monthlyVolume}
          getKey={(m) => m.month}
          page={pageMonthlyVolume}
          onPageChange={setPageMonthlyVolume}
          pageSize={PAGE_SIZE}
        />

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Retention Interactions
          </h2>
          <LogRetentionCallForm
            outcome={outcome}
            setOutcome={setOutcome}
            notes={notes}
            setNotes={setNotes}
            submitting={submitting}
            onSubmit={handleLogCall}
          />
          <PaginatedTable<RetentionCall>
            title=""
            columns={[
              {
                key: "date",
                header: "Date",
                render: (c) => formatDateTime(c.callTimestamp),
              },
              {
                key: "outcome",
                header: "Outcome",
                render: (c) => c.outcome ?? "—",
              },
              {
                key: "notes",
                header: "Notes",
                render: (c) => c.notes ?? "—",
              },
            ]}
            data={retentionCalls}
            getKey={(c, _i, _p, _s) => String(c.id)}
            page={pageRetentionCalls}
            onPageChange={setPageRetentionCalls}
            pageSize={PAGE_SIZE}
            emptyMessage="No retention calls logged yet"
          />
        </section>

        <PaginatedTable<Transaction>
          title="Transaction History (last 500)"
          columns={[
            {
              key: "date",
              header: "Date",
              render: (t) =>
                t.transactionTimestamp
                  ? formatDateTime(t.transactionTimestamp)
                  : "—",
            },
            {
              key: "amount",
              header: "Amount",
              render: (t) =>
                `${formatVolumeCents(t.transactionAmountEur)} ${t.currency ?? "EUR"}`,
            },
            {
              key: "card",
              header: "Card",
              render: (t) => t.cardType ?? "—",
            },
          ]}
          data={transactions}
          getKey={(t, i, p, sz) =>
            t.transactionId ?? `txn-${(p - 1) * sz + i}`
          }
          page={pageTransactions}
          onPageChange={setPageTransactions}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
