"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import "./demo.css";

type Industry = "dealer" | "restaurant" | "optica";
type Message = { id: string; by: "cliente" | "axira"; text: string };
type Lead = {
 id: string; industry: Industry; name: string; contact: string;
 need: string; channel: string; status: "Nuevo" | "Contactar" | "Cita solicitada" | "Ganado";
 priority: "Alta" | "Media"; nextAction: string; messages: Message[]; created: string;
};

const industries: Record<Industry, { label: string; customer: string; intro: string; response: string; contact: string; action: string; priority: "Alta" | "Media"; channel: string }> = {
 dealer: { label: "Dealer de autos", customer: "Hola, me interesa un vehículo y quisiera saber sobre financiamiento y una prueba de manejo.", intro: "¡Saludos! Soy Axira, asistente virtual del dealer. Con mucho gusto te ayudo. ¿Me compartes tu nombre y un contacto para coordinar con un asesor?", response: "Perfecto. Registré tu interés en financiamiento y prueba de manejo. Un asesor podrá revisar tu solicitud y coordinar los próximos pasos.", contact: "787-555-0101", action: "Coordinar prueba de manejo y validar opciones de financiamiento", priority: "Alta", channel: "WhatsApp (simulado)" },
 restaurant: { label: "Restaurante", customer: "Buenas, ¿puedo reservar una mesa para cuatro personas mañana por la noche?", intro: "¡Claro! Soy Axira. ¿A nombre de quién sería la reserva y a qué contacto podemos confirmarla? La disponibilidad será verificada por el restaurante.", response: "He registrado la solicitud de mesa para cuatro. El restaurante debe confirmar disponibilidad antes de que la reserva sea definitiva.", contact: "787-555-0102", action: "Confirmar disponibilidad de mesa para cuatro", priority: "Alta", channel: "Instagram (simulado)" },
 optica: { label: "Óptica", customer: "Hola, deseo una cita para un examen visual. ¿Tienen espacios esta semana?", intro: "¡Saludos! Soy Axira, asistente de la óptica. Puedo ayudarte a solicitar una cita. ¿Me indicas tu nombre y un número de contacto? No necesito información médica.", response: "Gracias. Registré tu solicitud administrativa para una cita. La óptica podrá confirmar el horario disponible.", contact: "787-555-0103", action: "Confirmar fecha y hora de cita", priority: "Media", channel: "Messenger (simulado)" },
};
const sampleQuestions: Record<Industry, { question: string; answer: string }[]> = {
 dealer: [
  { question: "¿Puedo hacer una prueba de manejo?", answer: "Con gusto. Puedo registrar tu interés para que un asesor confirme el modelo y la disponibilidad de una prueba de manejo." },
  { question: "¿Ofrecen financiamiento?", answer: "Podemos registrar tu consulta de financiamiento. Un asesor revisará las alternativas y requisitos; no hay una aprobación automática." },
  { question: "¿Me pueden llamar?", answer: "Claro. Registraré una solicitud para que el equipo comercial coordine el contacto." }
 ],
 restaurant: [
  { question: "¿Hay mesa para cuatro personas?", answer: "Puedo registrar la solicitud para cuatro personas. El restaurante confirmará la disponibilidad antes de aceptar la reserva." },
  { question: "¿Tienen opciones vegetarianas?", answer: "Puedo anotar tu pregunta para que el restaurante confirme las opciones del menú actual." },
  { question: "¿Puedo cambiar una reserva?", answer: "Sí, puedo recopilar la solicitud de cambio para que el personal la revise y confirme." }
 ],
 optica: [
  { question: "¿Puedo solicitar una cita?", answer: "Por supuesto. Registraré la solicitud administrativa para que la óptica confirme día y hora disponibles." },
  { question: "¿Trabajan los sábados?", answer: "Puedo dejar registrada tu consulta de horario. La óptica confirmará sus horas de atención vigentes." },
  { question: "¿Puedo recibir un recordatorio?", answer: "Puedo preparar esa solicitud; el equipo de la óptica deberá confirmar la cita y el recordatorio." }
 ]
};
const uid = () => crypto.randomUUID();
function initialMessages(industry: Industry): Message[] {
 const s = industries[industry]; return [{ id: uid(), by: "cliente", text: s.customer }, { id: uid(), by: "axira", text: s.intro }];
}
export default function DemoComercialPage() {
 const [industry, setIndustry] = useState<Industry>("dealer");
 const [messages, setMessages] = useState<Message[]>([]);
 const [leads, setLeads] = useState<Lead[]>([]);
 const [busy, setBusy] = useState(false);
 const [authState, setAuthState] = useState<"checking" | "locked" | "ready">("checking");
 const [accessCode, setAccessCode] = useState("");
 const [authError, setAuthError] = useState("");
 const [ready, setReady] = useState(false);
 const [name, setName] = useState("Andrea Rivera (ficticia)");
 const [contact, setContact] = useState("787-555-0101");
 const [selected, setSelected] = useState<string | null>(null);
 const [tab, setTab] = useState<"conversation" | "crm">("conversation");
 const [notice, setNotice] = useState("");
 useEffect(() => {
  setMessages(initialMessages("dealer"));
  let live = true;
  (async () => {
   try {
    const session = await fetch("/api/demo-comercial/session", { cache: "no-store" });
    const data: { authenticated?: boolean } = await session.json();
    if (!live) return;
    if (!data.authenticated) { setAuthState("locked"); return; }
    setAuthState("ready");
    const res = await fetch("/api/demo-comercial", { cache: "no-store" });
    if (!res.ok) throw new Error("Neon QA no disponible");
    const payload: { leads?: Lead[] } = await res.json();
    if (live && Array.isArray(payload.leads)) {
     setLeads(payload.leads);
     setReady(true);
     setNotice("Sesión autorizada y CRM conectado a Neon QA.");
    }
   } catch {
    if (live) { setReady(false); setAuthState(prev => prev === "checking" ? "locked" : prev); setNotice("No se pudo consultar Neon QA."); }
   }
  })();
  return () => { live = false; };
 }, []);
 async function unlock(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (busy || !accessCode.trim()) return;
  setBusy(true); setAuthError("");
  try {
   const res = await fetch("/api/demo-comercial/session", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: accessCode.trim() })
   });
   if (!res.ok) throw new Error(res.status === 401 ? "Código incorrecto." : "Acceso no disponible.");
   setAccessCode("");
   const leadsRes = await fetch("/api/demo-comercial", { cache: "no-store" });
   if (!leadsRes.ok) throw new Error("Sesión abierta, pero Neon QA no responde.");
   const data: { leads?: Lead[] } = await leadsRes.json();
   if (!Array.isArray(data.leads)) throw new Error("Respuesta inesperada de Neon QA.");
   setLeads(data.leads); setReady(true); setAuthState("ready");
   setNotice("Acceso autorizado · CRM de prueba conectado.");
  } catch (error) { setAuthError(error instanceof Error ? error.message : "No fue posible entrar."); }
  finally { setBusy(false); }
 }
 async function signOut() {
  setBusy(true);
  try { await fetch("/api/demo-comercial/session", { method: "DELETE" }); }
  finally { setBusy(false); setReady(false); setLeads([]); setAuthState("locked"); setSelected(null); setNotice(""); }
 }
 const active = useMemo(() => leads.find(l => l.id === selected) ?? null, [leads, selected]);
 const qualified = leads.filter(l => l.priority === "Alta").length;
 const pending = leads.filter(l => l.status !== "Ganado").length;
 function sendSampleQuestion(index: number) {
  if (busy || !ready || messages.length > 7) return;
  const item = sampleQuestions[industry][index];
  if (!item) return;
  setMessages(prev => [...prev, { id: uid(), by: "cliente", text: item.question }, { id: uid(), by: "axira", text: item.answer }]);
  setNotice("Respuesta simulada por Axira · ninguna conversación externa ni consulta real a un negocio.");
 }
 function changeIndustry(next: Industry) { setIndustry(next); setMessages(initialMessages(next)); setName(next === "dealer" ? "Andrea Rivera (ficticia)" : next === "restaurant" ? "Luis Morales (ficticio)" : "María López (ficticia)"); setContact(industries[next].contact); setNotice(""); setSelected(null); setTab("conversation"); }
 async function captureLead() {
  if (busy || !ready) return;
  if (!/fictici[oa]/i.test(name.trim()) || !/^787-555-[0-9]{4}$/.test(contact.trim())) {
   setNotice("Usa un nombre identificado como ficticio y un número de ejemplo 787-555-XXXX. No introduzcas datos reales.");
   return;
  }
  setBusy(true);
  const s = industries[industry];
  const reply: Message = { id: uid(), by: "axira", text: s.response };
  const conversation = [...messages, { id: uid(), by: "cliente" as const, text: "Mi nombre es " + name.trim() + " y mi contacto es " + contact.trim() + "." }, reply];
  const lead: Lead = { id: uid(), industry, name: name.trim(), contact: contact.trim(), need: s.customer, channel: s.channel, status: industry === "dealer" ? "Contactar" : "Cita solicitada", priority: s.priority, nextAction: s.action, messages: conversation, created: new Date().toISOString() };
  try {
   const res = await fetch("/api/demo-comercial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
   if (!res.ok) throw new Error("Error en Neon QA");
   setMessages(conversation); setLeads(prev => [lead, ...prev]); setSelected(lead.id); setTab("crm");
   setNotice("Prospecto ficticio registrado y confirmado por Neon QA. No se envió ninguna comunicación externa.");
  } catch { setNotice("No se pudo guardar en Neon QA. No se creó ningún prospecto; inténtalo nuevamente."); }
  finally { setBusy(false); }
 }
 async function updateStatus(id: string, value: Lead["status"]) {
  if (busy || !ready) return;
  setBusy(true);
  try {
   const res = await fetch("/api/demo-comercial", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: value }) });
   if (!res.ok) throw new Error("Falló persistencia");
   setLeads(prev => prev.map(l => l.id === id ? { ...l, status: value } : l));
   setNotice("Estado actualizado y confirmado en Neon QA.");
  } catch {
   setNotice("No se pudo actualizar Neon QA. El estado no cambió.");
  } finally { setBusy(false); }
 }
 function reset() { setSelected(null); setMessages(initialMessages(industry)); setTab("conversation"); setNotice("Conversación reiniciada. Los registros compartidos en Neon QA se conservan para mantener su historial."); }
 if (authState !== "ready") return (
  <main className="ad-root ad-login-wrap">
   <section className="ad-login" aria-label="Acceso privado al demo">
    <Image src="/axiomai-logo-transparent.webp" width={96} height={80} alt="AxiomAI Solutions" unoptimized />
    <div className="ad-eyebrow">AXIOMAI SOLUTIONS · ENTORNO QA</div>
    <h1>DEMO comercial privado</h1>
    <p>Recorrido interactivo de Axira y AxiomOS con datos ficticios. Este entorno usa una clave exclusiva para el demo QA, diferente del PIN del CRM. No utiliza WhatsApp ni telefonía reales.</p>
    {authState === "checking" ? <p role="status">Comprobando acceso…</p> :
     <form onSubmit={unlock}>
      <label htmlFor="demo-code">Código de acceso</label>
      <input id="demo-code" type="password" value={accessCode} onChange={e => setAccessCode(e.target.value)}
       placeholder="Código privado de demostración" autoComplete="off" maxLength={128} required />
      <button type="submit" className="ad-primary" disabled={busy}>{busy ? "Validando…" : "Entrar al DEMO →"}</button>
      {authError && <p className="ad-login-error" role="alert">{authError}</p>}
     </form>}
    <small>Solo registros simulados · Datos QA separados de producción</small>
   </section>
  </main>
 );
 return (
  <main className="ad-root">
   <div className="ad-shell">
    <header className="ad-header">
     <div className="ad-brand"><Image src="/axiomai-logo-transparent.webp" width={66} height={54} alt="AxiomAI Solutions" unoptimized /><div><strong>AXIOMAI <span>SOLUTIONS</span></strong><small>DEMO COMERCIAL · AXIRA + AXIOMOS</small></div></div>
     <div className="ad-auth-actions"><span className="ad-sim">● SIMULACIÓN INTERACTIVA · SIN ENVÍOS REALES</span><button type="button" onClick={signOut} disabled={busy} className="ad-reset">Cerrar sesión</button></div>
    </header>
    <section className="ad-hero"><div><div className="ad-eyebrow">INTELIGENCIA COMERCIAL EN ACCIÓN</div><h1>De una conversación<br /><em>a una oportunidad real.</em></h1><p>Observa cómo Axira atiende una consulta, registra un prospecto y organiza su siguiente paso dentro de AxiomOS.</p></div><div className="ad-stats"><div><b>{leads.length}</b><span>Prospectos demo</span></div><div><b>{qualified}</b><span>Prioridad alta</span></div><div><b>{pending}</b><span>Acciones pendientes</span></div></div></section>
    <div className="ad-stepbar"><span><b>01</b> Elige un negocio</span><span><b>02</b> Axira atiende</span><span><b>03</b> CRM registra</span><span><b>04</b> Siguiente acción</span></div>
    <section className="ad-scenarios" aria-label="Escenarios comerciales">{(Object.keys(industries) as Industry[]).map(k => <button type="button" key={k} onClick={() => changeIndustry(k)} className={industry === k ? "ad-scenario active" : "ad-scenario"}><span>{k === "dealer" ? "🚙" : k === "restaurant" ? "🍽️" : "👓"}</span><strong>{industries[k].label}</strong><small>{k === "dealer" ? "Financiamiento y pruebas" : k === "restaurant" ? "Reservaciones y consultas" : "Citas administrativas"}</small></button>)}</section>
    <div className="ad-tabs"><button type="button" className={tab === "conversation" ? "active" : ""} onClick={() => setTab("conversation")}>Conversación con Axira</button><button type="button" className={tab === "crm" ? "active" : ""} onClick={() => setTab("crm")}>AxiomOS CRM <span>{leads.length}</span></button></div>
    {tab === "conversation" ? <section className="ad-panel">
     <div className="ad-panelhead"><div><b>Axira · Atención inteligente</b><small>{industries[industry].channel} — entorno de simulación</small></div><span className="ad-status">● Demo activo</span></div>
     <div className="ad-chat" aria-live="polite">{messages.map(m => <div className={m.by === "axira" ? "ad-bubble bot" : "ad-bubble"} key={m.id}><small>{m.by === "axira" ? "AXIRA" : "CLIENTE FICTICIO"}</small><p>{m.text}</p></div>)}</div>
     <div className="ad-quick"><div><strong>Prueba una pregunta</strong><small>Respuestas preparadas para esta simulación; sin proveedor de IA ni datos reales</small></div><div className="ad-quickbuttons">{sampleQuestions[industry].map((item, i) => <button type="button" key={i} disabled={!ready || busy || messages.length > 7} onClick={() => sendSampleQuestion(i)}>{item.question}</button>)}</div></div>
     <div className="ad-capture"><h3>Completa la solicitud de prueba</h3><div className="ad-fields"><label>Nombre ficticio<input value={name} onChange={e => setName(e.target.value)} maxLength={90} placeholder="Ej.: Andrea Rivera (ficticia)" autoComplete="off" /></label><label>Teléfono ficticio<input value={contact} onChange={e => setContact(e.target.value)} maxLength={12} placeholder="787-555-0101" inputMode="tel" autoComplete="off" /></label></div><button type="button" className="ad-primary" disabled={!ready || busy} onClick={captureLead}>{busy ? "Guardando en Neon QA…" : !ready ? "Neon QA no disponible" : "Registrar en AxiomOS CRM →"}</button></div>
    </section> : <section className="ad-panel">
     <div className="ad-panelhead"><div><b>AxiomOS · Centro comercial</b><small>Prospectos ficticios almacenados en Neon QA; si falla la conexión se deshabilitan los cambios</small></div><button className="ad-reset" type="button" onClick={reset}>Reiniciar demo</button></div>
     <div className="ad-crm"><div className="ad-leads">{leads.length === 0 ? <div className="ad-empty">Aún no hay prospectos de demostración. Vuelve a la conversación y registra uno.</div> : leads.map(l => <button className={selected === l.id ? "ad-lead active" : "ad-lead"} key={l.id} type="button" onClick={() => setSelected(l.id)}><b>{l.name}</b><small>{industries[l.industry].label} · {l.channel}</small><span>{l.priority === "Alta" ? "● Alta prioridad" : "● Prioridad media"} · {l.status}</span></button>)}</div><div className="ad-details">{active ? <><div className="ad-detailtop"><div><small>FICHA DEL PROSPECTO</small><h2>{active.name}</h2><p>{active.contact} · {active.channel}</p></div><span className="ad-priority">{active.priority}</span></div><div className="ad-highlight"><small>PRÓXIMA ACCIÓN RECOMENDADA</small><strong>{active.nextAction}</strong><span>Recomendación simulada · no ejecutada</span></div><label className="ad-statuslabel">Estado de oportunidad<select value={active.status} disabled={busy || !ready} onChange={e => updateStatus(active.id, e.target.value as Lead["status"])}><option>Nuevo</option><option>Contactar</option><option>Cita solicitada</option><option>Ganado</option></select></label><h3>Historial de la conversación</h3><div className="ad-history">{active.messages.map(m => <p key={m.id}><b>{m.by === "axira" ? "Axira" : "Cliente"}:</b> {m.text}</p>)}</div></> : <div className="ad-empty">Selecciona un prospecto para revisar su historial, cambiar el estado y observar la próxima acción.</div>}</div></div>
    </section>}
    {notice && <p role="status" className="ad-notice">{notice}</p>}
    <footer className="ad-footer"><div><strong>AxiomAI Solutions LLC</strong><p>Simulación funcional con persistencia confirmada en Neon QA. Los cambios se bloquean si falla la conexión. No utiliza proveedores reales de WhatsApp ni Telnyx; nunca escribe en el CRM productivo.</p></div><a href="https://www.axiomaisolutions.org/solicitud">Solicitar implementación →</a></footer>
   </div>
  </main>
 );
}
