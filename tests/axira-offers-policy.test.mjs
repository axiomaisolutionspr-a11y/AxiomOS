import test from "node:test";
import assert from "node:assert/strict";
import {
  formatOffersReply, getOfferState, hasUnverifiedCommercialClaim, isOfferQuestion,
  offerLanguage, puertoRicoLocalDateTime, validateOfferInput,
} from "../app/lib/axira-offers-policy.js";
import { commercialOffersDatabase, commercialOffersEnabled } from "../app/lib/axira-offers-store.js";

const input = {
  name: "CRM QA", product: "crm", normal: "59.00", promo: "9.99", activation: "25.5",
  start: "2026-11-06T23:30", end: "2026-11-07T00:00", channels: ["whatsapp", "messenger"],
  tax: "excluded", termsEs: "Contrato de 12 meses.", termsEn: "12-month agreement.",
  externalEs: "Licencias aparte.", externalEn: "Licenses billed separately.", maxClients: "3",
};

const offer = {
  id: "1", name: "CRM QA", product_key: "crm", status: "approved",
  normal_cents: 5900, promo_cents: 999, activation_cents: 2550,
  starts_at: "2026-11-07T03:30:00.000Z", ends_at: "2026-11-07T04:00:00.000Z",
  tax_included: false, terms_es: input.termsEs, terms_en: input.termsEn,
  external_es: input.externalEs, external_en: input.externalEn, max_clients: 3,
};

const activeTime = Date.parse("2026-11-07T03:45:00Z");
const catalog = (offers) => ({ status: "ok", offers });

test("preserves cents and the exact commercial window in Puerto Rico", () => {
  assert.equal(puertoRicoLocalDateTime(new Date(offer.starts_at)), input.start);
  const result = validateOfferInput(input);
  assert.equal(result.ok, true);
  assert.equal(result.value.normal, 5900);
  assert.equal(result.value.promo, 999);
  assert.equal(result.value.activation, 2550);
  assert.equal(result.value.start, offer.starts_at);
  assert.equal(result.value.end, offer.ends_at);
});

test("rejects invalid dates, money, prices, channels and missing commercial terms", () => {
  for (const invalid of [
    { end: "2026-11-31T00:00" }, { start: input.end }, { end: "2026-11-07T24:00" },
    { activation: "-1" }, { promo: "49.999" }, { promo: "69.00" },
    { product: "constructor" }, { maxClients: "0" }, { maxClients: "3.1" },
    { name: "A" }, { channels: ["sms"] }, { channels: [] }, { tax: "" },
    { termsEs: "" }, { externalEs: "" },
  ]) {
    assert.equal(validateOfferInput({ ...input, ...invalid }).ok, false, JSON.stringify(invalid));
  }
});

test("starts inclusively and expires on the exact minute without a background job", () => {
  const starts = Date.parse(offer.starts_at);
  const ends = Date.parse(offer.ends_at);
  assert.equal(getOfferState(offer, starts - 1), "scheduled");
  assert.equal(getOfferState(offer, starts), "active");
  assert.equal(getOfferState(offer, ends - 1), "active");
  assert.equal(getOfferState(offer, ends), "expired");
  assert.equal(getOfferState({ ...offer, status: "paused" }, starts), "paused");
  assert.equal(getOfferState({ ...offer, status: "draft" }, starts), "draft");
  assert.equal(getOfferState({ ...offer, ends_at: "" }, starts), "unavailable");
});

test("recognizes commercial questions and follow-ups without routing unrelated appointments", () => {
  for (const message of ["¿Qué oferta tienen?", "¿Sigue la de $9.99?", "¿Cuánto cuesta?",
    "¿Tienen una promoción?", "Do you have an offer?", "How much is CRM?"]) {
    assert.equal(isOfferQuestion(message), true, message);
  }
  assert.equal(isOfferQuestion("¿Hasta cuándo?", [{ text: "¿Qué oferta tienen para CRM?" }]), true);
  assert.equal(isOfferQuestion("¿Hasta cuándo estará el equipo en la oficina?", [{ text: "Quiero una cita" }]), false);
  assert.equal(isOfferQuestion("Quiero una cita"), false);
  assert.equal(offerLanguage(undefined, "What is the price?"), "en");
  assert.equal(offerLanguage("es", "What is the price?"), "es");
});

