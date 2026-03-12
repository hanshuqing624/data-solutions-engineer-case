"use client";

import { useEffect, useState } from "react";
import type {
  Customer,
  MonthlyVolume,
  RetentionCall,
  Transaction,
} from "@/lib/types";

const PAGE_SIZE = 10;

export function useCustomerDetail(id: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyVolume, setMonthlyVolume] = useState<MonthlyVolume[]>([]);
  const [retentionCalls, setRetentionCalls] = useState<RetentionCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [pageMonthlyVolume, setPageMonthlyVolume] = useState(1);
  const [pageRetentionCalls, setPageRetentionCalls] = useState(1);
  const [pageTransactions, setPageTransactions] = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
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

  return {
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
  };
}
