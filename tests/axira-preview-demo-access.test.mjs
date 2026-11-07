import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

test("isolated review preview exposes only the fictional CRM demo without the shared PIN", { timeout: 30000 }, async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const port = 38348;
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root, stdio: ["ignore", "pipe", "pipe"],
    env: {
      PATH: process.env.PATH, NODE_ENV: "production", VERCEL_ENV: "preview", NEXT_TELEMETRY_DISABLED: "1",
      AXIRA_OFFERS_QA_ENABLED: "true", AXIRA_OFFERS_QA_REVIEW_ONLY: "true",
    },
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if ((await fetch(origin + "/prospectos/acceso")).ok) { ready = true; break; }
      } catch {}
      if (child.exitCode !== null) throw new Error(output);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(ready, "Next.js did not start\n" + output);
    const demo = await fetch(origin + "/prospectos/demo");
    assert.equal(demo.status, 200);
    assert.match(await demo.text(), /datos ficticios/i);
    const crm = await fetch(origin + "/prospectos/simple");
    assert.equal(crm.status, 503);
    assert.match(await crm.text(), /no está configurado/i);
    const auth = await fetch(origin + "/api/auth/get-session");
    assert.equal(auth.status, 503);
    const individual = await fetch(origin + "/prospectos/autopilot");
    assert.equal(individual.status, 503);
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
  }
});
