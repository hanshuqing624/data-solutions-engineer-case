import { formatVolumeCents } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Customer } from "@/lib/types";

export function CustomerDetailHeader({ customer }: { customer: Customer }) {
  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {customer.companyName ?? `Merchant ${customer.merchantId}`}
          </h1>
          <p className="mt-1 text-sm text-zinc-700">
            {customer.country} · {customer.merchantSegment ?? "—"} ·{" "}
            {customer.productType ?? "—"}
          </p>
        </div>
        <StatusBadge status={customer.status} riskReason={customer.risk_reason} />
      </div>
      <p className="text-sm text-zinc-700" title={customer.risk_reason}>
        {customer.risk_reason}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-xs text-zinc-500">Contact</span>
          <p className="font-medium text-zinc-900">{customer.contactPerson ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Phone</span>
          <p className="font-medium text-zinc-900">{customer.phoneNumber ?? "—"}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Volume (90d)</span>
          <p className="font-medium text-zinc-900">{formatVolumeCents(customer.volume90d)}</p>
        </div>
        <div>
          <span className="text-xs text-zinc-500">Txns (90d)</span>
          <p className="font-medium text-zinc-900">{customer.transactionCount90d}</p>
        </div>
      </div>
    </div>
  );
}
