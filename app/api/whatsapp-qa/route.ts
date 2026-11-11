import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { POST as answerWithAxira } from "../brain/route";
import { qaTextMessages } from "../../lib/whatsapp-qa-events.mjs";
import { claimQaMessage } from "../../lib/whatsapp-qa-claim.mjs";
import { dispatchQaFollowup, recordQaDeliveryStatus, sendAutomaticQaReply, sendAuthorizedQaReply } from "./delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 128 * 1024;
const QA_SCHEMA = "axiomos_qa_ingress_scope";
const QA_TABLE = "meta_whatsapp_webhook_events";

function constantTimeMatches(expected: string, supplied: string | null): boolean {
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(supplied, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function validSignature(rawBody: string, supplied: string | null, secret: string): boolean {
  if (!supplied || !/^sha256=[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return constantTimeMatches(expected, supplied);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value);
  return /^\d{1,64}$/.test(text) ? text : null;
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? Math.min(value.length, 100) : 0;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const expected = process.env.META_WA_QA_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    expected &&
    constantTimeMatches(expected, token) &&
    challenge &&
    challenge.length <= 512
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({ ok: false }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const secret = process.env.META_WA_QA_APP_SECRET;
  const databaseUrl = process.env.AXIOMOS_AUTOPILOT_WA_QA_DATABASE_URL;
  const expectedHost = process.env.AXIOMOS_AUTOPILOT_WA_QA_DATABASE_HOST;

  if (!secret || !databaseUrl || !expectedHost) {
    return NextResponse.json({ ok: false, error: "QA webhook unavailable" }, { status: 503 });
  }

  if (request.headers.get("x-axiomos-qa-delivery") === "one-time-reply") {
    try {
      return await sendAuthorizedQaReply(request, new URL(databaseUrl));
    } catch {
      return NextResponse.json({ ok: false, error: "QA delivery could not be confirmed" }, { status: 503 });
    }
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  if (!validSignature(rawBody, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = asRecord(JSON.parse(rawBody));
    if (!parsed) throw new Error("invalid payload");
    payload = parsed;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    return NextResponse.json({ ok: true, accepted: 0 });
  }

  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "QA database unavailable" }, { status: 503 });
  }

  if (
    parsedDatabaseUrl.hostname !== expectedHost ||
    !parsedDatabaseUrl.hostname.endsWith(".neon.tech")
  ) {
    return NextResponse.json({ ok: false, error: "QA database guard rejected host" }, { status: 503 });
  }

  const eventId = createHash("sha256").update(rawBody).digest("hex");
  const sql = neon(databaseUrl);
  const records: Array<{
    wabaId: string | null;
    phoneNumberId: string | null;
    field: string;
    messageCount: number;
    statusCount: number;
  }> = [];

  for (const rawEntry of payload.entry) {
    const entry = asRecord(rawEntry);
    const wabaId = safeId(entry?.id);
    if (!Array.isArray(entry?.changes)) continue;

    for (const rawChange of entry.changes) {
      const change = asRecord(rawChange);
      const field = typeof change?.field === "string" ? change.field.slice(0, 80) : "";
      if (field !== "messages") continue;

      const value = asRecord(change?.value);
      const metadata = asRecord(value?.metadata);
      const phoneNumberId = safeId(metadata?.phone_number_id);
      await recordQaDeliveryStatus(sql, parsedDatabaseUrl, wabaId, phoneNumberId, value);
      records.push({
        wabaId,
        phoneNumberId,
        field,
        messageCount: countArray(value?.messages),
        statusCount: countArray(value?.statuses),
      });
    }
  }

  if (records.length === 0) {
    return NextResponse.json({ ok: true, accepted: 0 });
  }

  for (const record of records) {
    await sql`
      INSERT INTO axiomos_qa_ingress_scope.meta_whatsapp_webhook_events
        (event_id, waba_id, phone_number_id, field, message_count, status_count)
      VALUES
        (${eventId}, ${record.wabaId}, ${record.phoneNumberId}, ${record.field},
         ${record.messageCount}, ${record.statusCount})
      ON CONFLICT (event_id) DO NOTHING
    `;
  }

  // Default off. Processing is restricted to the dedicated Preview and the
  // verified test sender, WABA and phone-number ID. A reply requires a single-use QA grant.
  if (process.env.META_WA_QA_PROCESS_TEXT === "true") {
    if (process.env.VERCEL_ENV !== "preview" ||
        process.env.VERCEL_GIT_COMMIT_REF !== "feature/axiomos-whatsapp-meta-qa-20261110" ||
        parsedDatabaseUrl.hostname !== "ep-polished-fire-avorljs7-pooler.c-11.us-east-1.aws.neon.tech" ||
        parsedDatabaseUrl.username !== "axiomos_wa_qa_ingress" ||
        process.env.AXIRA_OFFERS_QA_ENABLED === "true") {
      return NextResponse.json({ ok: false, error: "QA isolation guard rejected configuration" }, { status: 503 });
    }
    const config = {
      wabaId: process.env.META_WA_QA_WABA_ID ?? "",
      phoneNumberId: process.env.META_WA_QA_PHONE_ID ?? "",
      recipient: process.env.META_WA_QA_ALLOWED_SENDER ?? "",
    };
    if (!/^\d{1,64}$/.test(config.wabaId) || !/^\d{1,64}$/.test(config.phoneNumberId) ||
        !/^\d{8,20}$/.test(config.recipient)) {
      return NextResponse.json({ ok: false, error: "QA test identifiers unavailable" }, { status: 503 });
    }
    for (const message of qaTextMessages(payload, config)) {
      if (await dispatchQaFollowup(sql, parsedDatabaseUrl, message)) continue;
      const hash = createHash("sha256").update(message.id).digest("hex");
      const attempt = randomUUID();
      if (!await claimQaMessage(sql, hash, attempt)) {
        const rows = await sql`SELECT state FROM axiomos_qa_ingress_scope.meta_whatsapp_qa_processing WHERE message_hash = ${hash}`;
        if (rows[0]?.state !== "completed") {
          return NextResponse.json({ ok: false, error: "QA message processing pending" }, { status: 503 });
        }
        await sendAutomaticQaReply(sql, parsedDatabaseUrl, message, hash);
        continue;
      }
      try {
        const answer = await answerWithAxira(new Request("https://localhost/api/brain", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: message.text, channel: "whatsapp" }),
        }));
        const body = await answer.json() as { result?: unknown };
        if (!answer.ok || typeof body.result !== "string" || !body.result.trim() || body.result.length > 4000) {
          throw new Error("QA response unavailable");
        }
        await sql`UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing SET state = 'completed', reply = ${body.result}, updated_at = now() WHERE message_hash = ${hash} AND state = 'processing' AND attempt_id = ${attempt}`;
      } catch {
        await sql`UPDATE axiomos_qa_ingress_scope.meta_whatsapp_qa_processing SET state = 'failed', updated_at = now() WHERE message_hash = ${hash} AND state = 'processing' AND attempt_id = ${attempt}`;
        return NextResponse.json({ ok: false, error: "QA processing failed" }, { status: 503 });
      }
      await sendAutomaticQaReply(sql, parsedDatabaseUrl, message, hash);
    }
  }

  return NextResponse.json({ ok: true, accepted: records.length });
}
