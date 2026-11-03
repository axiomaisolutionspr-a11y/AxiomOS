// Safe local preflight. Prints only status, never URLs, passwords or token values.
const databaseUrl = process.env.POS_QA_DATABASE_URL;
const host = process.env.POS_QA_DATABASE_HOST;
if (!databaseUrl || !host) {
  console.error("POS_QA_PREFLIGHT_BLOCKED: El CLI no recibio el secreto de Neon QA de Preview.");
  console.error("Las variables Secret de Vercel pueden estar disponibles solo en despliegues, no en CLI local.");
  process.exitCode = 2;
} else {
  try {
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)
      || !url.hostname.endsWith(".neon.tech")
      || url.hostname !== host
      || url.username !== "pos_qa_app_login") {
      console.error("POS_QA_PREFLIGHT_BLOCKED: URL, rol o host QA no coinciden.");
      process.exitCode = 3;
    } else {
      console.log("POS_QA_PREFLIGHT_OK: conexión QA y rol SQL restringido identificados.");
    }
  } catch {
    console.error("POS_QA_PREFLIGHT_BLOCKED: configuración de conexión inválida.");
    process.exitCode = 4;
  }
}
