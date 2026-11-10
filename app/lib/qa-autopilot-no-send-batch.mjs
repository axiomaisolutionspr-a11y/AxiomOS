/**
 * E2E QA-only CRM follow-up batch review.
 * Database READ ONLY, no provider credentials, no sends, no writes.
 * It never creates approvals or elevates a follow-up queue status.
 */
import {inspectQaFollowup} from "./qa-followup-readonly.mjs";

const blocked=(reason)=>Object.freeze({mode:"qa_no_send",sent:0,processed:0,eligibleForDispatch:0,reason,counts:Object.freeze({})});

export async function runQaNoSendBatch(sql,{environment="qa",maxItems=100}={}) {
  if(environment!=="qa" || typeof sql!=="function")return blocked("qa_guard");
  if(!Number.isInteger(maxItems)||maxItems<1||maxItems>100)return blocked("invalid_limit");
  let rows;
  try{
    rows=await sql`SELECT id::text AS queue_id
      FROM axiomos_commercial.followup_queue
      WHERE tenant_id='axiomai'
        AND status IN ('needs_review','blocked','cancelled')
      ORDER BY id ASC LIMIT ${maxItems}`;
  }catch{return blocked("database_unavailable");}
  if(!Array.isArray(rows)||rows.length>maxItems)return blocked("invalid_database_result");
  const counts=Object.create(null);
  let processed=0;
  for(const record of rows){
    const review=await inspectQaFollowup(sql,record?.queue_id,{environment});
    const reason=review.reason??"invalid_review";
    counts[reason]=(counts[reason]??0)+1;
    processed++;
  }
  return Object.freeze({
    mode:"qa_no_send",sent:0,processed,
    eligibleForDispatch:0,
    reason:"audit_only_no_dispatch",
    counts:Object.freeze({...counts})
  });
}
