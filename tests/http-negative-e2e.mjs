import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { randomBytes } from "node:crypto";

const port=31000+Math.floor(Math.random()*1500);
const origin="http://127.0.0.1:"+port;
const env={...process.env,PORT:String(port),HOSTNAME:"127.0.0.1",
  AXIOMOS_CRM_ACCESS_PIN:"synthetic-"+randomBytes(16).toString("hex"),
  AXIOMOS_CRM_SESSION_V2_ENABLED:"true",
  AXIOMOS_WHATSAPP_WEBHOOK_AUTH_MODE:"meta-direct",
  AXIOMOS_TELNYX_SIGNATURE_REQUIRED:"true",
  WHATSAPP_META_APP_SECRET:"synthetic-test-only-"+randomBytes(16).toString("hex"),
  TELNYX_PUBLIC_KEY:randomBytes(32).toString("base64"),
  NEXT_TELEMETRY_DISABLED:"1"
};
delete env.DATABASE_URL;
delete env.DATABASE_URL_UNPOOLED;
delete env.AXIOMOS_CRM_RATE_LIMIT_SECRET;
delete env.TELNYX_API_KEY;
delete env.DUALHOOK_API_KEY;
delete env.WHATSAPP_ACCESS_TOKEN;
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port),"--hostname","127.0.0.1"],{env,stdio:["ignore","ignore","pipe"]});
let stderr="";
server.stderr.on("data",part=>{stderr=(stderr+part.toString()).slice(-450)});
async function call(path,method="GET",body,headers={}){
  const res=await fetch(origin+path,{method,headers:{"content-type":"application/json",...headers},...(body!==undefined?{body}:{}),redirect:"manual",signal:AbortSignal.timeout(10000)});
  return res.status;
}
try {
  let ready=false;
  for(let i=0;i<50;i++){try{const status=await call("/api/telnyx");if(status===200){ready=true;break}}catch{} await delay(200)}
  assert.ok(ready,"Server did not start");
  const results={};
  results.crmOrigin=await call("/api/crm-auth","POST",JSON.stringify({pin:"fake"}),{origin:"https://untrusted.invalid"});
  assert.equal(results.crmOrigin,403);
  results.crmWrongPinNoDatabase=await call("/api/crm-auth","POST",JSON.stringify({pin:"wrong"}),{origin});
  assert.equal(results.crmWrongPinNoDatabase,503,"No DB => fail closed");
  results.crmOversized=await call("/api/crm-auth","POST",JSON.stringify({pin:"a".repeat(2048)}),{origin});
  assert.equal(results.crmOversized,413);
  results.crmUnauthorizedPage=await call("/prospectos/simple");
  assert.ok([302,303,307,308,503].includes(results.crmUnauthorizedPage));
  results.metaUnsigned=await call("/api/whatsapp","POST",JSON.stringify({object:"whatsapp_business_account",entry:[]}));
  assert.equal(results.metaUnsigned,401);
  results.telnyxUnsigned=await call("/api/telnyx","POST",JSON.stringify({event_type:"conversation_insight_result"}));
  assert.equal(results.telnyxUnsigned,401);
  results.whatsappTooLarge=await call("/api/whatsapp","POST","a".repeat(2*1024*1024+1));
  assert.equal(results.whatsappTooLarge,413);
  console.log("AXIOMOS_HTTP_NEGATIVE_E2E_PASS "+JSON.stringify(results));
}catch(err){console.error("AXIOMOS_HTTP_NEGATIVE_E2E_FAIL",err instanceof Error?err.message:String(err));process.exitCode=1}
finally{server.kill("SIGTERM")}
