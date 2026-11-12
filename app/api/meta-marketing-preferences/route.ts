import { neon } from "@neondatabase/serverless";
import { marketingPreferenceEvents, matchesWebhookSecret, validWebhookSignature } from "../../lib/meta-marketing-preferences.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxBytes = 128 * 1024;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const challenge = params.get("hub.challenge");
  if (params.get("hub.mode") !== "subscribe" || !challenge || !/^\d{1,100}$/.test(challenge) ||
      !matchesWebhookSecret(process.env.META_PREFERENCES_VERIFY_TOKEN, params.get("hub.verify_token"))) {
    return new Response(null, { status: 403 });
  }
  return new Response(challenge, { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}

function settings() {
  const { META_PREFERENCES_APP_SECRET: secret, META_PREFERENCES_CONTACT_KEY_SECRET: contactKeySecret,
    META_PREFERENCES_WABA_ID: wabaId, META_PREFERENCES_PHONE_ID: phoneId,
    META_PREFERENCES_DATABASE_URL: databaseUrl, META_PREFERENCES_DATABASE_HOST: host } = process.env;

  if (!secret || !contactKeySecret || contactKeySecret.length < 32 || secret === contactKeySecret ||
      !wabaId || !phoneId || !databaseUrl || !host) return null;
  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== host ||
        !url.hostname.endsWith(".neon.tech") || url.username !== "axiomos_meta_preferences_ingress" ||
        !url.password) return null;
  } catch {
    return null;
  }
  return { secret, contactKeySecret, wabaId, phoneId, databaseUrl };
}

export async function POST(request: Request) {
  const config = settings();
  if (!config) return new Response(null, { status: 503 });
  if (!request.body) return new Response(null, { status: 400 });

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        return new Response(null, { status: 413 });
      }
      chunks.push(chunk.value);
    }
  } catch {
    return new Response(null, { status: 400 });
  } finally {
    reader.releaseLock();
  }

  const bytes = Buffer.concat(chunks, size);
  if (!validWebhookSignature(bytes, request.headers.get("x-hub-signature-256"), config.secret)) {
    return new Response(null, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch {
    return new Response(null, { status: 400 });
  }

  const events = marketingPreferenceEvents(payload, config);
  if (events.length) {
    try {
      const sql = neon(config.databaseUrl);
      await sql`SELECT axiomos_meta_preferences.record_events(${JSON.stringify(events)}::jsonb)`;
    } catch {
      return new Response(null, { status: 503 });
    }
  }
  return Response.json({ ok: true });
}
