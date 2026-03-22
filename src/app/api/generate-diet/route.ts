export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";

const DIET_WEBHOOK = "https://n8n.marcbd.site/webhook/fitlife/generate-diet";
const WEBHOOK_SECRET = "fitlife_webhook_secret_2024";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(DIET_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": WEBHOOK_SECRET },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error("n8n returned " + response.status);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
