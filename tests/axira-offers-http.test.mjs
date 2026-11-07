import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { puertoRicoLocalDateTime } from "../app/lib/axira-offers-policy.js";

test("HTTP form → approval → Brain channels → pause and expiry use the verified catalog", { timeout: 90000 }, async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const dataDir = await mkdtemp(join(tmpdir(), "axiomos-offers-http-"));
  const port = 38347;
  const origin = `http://127.0.0.1:${port}`;
  const key = "synthetic-qa-approval-key-12345";
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root, stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: {
      PATH: process.env.PATH, NODE_ENV: "production", VERCEL_ENV: "preview", NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: `--import ${fileURLToPath(new URL("./fixtures/axira-offers-http-preload.mjs", import.meta.url))}`,
      AXIRA_HTTP_TEST_DATABASE_DIR: dataDir,
      AXIOMOS_CRM_ACCESS_PIN: "synthetic-qa-pin", AXIOMOS_OFFERS_APPROVAL_KEY: key,
      AXIRA_OFFERS_QA_ENABLED: "true", AXIRA_OFFERS_QA_DATABASE_HOST: "ep.offers-qa.invalid",
      AXIRA_OFFERS_QA_DATABASE_URL: "postgresql://qa:qa@ep.offers-qa.invalid/axiomos_offers_qa",
      DATABASE_URL: "postgresql://qa:qa@legacy.invalid/neondb", OPENAI_API_KEY: "synthetic-stub",
    },
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });

  const sql = (query, params = []) => new Promise((resolve, reject) => {
    const id = randomUUID();
    const listener = (message) => {
      if (message.id !== id) return;
      child.off("message", listener);
      if (message.error) reject(new Error(message.error)); else resolve(message.rows);
    };
    child.on("message", listener);
    child.send({ type: "qa-sql", id, query, params });
  });

  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(origin + "/prospectos/acceso")).ok) break; } catch {}
      if (child.exitCode !== null) throw new Error(output);
      if (attempt === 99) throw new Error("Next.js did not start\n" + output);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const unauthenticated = await fetch(origin + "/prospectos/ofertas", { redirect: "manual" });
    assert.equal(unauthenticated.status, 307);
    const login = await fetch(origin + "/api/crm-auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "synthetic-qa-pin" }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const page = async () => (await fetch(origin + "/prospectos/ofertas", { headers: { cookie } })).text();
    const submit = async (action, fields) => {
      const html = await page();
      const forms = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map((match) => match[1]);
      const form = forms.find((markup) => markup.includes(action));
      assert.ok(form, "Expected catalog form");
      const actionId = form.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
      assert.ok(actionId, "Expected Next.js action identifier");
      const body = new FormData();
      body.set(actionId, "");
      for (const [name, value] of Object.entries(fields)) {
        for (const item of Array.isArray(value) ? value : [value]) body.append(name, item);
      }
      return fetch(origin + "/prospectos/ofertas", {
        method: "POST", headers: { cookie, Origin: origin }, body, redirect: "manual",
      });
    };

    const create = await submit('name="requestId"', {
      requestId: randomUUID(), name: "CRM QA HTTP", product: "crm", normal: "59", promo: "9.99", activation: "25",
      start: puertoRicoLocalDateTime(new Date(Date.now() - 3600000)),
      end: puertoRicoLocalDateTime(new Date(Date.now() + 3600000)),
      channels: ["whatsapp", "messenger"], tax: "excluded",
      termsEs: "Contrato QA de 12 meses.", termsEn: "QA 12-month agreement.",
      externalEs: "Licencias aparte.", externalEn: "Licenses extra.", maxClients: "3",
    });
    assert.equal(create.status, 303);
    assert.match(new URL(create.headers.get("location"), origin).searchParams.get("ok"), /Borrador guardado/);
    const [offer] = await sql("SELECT id::text, revision FROM axiomos_commercial.offers");
    assert.ok(offer);
    const brain = async (message, channel = "whatsapp", extra = {}) => {
      const response = await fetch(origin + "/api/brain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, channel, mode: ["messenger", "instagram"].includes(channel) ? "social" : "analysis", ...extra }),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return (await response.json()).result;
    };
    assert.doesNotMatch(await brain("¿Cuánto cuesta el CRM?"), /\$/);
    const approveFields = { id: offer.id, revision: "1", target: "approved", confirmation: "APROBAR", approvalKey: key };
    const denied = await submit('name="confirmation"', { ...approveFields, approvalKey: "incorrect" });
    assert.match(new URL(denied.headers.get("location"), origin).searchParams.get("error"), /clave de administraci/);
    const approved = await submit('name="confirmation"', approveFields);
    assert.match(new URL(approved.headers.get("location"), origin).searchParams.get("ok"), /Oferta aprobada/);
    assert.match(await brain("¿Sigue la oferta del CRM de $39?"), /\$9\.99/);
    assert.match(await brain("Price of CRM?", "messenger", { language: "en" }), /\$9\.99.*Ends/);
    assert.doesNotMatch(await brain("Precio del CRM", "instagram"), /\$/);
    assert.equal(output.includes("AXIRA_TEST_MODEL_STUB_CALLED"), false);
    assert.doesNotMatch(await brain("Hola, quiero información"), /\$/);
    assert.ok(output.includes("AXIRA_TEST_MODEL_STUB_CALLED"));
    const paused = await submit('name="confirmation"', { id: offer.id, revision: "2", target: "paused", confirmation: "PAUSAR", approvalKey: key });
    assert.match(new URL(paused.headers.get("location"), origin).searchParams.get("ok"), /Oferta pausada/);
    assert.doesNotMatch(await brain("Precio del CRM"), /\$/);
    await sql("UPDATE axiomos_commercial.offers SET status='approved', starts_at=now()-interval '2 hours', ends_at=now()-interval '1 hour' WHERE id=$1", [offer.id]);
    assert.doesNotMatch(await brain("¿Sigue la de $9.99?"), /\$/);
    const [{ count }] = await sql("SELECT count(*)::int FROM axiomos_commercial.offer_audit");
    assert.equal(count, 3);
  } catch (error) {
    throw new Error(error.message + "\n" + output);
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
    await rm(dataDir, { recursive: true, force: true });
  }
});
