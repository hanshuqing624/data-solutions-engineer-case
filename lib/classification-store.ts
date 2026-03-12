"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { classifyCustomer } from "@/lib/classification-defaults";
import type { ClassificationThresholds } from "@/lib/classification-defaults";
import type { CustomerOverview } from "@/lib/types";
import { CLASSIFICATION_THRESHOLDS } from "@/lib/classification-defaults";
import type { ClassificationInput } from "@/lib/types";

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

const DEFAULT_THRESHOLDS: ThresholdsState = {
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

function toClassificationThresholds(s: ThresholdsState): ClassificationThresholds {
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

function reclassifyCustomers(
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

type ClassificationStore = {
  /** Raw customer data from API (with volume30d, volumePrior30d, avgMonthlyVolumeEur for reclassification) */
  rawCustomers: CustomerOverview[];
  /** Classified customers - recomputed when thresholds or rawCustomers change */
  classifiedCustomers: CustomerOverview[];
  /** User-adjustable thresholds (persisted to localStorage) */
  thresholds: ThresholdsState;
  setThresholds: (partial: Partial<ThresholdsState>) => void;
  resetThresholds: () => void;
  /** Set raw customers from API and reclassify with current thresholds */
  setRawCustomers: (customers: CustomerOverview[]) => void;
};

export const useClassificationStore = create<ClassificationStore>()(
  persist(
    (set) => ({
      rawCustomers: [],
      classifiedCustomers: [],
      thresholds: DEFAULT_THRESHOLDS,

      setThresholds: (partial) =>
        set((state) => {
          const nextThresholds = { ...state.thresholds, ...partial };
          const classificationThresholds =
            toClassificationThresholds(nextThresholds);
          const classifiedCustomers = reclassifyCustomers(
            state.rawCustomers,
            classificationThresholds
          );
          return {
            thresholds: nextThresholds,
            classifiedCustomers,
          };
        }),

      resetThresholds: () =>
        set((state) => {
          const classificationThresholds =
            toClassificationThresholds(DEFAULT_THRESHOLDS);
          const classifiedCustomers = reclassifyCustomers(
            state.rawCustomers,
            classificationThresholds
          );
          return {
            thresholds: DEFAULT_THRESHOLDS,
            classifiedCustomers,
          };
        }),

      setRawCustomers: (customers) =>
        set((state) => {
          const classificationThresholds = toClassificationThresholds(
            state.thresholds
          );
          const classifiedCustomers = reclassifyCustomers(
            customers,
            classificationThresholds
          );
          return {
            rawCustomers: customers,
            classifiedCustomers,
          };
        }),
    }),
    {
      name: "classification-thresholds",
      partialize: (state) => ({ thresholds: state.thresholds }),
    }
  )
);
