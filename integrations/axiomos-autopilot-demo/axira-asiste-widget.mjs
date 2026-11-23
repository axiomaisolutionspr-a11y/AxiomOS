import { DEMO_SECTORS, safeDemoSuggestions, validateDemoConversation, validateSuggestionOutput } from "./axira-asiste-policy.mjs";

/**
 * UI de Axira Asiste diseñada como complemento de la ficha de AxiomOS Autopilot DEMO.
 * Se monta por decisión explícita del código fuente de la app. NO se ejecuta al importarla.
 * No usa fetch, secretos, cookies, localStorage, SMS ni mensajería.
 *
 * mountAxiraAsisteDemo({ container: document.getElementById("..."), initial: {
 *   sector: "dealer", businessFacts: "...", messages: [{ by: "cliente", text: "..." }]
 * } })
 *
 * En esta etapa solo ofrece respuestas SIMULADAS. Para IA real se necesitará una
 * API server-side autenticada, con límites, datos sintéticos y aprobación.
 */
function element(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function labeledTextarea(labelText, value, max, rows) {
  const wrap = element("label", "aa-field");
  wrap.append(element("span", "aa-field-label", labelText));
  const field = element("textarea", "aa-textarea");
  field.value = value; field.maxLength = max; field.rows = rows; field.spellcheck = true;
  wrap.append(field);
  return { wrap, field };
}

export function mountAxiraAsisteDemo({ container, initial, generate = safeDemoSuggestions } = {}) {
  if (!container || typeof container.append !== "function" || typeof generate !== "function") {
    throw new Error("Axira Asiste necesita un contenedor y un generador autorizado.");
  }
  const validated = validateDemoConversation(initial);
  if (!validated.ok) throw new Error(validated.error);
  const state = validated.value;
  const panel = element("section", "aa-panel");
  panel.setAttribute("aria-label", "Axira Asiste QA");
  const heading = element("header", "aa-header");
  const titleArea = element("div", "aa-title");
  titleArea.append(element("small", "aa-kicker", "AXIRA ASISTE · DEMO QA"));
  titleArea.append(element("h3", "", "Tu copiloto de respuestas"));
  titleArea.append(element("p", "", "Ayuda para analizar mensajes y preparar respuestas con revisión humana."));
  heading.append(titleArea, element("span", "aa-pill", "Simulación · sin envíos"));
  const showButton = element("button", "aa-button aa-open", "✦ Pregúntale a Axira");
  showButton.type = "button";
  showButton.setAttribute("aria-expanded", "false");
  const body = element("div", "aa-body");
  body.hidden = true;
  const facts = labeledTextarea("Datos ficticios del negocio (editables)", state.businessFacts, 1800, 4);
  const conversationHeading = element("p", "aa-conversation-label", "Conversación ficticia · solo lectura");
  const conversation = element("ol", "aa-conversation");
  for (const message of state.messages) {
    const item = element("li", message.by === "cliente" ? "aa-from-client" : "aa-from-business");
    item.append(element("strong", "", message.by === "cliente" ? "Cliente:" : "Negocio:"));
    item.append(element("p", "", message.text));
    conversation.append(item);
  }
  const action = element("button", "aa-button aa-analyze", "Analizar conversación");
  action.type = "button";
  const note = element("p", "aa-note", "Modo seguro: el resultado es una simulación, no una respuesta generada por un modelo de IA. No se envía ni se guarda.");
  const status = element("p", "aa-status");
  status.setAttribute("role", "status");
  const results = element("div", "aa-results");
  results.setAttribute("aria-live", "polite");

  function showResult(value) {
    results.replaceChildren();
    const heading = element("h4", "", "Recomendación para el empleado");
    results.append(heading);
    for (const [label, field] of [
      ["Intención", "intent"], ["Análisis", "reason"], ["Resumen", "threadSummary"],
      ["Siguiente paso", "nextAction"], ["Precaución", "risk"],
    ]) {
      const item = element("div", "aa-insight");
      item.append(element("strong", "", label), element("p", "", value[field]));
      results.append(item);
    }
    const types = [
      ["quick", "Rápida"], ["empathetic", "Empática"], ["commercial", "Comercial"],
    ];
    for (const [key, label] of types) {
      const wrap = element("div", "aa-answer");
      const head = element("div", "aa-answer-head");
      head.append(element("strong", "", "Respuesta " + label.toLowerCase()));
      const copy = element("button", "aa-button aa-copy", "Copiar");
      copy.type = "button";
      const answer = labeledTextarea("Puedes editar esta sugerencia", value.answers[key], 900, 3);
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(answer.field.value);
          copy.textContent = "Copiada ✓";
        } catch {
          status.textContent = "No se pudo copiar. Selecciona el texto manualmente.";
        }
      });
      head.append(copy);
      wrap.append(head, answer.wrap);
      results.append(wrap);
    }
  }

  action.addEventListener("click", async () => {
    action.disabled = true;
    status.textContent = "";
    results.replaceChildren();
    try {
      const checked = validateDemoConversation({ ...state, businessFacts: facts.field.value });
      if (!checked.ok) throw new Error(checked.error);
      const result = await generate(checked.value);
      if (!result?.ok) throw new Error(result?.error || "No se pudo elaborar la recomendación.");
      const suggestion = validateSuggestionOutput(result);
      if (!suggestion) throw new Error("La respuesta no pasó las validaciones del DEMO.");
      showResult(suggestion);
      status.textContent = result.mode === "simulacion_sin_ia"
        ? "Vista demostrativa local. Ninguna API de IA fue consultada."
        : "Borradores recibidos para aprobación humana. No se enviaron mensajes.";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "No se pudo analizar.";
    } finally {
      action.disabled = false;
    }
  });
  showButton.addEventListener("click", () => {
    body.hidden = !body.hidden;
    showButton.setAttribute("aria-expanded", String(!body.hidden));
    showButton.textContent = body.hidden ? "✦ Pregúntale a Axira" : "Ocultar Axira Asiste";
  });
  body.append(facts.wrap, conversationHeading, conversation, action, note, status, results);
  panel.append(heading, showButton, body);
  container.append(panel);
  return { unmount: () => panel.remove(), element: panel, sectors: DEMO_SECTORS };
}
