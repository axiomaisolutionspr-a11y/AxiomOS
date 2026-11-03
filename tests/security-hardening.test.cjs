const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const vm=require("node:vm");
const ts=require("typescript");
const crypto=require("node:crypto");
function importTs(filename, imports, env={}) {
  const code=ts.transpileModule(readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  vm.runInNewContext("(function(require,module,exports){"+code+"\n})",
    {Buffer,Date,Number,Error,process:{env},URL,Headers})(name=>{
      if(name==="node:crypto")return crypto;
      if(name in imports)return imports[name];
      throw new Error("Unapproved test import: "+name);
    },module,module.exports);
  return module.exports;
}
test("Meta HMAC verifies raw bytes and rejects tampering/unsigned",()=>{
  const m=importTs("app/lib/webhook-auth.ts",{}, {});
  const body='{"object":"whatsapp_business_account"}';
  const header="sha256="+crypto.createHmac("sha256","test-secret").update(body).digest("hex");
  assert.equal(m.verifyMetaWebhook(body,header,"test-secret"),true);
  assert.equal(m.verifyMetaWebhook(body+" ",header,"test-secret"),false);
  assert.equal(m.verifyMetaWebhook(body,null,"test-secret"),false);
  assert.equal(m.verifyMetaWebhook(body,header,"other"),false);
});
test("Telnyx Ed25519 authenticates raw payload and freshness",()=>{
  const m=importTs("app/lib/webhook-auth.ts",{});
  const keys=crypto.generateKeyPairSync("ed25519");
  const pub=keys.publicKey.export({type:"spki",format:"der"}).subarray(-32).toString("base64");
  const stamp=String(Math.floor(Date.now()/1000));
  const raw='{"event_type":"conversation_insight_result"}';
  const signature=crypto.sign(null,Buffer.from(stamp+"|"+raw),keys.privateKey).toString("base64");
  const headers=new Headers({"telnyx-timestamp":stamp,"telnyx-signature-ed25519":signature});
  assert.equal(m.verifyTelnyxWebhook(raw,headers,pub),true);
  assert.equal(m.verifyTelnyxWebhook(raw+" ",headers,pub),false);
  assert.equal(m.verifyTelnyxWebhook(raw,headers,pub,Date.now()+400000),false);
  assert.equal(m.verifyTelnyxWebhook(raw,new Headers(),pub),false);
  assert.equal(m.verifyTelnyxWebhook(raw,headers,undefined),false);
});
test("Dualhook shape validation is deny-by-default but NOT authentication",()=>{
  const m=importTs("app/lib/webhook-auth.ts",{});
  const body={object:"whatsapp_business_account",entry:[{id:"waba-qa",changes:[{field:"messages",value:{metadata:{phone_number_id:"number-qa"}}}]}]};
  assert.equal(m.isExpectedDualhookWhatsAppPayload(body,"waba-qa","number-qa"),true);
  assert.equal(m.isExpectedDualhookWhatsAppPayload(body,"wrong","number-qa"),false);
  assert.equal(m.isExpectedDualhookWhatsAppPayload({...body,object:"page"},"waba-qa","number-qa"),false);
  assert.equal(m.isExpectedDualhookWhatsAppPayload(body,undefined,"number-qa"),false);
});
test("CRM sessions issue independent tokens, expire/revoke individually, and rate-limit logins",async()=>{
  const env={AXIOMOS_CRM_ACCESS_PIN:"qa-test-pin",AXIOMOS_CRM_SESSION_V2_ENABLED:"true",
    DATABASE_URL:"postgresql://fictional.invalid/test",AXIOMOS_CRM_RATE_LIMIT_SECRET:"x".repeat(48)};
  const sessions=new Map(), attempts=new Map();
  const sql=async(strings,...values)=>{
    const q=strings.join("?").replace(/\s+/g," ").trim();
    if(q.startsWith("INSERT INTO crm_admin_sessions")){sessions.set(values[0],{revoked:false});return [];}
    if(q.startsWith("UPDATE crm_admin_sessions SET last_seen_at")){let row=sessions.get(values[0]);return row&&!row.revoked?[{token_hash:values[0]}]:[];}
    if(q.startsWith("UPDATE crm_admin_sessions SET revoked_at")){let row=sessions.get(values[0]);if(row&&!row.revoked){row.revoked=true;return [{token_hash:values[0]}];}return [];}
    if(q.startsWith("INSERT INTO crm_auth_attempts")){let n=(attempts.get(values[0])||0)+1;attempts.set(values[0],n);return [{attempts:n}];}
    if(q.startsWith("DELETE FROM crm_auth_attempts")){attempts.delete(values[0]);return [];}
    throw Error("Unexpected QA query: "+q);
  };
  const m=importTs("app/lib/crm/security.ts",{"@neondatabase/serverless":{neon:()=>sql}},env);
  const a=await m.createCrmSession(), b=await m.createCrmSession();
  assert.notEqual(a,b);assert.equal(await m.validCrmSession(a),true);assert.equal(await m.validCrmSession(b),true);
  assert.equal(await m.revokeCrmSession(a),true);assert.equal(await m.validCrmSession(a),false);
  assert.equal(await m.validCrmSession(b),true);
  const legacy=crypto.createHash("sha256").update("axiomos-crm:"+env.AXIOMOS_CRM_ACCESS_PIN).digest("hex");
  assert.equal(await m.validCrmSession(legacy),false);
  const h=new Headers({"x-vercel-forwarded-for":"203.0.113.11"});
  for(let i=0;i<5;i++)assert.equal(await m.claimCrmLoginAttempt(h),true);
  assert.equal(await m.claimCrmLoginAttempt(h),false);
  await m.resetCrmLoginAttempts(h);assert.equal(await m.claimCrmLoginAttempt(h),true);
});

test("Bounded public request bodies preserve UTF-8 and reject oversized streaming bodies",async()=>{
  const m=importTs("app/lib/limited-request-body.ts",{});
  const valid=new Request("https://qa.invalid/receiver",{method:"POST",body:'{"name":"Axira","lang":"es"}'});
  assert.equal(await m.readLimitedUtf8Body(valid,1024),'{"name":"Axira","lang":"es"}');

  // Do not trust Content-Length: an attacker may omit it and stream data.
  const stream=new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.alloc(40,65));
      controller.enqueue(Buffer.alloc(40,66));
      controller.close();
    }
  });
  const unbounded=new Request("https://qa.invalid/receiver",{
    method:"POST",body:stream,duplex:"half"
  });
  await assert.rejects(m.readLimitedUtf8Body(unbounded,64),err=>err?.name==="RequestBodyTooLargeError");

  const declared=new Request("https://qa.invalid/receiver",{
    method:"POST",body:"oversized",headers:{"content-length":"9999"}
  });
  await assert.rejects(m.readLimitedUtf8Body(declared,64),err=>err?.name==="RequestBodyTooLargeError");
  const empty=new Request("https://qa.invalid/receiver",{method:"POST"});
  assert.equal(await m.readLimitedUtf8Body(empty,64),"");
});
