"use server";

import { redirect } from "next/navigation";
import { getOfferState } from "../../../lib/axira-offers-policy.js";
import { listOffers } from "../../../lib/axira-offers-store.js";
import { AXIOMAI_TENANT, loadPublishedCatalog, neonCatalogDb } from "../../../lib/axira-catalog-store.js";
import { knowledgeContext, relevantKnowledge } from "../../../lib/axira-catalog-policy.js";
import {
  analyzeConversation, answerBrain, BRAIN_MAX_CONVERSATION, BRAIN_MAX_QUESTION, BRAIN_PLAN_KEYS, brainAiInstructions, brainAllowance, brainHistory, brainPeriod, cancelPack, confirmPackForTest, conversationAnalysisTask,
  consumeQuestion, readBrainState, refundQuestion, requestPack, setTestPlan,
} from "../../../lib/axiomos-brain.js";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";

const PATH = "/prospectos/autopilot/brain";
const isQa = () => process.env.VERCEL_ENV === "preview";
type Reader = NonNullable<ReturnType<typeof commercialIdentityDatabase>>;
export type BrainReply = { ok: boolean; answer?: string; used?: number; limit?: number; blocked?: boolean; free?: boolean; error?: string };

async function member() {
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader) return null;
  const { data, error } = await auth.getSession();
  if (error || !data?.user) return null;
  let membership;
  try { membership = await commercialMember(reader, data.user.id); } catch { return null; }
  if (!membership) return null;
  return { reader, role: membership.role as "owner" | "operator" | "viewer", actor: `user:${data.user.id}` };
}

/** Lo que Brain puede ver del CRM: solo resúmenes de solo lectura (nunca datos personales de prospectos). */
async function crmSnapshot(reader: Reader) {
  let offers: { active: string[]; drafts: string[]; expiring: string[] } | null = null;
  try {
    const rows = await listOffers(reader) as Array<Record<string, unknown> & { name: string; ends_at: string; checked_at_ms: string }>;
    const now = rows.length ? Number(rows[0].checked_at_ms) : Date.now();
    const withState = rows.map((offer) => ({ offer, state: getOfferState(offer, now) }));
    const active = withState.filter(({ state }) => state === "active");
    offers = {
      active: active.map(({ offer }) => offer.name),
      drafts: withState.filter(({ state }) => state === "draft").map(({ offer }) => offer.name),
      expiring: active.filter(({ offer }) => Date.parse(offer.ends_at) - now <= 72 * 60 * 60 * 1000).map(({ offer }) => offer.name),
    };
  } catch { offers = null; }
  // Igual que el Panel: el resumen de prospectos solo existe en producción y con su permiso encendido.
  let prospects: Record<string, number> | null = null;
  if (process.env.VERCEL_ENV === "production" && process.env.AXIOMOS_AUTOPILOT_PROSPECT_SUMMARY_ENABLED === "true") {
    try {
      const rows = await reader`SELECT total, new_count, interested_count, followup_count, lost_count, overdue_count, due_next_7_days, with_notes, unassigned FROM axiomos_commercial.legacy_prospect_summary`;
      const value = rows[0];
      if (value && Object.values(value).every((v) => Number.isSafeInteger(Number(v)) && Number(v) >= 0)) {
        prospects = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, Number(v)]));
      }
    } catch { prospects = null; }
  }
  return { offers, prospects };
}

/** IA opcional: solo si el ambiente la tiene encendida a propósito. Si falla, se devuelve la pregunta. */
async function aiAnswer(question: string, lang: "es" | "en", context: string, history: Array<{ role: string; content: string }> = []): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (process.env.AXIOMOS_BRAIN_AI_ENABLED !== "true" || !key) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", signal: AbortSignal.timeout(25000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        // Esfuerzo de razonamiento bajo: con el valor por defecto el razonamiento puede gastar todo el
        // límite de salida y devolver una respuesta vacía (la pregunta se devolvería sin contestar).
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna", max_output_tokens: 1200, store: false,
        reasoning: { effort: "low" },
        instructions: brainAiInstructions(lang, context),
        input: [...history, { role: "user", content: question }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = typeof data.output_text === "string" ? data.output_text
      : (data.output ?? []).flatMap((o) => o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("\n");
    return text.trim().slice(0, 2000) || null;
  } catch { return null; }
}

