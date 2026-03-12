import { NextResponse } from "next/server";
import pool from "@/lib/db";

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

    const result = await pool.query(
      `
      INSERT INTO retention_calls (customer_id, call_timestamp, outcome, notes)
      VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
      RETURNING id, customer_id as "customerId", call_timestamp as "callTimestamp", outcome, notes
    `,
      [merchantId, outcome ?? null, notes ?? null]
    );

    const row = result.rows[0];
    return NextResponse.json({
      id: row.id,
      customerId: Number(row.customerId),
      callTimestamp: row.callTimestamp,
      outcome: row.outcome,
      notes: row.notes,
    });
  } catch (error) {
    console.error("Failed to create retention call:", error);
    return NextResponse.json(
      { error: "Failed to create retention call" },
      { status: 500 }
    );
  }
}
