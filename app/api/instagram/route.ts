import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { POST as askBrain } from "../brain/route";
import {
  instagramSignatureSecrets,
  verifyInstagramSignature,
} from "../../lib/instagram-signature.mjs";
import {
  buildSocialProspect,
  saveSocialProspect,
} from "../../lib/social-prospect.mjs";

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

// Guarda el prospecto en el CRM. Un fallo aquí nunca bloquea la respuesta.
async function registerInstagramProspect(
  senderId: string,
  messageId: string | undefined,
  text: string,
  reply: string | null
) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("INSTAGRAM_PROSPECT_SKIPPED", "Falta DATABASE_URL");
    return;
  }

  try {
    await saveSocialProspect(
      neon(databaseUrl),
      buildSocialProspect({
        channel: "instagram",
        senderId,
        messageId,
        text,
        reply,
      })
    );
  } catch (error) {
    console.error(
      "INSTAGRAM_PROSPECT_ERROR",
      error instanceof Error ? error.name : "UnknownError"
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const rawBody = await request.text();
    const check = verifyInstagramSignature(
      rawBody,
      signature,
      instagramSignatureSecrets()
    );

    if (!check.valid) {
      // Never log secret values or the body; only the reason.
      console.warn("instagram_webhook_rejected", { reason: check.reason });
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
              mode: "social",
              channel: "instagram",
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
          await registerInstagramProspect(
            senderId,
            event.message?.mid,
            text.trim(),
            null
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

        await registerInstagramProspect(
          senderId,
          event.message?.mid,
          text.trim(),
          brainData.result.slice(0, 1000)
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("INSTAGRAM_WEBHOOK_ERROR", error);
    return NextResponse.json({ ok: true });
  }
}