"use client";

import { useState } from "react";
import { useClassificationStore } from "@/lib/classification-store";

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const displayValue = step < 1 ? `${Math.round(value * 100)}%` : `${value}${suffix}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-600">{label}</span>
        <span className="font-medium text-zinc-900">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-zinc-700"
      />
    </div>
  );
}

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Recency (days)</div>
              <Slider
                label="Active days"
                value={thresholds.activeDays}
                min={7}
                max={60}
                step={1}
                onChange={(v) => setThresholds({ activeDays: v })}
              />
              <Slider
                label="At risk days"
                value={thresholds.atRiskDays}
                min={30}
                max={180}
                step={1}
                onChange={(v) => setThresholds({ atRiskDays: v })}
              />
            </div>
            <div className="space-y-4">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Decline thresholds</div>
              <Slider
                label="Volume decline %"
                value={thresholds.volumeDeclinePct}
                min={0.2}
                max={0.9}
                step={0.05}
                onChange={(v) => setThresholds({ volumeDeclinePct: v })}
              />
              <Slider
                label="Period decline %"
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
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["micro", "segmentMicroActiveDays", "segmentMicroAtRiskDays"],
                  ["small", "segmentSmallActiveDays", "segmentSmallAtRiskDays"],
                  ["medium", "segmentMediumActiveDays", "segmentMediumAtRiskDays"],
                  ["large", "segmentLargeActiveDays", "segmentLargeAtRiskDays"],
                ] as const
              ).map(([seg, activeKey, atRiskKey]) => (
                <div key={seg} className="space-y-3 rounded border border-zinc-100 p-3">
                  <div className="text-xs font-medium capitalize text-zinc-500">{seg}</div>
                  <Slider
                    label="Active"
                    value={thresholds[activeKey]}
                    min={7}
                    max={60}
                    step={1}
                    onChange={(v) => setThresholds({ [activeKey]: v })}
                  />
                  <Slider
                    label="At risk"
                    value={thresholds[atRiskKey]}
                    min={30}
                    max={180}
                    step={1}
                    onChange={(v) => setThresholds({ [atRiskKey]: v })}
                  />
                </div>
              ))}
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
