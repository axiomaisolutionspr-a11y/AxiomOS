import test from "node:test";
import assert from "node:assert/strict";
import {Readable} from "node:stream";
import handler from "../api/telnyx.js";
import {receiveQaTelnyxEvent} from "../qa-ingress.mjs";

function response(){
 return {statusCode:200,body:null,headers:{},status(code){this.statusCode=code;return this;},
  json(body){this.body=body;return this;},
  setHeader(key,value){this.headers[key]=value;return this;}};
}
async function call(method,raw=Buffer.alloc(0)){
 const req=Readable.from(raw.length?[raw]:[]);req.method=method;req.headers={};
 const res=response();await handler(req,res);return res;
}
test("Standalone receiver has a safe read-only health endpoint",async()=>{
 const r=await call("GET");
 assert.equal(r.statusCode,200);
 assert.equal(r.body.mode,"qa-auto-persist-preview");
});
test("Standalone POST is disabled when QA preview flag is missing",async()=>{
 const before=process.env.AXIOMOS_QA_TELNYX_AUTOSTORE;
 const environment=process.env.VERCEL_ENV;
 delete process.env.AXIOMOS_QA_TELNYX_AUTOSTORE;
 process.env.VERCEL_ENV="preview";
 try{
  const r=await call("POST",Buffer.from("test"));
  assert.equal(r.statusCode,503);assert.equal(r.body.reason,"qa_disabled");
 }finally{
  if(before===undefined)delete process.env.AXIOMOS_QA_TELNYX_AUTOSTORE;
  else process.env.AXIOMOS_QA_TELNYX_AUTOSTORE=before;
  if(environment===undefined)delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV=environment;
 }
});
test("Standalone module handles verified signatures without network, via fake store",async()=>{
 const result=await receiveQaTelnyxEvent({environment:"qa",rawBody:Buffer.from("{}"),
  publicKey:"no-public-key",headers:{},storeVerifiedEvent:async()=>{throw Error("should not write")}});
 assert.equal(result.status,401);
});