test("replies only with published figures, taxes, external charges and the exact expiry", () => {
  const reply = formatOffersReply(catalog([offer]), { now: activeTime, message: "Precio CRM" });
  assert.match(reply, /\$9\.99\/mes \(regular \$59\.00\)/);
  assert.match(reply, /Activación \$25\.50/);
  assert.match(reply, /7 de noviembre de 2026.*12:00.*hora de Puerto Rico/);
  assert.match(reply, /Impuestos aparte/);
  assert.match(reply, /Contrato de 12 meses/);
  assert.match(reply, /Licencias aparte/);
  assert.match(reply, /Cupos sujetos a confirmación/);
  assert.doesNotMatch(reply, /3 disponibles/);
  assert.ok(reply.length <= 480);
  const en = formatOffersReply(catalog([offer]), { language: "en", message: "Price of CRM", now: activeTime });
  assert.match(en, /Ends November 7, 2026.*Puerto Rico time/);
  assert.match(en, /12-month agreement/);
});

test("fails safely on missing English terms, unverified lookup, wrong product, and expiry", () => {
  const opts = { now: activeTime, message: "Precio CRM" };
  assert.doesNotMatch(formatOffersReply(catalog([{ ...offer, external_en: "" }]), { ...opts, language: "en" }), /\$/);
  assert.doesNotMatch(formatOffersReply(catalog([offer]), { ...opts, message: "Precio para WhatsApp" }), /\$/);
  assert.doesNotMatch(formatOffersReply(catalog([offer]), { ...opts, message: "Precio de un robot" }), /\$/);
  assert.doesNotMatch(formatOffersReply(catalog([offer]), { ...opts, message: "Cuánto cuesta pintar un apartamento" }), /\$/);
  assert.doesNotMatch(formatOffersReply(catalog([offer]), { ...opts, now: Date.parse(offer.ends_at) }), /\$/);
  assert.doesNotMatch(formatOffersReply(catalog([offer]), { ...opts, maxChars: 75 }), /\$/);
  assert.match(formatOffersReply({ status: "unavailable", offers: [] }), /no puedo verificar/);
  assert.match(formatOffersReply(catalog([])), /no tenemos una promoción vigente/);
});

test("guards model-generated figures and unverified availability", () => {
  for (const message of ["Sí, sigue a $9.99", "Tiene un 20% de descuento", "El costo es 39 al mes",
    "La promoción está vigente", "Hay cupos disponibles", "Three months free"]) {
    assert.equal(hasUnverifiedCommercialClaim(message), true, message);
  }
  assert.equal(hasUnverifiedCommercialClaim("Podemos prepararte una cotización."), false);
});

test("the pilot fails closed on production, the legacy database, or an unapproved endpoint", () => {
  const env = {
    VERCEL_ENV: "preview", AXIRA_OFFERS_QA_ENABLED: "true",
    AXIRA_OFFERS_QA_DATABASE_URL: "postgresql://axiomos_offers_qa_reader:qa@ep-test-pooler.example/axiomos_offers_qa",
    AXIRA_OFFERS_QA_DATABASE_HOST: "ep-test.example", DATABASE_URL: "postgresql://app:qa@ep-legacy.example/neondb",
  };
  assert.equal(commercialOffersEnabled(env), true);
  assert.ok(commercialOffersDatabase(env));
  assert.equal(commercialOffersDatabase({ ...env, VERCEL_ENV: "production" }), null);
  const prod = { VERCEL_ENV: "production", AXIOMOS_COMMERCIAL_ENABLED: "true", AXIOMOS_COMMERCIAL_DATABASE_HOST: "ep-prod.example", AXIOMOS_COMMERCIAL_DATABASE_URL: "postgresql://axiomos_commercial_reader:test@ep-prod-pooler.example/neondb" };
  assert.ok(commercialOffersDatabase(prod));
  assert.equal(commercialOffersDatabase({...prod, AXIOMOS_COMMERCIAL_ENABLED: "false"}), null);
  assert.equal(commercialOffersDatabase({...prod, AXIOMOS_COMMERCIAL_DATABASE_URL: "postgresql://owner:test@ep-prod.example/neondb"}), null);
  assert.equal(commercialOffersDatabase({ ...env, AXIRA_OFFERS_QA_ENABLED: "false" }), null);
  assert.equal(commercialOffersDatabase({ ...env, AXIRA_OFFERS_QA_DATABASE_HOST: "ep-legacy.example" }), null);
  assert.equal(commercialOffersDatabase({ ...env, AXIRA_OFFERS_QA_DATABASE_URL: env.AXIRA_OFFERS_QA_DATABASE_URL.replace("axiomos_offers_qa", "neondb") }), null);
  assert.equal(commercialOffersDatabase({ ...env, DATABASE_URL: "postgresql://app:qa@ep-test.example/neondb" }), null);
});
