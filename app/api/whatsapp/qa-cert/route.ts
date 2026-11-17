import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { POST as processWhatsapp } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Synthetic-only certification endpoint. No real outbound APIs or CRM notifications.
// This endpoint intentionally exists only on the isolated audit branch.
export async function GET(request: NextRequest) {
  const secret = process.env.AXIOMOS_WHATSAPP_QA_TEST_SECRET;
  const env = process.env;
  const branch = "audit/whatsapp-inbound-outbound-20261116";
  let safeDb = false;
  try {
    safeDb = new URL(env.DATABASE_URL || "").hostname.replace("-pooler.", ".")
      === env.AXIOMOS_WHATSAPP_QA_DB_HOST;
  } catch { safeDb = false; }
  if (!secret || !safeDb || env.VERCEL_ENV !== "preview" ||
      env.VERCEL_GIT_COMMIT_REF !== branch ||
      env.AXIOMOS_WHATSAPP_DELIVERY_QA_ENABLED !== "true" ||
      env.AXIOMOS_WHATSAPP_DELIVERY_QA_ISOLATED !== "true" ||
      env.AXIOMOS_WHATSAPP_E2E_SIMULATE !== "true") {
    return NextResponse.json({ ok: false, error: "Isolated QA environment required" }, { status: 403 });
  }
  const supplied = request.nextUrl.searchParams.get("auth") ?? "";
  const expected = createHmac("sha256", secret).update("qa-cert-access-v1").digest("hex");
  const left = Buffer.from(supplied, "utf8"), right = Buffer.from(expected, "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return NextResponse.json({ ok: false, error: "Unauthorized QA certification" }, { status: 401 });
  }
  const kind = request.nextUrl.searchParams.get("case");
  const cases: Record<string, { id: string; body: string }> = {
    accepted: { id: "qa-e2e-accepted-20261117", body: "QA_TRIGGER_ACCEPTED" },
    retry: { id: "qa-e2e-retry-20261117", body: "QA_TRIGGER_503" },
    unknown: { id: "qa-e2e-unknown-20261117", body: "QA_TRIGGER_TIMEOUT" },
    worker: { id: "qa-e2e-worker-20261117", body: "QA_TRIGGER_503" },
    status_base: { id: "qa-e2e-status-base-20261117", body: "QA_TRIGGER_ACCEPTED" },
    status_failure_base: { id: "qa-e2e-status-failure-20261117", body: "QA_TRIGGER_ACCEPTED" },
    status_early_base: { id: "qa-e2e-status-early-20261117", body: "QA_TRIGGER_ACCEPTED" }
  };
  const receiptCases: Record<string, { source: string; status: string; timestamp: string }> = {
    receipt_sent: { source: "status-base", status: "sent", timestamp: "1794921000" },
    receipt_delivered: { source: "status-base", status: "delivered", timestamp: "1794921020" },
    receipt_read: { source: "status-base", status: "read", timestamp: "1794921030" },
    receipt_late_sent: { source: "status-base", status: "sent", timestamp: "1794920990" },
    receipt_failed: { source: "status-failure", status: "failed", timestamp: "1794921040" },
    receipt_early: { source: "status-early", status: "delivered", timestamp: "1794921025" }
  };
  if (!kind || !(cases[kind] || receiptCases[kind])) {
    return NextResponse.json({ ok: false, error: "Invalid QA case" }, { status: 400 });
  }
  const fixture = cases[kind];
  const receipt = receiptCases[kind];
  const value = receipt
    ? {
        messaging_product: "whatsapp",
        metadata: { phone_number_id: "qa-e2e-phone" },
        statuses: [{
          id: `qa-provider-ack-qa-e2e-${receipt.source}-20261117`,
          status: receipt.status, timestamp: receipt.timestamp,
          recipient_user_id: "qa-e2e-recipient",
          ...(receipt.status === "failed" ? { errors: [{ code: 131036 }] } : {})
        }]
      }
    : {
        messaging_product: "whatsapp",
        metadata: { phone_number_id: "qa-e2e-phone" },
        contacts: [{ user_id: "qa-e2e-recipient" }],
        messages: [{
          id: fixture.id, from_user_id: "qa-e2e-recipient",
          timestamp: "1794910000", type: "text", text: { body: fixture.body }
        }]
      };
  const event = {
    object: "whatsapp_business_account",
    entry: [{ id: "qa-e2e-waba", changes: [{ field: "messages", value }] }]
  };
  const raw = JSON.stringify(event);
  const signature = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const internal = new NextRequest(new URL("/api/whatsapp", request.url), {
    method: "POST", headers: { "content-type": "application/json", "x-hub-signature-256": signature },
    body: raw
  });
  const response = await processWhatsapp(internal);
  const result = await response.json();
  return NextResponse.json({
    ok: result?.ok === true && Array.isArray(result?.errors) && result.errors.length === 0,
    case: kind, inboundMessageId: fixture?.id ?? null,
    acceptedByWebhook: result?.messagesReceived === 1,
    repliesSent: result?.repliesSent ?? 0,
    processingErrorCount: Array.isArray(result?.errors) ? result.errors.length : -1,
    // Deliberately omit sensitive error strings, input messages and recipient identity.
  }, { status: 200, headers: { "cache-control": "no-store" } });
}
