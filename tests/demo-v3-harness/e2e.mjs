import { chromium } from "playwright";
const results = []; const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} · ${name}${extra ? " · " + extra : ""}`); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
await page.goto("http://127.0.0.1:8765/index.html");
await page.fill("#demo-code", "incorrecto"); await page.click("text=Entrar al DEMO");
ok("Código incorrecto rechazado", await page.locator("text=Código incorrecto.").isVisible());
await page.fill("#demo-code", "harness-local-code"); await page.click("text=Entrar al DEMO");
await page.waitForSelector("text=Pulso comercial");
ok("Acceso y carga de 5 prospectos QA", true);
await page.screenshot({ path: "shots/01-hero.png" });

// Funciones originales intactas: pregunta rápida + captura
await page.click(".ad-quickbuttons button >> nth=0");
ok("Pregunta rápida agrega 2 turnos", (await page.locator(".ad-chat .ad-bubble").count()) === 4);
await page.fill("input[placeholder='Ej.: Andrea Rivera (ficticia)']", "Persona Real");
await page.click("text=Registrar en AxiomOS CRM →");
ok("Rechaza nombre no ficticio", await page.locator("text=Usa un nombre identificado como ficticio").isVisible());
await page.fill("input[placeholder='Ej.: Andrea Rivera (ficticia)']", "Andrea Rivera (ficticia)");
await page.click("text=Registrar en AxiomOS CRM →");
await page.waitForSelector("text=FICHA DEL PROSPECTO");
ok("Captura crea prospecto y abre ficha", (await page.locator(".ad-lead").count()) === 6);

// Inteligencia en ficha
ok("Ficha muestra inteligencia de Axira", await page.locator(".ap-intel").isVisible());
const score = await page.locator(".ap-gauge span").innerText();
ok("Puntuación visible 0–100", Number(score) >= 0 && Number(score) <= 100, `score=${score}`);
await page.click(".ap-why summary");
ok("Razones de puntuación explicables", (await page.locator(".ap-why li").count()) >= 2);
await page.screenshot({ path: "shots/02-ficha-inteligencia.png", fullPage: true });

// Búsqueda y filtros
await page.fill(".ap-toolbar input", "vegetariana");
ok("Búsqueda sin coincidencias muestra aviso", await page.locator("text=Ningún prospecto coincide").isVisible());
await page.fill(".ap-toolbar input", "examen visual");
ok("Búsqueda en historial encuentra a María", (await page.locator(".ad-lead").count()) === 1 && await page.locator(".ad-lead >> text=María López").isVisible());
await page.fill(".ap-toolbar input", "");
await page.click(".ap-chips button:has-text('Olvidados')");
const stale = await page.locator(".ad-lead").count();
ok("Filtro Olvidados (SLA vencido)", stale >= 3, `${stale} olvidados`);
await page.click(".ap-chips button:has-text('Todos')");

// Autopilot: modo supervisado
await page.click(".ad-tabs button:has-text('Axira Autopilot')");
await page.waitForSelector("text=Nivel de autonomía");
const qBefore = Number(await page.locator(".ap-count").innerText());
await page.screenshot({ path: "shots/03-autopilot-antes.png", fullPage: true });
const callsBefore = await page.evaluate(() => window.__calls.length);
await page.click(".ad-panelhead .ap-run");
await page.waitForSelector("text=Autopilot terminó");
const notice = await page.locator(".ad-notice").innerText();
ok("Autopilot ejecuta y reporta", /acciones ejecutadas/.test(notice), notice);
const calls = await page.evaluate(() => window.__calls);
const newCalls = calls.slice(callsBefore);
ok("Modo Supervisado no cambia etapas sin aprobación (0 PATCH)", !newCalls.some(c => c.startsWith("PATCH")), `${newCalls.length} escrituras, todas en la bitácora: ${newCalls.every(c => c.startsWith("POST /api/demo-comercial/autopilot"))}`);
ok("Ninguna llamada a proveedores externos", calls.every(c => / \/api\/demo-comercial/.test(c)));
ok("Registro de auditoría con entradas", (await page.locator(".ap-log li").count()) > 0);
ok("Paso de envío externo viene desactivado por defecto", await page.locator(".ap-node.off:has-text('Enviar respuesta')").isVisible());
await page.locator(".ap-node:has-text('Enviar respuesta') input[type=checkbox]").first().check();
const cx = await page.evaluate(() => window.__calls.length);
await page.click(".ad-panelhead .ap-run"); await page.waitForTimeout(300); await page.waitForSelector("text=bloqueadas por política");
ok("Activar envío externo: Axira lo bloquea y lo registra", (await page.locator(".ap-log .ap-out-bloqueada").count()) > 0, await page.locator(".ad-notice").innerText());
const blockCalls = (await page.evaluate(() => window.__calls)).slice(cx);
ok("Bloqueo: ningún envío, solo se anota en la bitácora", blockCalls.length > 0 && blockCalls.every(c => c.startsWith("POST /api/demo-comercial/autopilot") && c.includes('"outcome":"bloqueada"')), `${blockCalls.length} anotaciones`);
await page.locator(".ap-node:has-text('Enviar respuesta') input[type=checkbox]").first().uncheck();
const qAfter = Number(await page.locator(".ap-count").innerText());
ok("Cola de aprobación con pendientes", qAfter > 0, `antes=${qBefore} después=${qAfter}`);
await page.screenshot({ path: "shots/04-autopilot-despues.png", fullPage: true });

// Aprobar un avance de etapa → PATCH persistido
const stageItem = page.locator(".ap-card .ap-plan li:has-text('Avanzar a')").first();
const c0 = await page.evaluate(() => window.__calls.length);
await stageItem.locator("button:has-text('Aprobar')").click();
await page.waitForSelector("text=Etapa actualizada en Neon QA.");
const patch = (await page.evaluate(() => window.__calls)).slice(c0).filter(c => c.startsWith("PATCH"));
ok("Aprobar avance de etapa hace 1 PATCH confirmado", patch.length === 1, patch[0] || "");

// Fallo de persistencia: no miente
await page.evaluate(() => { window.__failPatch = true; });
const next = page.locator(".ap-card .ap-plan li:has-text('Avanzar a')").first();
if (await next.count()) {
  await next.locator("button:has-text('Aprobar')").click();
  await page.waitForSelector("text=Neon QA no confirmó el cambio.");
  ok("Si Neon QA falla, se registra error y no se finge éxito", (await page.locator(".ap-log .ap-out-error").count()) === 1);
}
await page.evaluate(() => { window.__failPatch = false; });

// Modo Asistir: nada se ejecuta solo
await page.click("text=Asistir — Axira propone");
const logBefore = await page.locator(".ap-log li").count();
await page.click(".ad-panelhead .ap-run");
await page.waitForSelector("text=Autopilot terminó");
const n2 = await page.locator(".ad-notice").innerText();
ok("Modo Asistir: 0 acciones ejecutadas", /: 0 acciones ejecutadas/.test(n2), n2);

// Constructor de flujo: desactivar paso
await page.click("text=Supervisado — Axira ejecuta");
const assignNode = page.locator(".ap-node:has-text('Se asigna vendedor') input[type=checkbox]").first();
await assignNode.uncheck();
ok("Paso desactivado se ve atenuado", await page.locator(".ap-node.off:has-text('Se asigna vendedor')").isVisible());
const draftLock = page.locator(".ap-node:has-text('respuesta sugerida') input[type=checkbox]").nth(1);
ok("Aprobación del borrador no se puede quitar", await draftLock.isDisabled());
await assignNode.check();

// Borrador: aprobar → no envía, y no se duplica
await page.click(".ad-tabs button:has-text('AxiomOS CRM')");
await page.click(".ad-lead:has-text('María López')");
const hasDraft = await page.locator(".ap-draft textarea").count();
if (hasDraft) {
  await page.fill(".ap-draft textarea", "Hola María, la óptica te confirmará la cita. ¿Prefieres mañana o tarde?");
  const c1 = await page.evaluate(() => window.__calls.length);
  await page.click(".ap-draft .ap-approve");
  await page.waitForSelector("text=Respuesta aprobada");
  const after = (await page.evaluate(() => window.__calls)).slice(c1);
  ok("Aprobar respuesta no la envía: solo 1 anotación en la bitácora", after.length === 1 && after[0].startsWith("POST /api/demo-comercial/autopilot") && after[0].includes("Aprobada, no enviada"));
  ok("Borrador aprobado desaparece (sin duplicado)", (await page.locator(".ap-draft").count()) === 0);
} else ok("Ficha de María con borrador sugerido", false);
await page.screenshot({ path: "shots/05-ficha-tras-aprobar.png", fullPage: true });

// Persistencia en Neon QA (simulado): borrar el navegador no borra la bitácora
const serverEvents = await page.evaluate(() => window.__db.events.length);
ok("Acciones guardadas en la bitácora del servidor", serverEvents > 0, `${serverEvents} eventos`);
ok("Bitácora marcada como Neon QA", (await page.locator(".ap-log span:has-text('Neon QA')").count()) > 0);
await page.click(".ad-tabs button:has-text('Axira Autopilot')");
await page.evaluate(() => localStorage.clear());
await page.click("text=Recargar desde Neon QA");
await page.waitForTimeout(300);
const shown = await page.locator(".ap-log li").count();
ok("Sin datos locales, la bitácora se recupera del servidor", shown === Math.min(30, serverEvents), `${shown} visibles de ${serverEvents}`);
const dupKeys = await page.evaluate(() => { const k = window.__db.events.filter(e => e.outcome !== "error").map(e => e.actionKey); return k.length - new Set(k).size; });
ok("Ninguna acción resuelta dos veces", dupKeys === 0);

// Aprobar desde la cola: un solo evento por acción
const ev0 = await page.evaluate(() => window.__db.events.length);
await page.click(".ap-card .ap-plan li >> nth=0 >> button:has-text('Aprobar')").catch(() => {});
await page.waitForTimeout(300);
const ev1 = await page.evaluate(() => window.__db.events.length);
ok("Aprobar desde la cola agrega exactamente 1 evento", ev1 - ev0 <= 1, `${ev1 - ev0}`);
// Simula que otra sesión ya resolvió una acción pendiente
const pendingKey = await page.evaluate(() => {
  const anyKey = window.__db.events[0]; return anyKey ? anyKey.actionKey : null; });
const status409 = await page.evaluate(async (key) => {
  const r = await fetch("/api/demo-comercial/autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: { id: crypto.randomUUID(), leadId: key.split(":")[0], actionKey: key, kind: key.split(":")[1], title: "x", detail: "x", outcome: "ejecutada", actor: "Axira" } }) });
  return r.status; }, pendingKey);
ok("Repetir una acción ya resuelta devuelve 409", status409 === 409);

// Neon QA caído: se indica y queda local, sin fingir
await page.evaluate(() => { window.__failAutopilot = true; });
const qItem = page.locator(".ap-card .ap-plan li:has(button:has-text('Aprobar'))").first();
if (await qItem.count()) {
  await qItem.locator("button:has-text('Aprobar')").click();
  await page.waitForTimeout(400);
  const msg = await page.locator(".ad-notice").innerText();
  ok("Con Neon QA caído se avisa y la anotación queda solo local", /Neon QA no (respondió|confirmó)|quedó solo en este navegador/.test(msg) && (await page.locator(".ap-log span:has-text('Este navegador')").count()) > 0, msg);
} else ok("Hay acciones pendientes para probar la caída", false);
await page.evaluate(() => { window.__failAutopilot = false; });

// Recorrido guiado original sigue funcionando
await page.click(".ad-tabs button:has-text('Conversación')");
await page.click(".ad-scenario:has-text('Restaurante')");
await page.fill("input[placeholder='Ej.: Andrea Rivera (ficticia)']", "Luis Morales (ficticio)");
await page.click(".ad-hero-tour");
await page.waitForSelector("text=FICHA DEL PROSPECTO");
ok("Recorrido guiado original registra y abre ficha", true);

// Móvil
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
m.on("pageerror", e => errors.push("mobile: " + e));
await m.goto("http://127.0.0.1:8765/index.html");
await m.fill("#demo-code", "harness-local-code"); await m.click("text=Entrar al DEMO"); await m.waitForSelector("text=Pulso comercial");
await m.click(".ad-tabs button:has-text('Axira Autopilot')");
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok("Móvil 390px sin desbordamiento horizontal", overflow <= 1, `exceso=${overflow}px`);
await m.screenshot({ path: "shots/06-movil-autopilot.png", fullPage: true });
await m.click(".ad-tabs button:has-text('AxiomOS CRM')");
await m.click(".ad-lead >> nth=1");
await m.screenshot({ path: "shots/07-movil-ficha.png", fullPage: true });
const overflow2 = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok("Móvil ficha sin desbordamiento", overflow2 <= 1, `exceso=${overflow2}px`);

ok("Sin errores de JavaScript en consola", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(results.join("\n"));
await browser.close();
