/**
 * Amount formatting. transaction_amount_eur and related fields are stored in cents.
 */

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
