// Fail closed until a verified, approved commercial catalog is available in production.
const normalize = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase();

const priceQuestion = /\b(?:ofertas?|promocion(?:es)?|promos?|descuentos?|precios?|tarifas?|costos?|cuesta(?:n)?|cuanto (?:vale|cuesta|cobran)|offers?|promotions?|deals?|discounts?|pric(?:e|es|ing)|costs?|how much)\b/;
const followUp = /\b(?:hasta cuando|sigue(?: vigente)?|todavia|vence|vencimiento|la de|el de|still|that one|until when|expires?|when does it end)\b/;
const money = /[$€£]|\b(?:usd|d[oó]lares?|dollars?|centavos?|cents)\b|\b\d{1,6}[.,]\d{2}\b/i;

export function isUnverifiedOfferQuestion(message, history = []) {
  const current = normalize(message);
  if (priceQuestion.test(current)) return true;
  return followUp.test(current) && history.slice(-6).some((item) =>
    priceQuestion.test(normalize(item.text)) || money.test(String(item.text ?? "")));
}

export function hasUnverifiedCommercialClaim(message) {
  const value = String(message ?? "");
  const normalized = normalize(value);
  return money.test(value) ||
    /\b(?:descuento|rebaja|discount)\b.{0,24}\b\d+[.,]?\d*\s*%|\b\d+[.,]?\d*\s*%\s*(?:de\s+)?(?:descuento|rebaja|off|discount)\b|\b(?:precio|tarifa|price|rate|costo|cost|activacion|setup|monthly)\b.{0,32}\b\d+|\b(?:oferta|promocion|discount|promotion|deal)\b.{0,48}\b(?:vigente|valid|vence|ends|hasta|until|gratis|free)\b|\b(?:mes(?:es)? gratis|months? free|free months?|cupos? (?:disponibles?|confirmados?)|slots? available)\b/.test(normalized);
}

export function commercialUnavailableReply(language, message = "") {
  const english = language === "en" || (language !== "es" &&
    /\b(?:what|how much|pricing|prices?|costs?|discounts?|offers?|deals?|until|expires?)\b/i.test(message));
  return english
    ? "I can’t verify current prices or promotions right now. Our team can confirm the terms before preparing a quote. Which service interests you?"
    : "Ahora mismo no puedo verificar precios ni promociones vigentes. Nuestro equipo puede confirmar las condiciones antes de cotizar. ¿Qué servicio te interesa?";
}
