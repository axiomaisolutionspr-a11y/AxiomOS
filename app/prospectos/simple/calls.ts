"use server";

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

function e164(value: string) {
  const clean = value.trim();
  if (/^\+\d{8,15}$/.test(clean)) return clean;
  const digits = clean.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function matchesSecret(value: string | undefined, expected: string) {
  if (!value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

async function authenticatedCrmSession() {
  const accessPin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const cookieStore = await cookies();
  const session = cookieStore.get("axiomos_crm_session")?.value;
  if (!accessPin || !matchesSecret(session, hash(`axiomos-crm:${accessPin}`))) {
    return { ok: false as const, cookieStore };
  }
  return { ok: true as const, cookieStore, session: session! };
}

async function hasDatabaseCallAuthorization(sessionHash: string) {
  const db = process.env.DATABASE_URL;
  if (!db) return false;
  try {
    const sql = neon(db);
    const rows = await sql`SELECT session_hash FROM crm_call_authorizations WHERE session_hash=${sessionHash} AND expires_at>NOW() LIMIT 1`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Verifies the private call PIN without placing a call. A short-lived,
 * HttpOnly cookie authorizes subsequent calls for ten minutes.
 */
export async function authorizeSimpleCalls(
  data: FormData
): Promise<{ ok: boolean; error?: string; expiresInMinutes?: number }> {
  const crm = await authenticatedCrmSession();
  if (!crm.ok) return { ok: false, error: "Tu sesión venció. Vuelve a entrar al CRM." };

  const callPin = process.env.AXIOMOS_CRM_CALL_PIN;
  if (!callPin) return { ok: false, error: "El PIN de llamada no está configurado." };

  const provided = String(data.get("crm_call_pin") || "").trim();
  if (!matchesSecret(provided, callPin)) {
    return { ok: false, error: "PIN de llamada incorrecto." };
  }

  const db = process.env.DATABASE_URL;
  if (!db) return { ok: false, error: "No se pudo conectar con el CRM." };
  try {
    const sql = neon(db);
    await sql`CREATE TABLE IF NOT EXISTS crm_call_authorizations (session_hash text PRIMARY KEY, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW())`;
    await sql`INSERT INTO crm_call_authorizations (session_hash, expires_at) VALUES (${crm.session}, NOW() + INTERVAL '10 minutes') ON CONFLICT (session_hash) DO UPDATE SET expires_at=EXCLUDED.expires_at, created_at=NOW()`;
  } catch {
    return { ok: false, error: "No se pudo registrar la autorización. Intenta otra vez." };
  }

  crm.cookieStore.set("axiomos_crm_call_session", hash(`axiomos-call:${callPin}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/prospectos",
    maxAge: 10 * 60,
  });

  return { ok: true, expiresInMinutes: 10 };
}

export async function checkSimpleCallAuthorization(): Promise<{ok:boolean;authorized:boolean;error?:string}> {
  const crm = await authenticatedCrmSession();
  if (!crm.ok) return {ok:false,authorized:false,error:"Tu sesión venció. Vuelve a entrar al CRM."};
  const callPin = process.env.AXIOMOS_CRM_CALL_PIN;
  if (!callPin) return {ok:false,authorized:false,error:"El PIN de llamada no está configurado."};
  const cookieSession = crm.cookieStore.get("axiomos_crm_call_session")?.value;
  const authorized =
    matchesSecret(cookieSession, hash(`axiomos-call:${callPin}`)) ||
    (await hasDatabaseCallAuthorization(crm.session));
  return {ok:true,authorized};
}

export async function startSimpleCall(
  data: FormData
): Promise<{ ok: boolean; error?: string }> {
  const crm = await authenticatedCrmSession();
  if (!crm.ok) return { ok: false, error: "Tu sesión venció. Vuelve a entrar al CRM." };

  const callPin = process.env.AXIOMOS_CRM_CALL_PIN;
  if (!callPin) return { ok: false, error: "El PIN de llamada no está configurado." };

  const expectedCallSession = hash(`axiomos-call:${callPin}`);
  const callSession = crm.cookieStore.get("axiomos_crm_call_session")?.value;
  const provided = String(data.get("crm_call_pin") || "").trim();
  const isAuthorized =
    matchesSecret(callSession, expectedCallSession) ||
    matchesSecret(provided, callPin) ||
    (await hasDatabaseCallAuthorization(crm.session));

  if (!isAuthorized) {
    return { ok: false, error: "Autoriza las llamadas con tu PIN antes de continuar." };
  }

  const id = String(data.get("id") || "");
  if (!/^\d+$/.test(id)) return { ok: false, error: "El contacto no es válido." };

  const apiKey = process.env.TELNYX_API_KEY;
  const appId = process.env.TELNYX_TEXML_APP_ID;
  const assistantId = process.env.TELNYX_AI_ASSISTANT_ID;
  const from = process.env.TELNYX_FROM_NUMBER;
  const db = process.env.DATABASE_URL;

  if (!apiKey || !appId || !assistantId || !from || !db) {
    return { ok: false, error: "La conexión de llamadas no está completa en esta versión." };
  }

  let submitted = false;

  try {
    const sql = neon(db);
    const rows = await sql`
      SELECT caller_name, caller_company, caller_phone, crm_notes
      FROM prospects
      WHERE id = ${id}
      LIMIT 1
    `;
    const contact = rows[0];
    if (!contact) return { ok: false, error: "No se encontró el contacto." };

    const to = e164(String(contact.caller_phone || ""));
    const origin = e164(from);
    if (!to || !origin) {
      return { ok: false, error: "Revisa el teléfono registrado y el número de origen." };
    }

    const name = String(contact.caller_name || "cliente").trim();
    const company = String(contact.caller_company || "").trim();
    const greeting = company
      ? `Hola ${name}. Te llamo de AxiomAI Solutions para dar seguimiento a tu interés en nuestros servicios para ${company}. ¿Tienes un momento para conversar?`
      : `Hola ${name}. Te llamo de AxiomAI Solutions para dar seguimiento a tu interés en nuestros servicios. ¿Tienes un momento para conversar?`;

    submitted = true;
    const response = await fetch(
      `https://api.telnyx.com/v2/texml/ai_calls/${encodeURIComponent(appId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: origin,
          To: to,
          AIAssistantId: assistantId,
          AIAssistantDynamicVariables: {
            call_direction: "outbound",
            prospect_id: id,
            prospect_name: name,
            prospect_company: company || "No disponible",
            crm_notes: contact.crm_notes || "No hay notas internas disponibles",
            outbound_greeting: greeting,
          },
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return { ok: false, error: `Telnyx rechazó iniciar la llamada (${response.status}).` };
    }

    try {
      revalidatePath("/prospectos");
      revalidatePath("/prospectos/simple");
    } catch {
      // La llamada ya fue aceptada; no sugerir repetirla.
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: submitted
        ? "No pudimos confirmar si Telnyx inició la llamada. Revisa el historial antes de intentar otra vez."
        : "No se pudo consultar el contacto. Intenta otra vez.",
    };
  }
}
