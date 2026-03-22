export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(process.env.N8N_WORKOUT_WEBHOOK!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET!,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`n8n returned ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
