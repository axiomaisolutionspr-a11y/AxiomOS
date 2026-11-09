import { redirect } from "next/navigation";
import { recordFollowupReview } from "./review-actions";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../lib/commercial-identity";
export const dynamic = "force-dynamic";
type Item = {item_id:string;prospect_ref:string;channel:string;purpose:string;status:string;scheduled_for:string;review_reason:string};
export default async function FollowupReviewPage({searchParams}:{searchParams:Promise<{ok?:string;error?:string}>}) {
  const sql = commercialIdentityDatabase(), auth = commercialIdentityAuth();
  if (!sql || !auth) return <main className="p-8"><h1>Revisión no disponible</h1></main>;
  const {data,error} = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let member;
  try { member = await commercialMember(sql,data.user.id); }
  catch { return <main className="p-8">No se pudo verificar tu permiso.</main>; }
  if (!member) return <main className="p-8">No tienes acceso a esta empresa.</main>;
  if (process.env.AXIOMOS_FOLLOWUP_QUEUE_REVIEW_ENABLED !== "true" || process.env.VERCEL_ENV !== "production") {
    return <main className="p-8"><h1>Revisión de seguimientos</h1><p>Función en pruebas, sin envíos habilitados.</p></main>;
  }
  let rows: Item[] = [];
  try {
    const result = await sql`SELECT item_id,prospect_ref,channel,purpose,status,scheduled_for,review_reason
      FROM axiomos_commercial.followup_review_dashboard WHERE tenant_id='axiomai'
      ORDER BY scheduled_for,item_id LIMIT 50`;
    rows = result.filter(r => /^\d{1,18}$/.test(String(r.item_id)) && /^\d{1,18}$/.test(String(r.prospect_ref)) &&
       ["needs_review","blocked","cancelled"].includes(String(r.status)) &&
       !Number.isNaN(Date.parse(String(r.scheduled_for))))
      .map(r => ({item_id:String(r.item_id),prospect_ref:String(r.prospect_ref),channel:String(r.channel),
        purpose:String(r.purpose),status:String(r.status),scheduled_for:String(r.scheduled_for),review_reason:String(r.review_reason)}));
  } catch (e) {
    console.error("FOLLOWUP_QUEUE_REVIEW_UNAVAILABLE",(e as {code?:string})?.code ?? "unknown");
    return <main className="p-8"><h1>Revisión temporalmente no disponible</h1><p>No se ha enviado ningún mensaje.</p></main>;
  }
  const feedback = await searchParams;
  return <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
    <div className="mx-auto max-w-5xl">
      <p className="font-semibold text-blue-700">AxiomOS Autopilot · Axira</p>
      <h1 className="mt-2 text-3xl font-bold">Propuestas de seguimiento</h1>
      {feedback.ok && <p role="status" className="mt-2 rounded bg-green-100 p-3">{feedback.ok}</p>}
      {feedback.error && <p role="alert" className="mt-2 rounded bg-red-100 p-3">{feedback.error}</p>}
      <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4">Revisión solamente. Ninguna acción envía WhatsApp, SMS, correos ni llamadas; es obligatorio verificar consentimiento y contexto antes de autorizar un envío futuro.</p>
      <p className="my-5 font-medium">Solicitudes visibles: {rows.length} · {member.role === "owner" ? "Propietario" : "Solo lectura"}</p>
      {rows.length === 0 ? <p>No hay borradores pendientes.</p> : <div className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="p-3">Referencia</th><th className="p-3">Canal</th><th className="p-3">Fecha PR</th><th className="p-3">Estado</th><th className="p-3">Motivo</th>{member.role==="owner"&&<th className="p-3">Decisión sin envío</th>}</tr></thead>
      <tbody>{rows.map(item => <tr key={item.item_id} className="border-b"><td className="p-3">#{item.prospect_ref}</td><td className="p-3">{item.channel}</td><td className="p-3">{new Intl.DateTimeFormat("es-PR",{timeZone:"America/Puerto_Rico",dateStyle:"medium",timeStyle:"short"}).format(new Date(item.scheduled_for))}</td><td className="p-3">{item.status}</td><td className="p-3">{item.review_reason}</td>{member.role==="owner"&&<td className="p-3"><form action={recordFollowupReview} className="grid gap-1"><input type="hidden" name="itemId" value={item.item_id}/><select name="decision" required defaultValue=""><option value="" disabled>Selecciona</option><option value="reviewed_only">Revisado (NO enviar)</option><option value="blocked">Bloquear contacto</option></select><input name="confirmation" required placeholder="Escribe REGISTRAR" className="border p-1"/><button className="rounded bg-blue-800 p-2 text-white">Registrar decisión</button></form></td>}</tr>)}</tbody></table></div>}
      <p className="mt-5 text-sm text-slate-600">Sin datos de contacto, texto del mensaje ni controles de envío. <a className="underline" href="/prospectos/autopilot">Regresar a Autopilot</a>.</p>
    </div>
  </main>;
}
