"use server";

import { redirect } from "next/navigation";
import { validateOfferInput } from "../../lib/axira-offers-policy.js";
import { saveOfferDraft, setOfferStatus } from "../../lib/axira-offers-store.js";
import { commercialIdentityAuth } from "../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember, commercialOfferWriterDatabase } from "../../lib/commercial-identity";

const PATH = "/prospectos/autopilot";
function done(type: "ok" | "error", message: string): never {
  redirect(`${PATH}?${new URLSearchParams({ [type]: message })}`);
}

async function requireOwner() {
  const auth = commercialIdentityAuth();
  const reader = commercialIdentityDatabase();
  if (!auth || !reader) done("error", "El acceso comercial no está disponible.");
  const { data, error } = await auth.getSession();
  if (error || !data?.user) redirect("/prospectos/autopilot/acceso");
  let membership;
  try { membership = await commercialMember(reader, data.user.id); }
  catch { done("error", "No se pudo verificar tu permiso."); }
  if (membership?.role !== "owner") done("error", "Solo el propietario puede administrar ofertas.");
  const writer = commercialOfferWriterDatabase();
  if (!writer) done("error", "La escritura comercial no está habilitada.");
  return { writer, actor: `user:${data.user.id}` };
}

export async function createQaOffer(formData: FormData) {
  const { writer, actor } = await requireOwner();
  const requestId = String(formData.get("requestId") ?? "");
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)) {
    done("error", "Recarga la página antes de guardar el borrador.");
  }
  const result = validateOfferInput({
    name: formData.get("name"), product: formData.get("product"),
    normal: formData.get("normal"), promo: formData.get("promo"), activation: formData.get("activation"),
    start: formData.get("start"), end: formData.get("end"), tax: formData.get("tax"),
    termsEs: formData.get("termsEs"), termsEn: formData.get("termsEn"),
    externalEs: formData.get("externalEs"), externalEn: formData.get("externalEn"),
    maxClients: formData.get("maxClients"), channels: formData.getAll("channels"),
  });
  if (!result.ok || !result.value) done("error", result.error || "Revisa las condiciones de la oferta.");
  let rows;
  try { rows = await saveOfferDraft(writer, result.value, requestId, actor); }
  catch (error) {
    console.error("AUTOPILOT_OFFER_DRAFT_FAILED", (error as {code?: string})?.code ?? "unknown");
    done("error", "No se pudo guardar el borrador.");
  }
  done("ok", rows.length ? "Borrador guardado en QA. Revisa los datos antes de aprobar." : "Esta solicitud ya se registró.");
}

export async function changeQaOfferStatus(formData: FormData) {
  const { writer, actor } = await requireOwner();
  const id = String(formData.get("id") ?? "");
  const revision = Number(formData.get("revision"));
  const target = String(formData.get("target") ?? "");
  if (!/^[1-9]\d{0,17}$/.test(id) || !Number.isInteger(revision) || revision < 1 || revision > 2147483647 ||
      (target !== "approved" && target !== "paused")) done("error", "Selecciona una versión válida.");
  const confirm = target === "approved" ? "APROBAR" : "PAUSAR";
  if (String(formData.get("confirmation") ?? "").trim() !== confirm) {
    done("error", `Escribe ${confirm} para confirmar el cambio.`);
  }
  let rows;
  try { rows = await setOfferStatus(writer, id, revision, target, actor); }
  catch (error) {
    const code = (error as {code?: string})?.code;
    if (code === "23P01") done("error", "Ya existe una promoción aprobada superpuesta para ese servicio.");
    console.error("AUTOPILOT_OFFER_STATUS_FAILED", code ?? "unknown");
    done("error", "No se pudo cambiar el estado de la oferta.");
  }
  if (!rows.length) done("error", "La oferta cambió o venció. Recarga el panel.");
  done("ok", target === "approved" ? "Oferta aprobada para su período y canales autorizados." : "Oferta pausada.");
}
