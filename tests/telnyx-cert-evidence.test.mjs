import assert from "node:assert/strict";
import test from "node:test";
import {evaluateTelnyxSmsCertificate} from "../app/lib/telnyx-cert-evidence.ts";

const id = "40385f64-5717-4562-b3fc-2c963f66afa6";
const fixture = {
  id, direction: "outbound", type: "SMS",
  text: "AxiomAI Solutions - PRUEBA AUTORIZADA de SMS Autopilot (09-nov-2026). Sin enlaces. No responder.",
  received_at: "2026-11-09T14:44:31Z", to: [{phone_number: "+17872320132",status: "delivered"}]
};
function clone(obj){return JSON.parse(JSON.stringify(obj));}

test("historic Telnyx SMS status is delivered only with a matched recipient, body, id and date",()=>{
  const x=evaluateTelnyxSmsCertificate(fixture,id);
  assert.equal(x.status,"delivered");
  assert.equal(x.providerStatus,"delivered");
  for (const data of [
    {...fixture, id:"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"},
    {...fixture, text:"unrelated SMS"},
    {...fixture, type:"MMS"},
    {...fixture, direction:"inbound"},
    {...fixture, received_at:"2026-11-10T14:44:31Z"},
    {...fixture, to:[{phone_number:"+17875550000",status:"delivered"}]},
    {...fixture, to:[]},
    null,
  ]) assert.equal(evaluateTelnyxSmsCertificate(data,id).status,"mismatch");
  assert.equal(evaluateTelnyxSmsCertificate(fixture,"different").status,"mismatch");
});

test("other Telnyx statuses are not misrepresented as delivered",()=>{
  const cases={
    queued:"unconfirmed",sending:"unconfirmed",sent:"unconfirmed",
    delivery_unconfirmed:"unconfirmed",unknown:"unconfirmed",
    sending_failed:"failed",delivery_failed:"failed",delivered:"delivered"
  };
  for(const [status, expected] of Object.entries(cases)){
    const data=clone(fixture);data.to[0].status=status;
    assert.equal(evaluateTelnyxSmsCertificate(data,id).status,expected, status);
  }
});

test("missing/incorrect receipt timestamp never proves delivery",()=>{
  const data=clone(fixture);
  delete data.received_at;
  assert.equal(evaluateTelnyxSmsCertificate(data,id).status,"mismatch");
  data.sent_at="2026-11-09T14:45:00Z";
  assert.equal(evaluateTelnyxSmsCertificate(data,id).status,"delivered");
  data.sent_at="not-a-time";
  assert.equal(evaluateTelnyxSmsCertificate(data,id).status,"mismatch");
});
