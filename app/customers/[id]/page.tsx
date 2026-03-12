"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatVolumeCents } from "@/lib/format";
import type {
  Customer,
  CustomerDetailResponseFromApi,
  CustomerStatus,
  MonthlyVolume,
  RetentionCall,
  Transaction,
} from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({
  status,
  riskReason,
}: {
  status: CustomerStatus;
  riskReason: string;
}) {
  const styles: Record<CustomerStatus, string> = {
    Active: "bg-green-100 text-green-800",
    "At Risk": "bg-amber-100 text-amber-800",
    Inactive: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      title={riskReason}
      className={`inline-block cursor-help rounded px-2 py-0.5 text-sm font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyVolume, setMonthlyVolume] = useState<MonthlyVolume[]>([]);
  const [retentionCalls, setRetentionCalls] = useState<RetentionCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log call form state
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/customers/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setCustomer(data.customer);
        setTransactions(data.transactions);
        setMonthlyVolume(data.monthlyVolume);
        setRetentionCalls(data.retentionCalls);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    if (!id || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/retention-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: parseInt(id, 10),
          outcome: outcome || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to log call");
      const newCall = await res.json();
      setRetentionCalls((prev) => [newCall, ...prev]);
      setOutcome("");
      setNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

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

        {/* Customer header */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">
                {customer.companyName ?? `Merchant ${customer.merchantId}`}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {customer.country} · {customer.merchantSegment ?? "—"} ·{" "}
                {customer.productType ?? "—"}
              </p>
            </div>
            <StatusBadge status={customer.status} riskReason={customer.risk_reason} />
          </div>
          <p className="text-sm text-zinc-600" title={customer.risk_reason}>
            {customer.risk_reason}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-xs text-zinc-500">Contact</span>
              <p className="font-medium">{customer.contactPerson ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500">Phone</span>
              <p className="font-medium">{customer.phoneNumber ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500">Volume (90d)</span>
              <p className="font-medium">{formatVolumeCents(customer.volume90d)}</p>
            </div>
            <div>
              <span className="text-xs text-zinc-500">Txns (90d)</span>
              <p className="font-medium">{customer.transactionCount90d}</p>
            </div>
          </div>
        </div>

        {/* Monthly volume */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Monthly Transaction Volume
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-medium">Month</th>
                  <th className="px-4 py-3 font-medium text-right">Volume</th>
                  <th className="px-4 py-3 font-medium text-right">Txns</th>
                </tr>
              </thead>
              <tbody>
                {monthlyVolume.map((m) => (
                  <tr
                    key={m.month}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3">{formatDate(m.month)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatVolumeCents(m.volume)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.transactionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Retention calls + Log form */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Retention Interactions
          </h2>

          {/* Log new call form */}
          <form
            onSubmit={handleLogCall}
            className="mb-6 rounded-lg border border-zinc-200 bg-white p-4"
          >
            <h3 className="mb-3 text-sm font-medium text-zinc-700">
              Log new call
            </h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-500">
                  Outcome
                </label>
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="e.g. Reached, No answer"
                  className="rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-xs text-zinc-500">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Call notes..."
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Log call"}
                </button>
              </div>
            </div>
          </form>

          {/* Retention calls history */}
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {retentionCalls.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      No retention calls logged yet
                    </td>
                  </tr>
                ) : (
                  retentionCalls.map((call) => (
                    <tr
                      key={call.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-4 py-3">
                        {formatDateTime(call.callTimestamp)}
                      </td>
                      <td className="px-4 py-3">{call.outcome ?? "—"}</td>
                      <td className="px-4 py-3">{call.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Transaction history */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Transaction History (last 500)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Card</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr
                    key={t.transactionId ?? `txn-${i}`}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3">
                      {t.transactionTimestamp
                        ? formatDateTime(t.transactionTimestamp)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {formatVolumeCents(t.transactionAmountEur)}{" "}
                      {t.currency ?? "EUR"}
                    </td>
                    <td className="px-4 py-3">{t.cardType ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
