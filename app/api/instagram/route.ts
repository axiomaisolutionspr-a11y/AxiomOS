import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as askBrain } from "../brain/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("hub.challenge");

  if (
    VERIFY_TOKEN &&
    searchParams.get("hub.mode") === "subscribe" &&
    searchParams.get("hub.verify_token") === VERIFY_TOKEN &&
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
    const appSecret = process.env.META_APP_SECRET;
    const signature = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();

    if (!appSecret || !signature?.startsWith("sha256=")) {
      return NextResponse.json(
        { error: "Firma inválida" },
        { status: 401 }
      );
    }

    const received = signature.slice("sha256=".length);

    if (!/^[a-f0-9]{64}$/i.test(received)) {
      return NextResponse.json(
        { error: "Firma inválida" },
        { status: 401 }
      );
    }

    const expected = createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

    if (
      !timingSafeEqual(
        Buffer.from(received, "hex"),
        Buffer.from(expected, "hex")
      )
    ) {
      return NextResponse.json(
        { error: "Firma inválida" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    if (body?.object !== "instagram") {
      return NextResponse.json({ ok: true });
    }

    const token = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!token) {
      console.error("Falta INSTAGRAM_ACCESS_TOKEN");
      return NextResponse.json({ ok: true });
    }

    for (const entry of body.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        const senderId = event.sender?.id;
        const text = event.message?.text;

        if (
          !senderId ||
          typeof text !== "string" ||
          !text.trim() ||
          event.message?.is_echo
        ) {
          continue;
        }

        const brainResponse = await askBrain(
          new Request(new URL("/api/brain", request.url), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: text.trim(),
            }),
          })
        );

        const brainData = await brainResponse.json();

        if (
          !brainResponse.ok ||
          typeof brainData.result !== "string" ||
          !brainData.result.trim()
        ) {
          console.error(
            "INSTAGRAM_BRAIN_ERROR",
            brainResponse.status,
            brainData.error
          );
          continue;
        }

        const sendResponse = await fetch(
          "https://graph.instagram.com/v25.0/me/messages",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: {
                text: brainData.result.slice(0, 1000),
              },
            }),
          }
        );

        if (!sendResponse.ok) {
          console.error(
            "INSTAGRAM_SEND_ERROR",
            sendResponse.status,
            await sendResponse.text()
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("INSTAGRAM_WEBHOOK_ERROR", error);
    return NextResponse.json({ ok: true });
  }
}