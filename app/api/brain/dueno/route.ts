// Brain del dueño — ruta aparte de /api/brain (Axira). Fase 1: sin acceso a datos del CRM.
// Apagada salvo BRAIN_OWNER_ENABLED=true; exige sesión y membresía activa (owner u operator).
// Cada pregunta se reserva en el contador mensual antes de llamar a la IA; si la IA falla, se devuelve.
import { NextResponse } from "next/server";
import {
  brainLanguage, brainOwnerEnabled, brainOwnerErrorMessage, buildBrainOwnerRequest, canAskBrain,
  cleanBrainHistory, extractOutputText, sanitizeBrainOwnerOutput,
} from "../../../lib/brain-owner-policy.js";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";
import { AXIOMAI_TENANT, neonCatalogDb } from "../../../lib/axira-catalog-store.js";
import { brainMonthlyLimit, brainPeriod, releaseBrainQuestion, reserveBrainQuestion } from "../../../lib/brain-usage-store.js";

export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";
// Mismo modelo configurado que Axira: no se cambia el modelo de IA sin autorización.
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const TIMEOUT_MS = 45000;
const NO_STORE = { "Cache-Control": "no-store" };

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  if (!brainOwnerEnabled(process.env)) return reply(404, { error: "No disponible." });

  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader) return reply(503, { error: "El acceso a Brain no está configurado en este entorno." });

  const { data: session, error: sessionError } = await auth.getSession();
  if (sessionError || !session?.user) return reply(401, { error: "Inicia sesión para usar Brain." });

  let membership;
  try {
    membership = await commercialMember(reader, session.user.id);
  } catch {
    return reply(503, { error: "No se pudo verificar tu permiso." });
  }
  if (!canAskBrain(membership)) return reply(403, { error: "Tu usuario no tiene acceso a Brain." });

  let body: { messages?: unknown; language?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: "Solicitud no válida." });
  }
  const language = brainLanguage(body.language);
  const history = cleanBrainHistory(body.messages);
  if (!history.length || history.at(-1)?.role !== "user") {
    return reply(400, { error: language === "en" ? "Write a question for Brain." : "Escribe una pregunta para Brain." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return reply(503, { error: brainOwnerErrorMessage(503, "", language) });

  // Contador mensual (falla cerrado: sin contador no se gasta IA).
  const counter = neonCatalogDb(commercialOfferWriterDatabase());
  if (!counter) return reply(503, { error: language === "en" ? "Brain's usage counter is not available." : "El contador de Brain no está disponible en este entorno." });
  const limit = brainMonthlyLimit(process.env);
  const period = brainPeriod();
  let reservation;
  try {
    reservation = await reserveBrainQuestion(counter, AXIOMAI_TENANT, limit, period);
  } catch {
    return reply(503, { error: language === "en" ? "Brain's usage counter is not available." : "El contador de Brain no está disponible en este entorno." });
  }
  if (!reservation.ok) {
    return reply(429, {
      error: language === "en"
        ? `You used your ${limit} Brain questions for this month. Add a package of 1,000 questions or wait for next month.`
        : `Ya usaste tus ${limit} preguntas a Brain de este mes. Puedes añadir un paquete de 1,000 preguntas o esperar al próximo mes.`,
      used: reservation.used, limit,
    });
  }
  const refund = () => releaseBrainQuestion(counter, AXIOMAI_TENANT, period).catch(() => undefined);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(buildBrainOwnerRequest({ model: MODEL, history, language })),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await refund();
      console.error("Brain dueño: error de OpenAI", response.status, data?.error?.type, data?.error?.code);
      return reply(502, { error: brainOwnerErrorMessage(response.status, data?.error?.message, language) });
    }
    const text = sanitizeBrainOwnerOutput(extractOutputText(data));
    if (!text) {
      await refund();
      return reply(502, { error: brainOwnerErrorMessage(502, "", language) });
    }
    return reply(200, { reply: text, used: reservation.used, limit });
  } catch (error) {
    await refund();
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error("Brain dueño: fallo de red", aborted ? "timeout" : "error");
    return reply(504, { error: brainOwnerErrorMessage(504, "", language) });
  } finally {
    clearTimeout(timeout);
  }
}
