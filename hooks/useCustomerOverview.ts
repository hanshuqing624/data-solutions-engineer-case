"use client";

import { useEffect, useState } from "react";
import { useClassificationStore } from "@/lib/classification-store";
import {
  filterCustomers,
  sortCustomers,
  getUniqueCountries,
  getUniqueSegments,
} from "@/lib/customer-utils";
import type { SortColumn, StatusFilter, StatusOverTimeWeek } from "@/lib/types";

const PAGE_SIZE = 10;

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

  const filtered = filterCustomers(classifiedCustomers, {
    statusFilter,
    searchQuery,
    countryFilter,
    segmentFilter,
  });
  const sortedCustomers = sortCustomers(
    filtered,
    sortColumn,
    sortDirection
  );

  const totalPages = Math.ceil(sortedCustomers.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const countries = getUniqueCountries(classifiedCustomers);
  const segments = getUniqueSegments(classifiedCustomers);

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
