import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
const port=32871,base="http://127.0.0.1:"+port;
const env={...process.env,VERCEL_ENV:"preview",POS_QA_ENABLED:"false",NEXT_TELEMETRY_DISABLED:"1"};
for(const key of ["DATABASE_URL","POS_QA_DATABASE_URL","POS_QA_USERS_JSON","POS_QA_SESSION_SECRET","TELNYX_API_KEY","WHATSAPP_ACCESS_TOKEN"])delete env[key];
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port),"--hostname","127.0.0.1"],{env,stdio:"ignore"});
async function req(path,method="GET",body){const r=await fetch(base+path,{method,redirect:"manual",headers:{"content-type":"application/json",origin:base},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});return r.status;}
try{
 let ready=false;
 for(let i=0;i<80;i++){try{const s=await req("/api/pos/qa/session");if(s===503){ready=true;break;}}catch{}await sleep(250);}
 assert.ok(ready,"POS server not ready");
 const results={session:await req("/api/pos/qa/session"),catalog:await req("/api/pos/qa/catalog"),orders:await req("/api/pos/qa/orders"),login:await req("/api/pos/qa/session","POST",{username:"fake",password:"fake"}),create:await req("/api/pos/qa/orders","POST",{items:[]})};
 for(const [name,status] of Object.entries(results)){assert.ok([401,403,503].includes(status),name+" unexpected HTTP "+status);}
 console.log("POS_HTTP_FAIL_CLOSED_PASS",JSON.stringify(results));
}catch(e){console.error("POS_HTTP_FAIL_CLOSED_FAIL",e instanceof Error?e.message:String(e));process.exitCode=1;}finally{server.kill("SIGTERM");}
