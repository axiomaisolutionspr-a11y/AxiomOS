import { neon } from "@neondatabase/serverless";
export function autopilotPanelDatabase(env = process.env) {
  if (env.AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED !== "true" ||
      env.VERCEL_ENV !== "preview" || env.AXIOMOS_AUTOPILOT_PANEL_QA_ENABLED !== "true") return null;
  const value=env.AXIOMOS_AUTOPILOT_PANEL_QA_READ_URL;
  const host=env.AXIOMOS_AUTOPILOT_PANEL_QA_HOST;
  if (!value || !host) return null;
  try {
    const url=new URL(value);
    const hostname=(x)=>x.replace(/-pooler(?=\.)/,"");
    const identity=env.AXIOMOS_IDENTITY_QA_DATABASE_URL && new URL(env.AXIOMOS_IDENTITY_QA_DATABASE_URL);
    if (!["postgres:","postgresql:"].includes(url.protocol) ||
        url.pathname!=="/axiomos_offers_qa" || hostname(url.hostname)!==hostname(host) ||
        (identity && hostname(url.hostname)===hostname(identity.hostname)) ||
        (env.DATABASE_URL && hostname(url.hostname)===hostname(new URL(env.DATABASE_URL).hostname)) ||
        url.username!=="axiomos_autopilot_qa_panel_reader" || !url.password) return null;
    return neon(url.href,{fetchOptions:{signal:AbortSignal.timeout(5000)}});
  } catch {return null;}
}
export function panelReadAllowed(role) {
  return role==="owner" || role==="operator" || role==="viewer";
}
export async function loadAutopilotPanel(sql) {
  if (typeof sql!=="function")throw Error("QA_PANEL_NOT_CONFIGURED");
  const [summary,prospects,tasks,audit] = await Promise.all([
    sql`SELECT
      (SELECT COUNT(*)::int FROM axiomos_autopilot_qa.prospects WHERE tenant_id='axiomai-qa') AS prospects,
      (SELECT COUNT(*)::int FROM axiomos_autopilot_qa.tasks WHERE tenant_id='axiomai-qa' AND state='awaiting_approval') AS awaiting,
      (SELECT COUNT(*)::int FROM axiomos_autopilot_qa.events WHERE tenant_id='axiomai-qa') AS events`,
    sql`SELECT contact_key,events_seen,last_seen FROM axiomos_autopilot_qa.prospects
      WHERE tenant_id='axiomai-qa' ORDER BY last_seen DESC LIMIT 25`,
    sql`SELECT contact_key,channel,event_id,kind,priority,state,created_at
      FROM axiomos_autopilot_qa.tasks WHERE tenant_id='axiomai-qa'
      ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,created_at ASC LIMIT 40`,
    sql`SELECT channel,event_id,action,created_at FROM axiomos_autopilot_qa.audit
      WHERE tenant_id='axiomai-qa' ORDER BY created_at DESC LIMIT 15`
  ]);
  if (!Array.isArray(summary)||summary.length!==1||!Array.isArray(prospects)||!Array.isArray(tasks)||!Array.isArray(audit))
    throw Error("QA_PANEL_INVALID_RESULT");
  return {summary:summary[0],prospects,tasks,audit};
}
