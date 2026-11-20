// Brain del dueño — ruta aparte de /api/brain (Axira). Fase 1: sin acceso a datos del CRM.
// Apagada salvo BRAIN_OWNER_ENABLED=true; exige sesión y membresía activa (owner u operator).
import { NextResponse } from "next/server";
import {
  brainLanguage, brainOwnerEnabled, brainOwnerErrorMessage, buildBrainOwnerRequest, canAskBrain,
  cleanBrainHistory, extractOutputText, sanitizeBrainOwnerOutput,
} from "../../../lib/brain-owner-policy.js";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../lib/commercial-identity";

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
      console.error("Brain dueño: error de OpenAI", response.status, data?.error?.type, data?.error?.code);
      return reply(502, { error: brainOwnerErrorMessage(response.status, data?.error?.message, language) });
    }
    const text = sanitizeBrainOwnerOutput(extractOutputText(data));
    if (!text) return reply(502, { error: brainOwnerErrorMessage(502, "", language) });
    return reply(200, { reply: text });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error("Brain dueño: fallo de red", aborted ? "timeout" : "error");
    return reply(504, { error: brainOwnerErrorMessage(504, "", language) });
  } finally {
    clearTimeout(timeout);
  }
}
