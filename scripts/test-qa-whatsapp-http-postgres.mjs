/**
 * WhatsApp QA end-to-end receipt ingest:
 * LOCALHOST HTTP POST + synthetic Meta HMAC + disposable PostgreSQL.
 * No external network requests, Meta API key, WhatsApp send or production DB.
 */
import {createServer} from "node:http";
import {createHmac} from "node:crypto";
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";
import {receiveQaWhatsAppStatus} from "../app/lib/qa-whatsapp-status-ingress.mjs";

const testEnv={...process.env,PGHOST:"127.0.0.1",PGPORT:"5432",
  PGDATABASE:"postgres",PGUSER:"neondb_owner",PGPASSWORD:"qa-only-test"};
const sql=text=>execFileSync("psql",["-X","-A","-t","-v","ON_ERROR_STOP=1","-c",text],
  {env:testEnv,encoding:"utf8",timeout:10000}).trim();
const waba="100001234567890",phone="200009876543210";
const appSecret="test-only-localhost-whatsapp-secret";
const messageId="wamid.syntheticMetaQA00001";
sql(`WITH q AS (
  INSERT INTO axiomos_commercial.qa_delivery_outbox
  (test_key,tenant_id,channel,status,is_synthetic,authorized,opt_in,suppressed,
   due_at,claim_at,attempts)
  VALUES('QA-META-HTTP-0001','axiomai','whatsapp','accepted',true,true,true,false,
  '2026-11-10T13:00:00Z',clock_timestamp(),1) RETURNING id
) INSERT INTO axiomos_commercial.qa_provider_receipts
(outbox_id,provider,provider_message_id,delivery_state)
SELECT id,'dualhook','${messageId}','accepted' FROM q`);
const seen=[];
async function storeVerifiedStatus(evt){
 for(const key of ["providerMessageId","eventKey","provider","status"]){
  if(typeof evt[key]!=="string")throw Error("bad QA fixture");
 }
 if(!/^[A-Za-z0-9._=:+/-]{8,255}$/.test(evt.providerMessageId)||
    !/^[a-f0-9]{64}$/.test(evt.eventKey)||evt.provider!=="dualhook"||
    !["sent","delivered","read","failed"].includes(evt.status))
  throw Error("unsafe QA store arguments");
 seen.push(evt);
 const esc=v=>"'"+v.replaceAll("'","''")+"'";
 return sql("SELECT axiomos_commercial.qa_apply_verified_delivery_event("+
   [evt.provider,evt.providerMessageId,evt.eventKey,evt.status].map(esc).join(",")+")");
}
const server=createServer(async(req,res)=>{
 const chunks=[];let size=0;
 try{
  for await(const part of req){size+=part.length;if(size>262144)break;chunks.push(part)}
  const r=await receiveQaWhatsAppStatus({environment:"qa",method:req.method,
    rawBody:Buffer.concat(chunks),headers:req.headers,appSecret,
    expectedWabaId:waba,expectedPhoneNumberId:phone,
    storeVerifiedStatus});
  res.writeHead(r.httpStatus,{"content-type":"application/json"});
  res.end(JSON.stringify(r));
 }catch{
  res.writeHead(503,{"content-type":"application/json"});
  res.end('{"ok":false}');
 }
});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const endpoint="http://127.0.0.1:"+server.address().port;
async function send(status,{account=waba,number=phone,tampered=false}={}){
 const raw=Buffer.from(JSON.stringify({object:"whatsapp_business_account",
 entry:[{id:account,changes:[{field:"messages",value:{
   metadata:{phone_number_id:number},
   statuses:[{id:messageId,status,timestamp:"1794320000"}]
 }}]}]}));
 const signature="sha256="+createHmac("sha256",appSecret).update(raw).digest("hex");
 const response=await fetch(endpoint,{
  method:"POST",headers:{"content-type":"application/json","x-hub-signature-256":signature},
  body:tampered?Buffer.concat([raw,Buffer.from(" ")]):raw,signal:AbortSignal.timeout(5000)
 });
 return {code:response.status,...await response.json()};
}
try{
 let r=await send("sent");
 assert.equal(r.code,200);assert.equal(r.processed,1);
 r=await send("delivered");
 assert.equal(r.code,200);assert.equal(r.processed,1);
 r=await send("delivered");
 assert.equal(r.code,200);assert.equal(r.duplicates,1);
 const before=seen.length;
 r=await send("read",{account:"999999999999999"});
 assert.equal(r.code,202);assert.equal(seen.length,before);
 r=await send("read",{number:"888888888888888"});
 assert.equal(r.code,202);assert.equal(seen.length,before);
 r=await send("read",{tampered:true});
 assert.equal(r.code,401);assert.equal(seen.length,before);
 r=await send("read");
 assert.equal(r.code,200);assert.equal(r.processed,1);
 const summary=sql(`SELECT delivery_state FROM axiomos_commercial.qa_provider_receipts
    WHERE provider='dualhook' AND provider_message_id='${messageId}'`);
 assert.equal(summary,"read");
 assert.equal(sql(`SELECT count(*) FROM axiomos_commercial.qa_provider_delivery_events
    WHERE provider='dualhook' AND provider_message_id='${messageId}'`),"3");
 assert.equal(sql(`SELECT attempts FROM axiomos_commercial.qa_delivery_outbox
    WHERE test_key='QA-META-HTTP-0001'`),"1");
 console.log("QA_WHATSAPP_SIGNED_HTTP_POST_TO_POSTGRES_PASS");
}finally{
 await new Promise(resolve=>server.close(resolve));
}
