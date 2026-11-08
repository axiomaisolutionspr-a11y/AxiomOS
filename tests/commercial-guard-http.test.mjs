import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

test("compiled Brain routes price questions from all channels without contacting providers", async () => {
  const port = 31300 + (process.pid % 500);
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start",
    "-p", String(port), "-H", "127.0.0.1"], {
    cwd: process.cwd(),
    env: { ...process.env, OPENAI_API_KEY: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server did not start: " + output)), 10000);
    const onChunk = (chunk) => {
      output += String(chunk);
      if (output.includes("Ready in")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout.on("data", onChunk);
    server.stderr.on("data", onChunk);
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error("Server exited " + code + ": " + output));
    });
  });

  try {
    await ready;
    const cases = [
      { channel: "web", message: "¿Cuánto cuesta el CRM?" },
      { channel: "whatsapp", message: "¿Sigue vigente la promoción de octubre?" },
      { channel: "whatsapp", message: "¿Sigue la de 39 al mes?" },
      { channel: "messenger", mode: "social", message: "What are your current prices?", language: "en" },
      { channel: "instagram", mode: "social", message: "¿Cuánto vale WhatsApp?" },
    ];
    for (const body of cases) {
      const response = await fetch(`http://127.0.0.1:${port}/api/brain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      assert.equal(response.status, 200, body.channel);
      assert.match(data.result, /confirmar|confirm/i, body.channel);
      assert.doesNotMatch(data.result, /\$|\b(?:39|15|129|279)\b/, body.channel);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }

    const unrelated = await fetch(`http://127.0.0.1:${port}/api/brain`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Tengo $500 de presupuesto para automatizar citas." }),
    });
    assert.equal(unrelated.status, 503, "a budget alone must not be mistaken for an offer question");
  } finally {
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      if (server.exitCode !== null || server.signalCode !== null) resolve();
      else server.once("exit", resolve);
    });
  }
});
