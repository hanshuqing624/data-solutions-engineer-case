import { NextResponse } from "next/server";
import { getStatusOverTimeData } from "@/lib/risk-assessment";
import {
  toClassificationThresholds,
  type ThresholdsQuery,
} from "@/lib/thresholds-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weeksParam = parseInt(searchParams.get("weeks") ?? "12", 10);

    let thresholds: ReturnType<typeof toClassificationThresholds> | undefined;
    const thresholdsParam = searchParams.get("thresholds");
    if (thresholdsParam) {
      try {
        const parsed = JSON.parse(
          decodeURIComponent(thresholdsParam)
        ) as ThresholdsQuery;
        thresholds = toClassificationThresholds(parsed);
      } catch {
        // Invalid JSON, use defaults
      }
    }

    const data = await getStatusOverTimeData(weeksParam, thresholds);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch status over time:", error);
    return NextResponse.json(
      { error: "Failed to fetch status over time" },
      { status: 500 }
    );
  }
}
