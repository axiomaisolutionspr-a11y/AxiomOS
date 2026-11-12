import "server-only";

import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { novemberCampaignAudienceQuery } from "./audience.mjs";
import { whatsappManualOptOutMode, whatsappManualOptOutSharesCampaignDatabase } from "../../../lib/whatsapp-manual-opt-out-mode.mjs";

export const CAMPAIGN_KEY = "fundadores_noviembre_2026";
export const TEMPLATE_NAME = "oferta_fundadores_noviembre_2026";
export const TEMPLATE_LANGUAGE = "es";

export const TEMPLATE_BODY =
  "Gracias por haber solicitado información a AxiomAI Solutions. Durante noviembre tenemos 3 espacios del Plan Fundador: WhatsApp inteligente + CRM Básico por $17.95 al mes durante los primeros 3 meses; luego $39 al mes. La activación inicial no tiene cargo. Aplican límites de alcance y costos externos de Meta o del proveedor. ¿Deseas una evaluación gratuita? Responde SÍ.";

export const TEMPLATE_FOOTER =
  "Si no deseas más promociones, responde NO.";

export const TEMPLATE_LOG_MESSAGE =
  `${TEMPLATE_BODY}\n\n${TEMPLATE_FOOTER}`;

export type CampaignRecipient = {
  id: string;
  name: string;
  company: string;
  phone: string;
  phoneKey: string;
  stage: string;
  inboundCount: number;
  lastInboundAt: string;
  sendStatus: string | null;
  providerMessageId: string | null;
  sentAt: string | null;
};

export type TemplateState = {
  configured: boolean;
  found: boolean;
  approved: boolean;
  status: string | null;
  category: string | null;
  error: string | null;
};

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurado.");
  return neon(url);
}

export function normalizePuertoRicoPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && /^(787|939)/.test(digits)) return `1${digits}`;
  if (digits.length === 11 && /^1(787|939)/.test(digits)) return digits;
  return "";
}

export function campaignSnapshot(recipients: CampaignRecipient[]) {
  const stable = recipients
    .map((item) => `${item.id}:${item.phoneKey}`)
    .sort()
    .join("|");
  return createHash("sha256").update(stable).digest("hex");
}

export async function getNovemberCampaignData() {
  const manualOptOut = whatsappManualOptOutMode() === "production";
  if (manualOptOut && !whatsappManualOptOutSharesCampaignDatabase()) {
    return {
      migrationReady: false,
      recipients: [] as CampaignRecipient[],
      snapshot: campaignSnapshot([]),
      configurationError: "La campaña y el registro de bajas deben compartir la misma base de datos.",
    };
  }
  const sql = database();
  const readiness = await sql`
    SELECT to_regclass('public.whatsapp_campaign_sends') IS NOT NULL AS ready,
      CASE WHEN ${manualOptOut}::boolean THEN COALESCE(has_function_privilege(
        to_regprocedure('axiomos_commercial.is_whatsapp_manually_opted_out(text)'), 'EXECUTE'
      ), false) ELSE false END AS opt_out_ready
  ` as Array<{ ready: boolean; opt_out_ready: boolean }>;
  if (manualOptOut && !readiness[0]?.opt_out_ready) {
    return {
      migrationReady: false,
      recipients: [] as CampaignRecipient[],
      snapshot: campaignSnapshot([]),
      configurationError: "La campaña no puede consultar el registro de bajas.",
    };
  }
  const migrationReady = Boolean(readiness[0]?.ready);
  const rows = await sql.query(novemberCampaignAudienceQuery(manualOptOut)) as Array<{
    id: string;
    name: string;
    company: string;
    phone: string;
    phone_key: string;
    stage: string;
    inbound_count: number;
    last_inbound_at: Date | string;
  }>;

  let sends: Array<{
    phone: string;
    status: string;
    provider_message_id: string | null;
    sent_at: Date | string | null;
  }> = [];

  if (migrationReady) {
    sends = await sql`
      SELECT phone, status, provider_message_id, sent_at
      FROM whatsapp_campaign_sends
      WHERE campaign_key = ${CAMPAIGN_KEY}
    ` as typeof sends;
  }

  const sendsByPhone = new Map(
    sends.map((item) => [item.phone.replace(/\D/g, ""), item])
  );

  const recipients: CampaignRecipient[] = rows
    .map((row) => {
      const normalized = normalizePuertoRicoPhone(row.phone);
      const send = sendsByPhone.get(normalized);
      return {
        id: row.id,
        name: row.name,
        company: row.company,
        phone: row.phone,
        phoneKey: normalized,
        stage: row.stage,
        inboundCount: Number(row.inbound_count),
        lastInboundAt: new Date(row.last_inbound_at).toISOString(),
        sendStatus: send?.status ?? null,
        providerMessageId: send?.provider_message_id ?? null,
        sentAt: send?.sent_at ? new Date(send.sent_at).toISOString() : null,
      };
    })
    .filter((item) => Boolean(item.phoneKey));

  return {
    migrationReady,
    recipients,
    snapshot: campaignSnapshot(recipients),
  };
}

export async function getNovemberTemplateState(): Promise<TemplateState> {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const apiKey = process.env.DUALHOOK_API_KEY;

  if (!wabaId || !apiKey) {
    return {
      configured: false,
      found: false,
      approved: false,
      status: null,
      category: null,
      error: "Falta WHATSAPP_BUSINESS_ACCOUNT_ID en la configuración segura.",
    };
  }

  const url = new URL(
    `https://api.dualhook.com/v25.0/${encodeURIComponent(wabaId)}/message_templates`
  );
  url.searchParams.set(
    "fields",
    "id,name,language,status,category,rejected_reason,quality_score"
  );
  url.searchParams.set("name", TEMPLATE_NAME);
  url.searchParams.set("language", TEMPLATE_LANGUAGE);
  url.searchParams.set("limit", "10");

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const body = await response.json() as {
      data?: Array<{ name?: string; language?: string; status?: string; category?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        configured: true,
        found: false,
        approved: false,
        status: null,
        category: null,
        error: body.error?.message || `Dualhook respondió ${response.status}.`,
      };
    }

    const template = body.data?.find(
      (item) =>
        item.name === TEMPLATE_NAME &&
        item.language === TEMPLATE_LANGUAGE
    );

    return {
      configured: true,
      found: Boolean(template),
      approved: template?.status === "APPROVED",
      status: template?.status ?? null,
      category: template?.category ?? null,
      error: null,
    };
  } catch {
    return {
      configured: true,
      found: false,
      approved: false,
      status: null,
      category: null,
      error: "No se pudo consultar el estado de la plantilla.",
    };
  }
}
