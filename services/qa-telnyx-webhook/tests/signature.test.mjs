import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import handler,{verifyTelnyxWebhook} from "../api/telnyx.js";
import {Readable} from "node:stream";
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const pub=publicKey.export({format:"der",type:"spki"}).subarray(-32).toString("base64");
const ts="1794254400";
const payload=Buffer.from(JSON.stringify({data:{event_type:"message.finalized",payload:{id:"qa-test-message-123",to:[{status:"delivered"}]}}}));
const sig=sign(null,Buffer.concat([Buffer.from(ts+"|"),payload]),privateKey).toString("base64");
test("valid signature with exact timestamp and raw bytes",()=>assert.equal(verifyTelnyxWebhook(payload,ts,sig,pub,Number(ts)*1000),true));
test("tampering fails",()=>assert.equal(verifyTelnyxWebhook(Buffer.from(payload.toString()+" "),ts,sig,pub,Number(ts)*1000),false));
test("replay expires",()=>assert.equal(verifyTelnyxWebhook(payload,ts,sig,pub,Number(ts)*1000+301000),false));
test("no signature fails",()=>assert.equal(verifyTelnyxWebhook(payload,ts,"",pub,Number(ts)*1000),false));
test("no verification key fails",()=>assert.equal(verifyTelnyxWebhook(payload,ts,sig,"",Number(ts)*1000),false));


// Real handler invocation with an in-memory request/response, synthetic keys,
// synthetic messages and zero external requests. Not a Telnyx delivery test.
function mockResponse() {
  return {
    statusCode:200, body:null, headers:{},
    setHeader(k,v){this.headers[k]=v;return this;},
    status(n){this.statusCode=n;return this;},
    json(payload){this.body=payload;return this;}
  };
}
async function invokeHandler(method,raw=Buffer.alloc(0),headers={}) {
  const request=Readable.from(raw.length?[raw]:[]);
  request.method=method;
  request.headers=headers;
  const response=mockResponse();
  await handler(request,response);
  return response;
}
function signSynthetic(raw,timestamp) {
  return sign(null,Buffer.concat([Buffer.from(timestamp+"|"),raw]),privateKey).toString("base64");
}
const fakeEvent=Buffer.from(JSON.stringify({
  data:{id:"qa-synthetic-event-0001",event_type:"message.finalized",
    payload:{id:"qa-synthetic-provider-0001",to:[{status:"delivered"}]}}
}));

test("synthetic HTTP GET reports verify-only (no sending)",async()=>{
  const r=await invokeHandler("GET");
  assert.equal(r.statusCode,200);
  assert.equal(r.body.mode,"verify-only");
});

test("synthetic HTTP POST accepts signed Telnyx event",async()=>{
  const before=process.env.TELNYX_SIGNING_PUBLIC_KEY;
  process.env.TELNYX_SIGNING_PUBLIC_KEY=pub;
  try {
    const t=String(Math.floor(Date.now()/1000));
    const r=await invokeHandler("POST",fakeEvent,{
      "telnyx-timestamp":t,"telnyx-signature-ed25519":signSynthetic(fakeEvent,t)
    });
    assert.equal(r.statusCode,200);
    assert.equal(r.body.verified,true);
    assert.equal(r.body.processed,true);
  } finally {
    if(before===undefined)delete process.env.TELNYX_SIGNING_PUBLIC_KEY;
    else process.env.TELNYX_SIGNING_PUBLIC_KEY=before;
  }
});

test("synthetic HTTP POST rejects altered bytes, expired and missing signatures",async()=>{
  const before=process.env.TELNYX_SIGNING_PUBLIC_KEY;
  process.env.TELNYX_SIGNING_PUBLIC_KEY=pub;
  try {
    const t=String(Math.floor(Date.now()/1000));
    const cases=[
      [Buffer.concat([fakeEvent,Buffer.from(" ")]),t,signSynthetic(fakeEvent,t)],
      [fakeEvent,String(Number(t)-601),signSynthetic(fakeEvent,String(Number(t)-601))],
      [fakeEvent,t,""]
    ];
    for(const [raw,stamp,sig] of cases){
      const r=await invokeHandler("POST",raw,{
        "telnyx-timestamp":stamp,"telnyx-signature-ed25519":sig
      });
      assert.equal(r.statusCode,401);
      assert.equal(r.body.ok,false);
    }
  } finally {
    if(before===undefined)delete process.env.TELNYX_SIGNING_PUBLIC_KEY;
    else process.env.TELNYX_SIGNING_PUBLIC_KEY=before;
  }
});

test("synthetic signed invalid JSON rejected, unknown event ignored",async()=>{
  const before=process.env.TELNYX_SIGNING_PUBLIC_KEY;
  process.env.TELNYX_SIGNING_PUBLIC_KEY=pub;
  try {
    const t=String(Math.floor(Date.now()/1000));
    const invalid=Buffer.from("{invalid json");
    const bad=await invokeHandler("POST",invalid,{
      "telnyx-timestamp":t,"telnyx-signature-ed25519":signSynthetic(invalid,t)
    });
    assert.equal(bad.statusCode,400);
    const unknown=Buffer.from(JSON.stringify({data:{event_type:"call.answered"}}));
    const ignored=await invokeHandler("POST",unknown,{
      "telnyx-timestamp":t,"telnyx-signature-ed25519":signSynthetic(unknown,t)
    });
    assert.equal(ignored.statusCode,202);
    assert.equal(ignored.body.processed,false);
  } finally {
    if(before===undefined)delete process.env.TELNYX_SIGNING_PUBLIC_KEY;
    else process.env.TELNYX_SIGNING_PUBLIC_KEY=before;
  }
});

test("oversized synthetic webhook body rejected without processing",async()=>{
  const r=await invokeHandler("POST",Buffer.alloc(262145,88));
  assert.equal(r.statusCode,413);
  assert.equal(r.body.ok,false);
});

test("webhook rejects unsupported HTTP methods",async()=>{
  const r=await invokeHandler("PUT");
  assert.equal(r.statusCode,405);
});
