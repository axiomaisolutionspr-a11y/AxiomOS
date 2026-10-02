import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

type HistoryItem = { role: "user" | "assistant"; text: string };
type ContactKind = "evaluation" | "advisor" | "preference";

function normalized(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function contactRequestKind(text: string, history: HistoryItem[] = []): ContactKind | null {
  const value = normalized(text);
  // Solo solicitudes del cliente; no descripciones de lo que necesita su negocio.
  if (/\b(no quiero|no necesito|no deseo|no me interesa|no me contacten|no me llamen|cancelar|cancela)\b/.test(value)) return null;
  if (/\b(quiero|quisiera|necesito|deseo|me gustaria|podemos|pueden|puedes)\b.{0,60}\b(evaluacion|consulta gratuita)\b/.test(value)
    || /\b(agendar|coordinar|solicitar|programar|reservar)\b.{0,35}\b(cita|evaluacion)\b/.test(value)
    || /\b(disponibilidad|horarios)\b.{0,45}\b(evaluacion|consulta gratuita)\b/.test(value)) return "evaluation";
  if (/\b(quiero|quisiera|necesito|deseo|me gustaria|puedo)\b.{0,40}\b(hablar|contactar|comunicarme)\b.{0,40}\b(asesor|agente|persona|humano|equipo|especialista|representante)\b/.test(value)
    || /\b(contactenme|llamenme|llamame|contactame)\b/.test(value)
    || /\b(pueden|puedes)\b.{0,20}\b(llamarme|contactarme)\b/.test(value)) return "advisor";
  const previous = history.filter(item => item.role === "assistant").at(-1)?.text || "";
  if (previous.includes("Registramos tu solicitud") && previous.includes("¿Qué día y horario prefieres?")
    && /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|manana|hoy|tarde|noche|am|pm|\d{1,2})\b/.test(value)) return "preference";
  return null;
}

