import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHmac} from "node:crypto";
import {verifyMetaSignedEvent} from "../app/lib/autopilot-provider-bridge.mjs";

const route=readFileSync(new URL("../app/api/whatsapp/route.ts",import.meta.url),"utf8");
test("WhatsApp POST authenticates raw bytes before JSON parsing",()=>{
  const post=route.slice(route.indexOf("export async function POST("));
  const verify=post.indexOf("verifyMetaSignedEvent(");
  const parse=post.indexOf("JSON.parse(rawBody)");
  assert.ok(verify>=0 && parse>verify,"signature must be validated before JSON.parse");
  assert.ok(post.includes('request.headers.get("x-hub-signature-256")'));
  assert.ok(post.includes("if (!appSecret)"));
  assert.equal(post.includes("await request.json()"),false);
});
test("realistic signed Meta WhatsApp body passes; tampered/unsigned fails",()=>{
  const raw=JSON.stringify({object:"whatsapp_business_account",entry:[
    {changes:[{field:"messages",value:{statuses:[{id:"wamid.QA1",status:"delivered"}]}}]}
  ]});
  const secret="synthetic-ci-app-secret";
  const sig="sha256="+createHmac("sha256",secret).update(raw).digest("hex");
  assert.equal(verifyMetaSignedEvent({rawBody:raw,signature:sig,appSecret:secret}),true);
  assert.equal(verifyMetaSignedEvent({rawBody:raw+" ",signature:sig,appSecret:secret}),false);
  assert.equal(verifyMetaSignedEvent({rawBody:raw,signature:"",appSecret:secret}),false);
});
