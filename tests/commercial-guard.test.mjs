import assert from "node:assert/strict";
import test from "node:test";
import {
  commercialUnavailableReply, hasUnverifiedCommercialClaim, isUnverifiedOfferQuestion,
} from "../app/lib/commercial-guard.mjs";

test("routes expired-promotion questions and follow-ups to a verified fallback", () => {
  assert.equal(isUnverifiedOfferQuestion("¿Cuánto cuesta WhatsApp?"), true);
  assert.equal(isUnverifiedOfferQuestion("What are your current prices?"), true);
  assert.equal(isUnverifiedOfferQuestion("¿Todavía sigue vigente?", [
    { role: "user", text: "¿Cuál es la promoción de CRM?" },
  ]), true);
  assert.equal(isUnverifiedOfferQuestion("¿Sigue la de 39 al mes?"), true);
  assert.equal(isUnverifiedOfferQuestion("Tengo $500 de presupuesto para automatizar citas"), false);
  assert.equal(isUnverifiedOfferQuestion("¿Puedo reservar para mañana?"), false);
});

test("blocks model-generated commercial figures even in a non-pricing conversation", () => {
  for (const claim of ["El plan cuesta $39 al mes.", "La activación es 49.", "39 al mes.", "Tres meses gratis.", "Hay cupos disponibles.", "Promoción con 20% de descuento."]) {
    assert.equal(hasUnverifiedCommercialClaim(claim), true, claim);
  }
  assert.equal(hasUnverifiedCommercialClaim("Podemos analizar tus procesos y coordinar una llamada."), false);
  assert.equal(hasUnverifiedCommercialClaim("El 20% de las consultas trata sobre citas."), false);
});

test("fallback never presents unverified terms as current and supports both languages", () => {
  for (const reply of [
    commercialUnavailableReply("es", "¿Cuál es la oferta?"),
    commercialUnavailableReply("en", "What are your prices?"),
  ]) {
    assert.doesNotMatch(reply, /\$|\b(?:39|15|129|279)\b/);
    assert.match(reply, /confirmar|confirm/i);
  }
});
