// AxiomAI POS QA preflight. Never prints secret values or connection details.
const required = ["POS_QA_DATABASE_URL","POS_QA_DATABASE_HOST","POS_QA_SESSION_SECRET","POS_QA_USERS_JSON"];
const missing=required.filter(key=>!process.env[key]);
if (missing.length) {
  console.error("POS_QA_PREFLIGHT_BLOCKED: required QA variables unavailable: "+missing.join(", "));
  process.exitCode=2;
} else {
  try {
    const url = new URL(process.env.POS_QA_DATABASE_URL);
    const users=JSON.parse(process.env.POS_QA_USERS_JSON);
    const validDb=(url.protocol==="postgresql:" || url.protocol==="postgres:") &&
      url.hostname.endsWith(".neon.tech") &&
      url.hostname===process.env.POS_QA_DATABASE_HOST &&
      url.username==="pos_qa_app_login" &&
      url.pathname==="/neondb";
    const validConfig=process.env.POS_QA_ENABLED==="true" &&
      process.env.POS_QA_SESSION_SECRET.length>=32 &&
      Array.isArray(users) && users.length>0 && users.length<=50 &&
      users.every(u=>u && typeof u.username==="string" &&
        typeof u.passwordHash==="string" && /^scrypt\$[0-9a-f]{32,128}\$[0-9a-f]{128}$/i.test(u.passwordHash) &&
        typeof u.merchantId==="string" && typeof u.actorId==="string");
    if (!validDb || !validConfig) {
      console.error("POS_QA_PREFLIGHT_BLOCKED: isolated database or synthetic user configuration mismatch.");
      process.exitCode=3;
    } else {
      console.log("POS_QA_PREFLIGHT_OK: QA-only configuration structurally valid; database connectivity and HTTP login still require E2E.");
    }
  } catch {
    console.error("POS_QA_PREFLIGHT_BLOCKED: invalid URL or QA user JSON.");
    process.exitCode=4;
  }
}
