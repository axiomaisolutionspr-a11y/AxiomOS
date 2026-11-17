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
const KEY = "axiomai_demo_comercial_v2";
const industries: Record<Industry, { label: string; customer: string; intro: string; response: string; contact: string; action: string; priority: "Alta" | "Media"; channel: string }> = {
 dealer: { label: "Dealer de autos", customer: "Hola, me interesa un vehículo y quisiera saber sobre financiamiento y una prueba de manejo.", intro: "¡Saludos! Soy Axira, asistente virtual del dealer. Con mucho gusto te ayudo. ¿Me compartes tu nombre y un contacto para coordinar con un asesor?", response: "Perfecto. Registré tu interés en financiamiento y prueba de manejo. Un asesor podrá revisar tu solicitud y coordinar los próximos pasos.", contact: "787-555-0101", action: "Coordinar prueba de manejo y validar opciones de financiamiento", priority: "Alta", channel: "WhatsApp (simulado)" },
 restaurant: { label: "Restaurante", customer: "Buenas, ¿puedo reservar una mesa para cuatro personas mañana por la noche?", intro: "¡Claro! Soy Axira. ¿A nombre de quién sería la reserva y a qué contacto podemos confirmarla? La disponibilidad será verificada por el restaurante.", response: "He registrado la solicitud de mesa para cuatro. El restaurante debe confirmar disponibilidad antes de que la reserva sea definitiva.", contact: "787-555-0102", action: "Confirmar disponibilidad de mesa para cuatro", priority: "Alta", channel: "Instagram (simulado)" },
 optica: { label: "Óptica", customer: "Hola, deseo una cita para un examen visual. ¿Tienen espacios esta semana?", intro: "¡Saludos! Soy Axira, asistente de la óptica. Puedo ayudarte a solicitar una cita. ¿Me indicas tu nombre y un número de contacto? No necesito información médica.", response: "Gracias. Registré tu solicitud administrativa para una cita. La óptica podrá confirmar el horario disponible.", contact: "787-555-0103", action: "Confirmar fecha y hora de cita", priority: "Media", channel: "Messenger (simulado)" },
};
const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + String(Math.random());
function initialMessages(industry: Industry): Message[] {
 const s = industries[industry]; return [{ id: uid(), by: "cliente", text: s.customer }, { id: uid(), by: "axira", text: s.intro }];
}
function readDemo(): Lead[] {
 try { const raw = window.localStorage.getItem(KEY); const parsed: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.filter((v): v is Lead => !!v && typeof v === "object" && typeof v.id === "string" && typeof v.name === "string" && Array.isArray(v.messages)) : []; } catch { return []; }
}
export default function DemoComercialPage() {
 const [industry, setIndustry] = useState<Industry>("dealer");
 const [messages, setMessages] = useState<Message[]>([]);
 const [leads, setLeads] = useState<Lead[]>([]);
 const [hydrated, setHydrated] = useState(false);
 const [name, setName] = useState("Andrea Rivera (ficticia)");
 const [contact, setContact] = useState("787-555-0101");
 const [selected, setSelected] = useState<string | null>(null);
 const [tab, setTab] = useState<"conversation" | "crm">("conversation");
 const [notice, setNotice] = useState("");
 useEffect(() => { setLeads(readDemo()); setMessages(initialMessages("dealer")); setHydrated(true); }, []);
 useEffect(() => { if (hydrated) try { window.localStorage.setItem(KEY, JSON.stringify(leads)); } catch { /* Browser storage may be blocked. */ } }, [hydrated, leads]);
 const active = useMemo(() => leads.find(l => l.id === selected) ?? null, [leads, selected]);
 const qualified = leads.filter(l => l.priority === "Alta").length;
 const pending = leads.filter(l => l.status !== "Ganado").length;
 function changeIndustry(next: Industry) { setIndustry(next); setMessages(initialMessages(next)); setName(next === "dealer" ? "Andrea Rivera (ficticia)" : next === "restaurant" ? "Luis Morales (ficticio)" : "María López (ficticia)"); setContact(industries[next].contact); setNotice(""); setSelected(null); setTab("conversation"); }
 function captureLead() {
  if (!name.trim() || !contact.trim()) { setNotice("Incluye un nombre y un contacto ficticio para registrar la solicitud."); return; }
  const s = industries[industry];
  const reply: Message = { id: uid(), by: "axira", text: s.response };
  const conversation = [...messages, { id: uid(), by: "cliente" as const, text: "Mi nombre es " + name.trim() + " y mi contacto es " + contact.trim() + "." }, reply];
  const lead: Lead = { id: uid(), industry, name: name.trim(), contact: contact.trim(), need: s.customer, channel: s.channel, status: industry === "dealer" ? "Contactar" : "Cita solicitada", priority: s.priority, nextAction: s.action, messages: conversation, created: new Date().toISOString() };
  setMessages(conversation); setLeads(prev => [lead, ...prev]); setSelected(lead.id); setTab("crm"); setNotice("Prospecto de prueba creado y guardado en este navegador. No se envió ningún mensaje externo.");
 }
 function updateStatus(id: string, value: Lead["status"]) { setLeads(prev => prev.map(l => l.id === id ? { ...l, status: value } : l)); }
 function reset() { setLeads([]); setSelected(null); setMessages(initialMessages(industry)); setTab("conversation"); setNotice("Datos de demostración eliminados de este navegador."); }
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
     <div className="ad-capture"><h3>Completa la solicitud de prueba</h3><div className="ad-fields"><label>Nombre ficticio<input value={name} onChange={e => setName(e.target.value)} maxLength={90} /></label><label>Teléfono ficticio<input value={contact} onChange={e => setContact(e.target.value)} maxLength={70} /></label></div><button type="button" className="ad-primary" onClick={captureLead}>Registrar en AxiomOS CRM →</button></div>
    </section> : <section className="ad-panel">
     <div className="ad-panelhead"><div><b>AxiomOS · Centro comercial</b><small>Prospectos de prueba guardados localmente en este navegador</small></div><button className="ad-reset" type="button" onClick={reset}>Reiniciar demo</button></div>
     <div className="ad-crm"><div className="ad-leads">{leads.length === 0 ? <div className="ad-empty">Aún no hay prospectos de demostración. Vuelve a la conversación y registra uno.</div> : leads.map(l => <button className={selected === l.id ? "ad-lead active" : "ad-lead"} key={l.id} type="button" onClick={() => setSelected(l.id)}><b>{l.name}</b><small>{industries[l.industry].label} · {l.channel}</small><span>{l.priority === "Alta" ? "● Alta prioridad" : "● Prioridad media"} · {l.status}</span></button>)}</div><div className="ad-details">{active ? <><div className="ad-detailtop"><div><small>FICHA DEL PROSPECTO</small><h2>{active.name}</h2><p>{active.contact} · {active.channel}</p></div><span className="ad-priority">{active.priority}</span></div><div className="ad-highlight"><small>PRÓXIMA ACCIÓN RECOMENDADA</small><strong>{active.nextAction}</strong><span>Recomendación simulada · no ejecutada</span></div><label className="ad-statuslabel">Estado de oportunidad<select value={active.status} onChange={e => updateStatus(active.id, e.target.value as Lead["status"])}><option>Nuevo</option><option>Contactar</option><option>Cita solicitada</option><option>Ganado</option></select></label><h3>Historial de la conversación</h3><div className="ad-history">{active.messages.map(m => <p key={m.id}><b>{m.by === "axira" ? "Axira" : "Cliente"}:</b> {m.text}</p>)}</div></> : <div className="ad-empty">Selecciona un prospecto para revisar su historial, cambiar el estado y observar la próxima acción.</div>}</div></div>
    </section>}
    {notice && <p role="status" className="ad-notice">{notice}</p>}
    <footer className="ad-footer"><div><strong>AxiomAI Solutions LLC</strong><p>Esta versión es una simulación funcional con almacenamiento local. No utiliza la API real de WhatsApp, Telnyx ni Neon; no reemplaza el CRM productivo.</p></div><a href="https://www.axiomaisolutions.org/solicitud">Solicitar implementación →</a></footer>
   </div>
  </main>
 );
}
