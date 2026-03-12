import { NextResponse } from "next/server";
import { getStatusOverTimeData } from "@/lib/risk-assessment";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weeksParam = parseInt(searchParams.get("weeks") ?? "12", 10);

    const data = await getStatusOverTimeData(weeksParam);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch status over time:", error);
    return NextResponse.json(
      { error: "Failed to fetch status over time" },
      { status: 500 }
    );
  }
}
