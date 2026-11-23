"use client";

import { useState, type FormEvent } from "react";

type Suggestion = {
  intent: string;
  risk: string;
  reason: string;
  nextAction: string;
  threadSummary: string;
  answers: { quick: string; empathetic: string; commercial: string };
};

const styles = {
  field: "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100",
  label: "mb-2 block text-sm font-semibold text-slate-800",
  card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
};
const stages = [
  "Nuevo", "Seguimiento", "Contactado", "Interesado", "Cita agendada",
  "Cotización enviada", "Negociación", "Vendido", "Perdido",
];
const answers = [
  { key: "quick", name: "Rápida", help: "Directa y corta" },
  { key: "empathetic", name: "Empática", help: "Cercana y comprensiva" },
  { key: "commercial", name: "Comercial", help: "Avanza la oportunidad sin presión" },
] as const;

function parseHistory(value: string) {
  const lines = value.split("\n").map(line => line.trim()).filter(Boolean);
  if (lines.length > 11) throw new Error("Utiliza como máximo 11 mensajes anteriores.");
  return lines.map(line => {
    const match = line.match(/^(Cliente|Negocio)\s*:\s*(.+)$/i);
    if (!match) throw new Error("En el historial usa una línea por mensaje: Cliente: ... o Negocio: ...");
    if (match[2].length > 1500) throw new Error("Un mensaje del historial supera 1,500 caracteres.");
    return { role: match[1].toLowerCase() === "cliente" ? "customer" : "business", text: match[2] };
  });
}

