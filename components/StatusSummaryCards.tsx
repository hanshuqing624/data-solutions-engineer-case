import type { StatusFilter } from "@/lib/types";

type StatusSummaryCardsProps = {
  inactiveCount: number;
  atRiskCount: number;
  activeCount: number;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
};

export function StatusSummaryCards({
  inactiveCount,
  atRiskCount,
  activeCount,
  statusFilter,
  onStatusFilterChange,
}: StatusSummaryCardsProps) {
  return (
    <div className="mb-8 flex gap-4">
      <button
        type="button"
        onClick={() =>
          onStatusFilterChange(statusFilter === "Inactive" ? null : "Inactive")
        }
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
        onClick={() =>
          onStatusFilterChange(statusFilter === "At Risk" ? null : "At Risk")
        }
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
        onClick={() =>
          onStatusFilterChange(statusFilter === "Active" ? null : "Active")
        }
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
  );
}
