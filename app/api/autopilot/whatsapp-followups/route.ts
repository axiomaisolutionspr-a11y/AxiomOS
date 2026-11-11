import { neon } from "@neondatabase/serverless";
import { isFollowupCronAuthorized, runWhatsAppFollowup, whatsappFollowupWorkerSettings } from "../../../lib/whatsapp-followup-worker.mjs";
import { sendWhatsAppFollowupTemplate } from "../../../prospectos/autopilot/seguimientos/simulacion-whatsapp/pilot-provider";
import { checkWhatsAppFollowupProvider } from "../../../prospectos/autopilot/seguimientos/simulacion-whatsapp/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 35;

function respond(outcome: string, status = 200) {
  return Response.json({ outcome }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (request.method !== "GET") return respond("method_not_allowed", 405);
  if (!isFollowupCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return respond("unauthorized", 401);
  }
  const settings = whatsappFollowupWorkerSettings(process.env);
  if (!settings) return respond("disabled");

  try {
    const sql = neon(settings.databaseUrl);
    const outcome = await runWhatsAppFollowup({
      verifyProvider: () => checkWhatsAppFollowupProvider(),
      claim: async () => {
        const rows = await sql.query("SELECT * FROM axiomos_commercial.claim_whatsapp_followup()", [], {
          fetchOptions: { signal: AbortSignal.timeout(5000) },
        }) as Array<{ claim_id: string; recipient: string }>;
        return rows[0];
      },
      send: (recipient) => sendWhatsAppFollowupTemplate({ key: settings.key, phoneId: settings.phoneId, recipient }),
      finish: async (claim, result) => {
        const [row] = await sql.query("SELECT axiomos_commercial.finish_whatsapp_followup($1::uuid,$2,$3) AS saved",
          [claim, result.outcome, result.providerId], { fetchOptions: { signal: AbortSignal.timeout(5000) } });
        return row?.saved === true;
      },
    });
    if (["provider_unavailable", "audit_unavailable", "unknown", "held", "rejected"].includes(outcome)) {
      console.error("WHATSAPP_FOLLOWUP_WORKER", outcome);
    }
    return respond(outcome, ["provider_unavailable", "audit_unavailable"].includes(outcome) ? 503 : 200);
  } catch {
    console.error("WHATSAPP_FOLLOWUP_WORKER", "unavailable");
    return respond("unavailable", 503);
  }
}
