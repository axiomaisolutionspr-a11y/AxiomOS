import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "AxiomAI Telnyx Webhook",
    status: "ready",
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("=== AXIOMAI TELNYX WEBHOOK ===");
    console.log(JSON.stringify(payload, null, 2));
    console.log("=== END TELNYX WEBHOOK ===");

    return NextResponse.json(
      {
        ok: true,
        received: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Telnyx webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid webhook payload",
      },
      { status: 400 }
    );
  }
}