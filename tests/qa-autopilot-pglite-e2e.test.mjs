import test from "node:test";
import assert from "node:assert/strict";
import {PGlite} from "@electric-sql/pglite";
import {inspectQaFollowup} from "../app/lib/qa-followup-readonly.mjs";
import {runQaNoSendBatch} from "../app/lib/qa-autopilot-no-send-batch.mjs";

async function fixture(){
  const db=new PGlite();
  await db.exec(`
    CREATE SCHEMA axiomos_commercial;
    CREATE TABLE axiomos_commercial.followup_queue(
      id bigint PRIMARY KEY,tenant_id text NOT NULL,prospect_id bigint NOT NULL,
      channel text NOT NULL,purpose text NOT NULL,status text NOT NULL,
      scheduled_for timestamptz NOT NULL
    );
    CREATE TABLE axiomos_commercial.followup_contact_permissions(
      id bigint PRIMARY KEY,tenant_id text NOT NULL,prospect_id bigint NOT NULL,
      channel text NOT NULL,purpose text NOT NULL,permission_state text NOT NULL,
      recorded_at timestamptz NOT NULL,evidence_source text NOT NULL
    );
    CREATE TABLE axiomos_commercial.followup_review_decisions(
      id bigint PRIMARY KEY,tenant_id text NOT NULL,queue_id bigint NOT NULL,
      decision text NOT NULL
    );
  `);
  const sql=async(strings,...params)=>{
    const statement=strings.reduce((out,item,i)=>out+item+(i<params.length?"$"+(i+1):""),"");
    const result=await db.query(statement,params);
    return result.rows;
  };
  return {db,sql};
}
const hourAgo=new Date(Date.now()-3600_000).toISOString();
const hourBefore=new Date(Date.now()-7200_000).toISOString();
async function queue(db,id,tenant="axiomai",status="needs_review"){
 await db.query(`INSERT INTO axiomos_commercial.followup_queue
   (id,tenant_id,prospect_id,channel,purpose,status,scheduled_for)
   VALUES($1,$2,$3,'whatsapp','followup',$4,$5)`,
   [id,tenant,id,status,hourBefore]);
}
async function permission(db,id,state,when=hourAgo){
 await db.query(`INSERT INTO axiomos_commercial.followup_contact_permissions
   (id,tenant_id,prospect_id,channel,purpose,permission_state,recorded_at,evidence_source)
   VALUES($1,'axiomai',$2,'whatsapp','followup',$3,$4,'Synthetic QA evidence')`,
   [1000+id,id,state,when]);
}
test("PostgreSQL: two opt-outs and six unknown consents -> eight blocked, zero sends",async()=>{
 const {db,sql}=await fixture();
 try{
  for(let id=1;id<=8;id++)await queue(db,id);
  await permission(db,1,"opt_out");await permission(db,2,"opt_out");
  const result=await runQaNoSendBatch(sql);
  assert.equal(result.mode,"qa_no_send");
  assert.equal(result.processed,8);
  assert.equal(result.sent,0);
  assert.equal(result.eligibleForDispatch,0);
  assert.equal(result.counts.no_verifiable_consent,8);
  assert.deepEqual(Object.keys(result),["mode","sent","processed","eligibleForDispatch","reason","counts"]);
 }finally{await db.close();}
});
test("PostgreSQL: latest opt-out overrides older opt-in for the same channel and purpose",async()=>{
 const {db,sql}=await fixture();
 try{
  await queue(db,9);
  await db.query(`INSERT INTO axiomos_commercial.followup_contact_permissions
   (id,tenant_id,prospect_id,channel,purpose,permission_state,recorded_at,evidence_source)
   VALUES (100,'axiomai',9,'whatsapp','followup','opt_in',$1,'QA earlier consent'),
          (101,'axiomai',9,'whatsapp','followup','opt_out',$2,'QA subsequent optout')`,
   [hourBefore,hourAgo]);
  const item=await inspectQaFollowup(sql,"9");
  assert.equal(item.consentState,"opt_out");
  assert.equal(item.reason,"no_verifiable_consent");
  assert.equal(item.allowed,false);
 }finally{await db.close();}
});
test("PostgreSQL: even valid consent plus reviewed_only cannot dispatch",async()=>{
 const {db,sql}=await fixture();
 try{
  await queue(db,10);
  await permission(db,10,"opt_in");
  await db.exec(`INSERT INTO axiomos_commercial.followup_review_decisions
    (id,tenant_id,queue_id,decision)VALUES(1,'axiomai',10,'reviewed_only')`);
  const item=await inspectQaFollowup(sql,10);
  assert.equal(item.reason,"human_review_only_no_dispatch");
  assert.equal(item.allowed,false);
  const batch=await runQaNoSendBatch(sql);
  assert.equal(batch.processed,1);
  assert.equal(batch.sent,0);
  assert.equal(batch.counts.human_review_only_no_dispatch,1);
 }finally{await db.close();}
});
test("PostgreSQL: cross-tenant queue is never enumerated",async()=>{
 const {db,sql}=await fixture();
 try{
  await queue(db,11,"other");
  assert.equal((await runQaNoSendBatch(sql)).processed,0);
  assert.equal((await inspectQaFollowup(sql,11)).reason,"queue_not_found");
 }finally{await db.close();}
});
test("PostgreSQL: explicit blocked decision stays blocked despite prior opt-in",async()=>{
 const {db,sql}=await fixture();
 try{
  await queue(db,12);
  await permission(db,12,"opt_in");
  await db.exec(`INSERT INTO axiomos_commercial.followup_review_decisions
    (id,tenant_id,queue_id,decision)VALUES(1,'axiomai',12,'blocked')`);
  assert.equal((await inspectQaFollowup(sql,12)).reason,"blocked_or_cancelled");
  assert.equal((await runQaNoSendBatch(sql)).sent,0);
 }finally{await db.close();}
});
test("PostgreSQL: no DB reads outside QA, and audit output contains no PII",async()=>{
 const {db,sql}=await fixture();
 try{
  await queue(db,13); await permission(db,13,"opt_out");
  const result=await runQaNoSendBatch(sql,{environment:"production"});
  assert.equal(result.reason,"qa_guard");
  assert.equal(result.sent,0);
  const audit=await runQaNoSendBatch(sql);
  const serialized=JSON.stringify(audit);
  for(const forbidden of ["caller","phone","body","email","recipient","draft","prospect"])
    assert.equal(serialized.includes(forbidden),false);
 }finally{await db.close();}
});
test("QA runner rejects invalid limits and DB failures without sending",async()=>{
 const invalid=await runQaNoSendBatch(async()=>{throw Error("must not query")},{maxItems:0});
 assert.equal(invalid.reason,"invalid_limit");assert.equal(invalid.sent,0);
 const failed=await runQaNoSendBatch(async()=>{throw Error("sql unavailable")});
 assert.equal(failed.reason,"database_unavailable");assert.equal(failed.sent,0);
});
