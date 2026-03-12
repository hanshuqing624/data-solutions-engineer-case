/**
 * Amount and date formatting.
 * transaction_amount_eur and related fields are stored in cents.
 */

/** Format ISO date string for display (e.g. "2024-01-15" → "15 Jan 2024") */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format ISO date-time string for display */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format cents as EUR for display (e.g. 2292 → "22.92") */
export function formatEur(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format volume in cents for display (e.g. 2015203 → "20.2k", 2292 → "22.92") */
export function formatVolumeCents(cents: number): string {
  const eur = cents / 100;
  if (eur >= 1_000_000) return `${(eur / 1_000_000).toFixed(1)}M`;
  if (eur >= 1_000) return `${(eur / 1_000).toFixed(1)}k`;
  return eur.toFixed(2);
}
