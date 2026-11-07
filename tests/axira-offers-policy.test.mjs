import test from "node:test";
import assert from "node:assert/strict";
import {
  puertoRicoDateISO, validateOfferInput, offerIsCurrent,
  isOfferQuestion, formatOffersReply, offersModelInstructions,
} from "../app/lib/axira-offers-policy.js";

const sample = {
  name: "WhatsApp Inicio", description: "Respuestas por WhatsApp",
  monthly: "39.00", activation: "0", startDate: "2026-11-06",
  endDate: "2026-11-30", terms: "Más impuestos.", maxClients: "3",
};

test("Puerto Rico date does not use UTC calendar date at night", () => {
  assert.equal(puertoRicoDateISO(new Date("2026-11-07T02:15:00Z")), "2026-11-06");
  assert.equal(puertoRicoDateISO(new Date("2026-11-07T05:15:00Z")), "2026-11-07");
});

test("validates money, dates, names, slots and prevents inverted dates", () => {
  assert.equal(validateOfferInput(sample).ok, true);
  assert.equal(validateOfferInput({ ...sample, endDate: "2026-11-05" }).ok, false);
  assert.equal(validateOfferInput({ ...sample, endDate: "2026-11-31" }).ok, false);
  assert.equal(validateOfferInput({ ...sample, activation: "-1" }).ok, false);
  assert.equal(validateOfferInput({ ...sample, monthly: "49.999" }).ok, false);
  assert.equal(validateOfferInput({ ...sample, maxClients: "0" }).ok, false);
  assert.equal(validateOfferInput({ ...sample, name: "A" }).ok, false);
});

test("approved offer becomes active and expires inclusive on last day", () => {
  const offer = { status: "approved", start_date: "2026-11-06", end_date: "2026-11-30" };
  assert.equal(offerIsCurrent(offer, "2026-11-05"), false);
  assert.equal(offerIsCurrent(offer, "2026-11-06"), true);
  assert.equal(offerIsCurrent(offer, "2026-11-30"), true);
  assert.equal(offerIsCurrent(offer, "2026-12-01"), false);
  assert.equal(offerIsCurrent({ ...offer, status: "draft" }, "2026-11-10"), false);
  assert.equal(offerIsCurrent({ ...offer, status: "paused" }, "2026-11-10"), false);
});

test("understands Spanish promotional questions", () => {
  assert.equal(isOfferQuestion("¿Qué ofertas tienen?"), true);
  assert.equal(isOfferQuestion("¿Tienen promociones?"), true);
  assert.equal(isOfferQuestion("Ofertas para WhatsApp"), true);
  assert.equal(isOfferQuestion("Quiero una cita"), false);
});

test("response includes dates, costs and clear fallback, and is short", () => {
  const offer = {
    name: "WhatsApp Inicio", monthly_usd: "39.00", activation_usd: "0",
    end_date: "2026-11-30", max_clients: 3,
  };
  const result = formatOffersReply([offer]);
  assert.match(result, /39/);
  assert.match(result, /30\/11\/2026/);
  assert.match(result, /activaci[oó]n/);
  assert.ok(result.length <= 480);
  const noOffer = formatOffersReply([]);
  assert.match(noOffer, /no tenemos ofertas promocionales vigentes/);
});

test("never treats the October offers as valid in current instructions", () => {
  const result = offersModelInstructions([], "2026-11-06");
  assert.match(result, /Ninguna promoción vigente/);
  assert.doesNotMatch(result, /\$39|31 de octubre de 2026/);
});

test("long catalog reply stays within WhatsApp limit and retains expiry", () => {
  const offers = Array.from({ length: 15 }, (_, i) => ({
    name: "Plan " + i, monthly_usd: String(i + 10), activation_usd: "0",
    end_date: "2026-12-31", max_clients: null,
  }));
  const answer = formatOffersReply(offers);
  assert.ok(answer.length <= 480);
  assert.match(answer, /31\/12\/2026/);
});
