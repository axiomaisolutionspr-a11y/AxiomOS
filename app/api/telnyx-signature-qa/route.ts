import { verifyTelnyxWebhook } from "../../lib/telnyx-webhook-auth.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Isolated verification endpoint: never reads a database or executes actions.
export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.AXIOMOS_TELNYX_SIGNATURE_PROBE_QA !== "true") {
    return new Response(null, { status: 404 });
  }
  const publicKey = process.env.TELNYX_WEBHOOK_PUBLIC_KEY_QA;
  if (!publicKey) return Response.json({ verified: false }, { status: 503 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 65536) return new Response(null, { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > 65536) return new Response(null, { status: 413 });
  const raw = new TextDecoder("utf-8", { fatal: true });
  let body: string;
  try { body = raw.decode(bytes); } catch { return new Response(null, { status: 400 }); }
  const verified = verifyTelnyxWebhook(body, request.headers, publicKey);
  return Response.json({ verified }, { status: verified ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
