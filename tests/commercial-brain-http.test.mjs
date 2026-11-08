import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

test("production commercial catalog answers only approved, current, authorized channels", { timeout: 90000 }, async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const dataDir = await mkdtemp(join(tmpdir(), "axiomos-commercial-http-"));
  const port = 38358;
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root, stdio: ["ignore", "pipe", "pipe", "ipc"],
    env: {
      PATH: process.env.PATH, NODE_ENV: "production", VERCEL_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: `--import ${fileURLToPath(new URL("./fixtures/commercial-brain-http-preload.mjs", import.meta.url))}`,
      AXIRA_HTTP_TEST_DATABASE_DIR: dataDir, AXIOMOS_COMMERCIAL_ENABLED: "true",
      AXIOMOS_COMMERCIAL_DATABASE_HOST: "api.commercial-test.invalid",
      AXIOMOS_COMMERCIAL_DATABASE_URL: "postgresql://axiomos_commercial_reader:synthetic@api.commercial-test.invalid/neondb",
      OPENAI_API_KEY: "synthetic-stub",
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
  const brain = async (message, channel = "whatsapp", extra = {}) => {
    const response = await fetch(origin + "/api/brain", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, channel, mode: ["messenger", "instagram"].includes(channel) ? "social" : "analysis", ...extra }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    return (await response.json()).result;
  };
  try {
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(origin + "/prospectos/acceso")).ok) break; } catch {}
      if (child.exitCode !== null) throw new Error(output);
      if (i === 79) throw new Error("Next did not start");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.doesNotMatch(await brain("Precio CRM"), /\$/);
    const result = await sql(`INSERT INTO axiomos_commercial.offers
      (tenant_id,product_key,request_id,name,normal_cents,promo_cents,activation_cents,starts_at,ends_at,channels,tax_included,terms_es,terms_en,external_es,external_en)
      VALUES ('axiomai','crm',$1::uuid,'CRM verificado',5900,999,2500,now()-interval '1 hour',now()+interval '1 day',ARRAY['whatsapp','messenger'],false,'Contrato de 12 meses.','12-month agreement.','Licencias aparte.','Licenses extra.') RETURNING id`, [randomUUID()]);
    assert.doesNotMatch(await brain("Precio CRM"), /\$/);
    await sql("UPDATE axiomos_commercial.offers SET status='approved' WHERE id=$1", [result[0].id]);
    assert.match(await brain("Precio CRM"), /\$9\.99.*Vence/);
    assert.match(await brain("Price CRM", "messenger", { language: "en" }), /\$9\.99.*Ends/);
    assert.doesNotMatch(await brain("Precio CRM", "instagram"), /\$/);
    await sql("UPDATE axiomos_commercial.offers SET ends_at=now()-interval '1 minute', starts_at=now()-interval '2 hours' WHERE id=$1", [result[0].id]);
    assert.doesNotMatch(await brain("Precio CRM"), /\$/);
  } catch (error) { throw new Error(error.message + "\n" + output); }
  finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
    await rm(dataDir, { recursive: true, force: true });
  }
});
