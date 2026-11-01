"use server";

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CAMPAIGN_KEY,
  TEMPLATE_BODY,
  TEMPLATE_FOOTER,
  TEMPLATE_LANGUAGE,
  TEMPLATE_LOG_MESSAGE,
  TEMPLATE_NAME,
  campaignSnapshot,
  getNovemberCampaignData,
  getNovemberTemplateState,
} from "./campaign";

const CAMPAIGN_PATH = "/prospectos/campanas/noviembre";

function finish(kind: "ok" | "error", message: string): never {
  const query = new URLSearchParams({ [kind]: message });
  redirect(`${CAMPAIGN_PATH}?${query.toString()}`);
}

async function hasValidSession() {
  const pin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  const cookie = (await cookies()).get("axiomos_crm_session")?.value;
  if (!pin || !cookie) return false;

  const expected = createHash("sha256")
    .update(`axiomos-crm:${pin}`)
    .digest("hex");

  return (
    cookie.length === expected.length &&
    timingSafeEqual(Buffer.from(cookie), Buffer.from(expected))
  );
}

function providerError(body: unknown) {
  const envelope = body as {
    error?: { code?: unknown; error_subcode?: unknown; message?: unknown };
  };
  return {
    code:
      envelope?.error?.code == null
        ? null
        : String(envelope.error.code).slice(0, 80),
    message:
      typeof envelope?.error?.message === "string"
        ? envelope.error.message.slice(0, 500)
        : "El proveedor rechazó la solicitud.",
  };
}

