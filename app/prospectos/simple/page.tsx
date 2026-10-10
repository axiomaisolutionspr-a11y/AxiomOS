import { neon } from "@neondatabase/serverless";
import CRMWorkspace from "./CRMWorkspace";
import { Channel, Contact, STAGES, cleanNotes, nextAction, phoneKey, summaryFromNotes } from "../../lib/crm/model";
export const dynamic = "force-dynamic";
export default async function SimpleCRMPage() {
  if (!process.env.DATABASE_URL) return <main style={{padding:32}}><h1>Tu CRM está protegido</h1><p>Esta versión de prueba necesita la conexión del CRM para mostrar tus contactos.</p><a href="/prospectos/demo">Abrir el demo con datos ficticios</a></main>;
  let contacts: Contact[];
  try {
    const sql = neon(process.env.DATABASE_URL);
    const [prospects,calls,whatsapp] = await Promise.all([
      sql`SELECT id::text AS id, prospect_key, caller_name, caller_phone, caller_company, crm_stage, assigned_to, follow_up_at, crm_notes, last_seen_at, last_reviewed_at FROM prospects ORDER BY last_seen_at DESC LIMIT 200`,
      sql`SELECT id::text AS id, prospect_id::text AS prospect_id, created_at, call_summary, call_reason, next_action FROM call_leads WHERE prospect_id IS NOT NULL ORDER BY created_at DESC LIMIT 1000`,
      sql`SELECT id::text AS id, phone, role, message, created_at FROM whatsapp_messages ORDER BY created_at DESC, id DESC LIMIT 1000`,
    ]);
    contacts = prospects.map(p => {
      const reviewed = p.last_reviewed_at ? new Date(p.last_reviewed_at).getTime() : 0;
      const key = phoneKey(p.caller_phone || String(p.prospect_key || "").replace(/^phone:/,""));
      const wa = key ? whatsapp.filter(w=>phoneKey(w.phone)===key) : [];
      const cs = calls.filter(c=>c.prospect_id===p.id);
      const messages = [
        ...wa.map(w=>({id:`wa-${w.id}`,text:String(w.message),at:new Date(w.created_at).toISOString(),incoming:w.role==="user",channel:"WhatsApp" as Channel})),
        ...cs.map(c=>({id:`call-${c.id}`,text:String(c.call_summary || c.call_reason || "Llamada recibida"),at:new Date(c.created_at).toISOString(),incoming:true,channel:"Llamada" as Channel})),
      ].sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
      const notes = String(p.crm_notes || "");
      const contact: Contact = {id:p.id,name:p.caller_name || "Contacto sin identificar",company:p.caller_company || "",phone:p.caller_phone || "",
        stage:STAGES.includes(p.crm_stage) ? p.crm_stage : "Nuevo",assignee:p.assigned_to || "",followUpAt:p.follow_up_at ? new Date(p.follow_up_at).toISOString() : null,
        lastSeenAt:new Date(p.last_seen_at).toISOString(),notes:cleanNotes(notes),request:messages.find(m=>m.incoming)?.text.slice(0,220) || summaryFromNotes(notes),
        nextAction:"",unread:messages.filter(m=>m.incoming && new Date(m.at).getTime()>reviewed).length,
        channel:messages[0]?.channel || "Web",messages:messages.slice(0,30)};
      contact.nextAction = String(cs[0]?.next_action || nextAction(contact));
      return contact;
    });
  } catch {
    contacts = [];
    return loadError();
  }
  return <CRMWorkspace mode="live" initialContacts={contacts} />;
}
function loadError() { return <main style={{padding:32}}><h1>No pudimos cargar tus contactos</h1><p>Puedes continuar en el CRM actual o abrir la demostración.</p><a href="/prospectos">CRM actual</a> · <a href="/prospectos/demo">Ver demo</a></main>; }
