import test from "node:test";
import assert from "node:assert/strict";
import {evaluateInbound,processSyntheticInbound} from "../app/lib/axiomos-autopilot-core.mjs";
const e={tenantId:"axiomai-qa",eventId:"msg_0001",channel:"whatsapp",text:"Necesito una cotización hoy",verified:true,simulated:true,contactKey:"qa:client_1"};
test("prioritizes urgent commercial interest without sending",()=>{const d=evaluateInbound(e);assert.equal(d.priority,"high");assert.equal(d.task,"prepare_followup");assert.equal(d.outboundPermitted,false);assert.equal(d.needsApproval,true);});
test("routes human requests to handoff",()=>{assert.equal(evaluateInbound({...e,text:"Quiero hablar con una persona"}).task,"human_handoff");});
test("rejects unverified and nonsynthetic events",()=>{for(const p of [{simulated:false},{verified:false},{tenantId:"other"},{channel:"email"},{contactKey:"real:555"},{text:""},{eventId:"1"}])assert.throws(()=>evaluateInbound({...e,...p}));});
test("deduplicates through an atomic adapter",async()=>{const seen=new Set();let writes=0;const adapter={async processOnce(key){if(seen.has(key))return {inserted:false,receipt:"existing"};seen.add(key);writes++;return {inserted:true,receipt:"created"};}};assert.equal((await processSyntheticInbound(e,adapter)).status,"recorded");assert.equal((await processSyntheticInbound(e,adapter)).status,"duplicate");assert.equal(writes,1);});
test("requires persisted evidence",async()=>{await assert.rejects(processSyntheticInbound(e,{async processOnce(){return {inserted:true};}}),/UNVERIFIED_PERSISTENCE/);await assert.rejects(processSyntheticInbound(e,null),/PERSISTENCE_ADAPTER_REQUIRED/);});