/** Una pregunta a Brain. Cuenta contra el límite del mes solo si Brain pudo contestarla. */
export async function askBrain(question: string, lang: "es" | "en", previous: unknown = []): Promise<BrainReply> {
  const english = lang === "en";
  const text = String(question ?? "").trim().slice(0, BRAIN_MAX_QUESTION);
  if (text.length < 2) return { ok: false, error: english ? "Write a question." : "Escribe una pregunta." };
  const who = await member();
  if (!who) return { ok: false, error: english ? "Your session ended. Sign in again." : "Tu sesión terminó. Vuelve a entrar." };
  const writer = neonCatalogDb(commercialOfferWriterDatabase());
  const reader = neonCatalogDb(who.reader);
  if (!writer || !reader) return { ok: false, error: english ? "Brain isn't enabled in this environment." : "Brain no está habilitado en este ambiente." };
  const period = brainPeriod();
  try {
    const [catalog, state, crm] = await Promise.all([
      loadPublishedCatalog(reader, AXIOMAI_TENANT, "web"), readBrainState(reader, AXIOMAI_TENANT, period), crmSnapshot(who.reader),
    ]);
    const allowance = brainAllowance(catalog, state.account);
    if (state.used >= allowance.limit) return { ok: true, blocked: true, used: state.used, limit: allowance.limit };
    const local = answerBrain({ message: text, language: lang, catalog, crm, allowance, used: state.used + 1 });
    const aiOn = process.env.AXIOMOS_BRAIN_AI_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);
    if (!local.charge && !aiOn) return { ok: true, answer: local.text, used: state.used, limit: allowance.limit, free: true };
    if (!local.charge) {
      const context = knowledgeContext(relevantKnowledge(catalog, text, { language: lang }), []) +
        `\nRESUMEN DEL CRM (datos): ofertas activas ${crm.offers?.active.length ?? "sin datos"}, borradores ${crm.offers?.drafts.length ?? "sin datos"}` +
        (crm.prospects ? `, prospectos ${crm.prospects.total}, seguimientos atrasados ${crm.prospects.overdue_count}` : ", prospectos sin conectar");
      const used = await consumeQuestion(writer, AXIOMAI_TENANT, period, allowance.limit, who.actor, "ai");
      if (used === null) return { ok: true, blocked: true, used: allowance.limit, limit: allowance.limit };
      const ai = await aiAnswer(text, lang, context, brainHistory(previous));
      if (ai) return { ok: true, answer: ai, used, limit: allowance.limit };
      await refundQuestion(writer, AXIOMAI_TENANT, period, who.actor);
      return { ok: true, answer: local.text, used: used - 1, limit: allowance.limit, free: true };
    }
    const used = await consumeQuestion(writer, AXIOMAI_TENANT, period, allowance.limit, who.actor, local.source);
    if (used === null) return { ok: true, blocked: true, used: allowance.limit, limit: allowance.limit };
    return { ok: true, answer: local.text, used, limit: allowance.limit };
  } catch (error) {
    console.error("BRAIN_ASK_FAILED", (error as { code?: string })?.code ?? "unknown");
    return { ok: false, error: english ? "Brain couldn't answer right now. The question wasn't counted." : "Brain no pudo contestar ahora. La pregunta no se contó." };
  }
}

/**
 * Brain analiza una conversación de Axira (o del equipo) con un cliente y dice qué responder.
 * Cuenta 1 pregunta. Con IA encendida: análisis completo; sin IA (o si la IA falla): análisis por
 * reglas a partir del texto pegado. La conversación nunca se guarda.
 */
export async function analyzeBrainConversation(conversation: string, lang: "es" | "en"): Promise<BrainReply> {
  const english = lang === "en";
  const text = String(conversation ?? "").trim().slice(0, BRAIN_MAX_CONVERSATION);
  if (text.length < 10) return { ok: false, error: english ? "Paste the conversation first." : "Pega primero la conversación." };
  const who = await member();
  if (!who) return { ok: false, error: english ? "Your session ended. Sign in again." : "Tu sesión terminó. Vuelve a entrar." };
  const writer = neonCatalogDb(commercialOfferWriterDatabase());
  const reader = neonCatalogDb(who.reader);
  if (!writer || !reader) return { ok: false, error: english ? "Brain isn't enabled in this environment." : "Brain no está habilitado en este ambiente." };
  const period = brainPeriod();
  try {
    const [catalog, state] = await Promise.all([loadPublishedCatalog(reader, AXIOMAI_TENANT, "web"), readBrainState(reader, AXIOMAI_TENANT, period)]);
    const allowance = brainAllowance(catalog, state.account);
    if (state.used >= allowance.limit) return { ok: true, blocked: true, used: state.used, limit: allowance.limit };
    const aiOn = process.env.AXIOMOS_BRAIN_AI_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);
    const used = await consumeQuestion(writer, AXIOMAI_TENANT, period, allowance.limit, who.actor, aiOn ? "ai" : "help");
    if (used === null) return { ok: true, blocked: true, used: allowance.limit, limit: allowance.limit };
    if (aiOn) {
      const context = conversationAnalysisTask(lang) + "\n" + knowledgeContext(relevantKnowledge(catalog, text, { language: lang }), catalog.status === "ok"
        ? catalog.items.filter((i: { kind: string; pricing_mode: string }) => i.kind === "plan" && i.pricing_mode === "fixed") : []);
      const ai = await aiAnswer(`${english ? "CONVERSATION" : "CONVERSACIÓN"}:\n${text}`, lang, context);
      if (ai) return { ok: true, answer: ai, used, limit: allowance.limit };
    }
    // Sin IA (o si la IA falló): análisis por reglas a partir del texto pegado.
    const messages = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const m = line.match(/^([^:]{1,30}):\s*(.*)$/);
      const who = m ? m[1].toLowerCase() : "";
      const from = /^(axira|t[uú]|you|yo|agente|asesor|equipo|negocio)\b/.test(who) ? "axira" : "client";
      return { from, text: m ? m[2] : line };
    });
    const a = analyzeConversation({ messages, language: lang, catalog });
    const answer = english
      ? `What the client wants: ${a.wants}\nTone: ${a.tone}\nHow Axira did:\n${a.review.map((r) => `- ${r}`).join("\n")}\nRecommended reply:\n${a.reply}\nNext step: ${a.next}`
      : `Qué quiere el cliente: ${a.wants}\nTono: ${a.tone}\nCómo lo hizo Axira:\n${a.review.map((r) => `- ${r}`).join("\n")}\nRespuesta recomendada:\n${a.reply}\nPróximo paso: ${a.next}`;
    return { ok: true, answer, used, limit: allowance.limit };
  } catch (error) {
    console.error("BRAIN_ANALYZE_FAILED", (error as { code?: string })?.code ?? "unknown");
    return { ok: false, error: english ? "Brain couldn't analyze it right now. The question wasn't counted." : "Brain no pudo analizarla ahora. La pregunta no se contó." };
  }
}

