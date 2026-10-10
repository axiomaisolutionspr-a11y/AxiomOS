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
  } catch { return {ok:false,error:"No se pudo guardar. Tus cambios siguen en pantalla; intenta otra vez."}; }
}
