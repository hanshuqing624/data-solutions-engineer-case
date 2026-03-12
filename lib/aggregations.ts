/** Aggregate transactions by month for monthly volume charts */
export function aggregateMonthlyVolume(
  transactions: Array<{
    transaction_timestamp: Date | null;
    transaction_amount_eur: bigint | null;
  }>
): Array<{ month: Date; volume: number; transactionCount: number }> {
  const byMonth = new Map<
    string,
    { volume: number; transactionCount: number }
  >();
  for (const t of transactions) {
    if (!t.transaction_timestamp) continue;
    const monthKey = `${t.transaction_timestamp.getFullYear()}-${String(t.transaction_timestamp.getMonth() + 1).padStart(2, "0")}`;
    const existing = byMonth.get(monthKey) ?? {
      volume: 0,
      transactionCount: 0,
    };
    existing.volume += Number(t.transaction_amount_eur ?? 0);
    existing.transactionCount += 1;
    byMonth.set(monthKey, existing);
  }
  return Array.from(byMonth.entries())
    .map(([monthStr, v]) => ({
      month: new Date(`${monthStr}-01`),
      volume: v.volume,
      transactionCount: v.transactionCount,
    }))
    .sort((a, b) => b.month.getTime() - a.month.getTime())
    .slice(0, 24);
}
