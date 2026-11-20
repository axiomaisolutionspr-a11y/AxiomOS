"use server";

import { redirect } from "next/navigation";
import { validateItemInput, validateKnowledgeInput } from "../../../lib/axira-catalog-policy.js";
import { AXIOMAI_TENANT, createDraft, neonCatalogDb, restoreVersion, transition } from "../../../lib/axira-catalog-store.js";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../../lib/commercial-identity";

const PATH = "/prospectos/autopilot/catalogo";
type Feedback = { ok?: string; error?: string; tab?: string };
function back(feedback: Feedback): never {
  const params = new URLSearchParams(Object.entries(feedback).filter(([, v]) => v) as [string, string][]);
  redirect(`${PATH}?${params}`);
}

async function requireOwner(tab: string) {
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader) back({ error: "El acceso comercial no está disponible.", tab });
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(reader, data.user.id); }
  catch { back({ error: "No se pudo verificar tu permiso.", tab }); }
  if (membership?.role !== "owner") back({ error: "Solo el propietario puede cambiar el catálogo y los conocimientos.", tab });
  const writer = neonCatalogDb(commercialOfferWriterDatabase());
  if (!writer) back({ error: "La escritura comercial no está habilitada en este entorno.", tab });
  return { writer, actor: `user:${data.user.id}` };
}

function reasonOf(formData: FormData, tab: string) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 3) back({ error: "Escribe el motivo del cambio (queda en la auditoría).", tab });
  return reason.slice(0, 300);
}

export async function saveItemDraft(formData: FormData) {
  const tab = "catalogo";
  const { writer, actor } = await requireOwner(tab);
  const result = validateItemInput({
    key: formData.get("key"), kind: formData.get("kind"), name: formData.get("name"), summary: formData.get("summary"),
    category: formData.get("category"), pricingMode: formData.get("pricingMode"), billingPeriod: formData.get("billingPeriod"),
    regular: formData.get("regular"), promo: formData.get("promo"), promoMonths: formData.get("promoMonths"),
    promoValidUntil: formData.get("promoValidUntil"), usersIncluded: formData.get("usersIncluded"),
    callMinutes: formData.get("callMinutes"), axiraResponses: formData.get("axiraResponses"),
    benefits: formData.get("benefits"), restrictions: formData.get("restrictions"), channels: formData.getAll("channels"),
    validFrom: formData.get("validFrom"), validUntil: formData.get("validUntil"),
  });
  if (!result.ok || !result.value || !result.key) back({ error: result.error || "Revisa los datos.", tab });
  const reason = reasonOf(formData, tab);
  try {
    const row = await createDraft(writer, AXIOMAI_TENANT, "item", result.key, result.value, actor, reason);
    back({ ok: `Borrador v${row.version} de “${result.value.name}” guardado. Revísalo y apruébalo por separado.`, tab });
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("CATALOG_ITEM_DRAFT_FAILED", (error as { code?: string })?.code ?? "unknown");
    back({ error: "No se pudo guardar el borrador.", tab });
  }
}

export async function saveKnowledgeDraft(formData: FormData) {
  const tab = "conocimiento";
  const { writer, actor } = await requireOwner(tab);
  const result = validateKnowledgeInput({
    key: formData.get("key"), topic: formData.get("topic"), language: formData.get("language"),
    title: formData.get("title"), answer: formData.get("answer"), keywords: formData.get("keywords"),
    validFrom: formData.get("validFrom"), validUntil: formData.get("validUntil"),
  });
  if (!result.ok || !result.value || !result.key) back({ error: result.error || "Revisa los datos.", tab });
  const reason = reasonOf(formData, tab);
  try {
    const row = await createDraft(writer, AXIOMAI_TENANT, "knowledge", result.key, result.value, actor, reason);
    back({ ok: `Borrador v${row.version} guardado. Apruébalo y publícalo para que Axira lo use.`, tab });
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("CATALOG_KNOWLEDGE_DRAFT_FAILED", (error as { code?: string })?.code ?? "unknown");
    back({ error: "No se pudo guardar el borrador.", tab });
  }
}

const CONFIRM: Record<string, string> = { approved: "APROBAR", published: "PUBLICAR", archived: "ARCHIVAR", restore: "RESTAURAR" };

export async function changeVersion(formData: FormData) {
  const entity = String(formData.get("entity") ?? "");
  const tab = entity === "knowledge" ? "conocimiento" : "catalogo";
  const { writer, actor } = await requireOwner(tab);
  const key = String(formData.get("key") ?? "");
  const version = Number(formData.get("version"));
  const target = String(formData.get("target") ?? "");
  if (!["item", "knowledge"].includes(entity) || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(key) ||
      !Number.isInteger(version) || version < 1 || !Object.hasOwn(CONFIRM, target)) {
    back({ error: "Selecciona una versión válida.", tab });
  }
  if (String(formData.get("confirmation") ?? "").trim().toUpperCase() !== CONFIRM[target]) {
    back({ error: `Escribe ${CONFIRM[target]} para confirmar.`, tab });
  }
  const reason = reasonOf(formData, tab);
  try {
    if (target === "restore") {
      const row = await restoreVersion(writer, AXIOMAI_TENANT, entity, key, version, actor, reason);
      back({ ok: `Se creó la v${row.version} (aprobada) a partir de la v${version}. Publícala para que Axira la use.`, tab });
    }
    await transition(writer, AXIOMAI_TENANT, entity, key, version, target, actor, reason);
    back({ ok: { approved: "Versión aprobada.", published: "Versión publicada: Axira ya puede usarla en sus canales.", archived: "Versión archivada." }[target], tab });
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    const code = (error as { code?: string })?.code;
    if (code === "STALE" || code === "RESTORE") back({ error: (error as Error).message, tab });
    console.error("CATALOG_TRANSITION_FAILED", code ?? "unknown");
    back({ error: "No se pudo cambiar la versión.", tab });
  }
}
