/**
 * Mantiene WhatsApp conversacional sin limitar solicitudes de explicación detallada.
 * La instrucción principal pide brevedad; esto solo aplica un límite de respaldo.
 * @param {string} text
 * @param {string} customerMessage
 * @returns {string}
 */
export function conciseWhatsAppReply(text, customerMessage = "") {
  const normalized = text
    .replace(/\r/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const requestedDetails =
    /(?:paso a paso|m[aá]s detalles|detallad[oa]s?|explica|expl[ií]came|explain|in depth|informaci[oó]n completa|comparaci[oó]n)/i
      .test(customerMessage);
  const maxLength = requestedDetails ? 1300 : 700;
  if (normalized.length <= maxLength) return normalized;

  const prefix = normalized.slice(0, maxLength);
  const minCut = Math.floor(maxLength * 0.6);
  const sentenceEnds = [...prefix.matchAll(/[.!?](?:\s|$)/g)];
  const lastSentence = sentenceEnds.at(-1);
  if (lastSentence && lastSentence.index >= minCut) {
    return prefix.slice(0, lastSentence.index + 1).trim();
  }

  const wordCut = prefix.lastIndexOf(" ");
  return (wordCut >= minCut ? prefix.slice(0, wordCut) : prefix.slice(0, maxLength - 1))
    .trimEnd() + "…";
}
