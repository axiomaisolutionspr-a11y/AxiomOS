import test from "node:test";
import assert from "node:assert/strict";
import {createQaStorageAdapter} from "../app/lib/axiomos-autopilot-storage-qa.mjs";
import {processSyntheticInbound} from "../app/lib/axiomos-autopilot-core.mjs";
const e={tenantId:"axiomai-qa",eventId:"event_0001",channel:"web",text:"Necesito un precio hoy",verified:true,simulated:true,contactKey:"qa:buyer_001"};
test("requires injected SQL adapter",()=>assert.throws(()=>createQaStorageAdapter(),/QA_SQL_REQUIRED/));
test("handles storage receipt and refuses mismatched receipt",async()=>{
  const success=async()=>[{inserted:true,receipt:"axiomai-qa:web:event_0001"}];
  const recorded=await processSyntheticInbound(e,createQaStorageAdapter(success));
  assert.equal(recorded.status,"recorded");
  const mismatch=async()=>[{inserted:true,receipt:"wrong"}];
  await assert.rejects(processSyntheticInbound(e,createQaStorageAdapter(mismatch)),/INVALID_QA_RECEIPT/);
});
test("refuses a decision that permits outbound operations",async()=>{
 const a=createQaStorageAdapter(async()=>[{inserted:true,receipt:"axiomai-qa:web:event_0001"}]);
 await assert.rejects(a.processOnce("axiomai-qa:web:event_0001",{
 tenantId:"axiomai-qa",eventId:"event_0001",channel:"web",contactKey:"qa:buyer_001",
 task:"prepare_followup",priority:"high",outboundPermitted:true,needsApproval:true}),/INVALID_QA_DECISION/);
});
