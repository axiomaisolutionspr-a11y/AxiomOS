import { neon } from "@neondatabase/serverless";

/**
 * Conexión exclusiva a la base QA del DEMO comercial. Falla cerrado (null) si la URL
 * no es exactamente la base `axiomai_demo_comercial_qa` con el rol limitado del DEMO.
 * Misma regla que app/api/demo-comercial/route.ts.
 */
export function demoQaDatabase() {
  const connection = process.env.AXIOMAI_DEMO_QA_DATABASE_URL;
  if (!connection) return null;
  try {
    const u = new URL(connection);
    if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") return null;
    if (u.pathname !== "/axiomai_demo_comercial_qa" || u.username !== "axiomai_demo_qa_writer" || !u.hostname.endsWith(".neon.tech")) return null;
    return neon(connection);
  } catch { return null; }
}
