"use client";

import { useState } from "react";
import { useClassificationStore } from "@/lib/classification-store";
import { Slider } from "@/components/Slider";

export function ThresholdsPanel() {
  const { thresholds, setThresholds, resetThresholds } = useClassificationStore();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-semibold text-zinc-900">Classification thresholds</h3>
        <span className="text-zinc-500">{expanded ? "▼" : "▶"}</span>
      </button>
      {expanded && (
        <div className="mt-4 space-y-4 pl-0">
          <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
            Adjust these thresholds to change how merchants are classified as Active, At Risk, or Inactive.
            Changes apply immediately to the summary cards and chart. Hover over the <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 text-[9px] font-bold text-zinc-600">?</span> for more detail.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Recency (days)</div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  How recently a merchant must have transacted to stay Active or avoid Inactive.
                </p>
              </div>
              <Slider
                label="Active days"
                tooltip="Merchants with their last transaction within this many days are considered Active. Lower = stricter (fewer Active)."
                value={thresholds.activeDays}
                min={7}
                max={Math.min(60, thresholds.atRiskDays - 1)}
                step={1}
                onChange={(v) => {
                  if (v >= thresholds.atRiskDays) {
                    setThresholds({ activeDays: v, atRiskDays: v + 1 });
                  } else {
                    setThresholds({ activeDays: v });
                  }
                }}
              />
              <Slider
                label="At risk days"
                tooltip="Merchants with last transaction between Active days and this value are At Risk. Beyond this = Inactive."
                value={thresholds.atRiskDays}
                min={Math.max(30, thresholds.activeDays + 1)}
                max={180}
                step={1}
                onChange={(v) => {
                  if (v <= thresholds.activeDays) {
                    setThresholds({ atRiskDays: v, activeDays: v - 1 });
                  } else {
                    setThresholds({ atRiskDays: v });
                  }
                }}
              />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Decline thresholds</div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Volume-based signals that flag a merchant as At Risk even if recently active.
                </p>
              </div>
              <Slider
                label="Volume decline %"
                tooltip="If recent 30d volume is below this % of their average monthly volume, the merchant is flagged At Risk. E.g. 50% = flag when volume halves."
                value={thresholds.volumeDeclinePct}
                min={0.2}
                max={0.9}
                step={0.05}
                onChange={(v) => setThresholds({ volumeDeclinePct: v })}
              />
              <Slider
                label="Period decline %"
                tooltip="If recent 30d volume is below this % of the prior 30d, the merchant is flagged At Risk. E.g. 70% = flag when volume drops 30% vs prior month."
                value={thresholds.periodDeclinePct}
                min={0.4}
                max={0.95}
                step={0.05}
                onChange={(v) => setThresholds({ periodDeclinePct: v })}
              />
            </div>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Segment-specific
            </summary>
            <p className="mt-2 text-xs text-zinc-500">
              Override recency thresholds per merchant segment. Micro merchants typically need more frequent activity.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["micro", "segmentMicroActiveDays", "segmentMicroAtRiskDays"],
                  ["small", "segmentSmallActiveDays", "segmentSmallAtRiskDays"],
                  ["medium", "segmentMediumActiveDays", "segmentMediumAtRiskDays"],
                  ["large", "segmentLargeActiveDays", "segmentLargeAtRiskDays"],
                ] as const
              ).map(([seg, activeKey, atRiskKey]) => {
                const segActive = thresholds[activeKey];
                const segAtRisk = thresholds[atRiskKey];
                return (
                  <div key={seg} className="space-y-3 rounded border border-zinc-100 p-3">
                    <div className="text-xs font-medium capitalize text-zinc-500">{seg}</div>
                    <Slider
                      label="Active"
                      tooltip={`Active days for ${seg} segment. Overrides the default when merchant segment is ${seg}.`}
                      value={segActive}
                      min={7}
                      max={Math.min(60, segAtRisk - 1)}
                      step={1}
                      onChange={(v) => {
                        if (v >= segAtRisk) {
                          setThresholds({ [activeKey]: v, [atRiskKey]: v + 1 });
                        } else {
                          setThresholds({ [activeKey]: v });
                        }
                      }}
                    />
                    <Slider
                      label="At risk"
                      tooltip={`At risk days for ${seg} segment. Overrides the default when merchant segment is ${seg}.`}
                      value={segAtRisk}
                      min={Math.max(30, segActive + 1)}
                      max={180}
                      step={1}
                      onChange={(v) => {
                        if (v <= segActive) {
                          setThresholds({ [atRiskKey]: v, [activeKey]: v - 1 });
                        } else {
                          setThresholds({ [atRiskKey]: v });
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </details>
          <button
            type="button"
            onClick={resetThresholds}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

export default ThresholdsPanel;
