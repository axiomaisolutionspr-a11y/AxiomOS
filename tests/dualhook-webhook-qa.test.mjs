import test from "node:test";
import assert from "node:assert/strict";
import {classifyDualhookWebhook,dualhookValidationQaEnabled} from "../app/lib/dualhook-webhook-qa.mjs";

const message={object:"whatsapp_business_account",entry:[{id:"waba-qa",changes:[{
  field:"messages",value:{metadata:{phone_number_id:"phone-qa"},messages:[{id:"qa-message"}]}
}]}]};
test("processes only the configured QA WABA and sending number",()=>{
  assert.equal(classifyDualhookWebhook(message,"waba-qa","phone-qa"),"process");
  assert.equal(classifyDualhookWebhook(message,"other","phone-qa"),"reject");
  assert.equal(classifyDualhookWebhook(message,"waba-qa","other"),"reject");
  assert.equal(classifyDualhookWebhook({...message,entry:[]},"waba-qa","phone-qa"),"reject");
  assert.equal(classifyDualhookWebhook(message,"","phone-qa"),"reject");
});
test("recognizes management fields without requiring message metadata",()=>{
  const management={...message,entry:[{id:"waba-qa",changes:[{field:"message_template_status_update",value:{}}]}]};
  assert.equal(classifyDualhookWebhook(management,"waba-qa","phone-qa"),"ignore");
  assert.equal(classifyDualhookWebhook({...message,entry:[...message.entry,...management.entry]},"waba-qa","phone-qa"),"process");
});
test("validation cannot be enabled in production",()=>{
  assert.equal(dualhookValidationQaEnabled({VERCEL_ENV:"preview",AXIOMOS_WA_VALIDATE_QA:"true"}),true);
  assert.equal(dualhookValidationQaEnabled({VERCEL_ENV:"production",AXIOMOS_WA_VALIDATE_QA:"true"}),false);
});
