"use server";

import { redirect } from "next/navigation";
import { validateOfferInput } from "../../lib/axira-offers-policy.js";
import { offersPilotDatabase, saveOfferDraft, setOfferStatus } from "../../lib/axira-offers-store.js";

import { hasCatalogSession, matchesSecret } from "./access";

const PATH = "/prospectos/ofertas";

function done(type: "ok" | "error", message: string): never {
  redirect(`${PATH}?${new URLSearchParams({ [type]: message })}`);
}

async function requireCatalogSession() {
  const sql = offersPilotDatabase();
  if (!sql) done("error", "El catálogo requiere una conexión QA aislada.");
  if (process.env.AXIRA_OFFERS_QA_REVIEW_ONLY === "true") {
    done("error", "La vista de revisión permite únicamente consultar el catálogo.");
  }

  if (!(await hasCatalogSession())) {
    done("error", "Inicia sesión en el CRM para administrar las ofertas.");
  }
  return sql;
}

export async function createOffer(formData: FormData) {
  const sql = await requireCatalogSession();
  const requestId = String(formData.get("requestId") ?? "");
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)) {
    done("error", "Recarga la página e intenta guardar el borrador otra vez.");
  }
  const result = validateOfferInput({
    name: formData.get("name"), product: formData.get("product"),
    normal: formData.get("normal"), promo: formData.get("promo"), activation: formData.get("activation"),
    start: formData.get("start"), end: formData.get("end"),
    tax: formData.get("tax"), termsEs: formData.get("termsEs"), termsEn: formData.get("termsEn"),
    externalEs: formData.get("externalEs"), externalEn: formData.get("externalEn"),
    maxClients: formData.get("maxClients"), channels: formData.getAll("channels"),
  });
  if (!result.ok || !result.value) done("error", result.error || "Revisa los datos de la oferta.");

  let rows;
  try {
    rows = await saveOfferDraft(sql, result.value, requestId);
  } catch (error) {
    console.error("AXIRA_OFFERS_DRAFT_FAILED", (error as { code?: string })?.code ?? "unknown");
    done("error", "No se pudo guardar el borrador en el catálogo QA.");
  }
  done("ok", rows.length ? "Borrador guardado. Revisa los datos antes de aprobarlo." : "Esta solicitud ya se registró.");
}

export async function changeOfferStatus(formData: FormData) {
  const sql = await requireCatalogSession();
  const id = String(formData.get("id") ?? "");
  const revision = Number(formData.get("revision"));
  const target = String(formData.get("target") ?? "");
  if (!/^[1-9]\d{0,17}$/.test(id) || !Number.isInteger(revision) || revision < 1 || revision > 2147483647 ||
    (target !== "approved" && target !== "paused")) {
    done("error", "Recarga el catálogo y selecciona una versión válida.");
  }

  const key = process.env.AXIOMOS_OFFERS_APPROVAL_KEY;
  const provided = String(formData.get("approvalKey") ?? "");
  if (!key || key.length < 24 || !provided || !matchesSecret(provided, key)) {
    done("error", "Se requiere la clave de administración del catálogo QA.");
  }
  const confirm = target === "approved" ? "APROBAR" : "PAUSAR";
  if (String(formData.get("confirmation") ?? "").trim() !== confirm) {
    done("error", `Escribe ${confirm} para confirmar el cambio.`);
  }

  let rows;
  try {
    rows = await setOfferStatus(sql, id, revision, target);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "23P01") done("error", "Ya hay una oferta aprobada para ese servicio con horarios superpuestos.");
    console.error("AXIRA_OFFERS_STATUS_FAILED", code ?? "unknown");
    done("error", "No se pudo cambiar el estado de la oferta.");
  }
  if (!rows.length) done("error", "La versión cambió, la oferta venció o el cambio ya se procesó. Recarga el catálogo.");
  done("ok", target === "approved" ? "Oferta aprobada para los canales y el horario seleccionados."
    : "Oferta pausada. Quedó fuera de las consultas vigentes.");
}
