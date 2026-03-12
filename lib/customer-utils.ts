import type { CustomerOverview, SortColumn, StatusFilter } from "@/lib/types";

const STATUS_ORDER = { Inactive: 0, "At Risk": 1, Active: 2 };

export function filterCustomers(
  customers: CustomerOverview[],
  filters: {
    statusFilter: StatusFilter;
    searchQuery: string;
    countryFilter: string;
    segmentFilter: string;
  }
): CustomerOverview[] {
  let result =
    filters.statusFilter === null
      ? customers
      : customers.filter((c) => c.status === filters.statusFilter);

  const searchLower = filters.searchQuery.trim().toLowerCase();
  if (searchLower !== "") {
    result = result.filter((c) =>
      (c.companyName ?? `Merchant ${c.merchantId}`)
        .toLowerCase()
        .includes(searchLower)
    );
  }

  if (filters.countryFilter !== "") {
    result = result.filter((c) => (c.country ?? "") === filters.countryFilter);
  }

  if (filters.segmentFilter !== "") {
    result = result.filter(
      (c) => (c.merchantSegment ?? "") === filters.segmentFilter
    );
  }

  return result;
}

export function sortCustomers(
  customers: CustomerOverview[],
  sortColumn: SortColumn,
  sortDirection: "asc" | "desc"
): CustomerOverview[] {
  return [...customers].sort((a, b) => {
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
}

export function getUniqueCountries(customers: CustomerOverview[]): string[] {
  return [...new Set(customers.map((c) => c.country ?? "").filter(Boolean))].sort();
}

export function getUniqueSegments(customers: CustomerOverview[]): string[] {
  return [
    ...new Set(customers.map((c) => c.merchantSegment ?? "").filter(Boolean)),
  ].sort();
}

/** Sort customers by churn risk: Inactive first, then At Risk, then Active; within same status by days since last (desc) */
export function sortByChurnRisk(
  customers: CustomerOverview[]
): CustomerOverview[] {
  return [...customers].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    const daysA = a.daysSinceLastTransaction ?? 9999;
    const daysB = b.daysSinceLastTransaction ?? 9999;
    return daysB - daysA;
  });
}
