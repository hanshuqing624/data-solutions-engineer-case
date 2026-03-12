"use client";

import { useEffect, useState } from "react";
import { useCustomerOverview } from "@/hooks/useCustomerOverview";
import { ThresholdsPanel } from "@/components/ThresholdsPanel";
import { StatusOverTimeChart } from "@/components/StatusOverTimeChart";
import { StatusSummaryCards } from "@/components/StatusSummaryCards";
import { CustomerFilters } from "@/components/CustomerFilters";
import { CustomersTable } from "@/components/CustomersTable";
import { Pagination } from "@/components/Pagination";

/** Renders ThresholdsPanel only after mount to avoid Zustand persist hydration issues */
function ThresholdsPanelPlaceholder() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="rounded-lg border border-zinc-200 bg-white p-4 animate-pulse h-24" />;
  return <ThresholdsPanel />;
}

export default function Home() {
  const {
    loading,
    error,
    chartData,
    chartLoading,
    inactiveCount,
    atRiskCount,
    activeCount,
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
    filteredCount,
    paginatedCustomers,
    totalPages,
    currentPage,
    setPage,
  } = useCustomerOverview();

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Customer Overview</h1>

        <p className="mb-4 text-sm text-zinc-600">
          Retention agent tool — multi-signal classification: recency, volume vs baseline, period-over-period decline.
          Segment-aware thresholds (micro more sensitive).
        </p>

        <div className="mb-6">
          <ThresholdsPanelPlaceholder />
        </div>

        <StatusOverTimeChart data={chartData} loading={chartLoading} />

        <StatusSummaryCards
          inactiveCount={inactiveCount}
          atRiskCount={atRiskCount}
          activeCount={activeCount}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <CustomerFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          countryFilter={countryFilter}
          onCountryChange={setCountryFilter}
          segmentFilter={segmentFilter}
          onSegmentChange={setSegmentFilter}
          countries={countries}
          segments={segments}
        />

        {(statusFilter || totalPages > 1 || searchQuery || countryFilter || segmentFilter) && (
          <p className="mb-4 text-sm text-zinc-600">
            {statusFilter
              ? `Showing ${filteredCount} ${statusFilter.toLowerCase()} merchant${filteredCount !== 1 ? "s" : ""}. Click a card again to clear filter. `
              : ""}
            {totalPages > 1 && (
              <span className={statusFilter ? " ml-4" : ""}>
                Page {currentPage} of {totalPages} ({filteredCount} total)
              </span>
            )}
          </p>
        )}

        <CustomersTable
          customers={paginatedCustomers}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        />

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
