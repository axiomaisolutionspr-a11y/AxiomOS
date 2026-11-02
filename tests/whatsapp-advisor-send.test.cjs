const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync("app/lib/whatsapp-advisor-send.ts", "utf8");
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(code, {module:moduleObject,exports:moduleObject.exports,Date,Number,Error});
const {sendAdvisorMessage} = moduleObject.exports;
const input = () => ({requestId:"123",conversationKey:"whatsapp:fictional",
  recipient:"12025550118",recipientKind:"phone",text:"Hola",advisor:"Alex",inboundAt:new Date()});

function database() {
  const events = [];
  let exists = false;
  const sql = async (parts, ...values) => {
    const query = parts.join("?");
    events.push({query,values});
    if (query.includes("INSERT INTO axira_advisor_outbound")) {
      if (exists) return [];
      exists = true;
      return [{request_id:values[0]}];
    }
    if (query.includes("UPDATE axira_advisor_outbound") && query.includes("accepted"))
      return [{request_id:"123"}];
    return [];
  };
  return {sql,events};
}

test("accepted message is recorded and a duplicate cannot send again", async () => {
  const db = database();
  let calls = 0;
  const send = async () => { calls++; return {providerId:"provider-1"}; };
  assert.equal((await sendAdvisorMessage(db.sql,input(),send)).state,"accepted");
  assert.equal((await sendAdvisorMessage(db.sql,input(),send)).state,"already_processed");
  assert.equal(calls,1);
  assert.ok(db.events.some(e=>e.query.includes("INSERT INTO whatsapp_messages")));
});

test("a closed window blocks the database and provider", async () => {
  const db = database();
  const old = input(); old.inboundAt = new Date(Date.now()-25*60*60*1000);
  assert.equal((await sendAdvisorMessage(db.sql,old,async()=>{throw Error("unexpected");})).state,"window_closed");
  assert.equal(db.events.length,0);
});

test("an ambiguous provider outcome is recorded without retry", async () => {
  const db = database();
  assert.equal((await sendAdvisorMessage(db.sql,input(),async()=>{throw Error("timeout");})).state,"uncertain");
  assert.ok(db.events.some(e=>e.query.includes("state='uncertain'")));
  assert.equal((await sendAdvisorMessage(db.sql,input(),async()=>{throw Error("unexpected");})).state,"already_processed");
});
