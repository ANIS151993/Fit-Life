export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";

const FOOD_WEBHOOK = "https://n8n.marcbd.site/webhook/fitlife/analyze-food";
const WEBHOOK_SECRET = "fitlife_webhook_secret_2024";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.imageBase64 || !body.userId) {
      return NextResponse.json({ error: "Missing imageBase64 or userId" }, { status: 400 });
    }
    const response = await fetch(FOOD_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("n8n returned " + response.status);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
