"use server";

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puertoRicoDateISO, validateOfferInput } from "../../lib/axira-offers-policy.js";

const PATH = "/prospectos/ofertas";

function done(type: "ok" | "error", message: string): never {
  redirect(`${PATH}?${new URLSearchParams({ [type]: message })}`);
}

async function authorized() {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const token = (await cookies()).get("axiomos_crm_session")?.value;
  if (!pin || !token) return false;
  const expected = createHash("sha256").update(`axiomos-crm:${pin}`).digest("hex");
  return token.length === expected.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

function correctApprovalKey(input: string): boolean {
  const configured = process.env.AXIOMOS_OFFERS_APPROVAL_KEY || "";
  if (configured.length < 16 || !input) return false;
  const provided = createHash("sha256").update(input).digest();
  const expected = createHash("sha256").update(configured).digest();
  return timingSafeEqual(provided, expected);
}

export async function createOffer(formData: FormData) {
  if (!(await authorized())) done("error", "La sesión privada no es válida.");
  const result = validateOfferInput({
    name: formData.get("name"), description: formData.get("description"),
    monthly: formData.get("monthly"), activation: formData.get("activation"),
    startDate: formData.get("startDate"), endDate: formData.get("endDate"),
    terms: formData.get("terms"), maxClients: formData.get("maxClients"),
  });
  if (!result.ok || !result.value) done("error", result.error || "Revisa los datos.");
  if (!process.env.DATABASE_URL) done("error", "La base de datos no está configurada.");
  const o = result.value;
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO axiomai_offers
        (name, description, monthly_usd, activation_usd, start_date, end_date, terms, max_clients, status)
      VALUES
        (${o.name}, ${o.description}, ${o.monthly}, ${o.activation},
         ${o.startDate}::date, ${o.endDate}::date, ${o.terms}, ${o.maxClients}, 'draft')
    `;
  } catch (error) {
    console.error("OFFERS_CREATE_FAILED", error instanceof Error ? error.message : "error");
    done("error", "No se pudo guardar. Verifica que se haya aplicado la migración en QA.");
  }
  revalidatePath(PATH);
  done("ok", "Oferta guardada como borrador. Todavía NO es visible para los clientes.");
}

export async function changeOfferStatus(formData: FormData) {
  if (!(await authorized())) done("error", "La sesión privada no es válida.");
  const id = String(formData.get("id") || "");
  const target = String(formData.get("target") || "");
  const confirmation = String(formData.get("confirmation") || "").trim();
  if (!/^\d+$/.test(id) || !["approved", "paused"].includes(target)) {
    done("error", "Solicitud inválida.");
  }
  if (target === "approved" && (confirmation !== "APROBAR" ||
      !correctApprovalKey(String(formData.get("approvalKey") || "")))) {
    done("error", "Para publicar escribe APROBAR y la clave de aprobación correcta.");
  }
  if (target === "paused" && confirmation !== "PAUSAR") {
    done("error", "Para desactivar escribe PAUSAR.");
  }
  if (!process.env.DATABASE_URL) done("error", "La base de datos no está configurada.");
  try {
    const sql = neon(process.env.DATABASE_URL);
    const today = puertoRicoDateISO();
    const rows = target === "approved"
      ? await sql`
          UPDATE axiomai_offers SET status='approved', updated_at=now()
          WHERE id=${id} AND end_date >= ${today}::date
          RETURNING id
        `
      : await sql`
          UPDATE axiomai_offers SET status='paused', updated_at=now()
          WHERE id=${id} AND status <> 'paused'
          RETURNING id
        `;
    if (!rows.length) done("error", "La oferta no existe o su fecha ya venció.");
  } catch (error) {
    console.error("OFFERS_STATUS_FAILED", error instanceof Error ? error.message : "error");
    done("error", "No se pudo cambiar el estado de la oferta.");
  }
  revalidatePath(PATH);
  done("ok", target === "approved" ? "Oferta aprobada. Axira la anunciará únicamente dentro de las fechas indicadas." : "Oferta pausada. Axira dejará de anunciarla.");
}
