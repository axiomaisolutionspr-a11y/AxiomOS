import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFile } from "node:fs/promises";

const dataDir = process.env.AXIRA_HTTP_TEST_DATABASE_DIR;
if (!dataDir) throw new Error("Missing isolated HTTP test database directory");
const initial = await PGlite.create({ dataDir, extensions: { btree_gist } });
await initial.exec("CREATE DATABASE neondb");
await initial.close();
const db = await PGlite.create({ dataDir, database: "neondb", extensions: { btree_gist } });
await db.exec(await readFile(new URL("../../database/migrations/20261108_axiomos_commercial_v1.sql", import.meta.url), "utf8"));

const wireValue = (value) => {
  if (value === null) return null;
  if (typeof value === "boolean") return value ? "t" : "f";
  if (Array.isArray(value)) return "{" + value.map((item) => '"' + item.replaceAll('"', '\\"') + '"').join(",") + "}";
  return String(value);
};

globalThis.fetch = async (input, options) => {
  const url = new URL(typeof input === "string" ? input : input.url ?? input.href);
  if (url.pathname === "/sql" && url.hostname === "api.commercial-test.invalid") {
    const { query, params } = JSON.parse(options.body);
    try {
      const result = await db.query(query, params, { rowMode: "array" });
      return Response.json({
        fields: result.fields, rows: result.rows.map((row) => row.map(wireValue)), rowCount: result.rows.length,
      });
    } catch (error) {
      return Response.json({ message: error.message, code: error.code }, { status: 400 });
    }
  }
  if (url.hostname === "api.openai.com") {
    console.log("AXIRA_TEST_MODEL_STUB_CALLED");
    return Response.json({ output_text: "La promoción sigue vigente a $39 al mes." });
  }
  throw new Error("External network disabled in the HTTP test fixture");
};

process.on("message", async (message) => {
  if (message?.type !== "qa-sql") return;
  try {
    const result = await db.query(message.query, message.params ?? []);
    process.send?.({ id: message.id, rows: result.rows });
  } catch (error) {
    process.send?.({ id: message.id, error: error.message });
  }
});
