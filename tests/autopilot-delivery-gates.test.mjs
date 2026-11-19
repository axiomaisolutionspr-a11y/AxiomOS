import test from "node:test";
import assert from "node:assert/strict";
import {evaluateDispatch} from "../app/lib/autopilot-delivery-gates.mjs";
const base={
  now:"2026-11-09T16:00:00Z",environment:"qa",enabled:true,
  ownerAuthorized:true,ownerSessionValid:true,tenantId:"axiomai",
  queueId:"24",prospectId:"qa-synthetic-1",channel:"sms",purpose:"followup",
  status:"approved_for_test",isSynthetic:true,recipientAllowlisted:true,
  recipient:"+17875550123",body:"Prueba autorizada sin información privada.",
  containsSensitiveData:false,scheduledFor:"2026-11-09T15:00:00Z",
  consent:{state:"opt_in",channel:"sms",purpose:"followup",
    prospectId:"qa-synthetic-1",recordedAt:"2026-11-09T14:00:00Z",
    evidence:"QA synthetic opt in"},optOutAfterConsent:false,
  globalSuppressed:false,lastContactAt:null,messagesInLast7Days:0,
  idempotencyKey:"axiomai:sms:24"
};
const deny=(name,change,reason)=>test(name,()=>{
  assert.equal(evaluateDispatch({...base,...change}).reason,reason);
});
test("QA SMS eligible to claim (no actual send)",()=>assert.equal(evaluateDispatch(base).allowed,true));
deny("production always denied",{environment:"production"},"qa_only");
deny("disabled flag",{enabled:false},"feature_disabled");
deny("missing owner",{ownerAuthorized:false},"owner_authorization_required");
deny("revoked owner session",{ownerSessionValid:false},"owner_authorization_required");
deny("cross-tenant",{tenantId:"other"},"tenant_mismatch");
deny("not approved",{status:"needs_review"},"not_approved_for_test");
deny("real contact forbidden",{isSynthetic:false},"not_synthetic_allowlisted");
deny("unlisted contact",{recipientAllowlisted:false},"not_synthetic_allowlisted");
deny("unvalidated recipient",{recipient:"7875550123"},"invalid_recipient");
deny("blank message",{body:" "},"invalid_message");
deny("sensitive content",{containsSensitiveData:true},"sensitive_data");
deny("scheduled in future",{scheduledFor:"2026-11-10T16:00:00Z"},"not_due");
deny("no opt in",{consent:{...base.consent,state:"unknown"}},"no_current_opt_in");
deny("cross-channel opt in",{consent:{...base.consent,channel:"whatsapp"}},"no_current_opt_in");
deny("cross-purpose opt in",{consent:{...base.consent,purpose:"appointment_reminder"}},"no_current_opt_in");
deny("different prospect consent",{consent:{...base.consent,prospectId:"other"}},"no_current_opt_in");
deny("future consent",{consent:{...base.consent,recordedAt:"2026-12-01T00:00:00Z"}},"invalid_consent_evidence");
deny("subsequent opt out",{optOutAfterConsent:true},"suppressed");
deny("suppression list",{globalSuppressed:true},"suppressed");
deny("24h frequency",{lastContactAt:"2026-11-09T08:00:00Z"},"rate_limit_24h");
deny("weekly frequency",{messagesInLast7Days:2},"rate_limit_7d");
deny("missing frequency evidence",{messagesInLast7Days:undefined},"rate_limit_7d");
deny("PR quiet hours",{now:"2026-11-09T03:00:00Z",
  scheduledFor:"2026-11-08T16:00:00Z",
  consent:{...base.consent,recordedAt:"2026-11-08T15:00:00Z"}},"quiet_hours");
deny("invalid idempotency key",{idempotencyKey:"wrong"},"idempotency_key_mismatch");
const wa={...base,channel:"whatsapp",idempotencyKey:"axiomai:whatsapp:24",
  consent:{...base.consent,channel:"whatsapp"}};
test("WhatsApp outside 24h needs approved template",()=>assert.equal(evaluateDispatch(wa).reason,"whatsapp_template_required"));
test("WhatsApp approved template allowed in QA",()=>assert.equal(evaluateDispatch({...wa,templateApproved:true,templateName:"qa_followup_approved"}).allowed,true));
test("WhatsApp customer service window allowed in QA",()=>assert.equal(evaluateDispatch({...wa,lastInboundWhatsAppAt:"2026-11-09T14:00:00Z"}).allowed,true));


test("Missing sensitive classification fails closed in QA",()=>assert.equal(
  evaluateDispatch({...base,containsSensitiveData:undefined}).reason,"sensitive_data"));
test("Missing opt-out evidence fails closed in QA",()=>assert.equal(
  evaluateDispatch({...base,optOutAfterConsent:undefined}).reason,"suppressed"));
test("Missing suppression-list evidence fails closed in QA",()=>assert.equal(
  evaluateDispatch({...base,globalSuppressed:undefined}).reason,"suppressed"));
test("WhatsApp 24h boundary: second before deadline allows free-form in QA",()=>{
  assert.equal(evaluateDispatch({...wa,lastInboundWhatsAppAt:"2026-11-08T16:00:01Z"}).allowed,true);
});
test("WhatsApp at exactly 24h requires approved template",()=>{
  assert.equal(evaluateDispatch({...wa,lastInboundWhatsAppAt:"2026-11-08T16:00:00Z"}).reason,"whatsapp_template_required");
});
test("WhatsApp future inbound timestamp cannot open 24h window",()=>{
  assert.equal(evaluateDispatch({...wa,lastInboundWhatsAppAt:"2026-11-09T16:01:00Z"}).reason,"whatsapp_template_required");
});
test("WhatsApp invalid template name rejected outside 24h",()=>{
  assert.equal(evaluateDispatch({...wa,templateApproved:true,templateName:"BAD-Template"}).reason,"whatsapp_template_required");
});
test("WhatsApp valid template can be used at exactly 24h in QA",()=>{
  assert.equal(evaluateDispatch({...wa,lastInboundWhatsAppAt:"2026-11-08T16:00:00Z",templateApproved:true,templateName:"qa_followup_approved"}).allowed,true);
});
test("Expired evidence older than 90 days blocks followup",()=>{
  assert.equal(evaluateDispatch({...base,consent:{...base.consent,recordedAt:"2026-08-01T00:00:00Z"}}).reason,"invalid_consent_evidence");
});
test("WhatsApp missing opt-out evidence cannot pass with approved template",()=>{
  assert.equal(evaluateDispatch({...wa,templateApproved:true,templateName:"qa_followup_approved",optOutAfterConsent:null}).reason,"suppressed");
});


test("Missing last-contact evidence fails closed rather than assuming no prior contact",()=>{
  assert.equal(evaluateDispatch({...base,lastContactAt:undefined}).reason,"rate_limit_24h");
});
test("Empty last-contact evidence fails closed",()=>{
  assert.equal(evaluateDispatch({...base,lastContactAt:""}).reason,"rate_limit_24h");
});
test("Explicit null last-contact result, indicating no prior contact, is permitted for synthetic QA",()=>{
  assert.equal(evaluateDispatch({...base,lastContactAt:null}).allowed,true);
});
