"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { StatusOverTimeWeek } from "@/lib/types";

export function StatusOverTimeChart({
  data,
  loading = false,
}: {
  data: StatusOverTimeWeek[];
  loading?: boolean;
}) {
  const [stacked, setStacked] = useState(true);

  if (data.length === 0 && !loading) return null;

  return (
    <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Merchants per status, per week
        </h2>
        <button
          type="button"
          onClick={() => setStacked((s) => !s)}
          disabled={loading}
          className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          {stacked ? "Switch to grouped" : "Switch to stacked"}
        </button>
      </div>
      <div className="relative h-64">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="inactive"
              name="Inactive"
              stackId={stacked ? "a" : undefined}
              fill="#dc2626"
            />
            <Bar
              dataKey="atRisk"
              name="At Risk"
              stackId={stacked ? "a" : undefined}
              fill="#f59e0b"
            />
            <Bar
              dataKey="active"
              name="Active"
              stackId={stacked ? "a" : undefined}
              fill="#16a34a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
