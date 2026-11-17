import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { recoverFailedQaReply } from "../../../lib/whatsapp-recovery-qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// On-demand synthetic QA worker only; production promotion must remove this route.
// Allows recovery without any second inbound webhook. No real network send.
export async function GET(request: NextRequest) {
  const env = process.env;
  const secret = env.AXIOMOS_WHATSAPP_QA_TEST_SECRET;
  const branch = "audit/whatsapp-inbound-outbound-20261116";
  let dbMatches = false;
  try {
    dbMatches = new URL(env.DATABASE_URL || "").hostname.replace("-pooler.", ".")
      === env.AXIOMOS_WHATSAPP_QA_DB_HOST;
  } catch { dbMatches = false; }
  if (!secret || !dbMatches || env.VERCEL_ENV !== "preview" ||
    env.VERCEL_GIT_COMMIT_REF !== branch ||
    env.AXIOMOS_WHATSAPP_DELIVERY_QA_ENABLED !== "true" ||
    env.AXIOMOS_WHATSAPP_DELIVERY_QA_ISOLATED !== "true" ||
    env.AXIOMOS_WHATSAPP_E2E_SIMULATE !== "true") {
    return NextResponse.json({ ok:false, error:"Isolated QA environment required" }, {status:403});
  }
  const expected = createHmac("sha256", secret).update("qa-cert-access-v1").digest("hex");
  const supplied = request.nextUrl.searchParams.get("auth") || "";
  const left = Buffer.from(supplied, "utf8"), right = Buffer.from(expected, "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return NextResponse.json({ok:false,error:"Unauthorized QA worker"}, {status:401});
  }
  const sql = neon(env.DATABASE_URL!);
  const pending = await sql`
    SELECT inbound_message_id
    FROM public.whatsapp_delivery_qa
    WHERE inbound_message_id LIKE 'qa-e2e-worker-%'
      AND state='failed' AND attempts < 3 AND reply_text IS NOT NULL
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    ORDER BY updated_at ASC LIMIT 5
  `;
  let recovered = 0, uncertain = 0, skipped = 0;
  for (const row of pending) {
    const id = String(row.inbound_message_id ?? "");
    const result = await recoverFailedQaReply(sql as ReturnType<typeof neon>,id,async (_reply, attempt) => {
      // A deterministic fake acknowledgement. No Dualhook/Meta request.
      return `qa-provider-mock-${id}-${attempt}`;
    });
    if(result.status==="recovered") recovered++;
    else if(result.status==="unknown") uncertain++;
    else skipped++;
  }
  return NextResponse.json({
    ok:true, source:"isolated_qa_worker", inspected:pending.length,
    recovered,uncertain,skipped,
  },{headers:{"cache-control":"no-store"}});
}
