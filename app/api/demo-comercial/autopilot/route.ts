import { NextResponse } from "next/server";
import { hasDemoSession, isSameOrigin } from "../../../lib/demo-auth";
import { demoQaDatabase } from "../../../lib/demo-qa-db";

// Autopilot v3 del DEMO: responsable, seguimiento, transferencia y bitácora en Neon QA.
// Solo escribe en tablas QA del DEMO. No contacta proveedores ni envía mensajes.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const kinds = ["clasificar", "crear_oportunidad", "asignar_vendedor", "programar_seguimiento", "borrador_respuesta", "transferir_humano", "avanzar_etapa", "enviar_mensaje", "confirmar_cita", "cobrar"];
const outcomes = ["ejecutada", "aprobada", "descartada", "bloqueada", "error"];
const sellers = ["s1", "s2", "s3"];

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

type EventInput = { id: string; leadId: string; actionKey: string; kind: string; title: string; detail: string; outcome: string; actor: string };
type OpsInput = { sellerId?: string | null; followupDue?: string | null; handoffSeller?: string | null };

function validEvent(x: unknown): x is EventInput {
  if (!x || typeof x !== "object") return false;
  const e = x as Partial<EventInput>;
  return typeof e.id === "string" && uuid.test(e.id)
    && typeof e.leadId === "string" && uuid.test(e.leadId)
    && typeof e.actionKey === "string" && e.actionKey.length >= 1 && e.actionKey.length <= 200 && e.actionKey.startsWith(e.leadId + ":")
    && typeof e.kind === "string" && kinds.includes(e.kind)
    && typeof e.title === "string" && e.title.length >= 1 && e.title.length <= 120
    && typeof e.detail === "string" && e.detail.length <= 700
    && typeof e.outcome === "string" && outcomes.includes(e.outcome)
    && (e.actor === "Axira" || e.actor === "Persona");
}
function validOps(x: unknown): x is OpsInput {
  if (x === undefined) return true;
  if (!x || typeof x !== "object") return false;
  const o = x as OpsInput;
  const okSeller = (v: unknown) => v === undefined || v === null || (typeof v === "string" && sellers.includes(v));
  const okDate = o.followupDue === undefined || o.followupDue === null || (typeof o.followupDue === "string" && o.followupDue.length <= 40 && Number.isFinite(Date.parse(o.followupDue)));
  return okSeller(o.sellerId) && okSeller(o.handoffSeller) && okDate;
}

export async function GET() {
  if (!(await hasDemoSession())) return response({ error: "Acceso al demo requerido" }, 401);
  const sql = demoQaDatabase(); if (!sql) return response({ error: "Demo QA no configurado" }, 503);
  try {
    const [ops, events] = await Promise.all([
      sql`SELECT lead_id AS "leadId", seller_id AS "sellerId", followup_due AS "followupDue", handoff_seller AS "handoffSeller" FROM public.demo_lead_ops`,
      sql`SELECT e.id, e.lead_id AS "leadId", l.name AS "leadName", e.at, e.action_key AS "actionKey", e.kind, e.title, e.detail, e.outcome, e.actor
          FROM public.demo_autopilot_events e JOIN public.demo_leads l ON l.id = e.lead_id ORDER BY e.at DESC LIMIT 200`,
    ]);
    return response({ ops, events });
  } catch { return response({ error: "No se pudo consultar Neon QA" }, 503); }
}

export async function POST(request: Request) {
  if (!(await hasDemoSession())) return response({ error: "Acceso al demo requerido" }, 401);
  if (!isSameOrigin(request)) return response({ error: "Origen no autorizado" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "Formato no permitido" }, 415);
  const sql = demoQaDatabase(); if (!sql) return response({ error: "Demo QA no configurado" }, 503);
  try {
    const raw = await request.text(); if (raw.length > 4000) return response({ error: "Solicitud demasiado grande" }, 413);
    const body: unknown = JSON.parse(raw);
    const { event, ops } = (body && typeof body === "object" ? body : {}) as { event?: unknown; ops?: unknown };
    if (!validEvent(event) || !validOps(ops)) return response({ error: "Evento inválido" }, 400);
    const e = event;
    let rows: Array<Record<string, unknown>>;
    const o = (ops ?? {}) as OpsInput;
    if (ops && e.outcome !== "error" && e.outcome !== "descartada" && e.outcome !== "bloqueada") {
      // Una sola sentencia: la operación solo se aplica si el evento es nuevo. Todo o nada.
      rows = await sql`WITH ins AS (
          INSERT INTO public.demo_autopilot_events(id, lead_id, action_key, kind, title, detail, outcome, actor)
          VALUES (${e.id}, ${e.leadId}, ${e.actionKey}, ${e.kind}, ${e.title}, ${e.detail}, ${e.outcome}, ${e.actor})
          ON CONFLICT DO NOTHING RETURNING id, lead_id),
        up AS (
          INSERT INTO public.demo_lead_ops(lead_id, seller_id, followup_due, handoff_seller)
          SELECT lead_id, ${o.sellerId ?? null}::text, ${o.followupDue ?? null}::timestamptz, ${o.handoffSeller ?? null}::text FROM ins
          ON CONFLICT (lead_id) DO UPDATE SET
            seller_id = COALESCE(EXCLUDED.seller_id, demo_lead_ops.seller_id),
            followup_due = COALESCE(EXCLUDED.followup_due, demo_lead_ops.followup_due),
            handoff_seller = COALESCE(EXCLUDED.handoff_seller, demo_lead_ops.handoff_seller),
            updated_at = now()
          RETURNING lead_id)
        SELECT id FROM ins` as Array<Record<string, unknown>>;
    } else {
      rows = await sql`INSERT INTO public.demo_autopilot_events(id, lead_id, action_key, kind, title, detail, outcome, actor)
        VALUES (${e.id}, ${e.leadId}, ${e.actionKey}, ${e.kind}, ${e.title}, ${e.detail}, ${e.outcome}, ${e.actor})
        ON CONFLICT DO NOTHING RETURNING id` as Array<Record<string, unknown>>;
    }
    // 409: otra sesión ya resolvió esta misma acción (índice único). El cliente se resincroniza.
    return rows.length === 1 ? response({ saved: true }, 201) : response({ saved: false, duplicate: true }, 409);
  } catch { return response({ error: "No se pudo guardar en Neon QA" }, 503); }
}
