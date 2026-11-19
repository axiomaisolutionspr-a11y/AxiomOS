// Banco de pruebas local: API simulada en memoria con las MISMAS validaciones de app/api/demo-comercial/route.ts.
import { createRoot } from "react-dom/client";
import Page from "../../app/demo-comercial/page";
import seed from "./seed.json";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = ["Nuevo", "Contactar", "Cita solicitada", "Ganado"];
const db: any[] = JSON.parse(JSON.stringify(seed));
let authed = false;
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
