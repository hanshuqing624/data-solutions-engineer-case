import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, outcome, notes } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      );
    }

    const merchantId = parseInt(String(customerId), 10);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: "Invalid customerId" },
        { status: 400 }
      );
    }

    const created = await prisma.retention_calls.create({
      data: {
        customer_id: BigInt(merchantId),
        outcome: outcome ?? null,
        notes: notes ?? null,
      },
    });

    return NextResponse.json({
      id: created.id,
      customerId: Number(created.customer_id),
      callTimestamp: created.call_timestamp,
      outcome: created.outcome,
      notes: created.notes,
    });
  } catch (error) {
    console.error("Failed to create retention call:", error);
    return NextResponse.json(
      { error: "Failed to create retention call" },
      { status: 500 }
    );
  }
}
