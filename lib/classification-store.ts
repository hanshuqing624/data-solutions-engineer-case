"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CustomerOverview } from "@/lib/types";
import {
  DEFAULT_THRESHOLDS,
  enforceRecencyInvariant,
  toClassificationThresholds,
  reclassifyCustomers,
  type ThresholdsState,
} from "@/lib/classification-store-utils";

type ClassificationStore = {
  rawCustomers: CustomerOverview[];
  classifiedCustomers: CustomerOverview[];
  thresholds: ThresholdsState;
  setThresholds: (partial: Partial<ThresholdsState>) => void;
  resetThresholds: () => void;
  setRawCustomers: (customers: CustomerOverview[]) => void;
};

export type { ThresholdsState } from "@/lib/classification-store-utils";

export const useClassificationStore = create<ClassificationStore>()(
  persist(
    (set) => ({
      rawCustomers: [],
      classifiedCustomers: [],
      thresholds: DEFAULT_THRESHOLDS,

      setThresholds: (partial) =>
        set((state) => {
          let nextThresholds = { ...state.thresholds, ...partial };
          nextThresholds = enforceRecencyInvariant(nextThresholds);
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
      merge: (persisted, current) => {
        const p = persisted as Partial<{ thresholds: ThresholdsState }> | null;
        const merged = {
          ...current,
          ...(p && typeof p === "object" ? p : {}),
        };
        if (merged.thresholds) {
          merged.thresholds = enforceRecencyInvariant(merged.thresholds);
        }
        return merged;
      },
    }
  )
);