export default function AsisteWorkspace() {
  const [businessName, setBusinessName] = useState("Óptica Ejemplo (ficticia)");
  const [businessKnowledge, setBusinessKnowledge] = useState(
    "Vendemos monturas y lentes. Ofrecemos orientación sobre productos, pero las cotizaciones, descuentos, disponibilidad y citas deben confirmarse con el personal. Atención en español e inglés."
  );
  const [channel, setChannel] = useState("whatsapp");
  const [stage, setStage] = useState("Interesado");
  const [history, setHistory] = useState("Cliente: ¿Tienen espejuelos para trabajar en computadora?\nNegocio: Tenemos diferentes alternativas y podemos orientarle.");
  const [latestMessage, setLatestMessage] = useState("Me interesan, pero no sé si son muy caros. ¿Qué me recomienda?");
  const [result, setResult] = useState<Suggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState("");

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setFeedback("");
    setCopied("");
    setResult(null);
    let messages;
    try {
      messages = [...parseHistory(history), { role: "customer", text: latestMessage.trim() }];
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Revisa el historial.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/autopilot/axira-asiste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ businessName, businessKnowledge, channel, stage, messages }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || !payload.result) {
        throw new Error(payload?.error || "La sugerencia no está disponible.");
      }
      setResult(payload.result as Suggestion);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo contactar Axira Asiste.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAnswer(key: keyof Suggestion["answers"]) {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.answers[key]);
      setCopied(key);
    } catch {
      setFeedback("No se pudo copiar. Selecciona el texto manualmente.");
    }
  }

  function editAnswer(key: keyof Suggestion["answers"], value: string) {
    setCopied("");
    setResult(previous => previous ? {
      ...previous,
      answers: { ...previous.answers, [key]: value },
    } : null);
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6">
      <header className="mx-auto mb-7 max-w-6xl rounded-3xl bg-slate-950 px-6 py-8 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">AxiomOS Autopilot · Preview/QA</p>
        <h1 className="mt-2 text-3xl font-bold">Axira Asiste <span className="text-blue-300">✦</span></h1>
        <p className="mt-3 max-w-2xl text-slate-300">Tu copiloto de respuestas y seguimiento. Analiza el mensaje, revisa tres propuestas y decide tú qué contestar.</p>
        <a className="mt-5 inline-block text-sm font-semibold text-blue-200 underline" href="/prospectos/autopilot">← Volver a Autopilot</a>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={generate} className="grid content-start gap-5">
          <section className={styles.card}>
            <h2 className="text-xl font-bold">1. Enséñale a Axira sobre el negocio</h2>
            <p className="mt-2 text-sm text-slate-600">Configuración temporal para esta consulta. No se guarda en el CRM ni entrena un modelo.</p>
            <div className="mt-5">
              <label htmlFor="asiste-name" className={styles.label}>Nombre del negocio</label>
              <input id="asiste-name" className={styles.field} required maxLength={100}
                value={businessName} onChange={event => setBusinessName(event.target.value)} />
            </div>
            <div className="mt-4">
              <label htmlFor="asiste-knowledge" className={styles.label}>Datos y políticas verificadas</label>
              <textarea id="asiste-knowledge" className={styles.field} rows={6} required maxLength={5000}
                value={businessKnowledge} onChange={event => setBusinessKnowledge(event.target.value)}
                placeholder="Servicios, horarios, condiciones, promociones aprobadas..." />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="asiste-channel" className={styles.label}>Canal</label>
                <select id="asiste-channel" className={styles.field} value={channel} onChange={event => setChannel(event.target.value)}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="messenger">Messenger</option>
                  <option value="sms">SMS</option>
                  <option value="manual">Otro / manual</option>
                </select>
              </div>
              <div>
                <label htmlFor="asiste-stage" className={styles.label}>Etapa del prospecto</label>
                <select id="asiste-stage" className={styles.field} value={stage} onChange={event => setStage(event.target.value)}>
                  {stages.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className="text-xl font-bold">2. Lee la conversación</h2>
            <p className="mt-2 text-sm text-slate-600">En esta fase utiliza únicamente datos ficticios. Cada línea anterior debe empezar con Cliente: o Negocio:</p>
            <div className="mt-5">
              <label htmlFor="asiste-history" className={styles.label}>Historial anterior (opcional)</label>
              <textarea id="asiste-history" className={styles.field} rows={5} maxLength={12000}
                value={history} onChange={event => setHistory(event.target.value)} />
            </div>
            <div className="mt-4">
              <label htmlFor="asiste-last" className={styles.label}>Último mensaje del cliente</label>
              <textarea id="asiste-last" className={styles.field} rows={4} required maxLength={1500}
                value={latestMessage} onChange={event => setLatestMessage(event.target.value)} />
            </div>
            {feedback && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{feedback}</p>}
            <button disabled={busy} type="submit" className="mt-5 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60">
              {busy ? "Axira está analizando…" : "✦ Pregúntale a Axira"}
            </button>
            <p className="mt-3 text-xs text-slate-500">Modo copiloto: no envía mensajes, no crea citas, no guarda datos del prospecto ni ejecuta seguimientos.</p>
          </section>
        </form>

        <div className="grid content-start gap-5">
          <section className={styles.card}>
            <h2 className="text-xl font-bold">3. Consejo de Axira</h2>
            {!result ? <p className="mt-4 text-sm text-slate-600">La intención, los borradores y el próximo paso aparecerán aquí cuando analices una conversación.</p> : (
              <div className="mt-4 grid gap-4 text-sm">
                <div><p className="font-semibold text-blue-800">Intención del cliente</p><p className="mt-1">{result.intent}</p></div>
                <div><p className="font-semibold text-blue-800">Por qué recomendamos esta estrategia</p><p className="mt-1">{result.reason}</p></div>
                <div><p className="font-semibold text-blue-800">Resumen de la conversación</p><p className="mt-1">{result.threadSummary}</p></div>
                <div className="rounded-xl bg-blue-50 p-4"><p className="font-semibold">Siguiente acción sugerida</p><p className="mt-1">{result.nextAction}</p></div>
                <div className="rounded-xl bg-amber-50 p-4"><p className="font-semibold text-amber-950">Precaución</p><p className="mt-1 text-amber-950">{result.risk}</p></div>
              </div>
            )}
          </section>
          {result && <section className={styles.card}>
            <h2 className="text-xl font-bold">4. Elige cómo contestar</h2>
            <p className="mt-2 text-sm text-slate-600">Puedes editar los borradores. Copiar no significa enviar ni aprobar un mensaje.</p>
            <div className="mt-5 grid gap-5">
              {answers.map(answer => <div key={answer.key} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div><h3 className="font-bold">{answer.name}</h3><p className="text-xs text-slate-500">{answer.help}</p></div>
                  <button type="button" onClick={() => copyAnswer(answer.key)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                    {copied === answer.key ? "Copiada ✓" : "Copiar"}
                  </button>
                </div>
                <textarea aria-label={"Editar respuesta " + answer.name} className={styles.field} rows={4}
                  maxLength={1100} value={result.answers[answer.key]}
                  onChange={event => editAnswer(answer.key, event.target.value)} />
              </div>)}
            </div>
          </section>}
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
            <h2 className="font-bold text-blue-950">Protección activa en QA</h2>
            <p className="mt-2">Las recomendaciones necesitan revisión humana. La conexión a las conversaciones reales, los seguimientos automáticos y los envíos por Meta o Telnyx no forman parte de esta fase.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
