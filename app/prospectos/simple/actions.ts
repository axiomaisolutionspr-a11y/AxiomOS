"use server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";
import { STAGES } from "../../lib/crm/model";
export async function saveSimpleContact(data: FormData): Promise<{ok:boolean; error?:string}> {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const cookie = (await cookies()).get("axiomos_crm_session")?.value;
  if (!pin || !cookie) return {ok:false,error:"Tu sesión venció. Vuelve a ingresar al CRM."};
  const expected = createHash("sha256").update(`axiomos-crm:${pin}`).digest("hex");
  if (cookie.length !== expected.length || !timingSafeEqual(Buffer.from(cookie),Buffer.from(expected))) return {ok:false,error:"Tu sesión venció. Vuelve a ingresar al CRM."};
  const id = String(data.get("id") || "");
  const stage = String(data.get("stage") || "");
  if (!/^\d+$/.test(id) || !STAGES.some(s=>s===stage)) return {ok:false,error:"Revisa el contacto y su estado."};
  const assigned = String(data.get("assignee") || "").trim().slice(0,180);
  const localDate = String(data.get("followUpAt") || "");
  const date = localDate ? new Date(`${localDate}:00-04:00`) : null;
  if (date && Number.isNaN(date.getTime())) return {ok:false,error:"La fecha no es válida."};
  if (!process.env.DATABASE_URL) return {ok:false,error:"No se pudo conectar con el CRM."};
  try {
    const sql = neon(process.env.DATABASE_URL);
    // No se sobrescriben notas existentes ni marcadores de deduplicación de WhatsApp.
    const note = String(data.get("note") || "").trim().slice(0,3000);
    const rows = await sql`
      UPDATE prospects SET crm_stage=${stage}, assigned_to=${assigned || null},
        follow_up_at=${date?.toISOString() || null},
        crm_notes=CASE WHEN ${note}='' THEN crm_notes ELSE CONCAT_WS(E'\n\n',crm_notes,${`Nota del equipo: ${note}`}) END,
        last_reviewed_at=CASE WHEN ${data.get("reviewed")==="true"} THEN NOW() ELSE last_reviewed_at END,
        updated_at=NOW() WHERE id=${id} RETURNING id
    `;
    if (!rows.length) return {ok:false,error:"No se encontró este contacto."};
    revalidatePath("/prospectos"); revalidatePath("/prospectos/simple");
    return {ok:true};
  } catch (error) { console.error("CRM_SAVE_FAILED", { error: error instanceof Error ? error.message : String(error) }); return {ok:false,error:"No se pudo guardar. Tus cambios siguen en pantalla; intenta otra vez."}; }
}

/** Updates only the review marker. It cannot overwrite stage, owner or follow-up. */
export async function markContactReviewed(id: string): Promise<{ok:boolean; error?:string}> {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const cookie = (await cookies()).get("axiomos_crm_session")?.value;
  if (!pin || !cookie) return {ok:false,error:"Tu sesión venció. Vuelve a ingresar al CRM."};
  const expected = createHash("sha256").update(`axiomos-crm:${pin}`).digest("hex");
  if (cookie.length !== expected.length || !timingSafeEqual(Buffer.from(cookie), Buffer.from(expected))) return {ok:false,error:"Tu sesión venció. Vuelve a ingresar al CRM."};
  if (!/^\d+$/.test(id)) return {ok:false,error:"El contacto no es válido."};
  if (!process.env.DATABASE_URL) return {ok:false,error:"No se pudo conectar con el CRM."};
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`UPDATE prospects SET last_reviewed_at=NOW(), updated_at=NOW() WHERE id=${id} RETURNING id, last_reviewed_at`;
    if (!rows.length) return {ok:false,error:"No se encontró este contacto."};
    revalidatePath("/prospectos/simple");
    return {ok:true};
  } catch (error) {
    console.error("CRM_MARK_REVIEWED_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return {ok:false,error:"No se pudo marcar como revisado. Intenta otra vez."};
  }
}


export async function deleteSimpleContact(
  id: string,
  expectedPhone: string,
  expectedCompany: string
): Promise<{ok:boolean; error?:string; deletedCalls?:number}> {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const cookie = (await cookies()).get("axiomos_crm_session")?.value;
  if (!pin || !cookie) return {ok:false,error:"Tu sesión venció. Vuelve a ingresar al CRM."};
  const expected = createHash("sha256").update(`axiomos-crm:${pin}`).digest("hex");
  if (cookie.length !== expected.length || !timingSafeEqual(Buffer.from(cookie),Buffer.from(expected))) {
    return {ok:false,error:"Tu sesión venció. Vuelve a ingresar al CRM."};
  }
  if (!/^\d+$/.test(id)) return {ok:false,error:"El contacto no es válido."};
  if (!process.env.DATABASE_URL) return {ok:false,error:"No se pudo conectar con el CRM."};

  const normalizePhone = (value: string) => value.replace(/\D/g, "").slice(-10);
  const verifiedPhone = normalizePhone(expectedPhone);
  const verifiedCompany = expectedCompany.trim();

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT id::text AS id, caller_phone, caller_company
      FROM prospects
      WHERE id=${id}
      LIMIT 1
    ` as Array<{id:string; caller_phone:string|null; caller_company:string|null}>;

    const contact = rows[0];
    if (!contact) return {ok:false,error:"No se encontró este contacto."};
    if (normalizePhone(contact.caller_phone || "") !== verifiedPhone) {
      return {ok:false,error:"El teléfono cambió. Actualiza el CRM antes de eliminar."};
    }
    if ((contact.caller_company || "").trim() !== verifiedCompany) {
      return {ok:false,error:"La empresa cambió. Actualiza el CRM antes de eliminar."};
    }

    const [deletedCalls, deletedContacts] = await sql.transaction([
      sql`DELETE FROM call_leads WHERE prospect_id=${id} RETURNING id`,
      sql`DELETE FROM prospects WHERE id=${id} RETURNING id`,
    ]);

    if (!deletedContacts.length) return {ok:false,error:"No se pudo confirmar la eliminación."};
    revalidatePath("/prospectos");
    revalidatePath("/prospectos/simple");
    revalidatePath("/prospectos/anterior");
    return {ok:true,deletedCalls:deletedCalls.length};
  } catch (error) {
    console.error("CRM_DELETE_FAILED", { id, error: error instanceof Error ? error.message : String(error) });
    return {ok:false,error:"No se pudo eliminar. El registro permanece intacto."};
  }
}
