"use server";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { qaHandoffEnabled, qaHandoffPhone } from "../../lib/qa-handoff";
import { sendAdvisorMessage } from "../../lib/whatsapp-advisor-send";
import { deliverAdvisorWhatsApp } from "../../lib/whatsapp-advisor-transport";

export async function handoffAction(action: string, id: string, name: string, token: string, message: string) {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const expected = pin && createHash("sha256").update("axiomos-crm:" + pin).digest("hex");
  if (!qaHandoffEnabled() || !expected || (await cookies()).get("axiomos_crm_session")?.value !== expected)
    throw new Error("Acceso restringido");
  const sql = neon(process.env.DATABASE_URL!);
  const [contact] = await sql`SELECT id FROM prospects WHERE id::text=${id} AND prospect_key=${"phone:"+qaHandoffPhone.slice(-10)}`;
  if (!contact) throw new Error("Contacto QA no encontrado");
  if (action === "take" && ["Alex","Rolando"].includes(name)) {
    const key = randomUUID();
    const rows = await sql`INSERT INTO axira_qa_handoff VALUES (${qaHandoffPhone},${name},${key}) ON CONFLICT DO NOTHING RETURNING phone`;
    if (rows.length) return {token:key, status:"Turno de "+name};
  } else if (action === "recover" && ["Alex","Rolando"].includes(name)) {
    const key = randomUUID();
    const rows = await sql`UPDATE axira_qa_handoff SET token=${key}
      WHERE phone=${qaHandoffPhone} AND owner_name=${name} RETURNING phone`;
    if (rows.length) return {token:key, status:"Turno recuperado de "+name};
  } else if (action === "release") {
    const rows = await sql`DELETE FROM axira_qa_handoff WHERE phone=${qaHandoffPhone} AND token=${token} RETURNING phone`;
    if (rows.length) return {token:"",status:"Axira retomó el turno"};
  } else if (action === "send-live" && message.trim() && message.length <= 4000) {
    // Multiple explicit gates: this QA-only switch must never work with the
    // fictional handoff contact or without a provider-verified inbound time.
    if (process.env.AXIRA_ADVISOR_LIVE_SEND_ENABLED !== "true" ||
        process.env.AXIRA_ADVISOR_TEST_RECIPIENTS?.split(",").map(x=>x.trim()).includes(qaHandoffPhone) !== true ||
        qaHandoffPhone === "12025550118") {
      return {token,status:"Envío real desactivado. QA usa un contacto ficticio."};
    }
    const [row] = await sql`SELECT m.conversation_key, m.phone, i.provider_timestamp
      FROM axira_qa_handoff h
      JOIN LATERAL (SELECT conversation_key,phone FROM whatsapp_messages
        WHERE phone=h.phone AND role='user' ORDER BY id DESC LIMIT 1) m ON true
      JOIN LATERAL (SELECT provider_timestamp FROM axira_advisor_inbound_verified
        WHERE phone=h.phone ORDER BY provider_timestamp DESC LIMIT 1) i ON true
      WHERE h.phone=${qaHandoffPhone} AND h.owner_name=${name} AND h.token=${token}`;
    if(!row) return {token,status:"No hay un turno propio o un mensaje entrante verificado."};
    const result=await sendAdvisorMessage(sql,{
      requestId:randomUUID(),conversationKey:String(row.conversation_key),
      recipient:String(row.phone),recipientKind:"phone",text:message.trim(),advisor:name,
      inboundAt:new Date(row.provider_timestamp)
    },async input=>deliverAdvisorWhatsApp({kind:input.recipientKind,value:input.recipient},input.text));
    const labels={accepted:"WhatsApp aceptó el mensaje; entrega aún sin confirmar.",
      uncertain:"Resultado incierto; no reintentar automáticamente.",
      window_closed:"Ventana de 24 horas cerrada: se requiere plantilla aprobada.",
      invalid:"Mensaje inválido.",already_processed:"Mensaje ya procesado."};
    return {token,status:labels[result.state]};
  } else if (action === "send" && message.trim() && message.length <= 4000) {
    // A QA draft is not a WhatsApp delivery. Never insert it into the
    // conversation history as an assistant message.
    const rows = await sql`INSERT INTO axira_advisor_outbound
      (request_id, conversation_key, recipient, recipient_kind, body, advisor, state)
      SELECT ${randomUUID()}::uuid, m.conversation_key, h.phone, 'phone',
        ${message.trim()}, h.owner_name, 'draft'
      FROM axira_qa_handoff h
      JOIN LATERAL (SELECT conversation_key FROM whatsapp_messages
        WHERE phone=h.phone AND role='user' ORDER BY id DESC LIMIT 1) m ON true
      WHERE h.phone=${qaHandoffPhone} AND h.token=${token} AND h.owner_name=${name}
      RETURNING request_id`;
    if (rows.length) return {token,status:"Borrador QA guardado. No enviado por WhatsApp."};
  }
  const [turn] = await sql`SELECT owner_name FROM axira_qa_handoff WHERE phone=${qaHandoffPhone}`;
  return {token,status:turn?.owner_name === "Axira"
    ? "Axira está procesando una respuesta. Espera a que termine."
    : turn ? "Turno de "+turn.owner_name : "Turno de Axira"};
}
