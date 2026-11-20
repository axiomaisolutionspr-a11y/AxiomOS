// Banco de pruebas local: API simulada en memoria con las MISMAS validaciones de app/api/demo-comercial/route.ts.
import { createRoot } from "react-dom/client";
import Page from "../../app/demo-comercial/page";
import seed from "./seed.json";
import { hasRealContactData } from "../../app/lib/demo-contact-guard";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = ["Nuevo", "Contactar", "Cita solicitada", "Ganado"];
const db: any[] = JSON.parse(JSON.stringify(seed));
let authed = false;
// Tablas QA nuevas simuladas: bitácora de solo agregar con índice único parcial (outcome <> 'error').
const events: any[] = []; const ops: Record<string, any> = {};
const kinds = ["clasificar","crear_oportunidad","asignar_vendedor","programar_seguimiento","borrador_respuesta","transferir_humano","avanzar_etapa","enviar_mensaje","confirmar_cita","cobrar"];
(window as any).__db = { events, ops };
(window as any).__calls = [];
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const realFetch = window.fetch.bind(window);
window.fetch = async (input: any, init: any = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method || "GET").toUpperCase();
  (window as any).__calls.push(method + " " + url + (init.body ? " " + init.body : ""));
  if (url === "/api/demo-comercial/session") {
    if (method === "GET") return json({ authenticated: authed });
    if (method === "POST") { const { code } = JSON.parse(init.body); if (code === "harness-local-code") { authed = true; return json({ authenticated: true }); } return json({ error: "x" }, 401); }
    if (method === "DELETE") { authed = false; return json({ authenticated: false }); }
  }
  if (url === "/api/demo-comercial/axira") {
    // Simula la ruta real: mismas reglas de datos ficticios y de precios; la IA se sustituye por texto fijo.
    if (!authed) return json({ error: "Acceso al demo requerido" }, 401);
    const enabled = !!(window as any).__aiEnabled;
    if (method === "GET") return json({ enabled, model: "simulado" });
    if (!enabled) return json({ error: "IA del demo no configurada", code: "not_configured" }, 503);
    const b = JSON.parse(init.body);
    if (!["dealer","restaurant","optica"].includes(b.industry) || !b.message || b.message.length > 300 || b.history.length > 12) return json({ error: "inválido" }, 400);
    if (hasRealContactData(b.message)) return json({ error: "Usa solo datos ficticios: teléfonos 787-555-0100 a 0199 y ningún correo.", code: "real_data" }, 400);
    if (/precio|cuanto cuesta|cuánto cuesta/i.test(b.message)) return json({ reply: "No puedo confirmar precios desde aquí; el equipo te los compartirá.", source: "regla" });
    (window as any).__aiCalls = ((window as any).__aiCalls || 0) + 1;
    return json({ reply: "Con gusto. El equipo confirmará la disponibilidad. ¿A nombre de quién sería?", source: "ia" });
  }
  if (url === "/api/demo-comercial/autopilot") {
    if (!authed) return json({ error: "Acceso al demo requerido" }, 401);
    if ((window as any).__failAutopilot) return json({ error: "simulado" }, 503);
    if (method === "GET") return json({ ops: Object.values(ops), events: [...events].sort((a, b) => b.at.localeCompare(a.at)).map(e => ({ ...e, leadName: db.find(l => l.id === e.leadId)?.name })) });
    const { event: e, ops: o } = JSON.parse(init.body);
    if (!uuid.test(e.id) || !uuid.test(e.leadId) || !e.actionKey.startsWith(e.leadId + ":") || !kinds.includes(e.kind) || e.title.length > 120 || e.detail.length > 700) return json({ error: "Evento inválido" }, 400);
    if (!db.some(l => l.id === e.leadId)) return json({ error: "fk" }, 503);
    if (e.outcome !== "error" && events.some(x => x.actionKey === e.actionKey && x.outcome !== "error")) return json({ saved: false, duplicate: true }, 409);
    events.push({ ...e, at: new Date().toISOString() });
    if (o && !["error","descartada","bloqueada"].includes(e.outcome)) {
      const cur = ops[e.leadId] || { leadId: e.leadId, sellerId: null, followupDue: null, handoffSeller: null };
      ops[e.leadId] = { leadId: e.leadId, sellerId: o.sellerId ?? cur.sellerId, followupDue: o.followupDue ?? cur.followupDue, handoffSeller: o.handoffSeller ?? cur.handoffSeller };
    }
    return json({ saved: true }, 201);
  }
  if (url === "/api/demo-comercial") {
    if (!authed) return json({ error: "Acceso al demo requerido" }, 401);
    if (method === "GET") return json({ leads: db });
    const body = JSON.parse(init.body);
    if (method === "POST") {
      if (!uuid.test(body.id) || !/fictici[oa]/i.test(body.name) || !/^787-555-01[0-9]{2}$/.test(body.contact) || !String(body.channel).includes("simulado") || body.messages.length > 12) return json({ error: "Solamente ficticios" }, 400);
      db.unshift(body); return json({ success: true, created: true }, 201);
    }
    if (method === "PATCH") {
      if (!uuid.test(body.id) || !statuses.includes(body.status)) return json({ error: "Estado inválido" }, 400);
      const row = db.find(r => r.id === body.id); if (!row) return json({ success: false }, 404);
      if ((window as any).__failPatch) return json({ error: "simulado" }, 503);
      row.status = body.status; return json({ success: true });
    }
  }
  return realFetch(input, init);
};
createRoot(document.getElementById("root")!).render(<Page />);
