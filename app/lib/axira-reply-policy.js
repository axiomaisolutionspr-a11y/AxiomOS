/**
 * Respuestas de Axira por WhatsApp: mensajes concisos, completos, sin cortar preguntas.
 * Las solicitudes explícitas de explicación permiten respuestas más extensas.
 */
export function conciseWhatsAppReply(text, customerMessage = "") {
  const normalized = text.replace(/\r/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return "";

  const detailed = /(?:paso a paso|m[aá]s detalles|detallad[oa]s?|expl[ií]came|explain|in depth|informaci[oó]n completa|comparaci[oó]n|profundiza)/i.test(customerMessage);
  const max = detailed ? 1100 : 480;
  if (normalized.length <= max) return normalized;

  const paragraphs = normalized.split(/\n\s*\n/);
  const first = paragraphs[0].trim();
  // La respuesta no debe perder su pregunta de seguimiento al acortarse.
  const lastQuestion = normalized.match(/(?:¿[^¿?\n]{5,180}\?|\b(?:What|How|Would|Do|Are|Can) [^?\n]{5,180}\?)\s*$/i)?.[0]?.trim() ?? "";
  let budget = max - (lastQuestion ? lastQuestion.length + 2 : 0);
  if (budget < 100) budget = max;
  let candidate = first.slice(0, budget);
  if (candidate.length < budget && paragraphs.length > 1) {
    const further = paragraphs.slice(1).join(" ").slice(0, budget - candidate.length - 1);
    candidate += further ? " " + further : "";
  }
  const ends = [...candidate.matchAll(/[.!?](?=\s|$)/g)];
  const end = ends.filter(match => match.index >= Math.floor(budget * .38)).at(-1);
  if (end) candidate = candidate.slice(0, end.index + 1);
  else if (candidate.length >= budget) {
    const word = candidate.lastIndexOf(" ");
    candidate = candidate.slice(0, word > budget * .5 ? word : budget - 1).trimEnd() + "…";
  }
  if (lastQuestion && !candidate.includes(lastQuestion) && candidate.length + lastQuestion.length + 2 <= max) {
    candidate += "\n\n" + lastQuestion;
  }
  return candidate.trim().slice(0, max);
}
