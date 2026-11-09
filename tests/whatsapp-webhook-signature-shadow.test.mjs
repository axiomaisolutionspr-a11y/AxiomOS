import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {readFileSync} from "node:fs";
import {assessMetaWebhookSignature} from "../app/lib/meta-signature-policy.ts";

test("valid exact raw-body HMAC accepted",()=>{
 const secret="synthetic-ci-app-secret";
 const raw='{"object":"whatsapp_business_account","entry":[]}';
 const signature="sha256="+createHmac("sha256",secret).update(raw).digest("hex");
 assert.deepEqual(assessMetaWebhookSignature(raw,signature,secret),{valid:true,reason:"verified"});
 assert.equal(assessMetaWebhookSignature(raw+" ",signature,secret).valid,false);
 assert.equal(assessMetaWebhookSignature(raw,null,secret).valid,false);
 assert.equal(assessMetaWebhookSignature(raw,signature,"other-secret").valid,false);
 assert.equal(assessMetaWebhookSignature(raw,signature,undefined).valid,false);
});
test("WhatsApp route observes before JSON parse; enforcement off unless explicitly true",()=>{
 const route=readFileSync(new URL("../app/api/whatsapp/route.ts",import.meta.url),"utf8");
 const post=route.slice(route.indexOf("export async function POST("));
 assert.ok(post.indexOf("assessMetaWebhookSignature(")>-1);
 assert.ok(post.indexOf("assessMetaWebhookSignature(")<post.indexOf("JSON.parse(rawBody)"));
 assert.ok(post.includes('process.env.AXIOMOS_WHATSAPP_SIGNATURE_ENFORCE==="true"'));
 assert.ok(post.includes("return NextResponse.json({error:\"Invalid webhook signature\"},{status:401})"));
 assert.ok(!post.includes("await request.json()"));
});
