"use client";

import { useEffect, useRef, useState } from "react";
import type { Contact, Sector } from "../../lib/crm/model";
import { asisteCrmDemoRequest } from "../../lib/axira-asiste-crm-demo.mjs";

type Suggestion = {
  intent: string;
  risk: string;
  reason: string;
  nextAction: string;
  threadSummary: string;
  answers: { quick: string; empathetic: string; commercial: string };
};
type AnswerKey = keyof Suggestion["answers"];
const answerChoices: {key: AnswerKey; label: string}[] = [
  { key: "quick", label: "Respuesta rápida" },
  { key: "empathetic", label: "Respuesta empática" },
  { key: "commercial", label: "Respuesta comercial" },
];
const sectorPolicies: Record<Sector, string> = {
  optica: "Óptica de demostración. Orientamos sobre monturas, lentes, exámenes visuales y citas. Cobertura de plan, disponibilidad, precios y descuentos deben ser confirmados por el personal. No prometer citas ni condiciones sin verificar.",
  dealer: "Dealer de demostración. Ayudamos a identificar vehículos y solicitudes de información. Inventario, precios, financiación, aprobación de crédito, pruebas de manejo y descuentos requieren confirmación de un vendedor autorizado.",
};

export default function AxiraAsisteCrmDemo({ contact, sector }: {contact: Contact; sector: Sector}) {
  const [knowledge, setKnowledge] = useState(sectorPolicies[sector]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<AnswerKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    requestSeq.current += 1;
    setSuggestion(null);
    setError("");
    setCopied(null);
    setOpened(false);
    setKnowledge(sectorPolicies[sector]);
    setBusy(false);
  }, [contact.id, sector, contact.messages.length]);

  async function generate() {
    if (busy) return;
    const checked = asisteCrmDemoRequest(contact, knowledge);
    if (!checked.ok) {
      setSuggestion(null);
      setError(checked.error || "La conversación no se puede analizar.");
      return;
    }
    const seq = ++requestSeq.current;
    setSuggestion(null);
    setError("");
    setCopied(null);
    setBusy(true);
    try {
      const response = await fetch("/api/autopilot/axira-asiste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(checked.value),
      });
      const payload = await response.json().catch(() => null);
      if (requestSeq.current !== seq) return;
      if (!response.ok || !payload?.ok || !payload.result) {
        if (response.status === 401) {
          throw new Error("Inicia sesión en Autopilot QA con un usuario autorizado antes de usar Axira.");
        }
        throw new Error(payload?.error || "Axira no pudo generar una respuesta.");
      }
      setSuggestion(payload.result as Suggestion);
    } catch (failure) {
      if (requestSeq.current === seq) {
        setError(failure instanceof Error ? failure.message : "No se pudo generar la sugerencia.");
      }
    } finally {
      if (requestSeq.current === seq) setBusy(false);
    }
  }

  async function copyAnswer(key: AnswerKey) {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion.answers[key]);
      setCopied(key);
    } catch {
      setError("No fue posible copiar. Selecciona y copia el texto manualmente.");
    }
  }

  function editAnswer(key: AnswerKey, text: string) {
    setCopied(null);
    setSuggestion(current => current ? {
      ...current, answers: { ...current.answers, [key]: text },
    } : null);
  }

  return <section className="axira-crm" aria-label="Axira Asiste dentro del CRM">
    <header className="axira-crm-heading">
      <div>
        <span className="axira-crm-eyebrow">AXIRA ASISTE · QA</span>
        <h2>Tu copiloto de respuestas</h2>
        <p>La conversación ficticia de este prospecto se prepara para que Axira te recomiende qué contestar.</p>
      </div>
      <span className="axira-crm-qa">Datos ficticios</span>
    </header>
    <button type="button" className="simple-button primary axira-crm-launch" onClick={() => setOpened(value => !value)}
      aria-expanded={opened} aria-controls="axira-crm-panel">
      ✦ {opened ? "Ocultar Axira Asiste" : "Pregúntale a Axira"}
    </button>
    {opened && <div id="axira-crm-panel" className="axira-crm-panel">
      <label className="axira-crm-label" htmlFor="axira-crm-facts">Lo que Axira debe saber del negocio</label>
      <textarea id="axira-crm-facts" value={knowledge} maxLength={5000} rows={4}
        onChange={event => { setKnowledge(event.target.value); setSuggestion(null); setCopied(null); }}
        className="axira-crm-textarea" />
      <p className="axira-crm-tip">El historial se toma de esta ficha de demostración. No se consultan ni comparten conversaciones reales.</p>
      <button type="button" className="simple-button primary" onClick={generate} disabled={busy}>
        {busy ? "Analizando mensaje…" : "Analizar y sugerir respuestas"}
      </button>
      {error && <p role="alert" className="axira-crm-error">{error}</p>}
      {suggestion && <div className="axira-crm-result" role="region" aria-label="Recomendaciones de Axira">
        <div><strong>¿Qué busca el cliente?</strong><p>{suggestion.intent}</p></div>
        <div><strong>Consejo de Axira</strong><p>{suggestion.reason}</p></div>
        <div><strong>Resumen de la conversación</strong><p>{suggestion.threadSummary}</p></div>
        <div className="axira-crm-next"><strong>Siguiente paso sugerido</strong><p>{suggestion.nextAction}</p></div>
        <div className="axira-crm-risk"><strong>Precaución</strong><p>{suggestion.risk}</p></div>
        <h3>Respuestas propuestas</h3>
        {answerChoices.map(option => <div className="axira-crm-answer" key={option.key}>
          <div className="axira-crm-answer-heading">
            <label className="axira-crm-label" htmlFor={"axira-crm-" + option.key}>{option.label}</label>
            <button type="button" className="simple-button secondary" onClick={() => copyAnswer(option.key)}>
              {copied === option.key ? "Copiada ✓" : "Copiar"}
            </button>
          </div>
          <textarea className="axira-crm-textarea" id={"axira-crm-" + option.key} rows={3}
            value={suggestion.answers[option.key]} maxLength={1100}
            onChange={event => editAnswer(option.key, event.target.value)} />
        </div>)}
      </div>}
      <p className="axira-crm-tip"><strong>Revisión humana obligatoria.</strong> Esta versión no envía mensajes, no crea recordatorios y no modifica el CRM ni las conexiones de mensajería.</p>
    </div>}
  </section>;
}