type Feedback = { ok?: string; error?: string };
function back(feedback: Feedback): never {
  const params = new URLSearchParams(Object.entries(feedback).filter(([, v]) => v) as [string, string][]);
  redirect(`${PATH}?${params}#plan`);
}
async function ownerWriter() {
  const who = await member();
  if (!who) redirect("/prospectos/autopilot/acceso");
  if (who.role !== "owner") back({ error: "Solo el propietario puede pedir paquetes o cambiar el plan." });
  const writer = neonCatalogDb(commercialOfferWriterDatabase());
  const reader = neonCatalogDb(who.reader);
  if (!writer || !reader) back({ error: "Brain no está habilitado en este ambiente." });
  return { who, writer, reader };
}
const rethrowRedirect = (error: unknown) => {
  if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
};

/** Pide un paquete adicional. No cobra: queda pendiente hasta que AxiomAI confirme el pago. */
export async function requestBrainPack() {
  const { who, writer, reader } = await ownerWriter();
  try {
    const catalog = await loadPublishedCatalog(reader, AXIOMAI_TENANT, "web");
    const { pack } = brainAllowance(catalog, {});
    if (!pack) back({ error: "El paquete de preguntas no está publicado en el Centro Comercial." });
    const id = await requestPack(writer, AXIOMAI_TENANT, pack, who.actor);
    if (!id) back({ error: "Ya tienes una solicitud de paquete pendiente." });
    back({ ok: "Solicitud de paquete enviada. Se activa cuando se confirme el pago." });
  } catch (error) {
    rethrowRedirect(error);
    console.error("BRAIN_PACK_REQUEST_FAILED", (error as { code?: string })?.code ?? "unknown");
    back({ error: "No se pudo enviar la solicitud." });
  }
}

export async function cancelBrainPack(formData: FormData) {
  const { who, writer } = await ownerWriter();
  try {
    const done = await cancelPack(writer, AXIOMAI_TENANT, String(formData.get("id") ?? ""), who.actor);
    back(done ? { ok: "Solicitud cancelada." } : { error: "Esa solicitud ya no está pendiente." });
  } catch (error) { rethrowRedirect(error); back({ error: "No se pudo cancelar la solicitud." }); }
}

/** SOLO QA: confirma un pago de prueba (no hay cobro real) para ver cómo se activa el paquete. */
export async function confirmBrainPackTest(formData: FormData) {
  if (!isQa()) back({ error: "Esta acción solo existe en el ambiente de prueba." });
  const { who, writer } = await ownerWriter();
  try {
    const packs = await confirmPackForTest(writer, AXIOMAI_TENANT, String(formData.get("id") ?? ""), who.actor);
    back(packs === null ? { error: "Esa solicitud ya no está pendiente." } : { ok: "Pago de prueba confirmado (sin cobro real). Paquete activado." });
  } catch (error) { rethrowRedirect(error); back({ error: "No se pudo confirmar el pago de prueba." }); }
}

/** SOLO QA: cambia el plan de prueba, o reinicia la prueba (Gratis, sin paquetes, contador del mes en 0). */
export async function setBrainTestPlan(formData: FormData) {
  if (!isQa()) back({ error: "Esta acción solo existe en el ambiente de prueba." });
  const { who, writer } = await ownerWriter();
  const reset = formData.get("reset") === "1";
  const plan = reset ? "axiomos-gratis" : String(formData.get("plan") ?? "");
  if (!BRAIN_PLAN_KEYS.includes(plan)) back({ error: "Plan no válido." });
  try {
    await setTestPlan(writer, AXIOMAI_TENANT, plan, who.actor, { reset });
    back({ ok: reset ? "Prueba reiniciada: plan Gratis, sin paquetes y contador en 0." : "Plan de prueba cambiado." });
  } catch (error) { rethrowRedirect(error); back({ error: "No se pudo cambiar el plan de prueba." }); }
}
