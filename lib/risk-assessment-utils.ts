/** Compute days since last transaction as of a given date */
export function daysSinceLastTransaction(
  lastTs: Date | null,
  asOf: Date
): number | null {
  if (lastTs === null) return null;
  return Math.floor(
    (asOf.getTime() - lastTs.getTime()) / (1000 * 60 * 60 * 24)
  );
}
