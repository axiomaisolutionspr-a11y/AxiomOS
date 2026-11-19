/**
 * End-to-end SYNTHETIC Telnyx HTTP POST -> Ed25519 -> restricted Postgres role.
 * Runs on localhost + disposable PostgreSQL in GitHub Actions. No Telnyx keys,
 * no Vercel calls, no customer data, no SMS and no production connections.
 */
import {createServer} from "node:http";
import {generateKeyPairSync,sign} from "node:crypto";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import {receiveQaTelnyxEvent} from "../app/lib/qa-telnyx-ingress.mjs";

const baseEnv={...process.env,PGHOST:"127.0.0.1",PGPORT:"5432",PGDATABASE:"postgres"};
const runSql=(sql,role="neondb_owner")=>execFileSync("psql",
  ["-X","-A","-t","-v","ON_ERROR_STOP=1","-c",sql],
  {env:{...baseEnv,PGUSER:role,PGPASSWORD:"qa-only-test"},
   encoding:"utf8",timeout:10000}).trim();

runSql("INSERT INTO axiomos_commercial.qa_telnyx_signed_probe (id,tenant_id,state,attempts,provider_message_id) VALUES (4,'axiomai','accepted',1,'qa-http-message-00001')");

const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const pub=publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("base64");
let dbWrites=0;
async function storeVerifiedEvent({providerMessageId,eventKey,eventType,status}) {
 // These values passed the application's allowlist, but validate again in
 // this disposable CI adapter before quoting for psql (no shell).
 for(const v of [providerMessageId,eventKey])
   assert.match(v,/^[A-Za-z0-9-]{8,100}$/);
 assert.ok(["message.sent","message.finalized"].includes(eventType));
 assert.ok(["sent","delivered","delivery_failed","sending_failed","delivery_unconfirmed"].includes(status));
 dbWrites++;
 return runSql("SELECT axiomos_commercial.qa_reconcile_telnyx_signed_probe("+
   [providerMessageId,eventKey,eventType,status].map(v=>"'"+v+"'").join(",")+")",
   "axiomos_qa_telnyx_ingress");
}
const server=createServer(async(req,res)=>{
 let parts=[],size=0;
 try{
  for await(const part of req){size+=part.length;if(size>262144)break;parts.push(part);}
  const result=await receiveQaTelnyxEvent({
    environment:"qa",method:req.method,rawBody:Buffer.concat(parts),
    headers:req.headers,publicKey:pub,storeVerifiedEvent
  });
  res.writeHead(result.status,{"content-type":"application/json"});
  res.end(JSON.stringify(result));
 }catch{
  res.writeHead(503,{"content-type":"application/json"});
  res.end('{"ok":false}');
 }
});
await new Promise((resolve,reject)=>{
 server.once("error",reject);
 server.listen(0,"127.0.0.1",resolve);
});
const origin="http://127.0.0.1:"+server.address().port;
async function request(eventType,status,eventId,{tampered=false,providerMessageId="qa-http-message-00001"}={}){
 const payload=Buffer.from(JSON.stringify({
   data:{id:eventId,event_type:eventType,payload:{id:providerMessageId,to:[{status}]}}
 }));
 const timestamp=String(Math.floor(Date.now()/1000));
 const signature=sign(null,Buffer.concat([Buffer.from(timestamp+"|"),payload]),privateKey).toString("base64");
 const body=tampered?Buffer.concat([payload,Buffer.from(" ")]):payload;
 const response=await fetch(origin,{
  method:"POST",headers:{"content-type":"application/json",
   "telnyx-timestamp":timestamp,"telnyx-signature-ed25519":signature},
  body,signal:AbortSignal.timeout(5000)});
 return {code:response.status,...await response.json()};
}
try{
 let r=await request("message.sent","sent","qa-http-event-00001");
 assert.equal(r.code,200);assert.equal(r.reason,"recorded");

 r=await request("message.finalized","delivered","qa-http-event-00002");
 assert.equal(r.code,200);assert.equal(r.reason,"recorded");

 r=await request("message.finalized","delivered","qa-http-event-00002");
 assert.equal(r.code,200);assert.equal(r.reason,"duplicate");

 const before=dbWrites;
 r=await request("message.finalized","delivered","qa-http-event-00003",{tampered:true});
 assert.equal(r.code,401);assert.equal(r.reason,"invalid_signature");
 assert.equal(dbWrites,before,"tampered payload reached SQL");

 r=await request("message.finalized","delivered","qa-http-event-00004",{providerMessageId:"qa-http-unknown-00002"});
 assert.equal(r.code,202);assert.equal(r.reason,"not_a_registered_probe");

 assert.equal(runSql("SELECT count(*) FROM axiomos_commercial.qa_telnyx_probe_verified_events WHERE provider_message_id='qa-http-message-00001'"),"2");
 assert.equal(runSql("SELECT count(*) FROM axiomos_commercial.qa_telnyx_probe_verified_events WHERE event_key='qa-http-event-00002'"),"1");
 assert.equal(runSql("SELECT attempts FROM axiomos_commercial.qa_telnyx_signed_probe WHERE id=4"),"1");
 console.log("QA_TELNYX_SIGNED_HTTP_POST_TO_POSTGRES_PASS");
}finally{
 await new Promise(resolve=>server.close(resolve));
}
