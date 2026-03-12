import { classifyCustomer } from "@/lib/classification-defaults";
import type { ClassificationThresholds } from "@/lib/classification-defaults";
import { CLASSIFICATION_THRESHOLDS } from "@/lib/classification-defaults";
import type { ClassificationInput, CustomerOverview } from "@/lib/types";

/** Slider-friendly thresholds - flat structure for UI */
export type ThresholdsState = {
  activeDays: number;
  atRiskDays: number;
  volumeDeclinePct: number;
  periodDeclinePct: number;
  segmentMicroActiveDays: number;
  segmentMicroAtRiskDays: number;
  segmentSmallActiveDays: number;
  segmentSmallAtRiskDays: number;
  segmentMediumActiveDays: number;
  segmentMediumAtRiskDays: number;
  segmentLargeActiveDays: number;
  segmentLargeAtRiskDays: number;
};

export const DEFAULT_THRESHOLDS: ThresholdsState = {
  activeDays: CLASSIFICATION_THRESHOLDS.ACTIVE_DAYS,
  atRiskDays: CLASSIFICATION_THRESHOLDS.AT_RISK_DAYS,
  volumeDeclinePct: CLASSIFICATION_THRESHOLDS.VOLUME_DECLINE_PCT,
  periodDeclinePct: CLASSIFICATION_THRESHOLDS.PERIOD_DECLINE_PCT,
  segmentMicroActiveDays: CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.micro,
  segmentMicroAtRiskDays: CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.micro,
  segmentSmallActiveDays: CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.small,
  segmentSmallAtRiskDays: CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.small,
  segmentMediumActiveDays: CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.medium,
  segmentMediumAtRiskDays: CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.medium,
  segmentLargeActiveDays: CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.large,
  segmentLargeAtRiskDays: CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.large,
};

/** Enforce activeDays < atRiskDays for all recency pairs */
export function enforceRecencyInvariant(t: ThresholdsState): ThresholdsState {
  const next = { ...t };
  if (next.activeDays >= next.atRiskDays) {
    next.atRiskDays = next.activeDays + 1;
  }
  const pairs: [keyof ThresholdsState, keyof ThresholdsState][] = [
    ["segmentMicroActiveDays", "segmentMicroAtRiskDays"],
    ["segmentSmallActiveDays", "segmentSmallAtRiskDays"],
    ["segmentMediumActiveDays", "segmentMediumAtRiskDays"],
    ["segmentLargeActiveDays", "segmentLargeAtRiskDays"],
  ];
  for (const [activeKey, atRiskKey] of pairs) {
    const active = next[activeKey] as number;
    const atRisk = next[atRiskKey] as number;
    if (active >= atRisk) {
      (next as Record<string, number>)[atRiskKey] = active + 1;
    }
  }
  return next;
}

export function toClassificationThresholds(
  s: ThresholdsState
): ClassificationThresholds {
  return {
    ACTIVE_DAYS: s.activeDays,
    AT_RISK_DAYS: s.atRiskDays,
    VOLUME_DECLINE_PCT: s.volumeDeclinePct,
    PERIOD_DECLINE_PCT: s.periodDeclinePct,
    SEGMENT_ACTIVE_DAYS: {
      micro: s.segmentMicroActiveDays,
      small: s.segmentSmallActiveDays,
      medium: s.segmentMediumActiveDays,
      large: s.segmentLargeActiveDays,
    },
    SEGMENT_AT_RISK_DAYS: {
      micro: s.segmentMicroAtRiskDays,
      small: s.segmentSmallAtRiskDays,
      medium: s.segmentMediumAtRiskDays,
      large: s.segmentLargeAtRiskDays,
    },
  };
}

function canReclassify(c: CustomerOverview): c is CustomerOverview & {
  volume30d: number;
  volumePrior30d: number;
  avgMonthlyVolumeEur: number | null;
} {
  return (
    typeof c.volume30d === "number" &&
    typeof c.volumePrior30d === "number" &&
    c.avgMonthlyVolumeEur !== undefined
  );
}

export function reclassifyCustomers(
  raw: CustomerOverview[],
  thresholds: ClassificationThresholds
): CustomerOverview[] {
  return raw.map((c) => {
    if (!canReclassify(c)) {
      return c;
    }
    const input: ClassificationInput = {
      daysSinceLastTransaction: c.daysSinceLastTransaction,
      transactionCount90d: c.transactionCount90d,
      volume30d: c.volume30d,
      volumePrior30d: c.volumePrior30d,
      avgMonthlyVolumeEur: c.avgMonthlyVolumeEur,
      merchantSegment: c.merchantSegment,
    };
    const { status, reason } = classifyCustomer(input, thresholds);
    return {
      ...c,
      status,
      risk_reason: reason,
    };
  });
}
