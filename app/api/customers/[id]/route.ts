import { NextResponse } from "next/server";
import { getCustomerDetail } from "@/lib/risk-assessment";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const merchantId = parseInt(id, 10);
  if (isNaN(merchantId)) {
    return NextResponse.json({ error: "Invalid merchant ID" }, { status: 400 });
  }

  try {
    const result = await getCustomerDetail(merchantId);
    if (!result) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch customer detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer detail" },
      { status: 500 }
    );
  }
}
