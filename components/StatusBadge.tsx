import type { CustomerStatus } from "@/lib/types";

export function StatusBadge({
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
