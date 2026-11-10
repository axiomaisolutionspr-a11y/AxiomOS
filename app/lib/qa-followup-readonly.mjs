/**
 * QA-only CRM follow-up preflight. Reads authoritative queue, consent and
 * human review records from the database and NEVER dispatches any message.
 * Deliberately excludes phone numbers, names, drafts and message bodies.
 * No caller may turn this preflight into dispatch approval.
 */
const ID=/^[1-9][0-9]{0,17}$/;
export const QA_FOLLOWUP_READONLY_VERSION="2026-11-10-v1";
export async function inspectQaFollowup(sql,queueId,{environment="qa"}={}) {
  if(environment!=="qa"||typeof sql!=="function")return Object.freeze({allowed:false,reason:"qa_guard"});
  const id=String(queueId??"");
  if(!ID.test(id))return Object.freeze({allowed:false,reason:"invalid_queue_id"});
  let rows;
  try {
    rows=await sql`SELECT queue_id,tenant_id,channel,purpose,status AS status,scheduled_for,
       permission_state,permission_recorded_at,has_evidence,review_decision
       FROM axiomos_commercial.qa_followup_preflight_readonly
       WHERE tenant_id='axiomai' AND queue_id=CAST(${id} AS bigint)::text LIMIT 1`;
  } catch {
    return Object.freeze({allowed:false,reason:"authoritative_read_unavailable"});
  }
  if(!Array.isArray(rows)||rows.length!==1)return Object.freeze({allowed:false,reason:"queue_not_found"});
  const r=rows[0];
  if(r.tenant_id!=="axiomai"||r.queue_id!==id)return Object.freeze({allowed:false,reason:"tenant_mismatch"});
  // Read-only output: no recipient, content, internal identities, or claim token.
  const base={allowed:false,queueId:id,channel:r.channel,purpose:r.purpose,queueStatus:r.status,
    consentState:r.permission_state??"unknown",reviewDecision:r.review_decision??"none"};
  if(r.status==="cancelled"||r.status==="blocked"||r.review_decision==="blocked")
    return Object.freeze({...base,reason:"blocked_or_cancelled"});
  if(r.permission_state!=="opt_in"||r.has_evidence!==true)
    return Object.freeze({...base,reason:"no_verifiable_consent"});
  const permissionTime=r.permission_recorded_at?new Date(r.permission_recorded_at).getTime():NaN;
  if(!Number.isFinite(permissionTime)||permissionTime>Date.now()||
     Date.now()-permissionTime>90*86400_000)
    return Object.freeze({...base,reason:"consent_time_invalid"});
  // A review_only decision is *not* approval. The existing DB CHECK constraint
  // blocks approved rows. No provider, recipient, or worker capability is here.
  return Object.freeze({...base,reason:"human_review_only_no_dispatch"});
}
