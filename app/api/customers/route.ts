import { NextResponse } from "next/server";
import { getCustomerOverviews } from "@/lib/risk-assessment";

export async function GET() {
  try {
    const customers = await getCustomerOverviews();
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
