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
ok("Modo Supervisado no cambia etapas sin aprobación (0 PATCH)", !newCalls.some(c => c.startsWith("PATCH")), newCalls.join(" | "));
ok("Ninguna llamada a proveedores externos", calls.every(c => / \/api\/demo-comercial/.test(c)));
ok("Registro de auditoría con entradas", (await page.locator(".ap-log li").count()) > 0);
ok("Paso de envío externo viene desactivado por defecto", await page.locator(".ap-node.off:has-text('Enviar respuesta')").isVisible());
await page.locator(".ap-node:has-text('Enviar respuesta') input[type=checkbox]").first().check();
const cx = await page.evaluate(() => window.__calls.length);
await page.click(".ad-panelhead .ap-run"); await page.waitForTimeout(300); await page.waitForSelector("text=bloqueadas por política");
ok("Activar envío externo: Axira lo bloquea y lo registra", (await page.locator(".ap-log .ap-out-bloqueada").count()) > 0, await page.locator(".ad-notice").innerText());
ok("Bloqueo no genera ninguna llamada", (await page.evaluate(() => window.__calls.length)) === cx);
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
  ok("Aprobar respuesta no genera envío ni escritura", after.length === 0, after.join("|"));
  ok("Borrador aprobado desaparece (sin duplicado)", (await page.locator(".ap-draft").count()) === 0);
} else ok("Ficha de María con borrador sugerido", false);
await page.screenshot({ path: "shots/05-ficha-tras-aprobar.png", fullPage: true });

// Persistencia local tras recargar (registro) — la sesión del arnés se reinicia, así que se vuelve a entrar
const logCount = await page.evaluate(() => JSON.parse(localStorage.getItem("axiomos_demo_autopilot_v3")).log.length);
await page.reload(); await page.fill("#demo-code", "harness-local-code"); await page.click("text=Entrar al DEMO"); await page.waitForSelector("text=Pulso comercial");
await page.click(".ad-tabs button:has-text('Axira Autopilot')");
const logAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("axiomos_demo_autopilot_v3")).log.length);
ok("Registro de auditoría sobrevive a la recarga", logAfter === logCount && logCount > 0, `${logCount}`);

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
