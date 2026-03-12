import type { ClassificationThresholds } from "@/lib/classification-defaults";
import { CLASSIFICATION_THRESHOLDS } from "@/lib/classification-defaults";

/** Flat thresholds shape from API query (matches ThresholdsState from store) */
export type ThresholdsQuery = {
  activeDays?: number;
  atRiskDays?: number;
  volumeDeclinePct?: number;
  periodDeclinePct?: number;
  segmentMicroActiveDays?: number;
  segmentMicroAtRiskDays?: number;
  segmentSmallActiveDays?: number;
  segmentSmallAtRiskDays?: number;
  segmentMediumActiveDays?: number;
  segmentMediumAtRiskDays?: number;
  segmentLargeActiveDays?: number;
  segmentLargeAtRiskDays?: number;
};

/** Convert flat query shape to ClassificationThresholds */
export function toClassificationThresholds(
  q: ThresholdsQuery
): ClassificationThresholds {
  return {
    ACTIVE_DAYS: q.activeDays ?? CLASSIFICATION_THRESHOLDS.ACTIVE_DAYS,
    AT_RISK_DAYS: q.atRiskDays ?? CLASSIFICATION_THRESHOLDS.AT_RISK_DAYS,
    VOLUME_DECLINE_PCT:
      q.volumeDeclinePct ?? CLASSIFICATION_THRESHOLDS.VOLUME_DECLINE_PCT,
    PERIOD_DECLINE_PCT:
      q.periodDeclinePct ?? CLASSIFICATION_THRESHOLDS.PERIOD_DECLINE_PCT,
    SEGMENT_ACTIVE_DAYS: {
      micro: q.segmentMicroActiveDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.micro,
      small: q.segmentSmallActiveDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.small,
      medium: q.segmentMediumActiveDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.medium,
      large: q.segmentLargeActiveDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_ACTIVE_DAYS.large,
    },
    SEGMENT_AT_RISK_DAYS: {
      micro: q.segmentMicroAtRiskDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.micro,
      small: q.segmentSmallAtRiskDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.small,
      medium: q.segmentMediumAtRiskDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.medium,
      large: q.segmentLargeAtRiskDays ?? CLASSIFICATION_THRESHOLDS.SEGMENT_AT_RISK_DAYS.large,
    },
  };
}
