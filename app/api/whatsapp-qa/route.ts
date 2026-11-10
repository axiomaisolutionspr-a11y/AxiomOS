import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

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
      records.push({
        wabaId,
        phoneNumberId: safeId(metadata?.phone_number_id),
        field,
        messageCount: countArray(value?.messages),
        statusCount: countArray(value?.statuses),
      });
    }
  }

  if (records.length === 0) {
    return NextResponse.json({ ok: true, accepted: 0 });
  }

  const sql = neon(databaseUrl);
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

  return NextResponse.json({ ok: true, accepted: records.length });
}
