"use client";

import { useEffect, useMemo, useState } from "react";
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
const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + String(Math.random());
function initialMessages(industry: Industry): Message[] {
 const s = industries[industry]; return [{ id: uid(), by: "cliente", text: s.customer }, { id: uid(), by: "axira", text: s.intro }];
}
export default function DemoComercialPage() {
 const [industry, setIndustry] = useState<Industry>("dealer");
 const [messages, setMessages] = useState<Message[]>([]);
 const [leads, setLeads] = useState<Lead[]>([]);
 const [busy, setBusy] = useState(false);
 const [ready, setReady] = useState(false);
 const [name, setName] = useState("Andrea Rivera (ficticia)");
 const [contact, setContact] = useState("787-555-0101");
 const [selected, setSelected] = useState<string | null>(null);
 const [tab, setTab] = useState<"conversation" | "crm">("conversation");
 const [notice, setNotice] = useState("");
 useEffect(() => {
  setMessages(initialMessages("dealer"));

  let live = true;
  fetch("/api/demo-comercial", { cache: "no-store" })
   .then(async r => { if (!r.ok) throw new Error("Neon QA no disponible"); return r.json(); })
   .then(data => { if (live && Array.isArray(data.leads)) { setLeads(data.leads); setReady(true); setNotice("Conectado a Neon QA · registros ficticios compartidos."); } })
   .catch(() => { if (live) { setReady(false); setNotice("No hay conexión con Neon QA. El registro de prospectos está deshabilitado hasta restablecer la conexión."); } });
  return () => { live = false; };
 }, []);

 const active = useMemo(() => leads.find(l => l.id === selected) ?? null, [leads, selected]);
 const qualified = leads.filter(l => l.priority === "Alta").length;
 const pending = leads.filter(l => l.status !== "Ganado").length;
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
 return (
  <main className="ad-root">
   <div className="ad-shell">
    <header className="ad-header">
     <div className="ad-brand"><Image src="/axiomai-logo-transparent.webp" width={66} height={54} alt="AxiomAI Solutions" unoptimized /><div><strong>AXIOMAI <span>SOLUTIONS</span></strong><small>DEMO COMERCIAL · AXIRA + AXIOMOS</small></div></div>
     <span className="ad-sim">● SIMULACIÓN INTERACTIVA · SIN ENVÍOS REALES</span>
    </header>
    <section className="ad-hero"><div><div className="ad-eyebrow">INTELIGENCIA COMERCIAL EN ACCIÓN</div><h1>De una conversación<br /><em>a una oportunidad real.</em></h1><p>Observa cómo Axira atiende una consulta, registra un prospecto y organiza su siguiente paso dentro de AxiomOS.</p></div><div className="ad-stats"><div><b>{leads.length}</b><span>Prospectos demo</span></div><div><b>{qualified}</b><span>Prioridad alta</span></div><div><b>{pending}</b><span>Acciones pendientes</span></div></div></section>
    <div className="ad-stepbar"><span><b>01</b> Elige un negocio</span><span><b>02</b> Axira atiende</span><span><b>03</b> CRM registra</span><span><b>04</b> Siguiente acción</span></div>
    <section className="ad-scenarios" aria-label="Escenarios comerciales">{(Object.keys(industries) as Industry[]).map(k => <button type="button" key={k} onClick={() => changeIndustry(k)} className={industry === k ? "ad-scenario active" : "ad-scenario"}><span>{k === "dealer" ? "🚙" : k === "restaurant" ? "🍽️" : "👓"}</span><strong>{industries[k].label}</strong><small>{k === "dealer" ? "Financiamiento y pruebas" : k === "restaurant" ? "Reservaciones y consultas" : "Citas administrativas"}</small></button>)}</section>
    <div className="ad-tabs"><button type="button" className={tab === "conversation" ? "active" : ""} onClick={() => setTab("conversation")}>Conversación con Axira</button><button type="button" className={tab === "crm" ? "active" : ""} onClick={() => setTab("crm")}>AxiomOS CRM <span>{leads.length}</span></button></div>
    {tab === "conversation" ? <section className="ad-panel">
     <div className="ad-panelhead"><div><b>Axira · Atención inteligente</b><small>{industries[industry].channel} — entorno de simulación</small></div><span className="ad-status">● Demo activo</span></div>
     <div className="ad-chat" aria-live="polite">{messages.map(m => <div className={m.by === "axira" ? "ad-bubble bot" : "ad-bubble"} key={m.id}><small>{m.by === "axira" ? "AXIRA" : "CLIENTE FICTICIO"}</small><p>{m.text}</p></div>)}</div>
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
