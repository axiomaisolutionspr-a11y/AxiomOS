import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Verificación inválida" },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      "AXIOMAI_INSTAGRAM_WEBHOOK",
      JSON.stringify(body)
    );

    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "AXIOMAI_INSTAGRAM_WEBHOOK_ERROR",
      error
    );

    return NextResponse.json(
      { ok: false },
      { status: 200 }
    );
  }
}