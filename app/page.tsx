"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatVolumeCents } from "@/lib/format";
import type {
  CustomerOverview,
  CustomerStatus,
  SortColumn,
  StatusFilter,
  StatusOverTimeWeek,
} from "@/lib/types";

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

export default function Home() {
  const [customers, setCustomers] = useState<CustomerOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("daysSinceLastTransaction");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [chartData, setChartData] = useState<StatusOverTimeWeek[]>([]);
  const [chartStacked, setChartStacked] = useState(true);

  const PAGE_SIZE = 10;

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setCustomers(data.customers);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, countryFilter, segmentFilter]);

  useEffect(() => {
    fetch("/api/customers/status-over-time?weeks=12")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setChartData(data.data))
      .catch(() => setChartData([]));
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const inactiveCount = customers.filter((c) => c.status === "Inactive").length;
  const atRiskCount = customers.filter((c) => c.status === "At Risk").length;
  const activeCount = customers.filter((c) => c.status === "Active").length;

  const statusFiltered = statusFilter === null ? customers : customers.filter((c) => c.status === statusFilter);

  const searchLower = searchQuery.trim().toLowerCase();
  const searchFiltered =
    searchLower === ""
      ? statusFiltered
      : statusFiltered.filter((c) => (c.companyName ?? `Merchant ${c.merchantId}`).toLowerCase().includes(searchLower));

  const countryFiltered =
    countryFilter === "" ? searchFiltered : searchFiltered.filter((c) => (c.country ?? "") === countryFilter);

  const segmentFiltered =
    segmentFilter === "" ? countryFiltered : countryFiltered.filter((c) => (c.merchantSegment ?? "") === segmentFilter);

  const countries = [...new Set(customers.map((c) => c.country ?? "").filter(Boolean))].sort();
  const segments = [...new Set(customers.map((c) => c.merchantSegment ?? "").filter(Boolean))].sort();

  const statusOrder = { Inactive: 0, "At Risk": 1, Active: 2 };
  const sortedCustomers = [...segmentFiltered].sort((a, b) => {
    let cmp = 0;
    if (sortColumn === "companyName") {
      const na = (a.companyName ?? `Merchant ${a.merchantId}`).toLowerCase();
      const nb = (b.companyName ?? `Merchant ${b.merchantId}`).toLowerCase();
      cmp = na.localeCompare(nb);
    } else if (sortColumn === "country") {
      cmp = (a.country ?? "").localeCompare(b.country ?? "");
    } else if (sortColumn === "merchantSegment") {
      cmp = (a.merchantSegment ?? "").localeCompare(b.merchantSegment ?? "");
    } else if (sortColumn === "volume90d") {
      cmp = a.volume90d - b.volume90d;
    } else if (sortColumn === "transactionCount90d") {
      cmp = a.transactionCount90d - b.transactionCount90d;
    } else if (sortColumn === "daysSinceLastTransaction") {
      const da = a.daysSinceLastTransaction ?? 9999;
      const db = b.daysSinceLastTransaction ?? 9999;
      cmp = da - db;
    } else if (sortColumn === "status") {
      cmp = statusOrder[a.status] - statusOrder[b.status];
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection(col === "companyName" || col === "country" || col === "merchantSegment" ? "asc" : "desc");
    }
    setPage(1);
  };

  const filteredCustomers = sortedCustomers;
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Customer Overview</h1>

        {/* Status over time chart - at top */}
        {chartData.length > 0 && (
          <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Merchants per status, per week</h2>
              <button
                type="button"
                onClick={() => setChartStacked((s) => !s)}
                className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
              >
                {chartStacked ? "Switch to grouped" : "Switch to stacked"}
              </button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="inactive" name="Inactive" stackId={chartStacked ? "a" : undefined} fill="#dc2626" />
                  <Bar dataKey="atRisk" name="At Risk" stackId={chartStacked ? "a" : undefined} fill="#f59e0b" />
                  <Bar dataKey="active" name="Active" stackId={chartStacked ? "a" : undefined} fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <p className="mb-4 text-sm text-zinc-600">
          Retention agent tool — multi-signal classification: recency, volume vs baseline, period-over-period decline.
          Segment-aware thresholds (micro more sensitive).
        </p>

        {/* Summary cards */}
        <div className="mb-8 flex gap-4">
          <button
            type="button"
            onClick={() => setStatusFilter((f) => (f === "Inactive" ? null : "Inactive"))}
            className={`flex flex-1 flex-col rounded-lg border-2 px-6 py-4 text-left transition-all hover:shadow-md ${
              statusFilter === "Inactive"
                ? "border-red-500 bg-red-50 shadow"
                : "border-red-200 bg-red-50/50 hover:border-red-300"
            }`}
          >
            <span className="text-sm font-medium text-red-700">Inactive</span>
            <span className="mt-1 text-3xl font-bold text-red-900">{inactiveCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((f) => (f === "At Risk" ? null : "At Risk"))}
            className={`flex flex-1 flex-col rounded-lg border-2 px-6 py-4 text-left transition-all hover:shadow-md ${
              statusFilter === "At Risk"
                ? "border-amber-500 bg-amber-50 shadow"
                : "border-amber-200 bg-amber-50/50 hover:border-amber-300"
            }`}
          >
            <span className="text-sm font-medium text-amber-700">At Risk</span>
            <span className="mt-1 text-3xl font-bold text-amber-900">{atRiskCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((f) => (f === "Active" ? null : "Active"))}
            className={`flex flex-1 flex-col rounded-lg border-2 px-6 py-4 text-left transition-all hover:shadow-md ${
              statusFilter === "Active"
                ? "border-green-500 bg-green-50 shadow"
                : "border-green-200 bg-green-50/50 hover:border-green-300"
            }`}
          >
            <span className="text-sm font-medium text-green-700">Active</span>
            <span className="mt-1 text-3xl font-bold text-green-900">{activeCount}</span>
          </button>
        </div>

        {/* Search and filters */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm w-64"
          />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All countries</option>
            {countries.map((co) => (
              <option key={co} value={co}>
                {co}
              </option>
            ))}
          </select>
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All segments</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {(statusFilter || totalPages > 1 || searchQuery || countryFilter || segmentFilter) && (
          <p className="mb-4 text-sm text-zinc-600">
            {statusFilter
              ? `Showing ${filteredCustomers.length} ${statusFilter.toLowerCase()} merchant${filteredCustomers.length !== 1 ? "s" : ""}. Click a card again to clear filter. `
              : ""}
            {totalPages > 1 && (
              <span className={statusFilter ? " ml-4" : ""}>
                Page {currentPage} of {totalPages} ({filteredCustomers.length} total)
              </span>
            )}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("companyName")}
                    className="flex items-center gap-1 hover:text-zinc-900"
                  >
                    Company
                    {sortColumn === "companyName" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("country")}
                    className="flex items-center gap-1 hover:text-zinc-900"
                  >
                    Country
                    {sortColumn === "country" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("merchantSegment")}
                    className="flex items-center gap-1 hover:text-zinc-900"
                  >
                    Segment
                    {sortColumn === "merchantSegment" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("volume90d")}
                    className="ml-auto flex items-center gap-1 hover:text-zinc-900"
                  >
                    Volume (90d)
                    {sortColumn === "volume90d" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("transactionCount90d")}
                    className="ml-auto flex items-center gap-1 hover:text-zinc-900"
                  >
                    Txns (90d)
                    {sortColumn === "transactionCount90d" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("daysSinceLastTransaction")}
                    className="ml-auto flex items-center gap-1 hover:text-zinc-900"
                  >
                    Days Since Last
                    {sortColumn === "daysSinceLastTransaction" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 hover:text-zinc-900"
                  >
                    Status
                    {sortColumn === "status" && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.map((c) => (
                <tr key={c.merchantId} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/customers/${c.merchantId}`} className="text-blue-600 hover:underline">
                      {c.companyName ?? `Merchant ${c.merchantId}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.country ?? "—"}</td>
                  <td className="px-4 py-3">{c.merchantSegment ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{formatVolumeCents(c.volume90d)}</td>
                  <td className="px-4 py-3 text-right">{c.transactionCount90d}</td>
                  <td className="px-4 py-3 text-right">{c.daysSinceLastTransaction ?? "—"}</td>
                  <td className="max-w-[200px] px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge status={c.status} riskReason={c.risk_reason} />
                      <span className="truncate text-xs text-zinc-500" title={c.risk_reason}>
                        {c.risk_reason}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-zinc-100"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-600">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-zinc-100"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
