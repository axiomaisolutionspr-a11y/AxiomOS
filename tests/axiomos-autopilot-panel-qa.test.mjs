import test from "node:test";
import assert from "node:assert/strict";
import {autopilotPanelDatabase,loadAutopilotPanel,panelReadAllowed} from "../app/lib/axiomos-autopilot-panel-qa.mjs";
const env={VERCEL_ENV:"preview",AXIOMOS_INDIVIDUAL_AUTH_QA_ENABLED:"true",AXIOMOS_AUTOPILOT_PANEL_QA_ENABLED:"true",
  AXIOMOS_AUTOPILOT_PANEL_QA_READ_URL:"postgresql://axiomos_autopilot_qa_panel_reader:synthetic@ep-storage.qa.example/axiomos_offers_qa",
  AXIOMOS_AUTOPILOT_PANEL_QA_HOST:"ep-storage.qa.example",
  AXIOMOS_IDENTITY_QA_DATABASE_URL:"postgresql://identity:synthetic@ep-identity.qa.example/axiomos_offers_qa"};
test("panel fails closed in production and without isolated reader",()=>{
  assert.ok(autopilotPanelDatabase(env));
  assert.equal(autopilotPanelDatabase({...env,VERCEL_ENV:"production"}),null);
  assert.equal(autopilotPanelDatabase({...env,AXIOMOS_AUTOPILOT_PANEL_QA_READ_URL:env.AXIOMOS_IDENTITY_QA_DATABASE_URL}),null);
  assert.equal(autopilotPanelDatabase({...env,AXIOMOS_AUTOPILOT_PANEL_QA_HOST:"another.qa.example"}),null);
  assert.equal(autopilotPanelDatabase({...env,AXIOMOS_AUTOPILOT_PANEL_QA_ENABLED:"false"}),null);
});
test("panel roles limited to known active roles",()=>{for(const role of ["owner","operator","viewer"])assert.equal(panelReadAllowed(role),true);for(const role of [null,"admin","disabled"])assert.equal(panelReadAllowed(role),false);});
test("load respects synthetic QA read-only projections",async()=>{
  let count=0;
  const sql=async()=>{count++;return count===1?[{prospects:1,awaiting:1,events:1}]:count===2?[{contact_key:"qa:buyer",events_seen:1}]:count===3?[{contact_key:"qa:buyer",event_id:"event_1",channel:"web"}]:[{event_id:"event_1",channel:"web",action:"recorded_pending_review"}];};
  const result=await loadAutopilotPanel(sql);
  assert.equal(result.summary.awaiting,1);assert.equal(result.tasks.length,1);assert.equal(count,4);
  await assert.rejects(loadAutopilotPanel(null),/QA_PANEL_NOT_CONFIGURED/);
});