export async function createNovemberTemplate(formData: FormData) {
  if (!(await hasValidSession())) {
    finish("error", "Tu sesión venció. Vuelve a ingresar al CRM.");
  }

  if (String(formData.get("confirmation") || "").trim() !== "CREAR PLANTILLA") {
    finish("error", "Escribe CREAR PLANTILLA para confirmar.");
  }

  const apiKey = process.env.DUALHOOK_API_KEY;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!apiKey || !wabaId) {
    finish(
      "error",
      "Falta identificar la cuenta de WhatsApp en la configuración segura."
    );
  }

  const current = await getNovemberTemplateState();
  if (current.found) {
    finish(
      "ok",
      `La plantilla ya existe con estado ${current.status || "desconocido"}.`
    );
  }

  try {
    const response = await fetch(
      `https://api.dualhook.com/v25.0/${encodeURIComponent(wabaId)}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: TEMPLATE_NAME,
          language: TEMPLATE_LANGUAGE,
          category: "MARKETING",
          components: [
            { type: "BODY", text: TEMPLATE_BODY },
            { type: "FOOTER", text: TEMPLATE_FOOTER },
          ],
        }),
      }
    );
    const body = await response.json() as {
      status?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      finish(
        "error",
        body.error?.message?.slice(0, 300) ||
          `No se pudo crear la plantilla (HTTP ${response.status}).`
      );
    }

    revalidatePath(CAMPAIGN_PATH);
    finish(
      "ok",
      `Plantilla enviada a revisión. Estado: ${body.status || "PENDING"}.`
    );
  } catch {
    finish("error", "No se pudo conectar con Dualhook para crear la plantilla.");
  }
}

export async function sendNovemberCampaign(formData: FormData) {
  if (!(await hasValidSession())) {
    finish("error", "Tu sesión venció. Vuelve a ingresar al CRM.");
  }

  if (String(formData.get("confirmation") || "").trim() !== "ENVIAR OFERTA") {
    finish("error", "Escribe ENVIAR OFERTA para confirmar.");
  }

  const campaign = await getNovemberCampaignData();
  if (!campaign.migrationReady) {
    finish("error", "El registro de deduplicación todavía no está habilitado.");
  }

  const pending = campaign.recipients.filter((item) => !item.sendStatus);
  const expectedCount = Number(formData.get("recipientCount"));
  const expectedSnapshot = String(formData.get("snapshot") || "");

  if (
    pending.length === 0 ||
    pending.length > 10 ||
    expectedCount !== pending.length ||
    expectedSnapshot !== campaignSnapshot(pending)
  ) {
    finish(
      "error",
      "La lista cambió desde que abriste la página. Revísala y confirma de nuevo."
    );
  }

  const template = await getNovemberTemplateState();
  if (!template.approved || template.category !== "MARKETING") {
    finish(
      "error",
      "La plantilla de marketing todavía no está aprobada para envío."
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.DUALHOOK_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!databaseUrl || !apiKey || !phoneNumberId) {
    finish("error", "La conexión segura de WhatsApp está incompleta.");
  }

  const sql = neon(databaseUrl);
  let sent = 0;
  let held = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of pending) {
    const reserved = await sql`
      INSERT INTO whatsapp_campaign_sends (
        campaign_key,
        prospect_id,
        phone,
        template_name,
        consent_source,
        status
      )
      VALUES (
        ${CAMPAIGN_KEY},
        ${recipient.id},
        ${recipient.phoneKey},
        ${TEMPLATE_NAME},
        ${"inbound_whatsapp"},
        ${"reserved"}
      )
      ON CONFLICT (campaign_key, phone) DO NOTHING
      RETURNING id::text AS id
    ` as Array<{ id: string }>;

    const sendId = reserved[0]?.id;
    if (!sendId) {
      skipped += 1;
      continue;
    }

    try {
      const response = await fetch(
        `https://api.dualhook.com/v25.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipient.phoneKey,
            type: "template",
            template: {
              name: TEMPLATE_NAME,
              language: { code: TEMPLATE_LANGUAGE },
            },
          }),
        }
      );

      let body: {
        messages?: Array<{ id?: string; message_status?: string }>;
        error?: { code?: unknown; error_subcode?: unknown; message?: unknown };
      } = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      if (!response.ok) {
        const error = providerError(body);
        await sql`
          UPDATE whatsapp_campaign_sends
          SET status = 'failed',
              error_code = ${error.code},
              error_message = ${error.message},
              updated_at = now()
          WHERE id = ${sendId}
        `;
        failed += 1;
        continue;
      }

      const providerMessageId = body.messages?.[0]?.id || null;
      const providerStatus = body.messages?.[0]?.message_status || "accepted";
      const status =
        providerStatus === "held_for_quality_assessment" ? "held" : "accepted";

      await sql`
        UPDATE whatsapp_campaign_sends
        SET status = ${status},
            provider_message_id = ${providerMessageId},
            sent_at = now(),
            updated_at = now()
        WHERE id = ${sendId}
      `;

      if (providerMessageId) {
        await sql`
          INSERT INTO whatsapp_messages (
            conversation_key,
            phone,
            role,
            message,
            whatsapp_message_id
          )
          VALUES (
            ${`whatsapp:${recipient.phoneKey}`},
            ${recipient.phoneKey},
            ${"assistant"},
            ${TEMPLATE_LOG_MESSAGE},
            ${providerMessageId}
          )
          ON CONFLICT (whatsapp_message_id)
            WHERE whatsapp_message_id IS NOT NULL
          DO NOTHING
        `;
      }

      if (status === "held") held += 1;
      else sent += 1;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Error inesperado al enviar.";
      await sql`
        UPDATE whatsapp_campaign_sends
        SET status = 'failed',
            error_message = ${message},
            updated_at = now()
        WHERE id = ${sendId}
      `;
      console.error("NOVEMBER_CAMPAIGN_SEND_FAILED", {
        sendId,
        error: message,
      });
      failed += 1;
    }
  }

  revalidatePath("/prospectos/simple");
  revalidatePath(CAMPAIGN_PATH);

  finish(
    failed > 0 ? "error" : "ok",
    `Resultado: ${sent} aceptados, ${held} retenidos por revisión, ${skipped} duplicados omitidos y ${failed} fallidos.`
  );
}
