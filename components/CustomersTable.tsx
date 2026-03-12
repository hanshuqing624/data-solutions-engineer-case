"use client";

import Link from "next/link";
import { formatVolumeCents } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { CustomerOverview, SortColumn } from "@/lib/types";

type CustomersTableProps = {
  customers: CustomerOverview[];
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (col: SortColumn) => void;
};

export function CustomersTable({
  customers,
  sortColumn,
  sortDirection,
  onSort,
}: CustomersTableProps) {
  const SortHeader = ({
    col,
    label,
    alignRight = false,
  }: {
    col: SortColumn;
    label: string;
    alignRight?: boolean;
  }) => (
    <th
      className={`px-4 py-3 font-medium ${alignRight ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`flex items-center gap-1 text-zinc-900 hover:text-zinc-900 ${
          alignRight ? "ml-auto" : ""
        }`}
      >
        {label}
        {sortColumn === col && (
          <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white text-zinc-900">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-900">
            <SortHeader col="companyName" label="Company" />
            <SortHeader col="country" label="Country" />
            <SortHeader col="merchantSegment" label="Segment" />
            <SortHeader col="volume90d" label="Volume (90d)" alignRight />
            <SortHeader col="transactionCount90d" label="Txns (90d)" alignRight />
            <SortHeader
              col="daysSinceLastTransaction"
              label="Days Since Last"
              alignRight
            />
            <SortHeader col="status" label="Status" />
          </tr>
        </thead>
        <tbody className="text-zinc-900">
          {customers.map((c) => (
            <tr
              key={c.merchantId}
              className="border-b border-zinc-100 hover:bg-zinc-50"
            >
              <td className="px-4 py-3 font-medium">
                <Link
                  href={`/customers/${c.merchantId}`}
                  className="text-blue-600 hover:underline"
                >
                  {c.companyName ?? `Merchant ${c.merchantId}`}
                </Link>
              </td>
              <td className="px-4 py-3">{c.country ?? "—"}</td>
              <td className="px-4 py-3">{c.merchantSegment ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                {formatVolumeCents(c.volume90d)}
              </td>
              <td className="px-4 py-3 text-right">
                {c.transactionCount90d}
              </td>
              <td className="px-4 py-3 text-right">
                {c.daysSinceLastTransaction ?? "—"}
              </td>
              <td className="max-w-[200px] px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <StatusBadge status={c.status} riskReason={c.risk_reason} />
                  <span
                    className="truncate text-xs text-zinc-600"
                    title={c.risk_reason}
                  >
                    {c.risk_reason}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
