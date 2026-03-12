"use client";

import { useEffect, useState } from "react";
import { useClassificationStore } from "@/lib/classification-store";
import type {
  CustomerOverview,
  SortColumn,
  StatusFilter,
  StatusOverTimeWeek,
} from "@/lib/types";

const PAGE_SIZE = 10;
const STATUS_ORDER = { Inactive: 0, "At Risk": 1, Active: 2 };

export function useCustomerOverview() {
  const { classifiedCustomers, setRawCustomers, thresholds } =
    useClassificationStore();
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
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setRawCustomers(data.customers))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setRawCustomers]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, countryFilter, segmentFilter]);

  useEffect(() => {
    setChartLoading(true);
    const params = new URLSearchParams({ weeks: "12" });
    params.set("thresholds", encodeURIComponent(JSON.stringify(thresholds)));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetch(`/api/customers/status-over-time?${params}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => setChartData(data.data))
        .catch((err) => {
          if (err.name !== "AbortError") setChartData([]);
        })
        .finally(() => setChartLoading(false));
    }, 300);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [thresholds]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection(
        col === "companyName" || col === "country" || col === "merchantSegment"
          ? "asc"
          : "desc"
      );
    }
    setPage(1);
  };

  // Filter pipeline
  const statusFiltered =
    statusFilter === null
      ? classifiedCustomers
      : classifiedCustomers.filter((c) => c.status === statusFilter);

  const searchLower = searchQuery.trim().toLowerCase();
  const searchFiltered =
    searchLower === ""
      ? statusFiltered
      : statusFiltered.filter((c) =>
          (c.companyName ?? `Merchant ${c.merchantId}`)
            .toLowerCase()
            .includes(searchLower)
        );

  const countryFiltered =
    countryFilter === ""
      ? searchFiltered
      : searchFiltered.filter((c) => (c.country ?? "") === countryFilter);

  const segmentFiltered =
    segmentFilter === ""
      ? countryFiltered
      : countryFiltered.filter(
          (c) => (c.merchantSegment ?? "") === segmentFilter
        );

  // Sort
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
      cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedCustomers.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const countries = [
    ...new Set(
      classifiedCustomers.map((c) => c.country ?? "").filter(Boolean)
    ),
  ].sort();
  const segments = [
    ...new Set(
      classifiedCustomers.map((c) => c.merchantSegment ?? "").filter(Boolean)
    ),
  ].sort();

  return {
    loading,
    error,
    chartData,
    chartLoading,
    inactiveCount: classifiedCustomers.filter((c) => c.status === "Inactive").length,
    atRiskCount: classifiedCustomers.filter((c) => c.status === "At Risk").length,
    activeCount: classifiedCustomers.filter((c) => c.status === "Active").length,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    countryFilter,
    setCountryFilter,
    segmentFilter,
    setSegmentFilter,
    countries,
    segments,
    sortColumn,
    sortDirection,
    handleSort,
    filteredCount: sortedCustomers.length,
    paginatedCustomers,
    totalPages,
    currentPage,
    setPage,
  };
}
