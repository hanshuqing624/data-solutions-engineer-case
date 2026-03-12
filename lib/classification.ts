/**
 * Churn classification logic for retention agents.
 * Multi-signal rules: recency, volume vs baseline, period-over-period decline.
 * All thresholds are adjustable.
 */

export type CustomerStatus = "Active" | "At Risk" | "Inactive";

// Adjustable thresholds
export const CLASSIFICATION_THRESHOLDS = {
  // Recency (primary signal)
  ACTIVE_DAYS: 30,
  AT_RISK_DAYS: 90,

  // Volume vs baseline: recent monthly < X% of avg_monthly_volume_eur → At Risk
  VOLUME_DECLINE_PCT: 0.5,

  // Period-over-period: last 30d < X% of prior 30d → At Risk
  PERIOD_DECLINE_PCT: 0.7,

  // Frequency: txn count down > X% (e.g. 0.5 = 50% drop) → At Risk
  FREQUENCY_DECLINE_PCT: 0.5,

  // Segment-specific recency (days) - micro merchants more sensitive
  SEGMENT_ACTIVE_DAYS: {
    micro: 14,
    small: 30,
    medium: 45,
    large: 45,
  } as Record<string, number>,
  SEGMENT_AT_RISK_DAYS: {
    micro: 60,
    small: 90,
    medium: 120,
    large: 120,
  } as Record<string, number>,
} as const;

export type ClassificationInput = {
  daysSinceLastTransaction: number | null;
  transactionCount90d: number;
  volume30d: number;
  volumePrior30d: number;
  avgMonthlyVolumeEur: number | null;
  merchantSegment: string | null;
};

/**
 * Get segment-aware recency thresholds. Falls back to default if segment unknown.
 */
function getSegmentThresholds(segment: string | null): {
  activeDays: number;
  atRiskDays: number;
} {
  const key = (segment ?? "small").toLowerCase();
  return {
    activeDays:
      CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS[key] ??
      CLASSIFICATION_THRESHOLDS.ACTIVE_DAYS,
    atRiskDays:
      CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS[key] ??
      CLASSIFICATION_THRESHOLDS.AT_RISK_DAYS,
  };
}

/**
 * Classify a customer using multi-signal rules.
 * Order: Inactive (no activity) → Recency → Volume decline → Period decline.
 */
export function classifyCustomer(input: ClassificationInput): {
  status: CustomerStatus;
  reason: string;
} {
  const {
    daysSinceLastTransaction,
    transactionCount90d,
    volume30d,
    volumePrior30d,
    avgMonthlyVolumeEur,
    merchantSegment,
  } = input;

  const { activeDays, atRiskDays } = getSegmentThresholds(merchantSegment);

  // No transactions in last 90 days → Inactive
  if (daysSinceLastTransaction === null || transactionCount90d === 0) {
    return {
      status: "Inactive",
      reason: "No transactions in last 90 days",
    };
  }

  // Primary: Recency
  if (daysSinceLastTransaction > atRiskDays) {
    return {
      status: "Inactive",
      reason: `Last transaction ${daysSinceLastTransaction} days ago (>${atRiskDays}d)`,
    };
  }

  // Build reason parts for At Risk
  const reasons: string[] = [];

  // Volume vs baseline
  let volumeDecline = false;
  if (
    avgMonthlyVolumeEur != null &&
    avgMonthlyVolumeEur > 0 &&
    volume30d < CLASSIFICATION_THRESHOLDS.VOLUME_DECLINE_PCT * avgMonthlyVolumeEur
  ) {
    volumeDecline = true;
    const pct = Math.round((volume30d / avgMonthlyVolumeEur) * 100);
    reasons.push(`volume 30d (${pct}% of baseline)`);
  }

  // Period-over-period decline (last 30d vs prior 30d)
  let periodDecline = false;
  if (volumePrior30d > 0 && volume30d < CLASSIFICATION_THRESHOLDS.PERIOD_DECLINE_PCT * volumePrior30d) {
    periodDecline = true;
    const pct = Math.round((volume30d / volumePrior30d) * 100);
    reasons.push(`volume down ${100 - pct}% vs prior 30d`);
  }

  // Recency in at-risk window (e.g. 31-90 days)
  const inAtRiskWindow =
    daysSinceLastTransaction > activeDays &&
    daysSinceLastTransaction <= atRiskDays;

  // Decline signals: volume vs baseline, or period-over-period
  const hasDeclineSignals = volumeDecline || periodDecline;

  // At Risk: in recency window OR has decline signals (even if recently active)
  if (inAtRiskWindow || hasDeclineSignals) {
    const parts: string[] = [];
    if (inAtRiskWindow)
      parts.push(`Last txn ${daysSinceLastTransaction}d ago`);
    if (reasons.length > 0) parts.push(reasons.join("; "));
    return {
      status: "At Risk",
      reason: parts.join(" · ") || "Declining activity",
    };
  }

  // Active: within active window, no decline signals
  return {
    status: "Active",
    reason: `Last transaction ${daysSinceLastTransaction} days ago`,
  };
}