export async function registerWhatsAppContact(input: {
  phone: string;
  text: string;
  messageId: string | null;
  profileName?: unknown;
  history: HistoryItem[];
}): Promise<string | null> {
  const kind = contactRequestKind(input.text, input.history);
  if (!kind) return null;
  const failureReply = "No pudimos registrar tu solicitud en este momento. Puedes llamar al 1 (787) 450-3679 para hablar con un asesor de AxiomAI Solutions.";
  // La identidad proviene del webhook; nunca de un teléfono sugerido por el modelo.
  const phone = input.phone.replace(/\D/g, "");
  if (!process.env.DATABASE_URL || !phone || !input.messageId) return failureReply;
  const sql = neon(process.env.DATABASE_URL);
  const key = `phone:${phone.slice(-10)}`; // Misma identidad que Prospectos Web.
  const token = createHash("sha256").update(input.messageId).digest("hex");
  const marker = `[WA_REQUEST:${token}]`;
  const sentMarker = `[WA_EMAIL_ACCEPTED:${token}]`;
  const profileName = typeof input.profileName === "string" ? input.profileName.trim().slice(0, 180) : "";
  const conversation = input.history.filter(item => item.role === "user").slice(-6)
    .map(item => item.text.slice(0, 1500)).join("\n");
  const notes = [marker, "WHATSAPP — SOLICITUD DE SEGUIMIENTO",
    `Tipo: ${kind === "evaluation" ? "Evaluación gratuita" : kind === "preference" ? "Preferencia de horario" : "Contacto con un asesor"}`,
    `Teléfono de WhatsApp: +${phone}`,
    profileName ? `Nombre de perfil (sin verificar): ${profileName}` : "Nombre pendiente de confirmar",
    `Solicitud: ${input.text.slice(0, 5000)}`,
    "Próxima acción: contactar al cliente y confirmar disponibilidad. No hay cita reservada.",
    `Contexto del cliente:\n${conversation}`].join("\n");
  let row: Record<string, unknown>;
  try {
    const rows = await sql`
      INSERT INTO prospects (prospect_key, caller_name, caller_phone, crm_stage,
        assigned_to, follow_up_at, crm_notes, first_seen_at, last_seen_at, created_at, updated_at)
      VALUES (${key}, ${"Contacto de WhatsApp"}, ${`+${phone}`}, ${"Interesado"},
        ${"Rolando"}, NOW(), ${notes}, NOW(), NOW(), NOW(), NOW())
      ON CONFLICT (prospect_key) DO UPDATE SET
        caller_name = COALESCE(NULLIF(prospects.caller_name, ''), EXCLUDED.caller_name),
        caller_phone = COALESCE(NULLIF(prospects.caller_phone, ''), EXCLUDED.caller_phone),
        crm_stage = CASE WHEN prospects.crm_stage IS NULL OR prospects.crm_stage IN ('', 'Nuevo')
          THEN EXCLUDED.crm_stage ELSE prospects.crm_stage END,
        assigned_to = COALESCE(NULLIF(prospects.assigned_to, ''), EXCLUDED.assigned_to),
        follow_up_at = LEAST(COALESCE(prospects.follow_up_at, NOW()), NOW()),
        crm_notes = CASE WHEN STRPOS(COALESCE(prospects.crm_notes, ''), ${marker}) > 0
          THEN prospects.crm_notes ELSE CONCAT_WS(E'\n\n', NULLIF(prospects.crm_notes, ''), EXCLUDED.crm_notes) END,
        last_seen_at = NOW(), updated_at = NOW()
      RETURNING id::text AS id, crm_notes
    `;
    if (!rows[0]?.id) throw new Error("CRM did not return a prospect ID");
    row = rows[0];
    console.log("WHATSAPP_CONTACT_SAVED", { prospectId: row.id, kind });
  } catch {
    console.error("WHATSAPP_CONTACT_SAVE_FAILED");
    return failureReply;
  }

  // Aviso con la configuración ya existente. El registro CRM no depende del correo.
  if (!String(row.crm_notes || "").includes(sentMarker)) {
    if (String(process.env.EMAIL_ENABLED || "").toLowerCase() !== "true") {
      console.log("WHATSAPP_CONTACT_EMAIL_DISABLED", { prospectId: row.id });
    } else if (!process.env.RESEND_API_KEY || !process.env.EMAIL_ALERT_FROM || !process.env.EMAIL_ALERT_TO) {
      console.error("WHATSAPP_CONTACT_EMAIL_CONFIG_MISSING", { prospectId: row.id });
    } else {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json", "Idempotency-Key": `whatsapp-contact-${token}` },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ from: process.env.EMAIL_ALERT_FROM, to: [process.env.EMAIL_ALERT_TO],
            subject: "AxiomAI — solicitud de seguimiento por WhatsApp",
            text: `WHATSAPP — SOLICITUD DE SEGUIMIENTO\nTeléfono: +${phone}\nSolicitud: ${input.text.slice(0, 5000)}\nID CRM: ${row.id}\n\nRevisar Prospectos: https://axiomaisolutions.org/prospectos` }),
        });
        const result = await response.json() as { id?: unknown };
        if (!response.ok || typeof result.id !== "string") throw new Error("Email not accepted");
        await sql`UPDATE prospects SET crm_notes = CONCAT_WS(E'\n', crm_notes, ${sentMarker}),
          updated_at = NOW() WHERE prospect_key = ${key}
          AND STRPOS(COALESCE(crm_notes, ''), ${sentMarker}) = 0`;
        console.log("WHATSAPP_CONTACT_EMAIL_ACCEPTED", { prospectId: row.id });
      } catch {
        console.error("WHATSAPP_CONTACT_EMAIL_FAILED", { prospectId: row.id });
      }
    }
  }
  // Destino de alertas autorizado por Rolando. No es el teléfono del prospecto.
  const smsTo = "+17872320132";
  const smsAttemptMarker = `[WA_SMS_ATTEMPT:${token}]`;
  const smsAcceptedMarker = `[WA_SMS_ACCEPTED:${token}]`;
  if (String(process.env.SMS_ENABLED || "").trim().toLowerCase() !== "true") {
    console.log("WHATSAPP_CONTACT_SMS_DISABLED", { prospectId: row.id });
  } else if (!process.env.TELNYX_API_KEY?.trim() || !process.env.TELNYX_SMS_FROM?.trim()) {
    console.error("WHATSAPP_CONTACT_SMS_CONFIG_MISSING", { prospectId: row.id });
  } else {
    try {
      // Reserva atómica: dos entregas simultáneas no deben enviar dos SMS.
      // Conservamos el intento incluso si hay timeout: Telnyx podría haberlo aceptado.
      // Los intentos fallidos requieren revisión; no hay reintento automático.
      const claimed = await sql`
        UPDATE prospects SET crm_notes = CONCAT_WS(E'\n', crm_notes, ${smsAttemptMarker}),
          updated_at = NOW()
        WHERE prospect_key = ${key}
          AND STRPOS(COALESCE(crm_notes, ''), ${smsAttemptMarker}) = 0
          AND STRPOS(COALESCE(crm_notes, ''), ${smsAcceptedMarker}) = 0
        RETURNING id
      `;
      if (claimed.length > 0) {
        const label = kind === "evaluation" ? "Evaluacion gratuita"
          : kind === "preference" ? "Horario para evaluacion" : "Solicitud de asesor";
        const smsText = `AxiomAI: WhatsApp. ${label}. Cliente: +${phone}. CRM: ${row.id}. Revisar axiomaisolutions.org/prospectos`;
        const response = await fetch("https://api.telnyx.com/v2/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY.trim()}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            from: process.env.TELNYX_SMS_FROM.trim(),
            to: smsTo,
            text: smsText,
            type: "SMS",
          }),
        });
        const result = await response.json() as {
          data?: { id?: unknown; errors?: unknown[]; to?: { status?: string }[] };
          errors?: { code?: unknown }[];
        };
        if (!response.ok || typeof result?.data?.id !== "string" || !result.data.id
          || result.errors?.length || result.data.errors?.length
          || result.data.to?.some(recipient => ["sending_failed", "delivery_failed"].includes(recipient.status || ""))) {
          console.error("WHATSAPP_CONTACT_SMS_REJECTED", {
            prospectId: row.id, status: response.status,
            codes: Array.isArray(result?.errors) ? result.errors.map(error => error.code) : [],
          });
        } else {
          // Aceptado por Telnyx; esto todavía no confirma entrega al teléfono.
          console.log("WHATSAPP_CONTACT_SMS_ACCEPTED", {
            prospectId: row.id, messageId: result.data.id,
          });
          const receipt = `${smsAcceptedMarker} Telnyx: ${result.data.id}`;
          await sql`UPDATE prospects SET crm_notes = CONCAT_WS(E'\n', crm_notes, ${receipt}),
            updated_at = NOW() WHERE prospect_key = ${key}
            AND STRPOS(COALESCE(crm_notes, ''), ${smsAcceptedMarker}) = 0`;
        }
      }
    } catch {
      // El CRM y el correo siguen disponibles aunque el SMS falle.
      console.error("WHATSAPP_CONTACT_SMS_FAILED_OR_UNKNOWN", { prospectId: row.id });
    }
  }


  if (kind === "preference") return "Registramos tu preferencia de horario en la solicitud. Un asesor de AxiomAI Solutions debe confirmar la disponibilidad; la cita todavía no está reservada.";
  if (kind === "evaluation") return "Registramos tu solicitud de evaluación gratuita para seguimiento con un asesor de AxiomAI Solutions. La disponibilidad queda pendiente de confirmación; todavía no hay una cita reservada. ¿Qué día y horario prefieres?";
  return "Registramos tu solicitud de contacto para seguimiento con un asesor de AxiomAI Solutions. Si necesitas atención inmediata, puedes llamar al 1 (787) 450-3679.";
}
