import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { hasDemoSession, isSameOrigin } from "../../lib/demo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeadInput = { id: string; industry: string; name: string; contact: string; need: string; channel: string; status: string; priority: string; nextAction: string; messages: Array<{ id: string; by: string; text: string }> };
const industries = ["dealer", "restaurant", "optica"];
const statuses = ["Nuevo", "Contactar", "Cita solicitada", "Ganado"];
const priorities = ["Alta", "Media"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const simulatedContact = /^787-555-[0-9]{4}$/;
function response(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
function db() {
 const connection = process.env.AXIOMAI_DEMO_QA_DATABASE_URL;
 if (!connection) return null;
 try {
  const u = new URL(connection);
  if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") return null;
  if (u.pathname !== "/axiomai_demo_comercial_qa" || u.username !== "axiomai_demo_qa_writer" || !u.hostname.endsWith(".neon.tech")) return null;
  return neon(connection);
 } catch { return null; }
}
function validate(data: unknown): data is LeadInput {
 if (!data || typeof data !== "object") return false;
 const x = data as Partial<LeadInput>;
 return typeof x.id === "string" && uuid.test(x.id)
  && typeof x.industry === "string" && industries.includes(x.industry)
  && typeof x.name === "string" && x.name.length > 0 && x.name.length <= 90 && /fictici[oa]/i.test(x.name)
  && typeof x.contact === "string" && simulatedContact.test(x.contact)
  && typeof x.need === "string" && x.need.length <= 500
  && typeof x.channel === "string" && x.channel.length <= 90 && x.channel.includes("simulado")
  && typeof x.status === "string" && statuses.includes(x.status)
  && typeof x.priority === "string" && priorities.includes(x.priority)
  && typeof x.nextAction === "string" && x.nextAction.length <= 200
  && Array.isArray(x.messages) && x.messages.length > 0 && x.messages.length <= 12
  && x.messages.every(m => !!m && typeof m.id === "string" && uuid.test(m.id) && ["cliente", "axira"].includes(m.by) && typeof m.text === "string" && m.text.length <= 500);
}
export async function GET() {
 if (!(await hasDemoSession())) return response({ error: "Acceso al demo requerido" }, 401);
 const sql = db(); if (!sql) return response({ error: "Demo QA no configurado" }, 503);
 try {
  const rows = await sql`SELECT id,industry,name,contact,need,channel,status,priority,next_action AS "nextAction",messages,created_at AS created FROM public.demo_leads ORDER BY created_at DESC LIMIT 100`;
  return response({ leads: rows });
 } catch { return response({ error: "No se pudo consultar Neon QA" }, 503); }
}
export async function POST(request: Request) {
 if (!(await hasDemoSession())) return response({ error: "Acceso al demo requerido" }, 401);
 if (!isSameOrigin(request)) return response({ error: "Origen no autorizado" }, 403);
 if (!request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "Formato no permitido" }, 415);
 const sql = db(); if (!sql) return response({ error: "Demo QA no configurado" }, 503);
 try {
  const raw = await request.text(); if (raw.length > 12000) return response({ error: "Solicitud demasiado grande" }, 413);
  const data: unknown = JSON.parse(raw); if (!validate(data)) return response({ error: "Solamente se permiten registros ficticios de demostración" }, 400);
  const l = data;
  const rows = await sql`INSERT INTO public.demo_leads(id,industry,name,contact,need,channel,status,priority,next_action,messages)
   VALUES (${l.id},${l.industry},${l.name},${l.contact},${l.need},${l.channel},${l.status},${l.priority},${l.nextAction},${JSON.stringify(l.messages)}::jsonb)
   ON CONFLICT (id) DO NOTHING RETURNING id`;
  const created = rows.length === 1;
  return response({ success: created, created }, created ? 201 : 409);
 } catch { return response({ error: "No se pudo guardar el registro de prueba" }, 503); }
}
export async function PATCH(request: Request) {
 if (!(await hasDemoSession())) return response({ error: "Acceso al demo requerido" }, 401);
 if (!isSameOrigin(request)) return response({ error: "Origen no autorizado" }, 403);
 if (!request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "Formato no permitido" }, 415);
 const sql = db(); if (!sql) return response({ error: "Demo QA no configurado" }, 503);
 try {
  const raw = await request.text(); if (raw.length > 1000) return response({ error: "Solicitud demasiado grande" }, 413);
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object") return response({ error: "Solicitud inválida" }, 400);
  const { id, status } = data as { id?: unknown; status?: unknown };
  if (typeof id !== "string" || !uuid.test(id) || typeof status !== "string" || !statuses.includes(status)) return response({ error: "Estado inválido" }, 400);
  const rows = await sql`UPDATE public.demo_leads SET status = ${status} WHERE id = ${id} RETURNING id`;
  return response({ success: rows.length === 1 }, rows.length ? 200 : 404);
 } catch { return response({ error: "No se pudo actualizar Neon QA" }, 503); }
}
