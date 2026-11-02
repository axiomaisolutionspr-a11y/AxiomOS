// Control-flow integration tests. SQL and all outbound HTTP are simulated.
// No environment variables, credentials, databases or providers are inherited.
// Run: node --test tests/axira-webhook-isolated.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require('next/server');
const PHONE = '12025550101'; // Reserved fictional NANP number.
const root = new URL('../', import.meta.url);

function fixture(options = {}) {
  const state = { messages: [], deliveries: new Map(), prospect: null, interest: [], calls: [], statuses: [], logs: [], dbDown: false, brainDown: false, outboundDown: false, interestDown: false };
  const env = {
    DATABASE_URL: 'postgresql://fictional.invalid/qa',
    WHATSAPP_PHONE_NUMBER_ID: 'fictional-phone-id', DUALHOOK_API_KEY: 'fictional-key',
    AXIRA_WHATSAPP_MENU_ENABLED: 'true', AXIRA_WHATSAPP_TEST_PHONES: PHONE,
    EMAIL_ENABLED: 'false', WHATSAPP_SMS_ALERTS_ENABLED: 'false', ...options.env,
  };
  const sql = async (strings, ...values) => {
    const query = strings.join('?').replace(/\s+/g, ' ').trim();
    if (state.dbDown) throw new Error('Simulated Neon unavailable');
    if (query.startsWith('INSERT INTO axira_whatsapp_delivery')) {
      const [id, conversation_key, payload_hash, owner_token] = values;
      const row = state.deliveries.get(id);
      if (state.messages.some(m => m.whatsapp_message_id === id)) return [];
      if (row && (row.conversation_key !== conversation_key || row.payload_hash !== payload_hash || !(row.state === 'retryable' || row.state === 'processing' && row.expired))) return [];
      const next = { ...row, conversation_key, payload_hash, owner_token, state: 'processing', expired: false };
      state.deliveries.set(id, next); return [{ reply_text: next.reply_text }];
    }
    if (query.startsWith('UPDATE axira_whatsapp_delivery SET owner_token')) {
      const [token, id, key, hash] = values; const row = state.deliveries.get(id);
      if (!row || row.conversation_key !== key || row.payload_hash !== hash || !(row.state === 'retryable' || row.state === 'processing' && row.expired)) return [];
      Object.assign(row, { owner_token: token, state: 'processing', expired: false }); return [{ reply_text: row.reply_text }];
    }
    if (query.startsWith('SELECT conversation_key, payload_hash FROM axira_whatsapp_delivery')) {
      const row = state.deliveries.get(values[0]); return row ? [row] : [];
    }
    if (query.startsWith('UPDATE axira_whatsapp_delivery SET state')) {
      let id, token, next, reply;
      if (query.includes("SET state = 'sending'")) { [reply, id, token] = values; next = 'sending'; }
      else if (query.includes("SET state = 'sent'")) { [id, token] = values; next = 'sent'; }
      else if (query.includes("SET state = 'ignored'")) { [id, token] = values; next = 'ignored'; }
      else [next, id, token] = values;
      const row = state.deliveries.get(id);
      const expected = next === 'sent' ? ['sending'] : ['sending', 'processing'];
      if (!row || row.owner_token !== token || !expected.includes(row.state)) return [];
      row.state = next; if (reply !== undefined) row.reply_text = reply;
      return [{ message_id: id }];
    }
    if (query.startsWith('INSERT INTO whatsapp_messages') && query.includes('FROM axira_whatsapp_delivery')) {
      const [phone, replyId, id] = values; const row = state.deliveries.get(id);
      if (row?.state === 'sent' && row.reply_text && !state.messages.some(m => m.whatsapp_message_id === replyId)) {
        state.messages.push({ id: state.messages.length + 1, conversation_key: row.conversation_key, phone, role: 'assistant', message: row.reply_text, whatsapp_message_id: replyId });
      }
      return [];
    }
    if (query.startsWith('SELECT id FROM whatsapp_messages')) return state.messages.filter(m => m.whatsapp_message_id === values[0]);
    if (query.startsWith('INSERT INTO whatsapp_messages')) {
      const [conversation_key, phone, role, message, whatsapp_message_id] = values;
      state.messages.push({ id: state.messages.length + 1, conversation_key, phone, role, message, whatsapp_message_id });
      return [];
    }
    if (query.startsWith('SELECT role, message FROM whatsapp_messages')) {
      return state.messages.filter(m => values.includes(m.conversation_key)).slice(-12).reverse();
    }
    if (query.startsWith('INSERT INTO prospects')) {
      if (!state.prospect) state.prospect = { id: 'qa-1', caller_name: values[1], caller_company: '', crm_notes: '' };
      const marker = values[6].split('\n')[0];
      if (!state.prospect.crm_notes.includes(marker)) state.prospect.crm_notes += '\n' + values[6];
      return [state.prospect];
    }
    if (query.startsWith('SELECT caller_company FROM prospects')) return state.prospect ? [state.prospect] : [];
    if (query.startsWith('UPDATE prospects') && values[0]?.includes?.('[WA_INTEREST:')) {
      if (state.interestDown) throw new Error('Simulated interest write failure');
      if (state.prospect && !state.prospect.crm_notes.includes(values[2])) {
        state.prospect.crm_notes += '\n' + values[0]; state.interest.push(values[0]);
      }
      return [];
    }
    throw new Error('Unhandled simulated SQL: ' + query);
  };
  const fetch = async (url, init) => {
    const target = String(url);
    const body = JSON.parse(init.body);
    state.calls.push({ url: target, body });
    if (target === 'https://qa.invalid/api/brain') {
      return Response.json(state.brainDown ? { error: 'Simulated Brain failure' } : { result: 'Respuesta de Brain simulado' }, { status: state.brainDown ? 503 : 200 });
    }
    if (target === 'https://api.dualhook.com/v25.0/fictional-phone-id/messages') {
      return Response.json(state.outboundDown ? { error: { code: 1, message: 'Simulated provider failure' } } : { messages: [{ id: 'fictional-outbound' }] }, { status: state.outboundDown ? 503 : 200 });
    }
    throw new Error('External request blocked by test harness: ' + target);
  };
  const context = vm.createContext({ process: { env }, fetch, URL, AbortSignal,
    console: Object.fromEntries(['log', 'error', 'warn'].map(level => [level, (...args) => state.logs.push([level, ...args])])) });
  const modules = new Map();
  function load(path) {
    if (modules.has(path)) return modules.get(path);
    const source = readFileSync(new URL(path, root), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} }; modules.set(path, module.exports);
    const imports = specifier => {
      if (specifier === 'next/server') return { NextRequest, NextResponse };
      if (specifier === '@neondatabase/serverless') return { neon: () => sql };
      if (specifier === 'node:crypto') return { createHash, randomUUID };
      if (specifier === '../../lib/whatsapp-contact-request') return load('app/lib/whatsapp-contact-request.ts');
      if (specifier === '../../lib/whatsapp-delivery') return load('app/lib/whatsapp-delivery.ts');
      if (specifier === '../../lib/axira-service-menu') return load('app/lib/axira-service-menu.ts');
      throw new Error('Unapproved test import: ' + specifier);
    };
    vm.runInContext('(function(require,module,exports){' + compiled + '\n})', context, { filename: path })(imports, module, module.exports);
    modules.set(path, module.exports); return module.exports;
  }
  const route = load('app/api/whatsapp/route.ts');
  async function send(text, id = 'qa-msg-1', extra = {}) {
    const message = { from: PHONE, type: 'text', text: { body: text }, id, ...extra };
    const request = new NextRequest('https://qa.invalid/api/whatsapp', { method: 'POST', body: JSON.stringify({ entry: [{ changes: [{ value: { messages: [message] } }] }] }) });
    const response = await route.POST(request); state.statuses.push(response.status);
    return response.json();
  }
  return { state, send, env, brainCalls: () => state.calls.filter(c => c.url.endsWith('/api/brain')), outbound: () => state.calls.filter(c => c.url.includes('dualhook.com')) };
}

for (let choice = 1; choice <= 6; choice++) {
  test(`option ${choice}: reply, interest and conversation are persisted in simulation`, async () => {
    const f = fixture(); const result = await f.send(String(choice));
    assert.equal(result.repliesSent, 1); assert.equal(result.errors.length, 0);
    assert.equal(f.state.interest.length, 1); assert.equal(f.state.messages.length, 2);
    assert.equal(f.brainCalls().length, 0); assert.equal(f.outbound().length, 1);
  });
}
test('menu flag disabled routes numbers to Brain', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_MENU_ENABLED: 'false' } }); await f.send('4');
  assert.equal(f.state.interest.length, 0); assert.equal(f.brainCalls().length, 1);
});
test('unlisted phone cannot activate experimental menu', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_TEST_PHONES: '12025550102' } }); await f.send('4');
  assert.equal(f.state.interest.length, 0); assert.equal(f.brainCalls().length, 1);
});
test('missing allowlist keeps the experimental menu off', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_TEST_PHONES: '' } }); await f.send('4');
  assert.equal(f.state.interest.length, 0); assert.equal(f.brainCalls().length, 1);
});
test('keycap selection reaches the webhook menu', async () => {
  const f = fixture(); await f.send('4️⃣');
  assert.equal(f.state.interest.length, 1); assert.equal(f.brainCalls().length, 0);
});
test('experimental flow rejects missing message id without reply or CRM write', async () => {
  const f = fixture(); const result = await f.send('4', undefined, { id: undefined });
  assert.equal(result.repliesSent, 0); assert.equal(f.state.prospect, null);
  assert.ok(result.errors.includes('WHATSAPP_MESSAGE_ID_REQUIRED'));
  assert.equal(f.state.interest.length, 0);
});
test('sequential duplicate does not repeat interest or outbound', async () => {
  const f = fixture(); await f.send('4'); await f.send('4');
  assert.equal(f.state.interest.length, 1); assert.equal(f.outbound().length, 1);
  assert.equal((f.state.prospect.crm_notes.match(/WA_REQUEST:/g) || []).length, 1);
});
test('free text reaches Brain unchanged', async () => {
  const f = fixture(); await f.send('Tengo una tienda');
  assert.equal(f.brainCalls().length, 1);
  assert.equal(f.brainCalls()[0].body.messages.at(-1).text, 'Tengo una tienda');
});
test('follow-up reaches Brain with selection, previous question and confirmed company', async () => {
  const f = fixture();
  f.state.prospect = { id: 'qa-1', caller_name: 'Cliente QA', caller_company: 'Empresa Ficticia QA', crm_notes: '' };
  await f.send('4'); await f.send('Uso hojas de cálculo', 'qa-msg-2');
  const history = f.brainCalls()[0].body.messages;
  assert.ok(history.some(m => m.text.includes('Empresa Ficticia QA')));
  assert.ok(history.some(m => m.role === 'assistant' && m.text.includes('facturación')));
  assert.equal(history.at(-1).text, 'Uso hojas de cálculo');
  assert.equal(f.state.prospect.caller_name, 'Cliente QA');
  assert.equal(f.state.prospect.caller_company, 'Empresa Ficticia QA');
});
test('reset bypasses menu and clears previous Brain context', async () => {
  const f = fixture(); await f.send('4'); await f.send('#reset', 'qa-msg-2'); await f.send('Hola', 'qa-msg-3');
  const history = f.brainCalls()[0].body.messages;
  assert.equal(history.length, 2); assert.equal(history.at(-1).text, 'Hola');
});
test('image without text registers for team without fabricated reply', async () => {
  const f = fixture(); const result = await f.send(undefined, 'qa-media', { type: 'image', text: undefined, image: {} });
  assert.equal(result.repliesSent, 0); assert.ok(f.state.prospect);
  assert.equal(f.state.calls.length, 0);
});
test('missing sender is skipped without writes or outbound', async () => {
  const f = fixture(); const result = await f.send('4', 'qa-no-sender', { from: undefined });
  assert.equal(result.messagesReceived, 0); assert.equal(f.state.messages.length, 0); assert.equal(f.state.calls.length, 0);
});
test('database outage records error without outbound', async () => {
  const f = fixture(); f.state.dbDown = true; const result = await f.send('4');
  assert.equal(result.errors.length, 1); assert.equal(f.state.calls.length, 0);
});
test('Brain error is surfaced and no outbound is attempted', async () => {
  const f = fixture(); f.state.brainDown = true; const result = await f.send('Hola');
  assert.equal(result.errors.length, 1); assert.equal(f.outbound().length, 0);
});
test('provider error does not persist assistant success', async () => {
  const f = fixture(); f.state.outboundDown = true; const result = await f.send('4');
  assert.equal(result.errors.length, 1); assert.equal(result.repliesSent, 0);
  assert.equal(f.state.messages.filter(m => m.role === 'assistant').length, 0);
});
test('SMS and email disabled even with fictional provider configuration', async () => {
  const f = fixture({ env: { TELNYX_API_KEY: 'fictional', TELNYX_SMS_FROM: '+12025550103', RESEND_API_KEY: 'fictional', EMAIL_ALERT_FROM: 'qa@example.invalid', EMAIL_ALERT_TO: 'qa@example.invalid' } });
  await f.send('Quiero hablar con un asesor');
  assert.ok(f.state.logs.some(l => l[1] === 'WHATSAPP_CONTACT_EMAIL_DISABLED'));
  assert.ok(f.state.logs.some(l => l[1] === 'WHATSAPP_CONTACT_SMS_DISABLED'));
  assert.equal(f.state.calls.some(c => /telnyx|resend/.test(c.url)), false);
});

test('opted-in retry after Brain failure replies once', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_RECOVERY_ENABLED: 'true' } }); f.state.brainDown = true; await f.send('Hola'); f.state.brainDown = false;
  await f.send('Hola'); assert.equal(f.outbound().length, 1); assert.equal(f.state.statuses[0], 503); assert.equal(f.state.statuses[1], 200);
});
test('retry repairs failed interest annotation without repeating reply', async () => {
  const f = fixture(); f.state.interestDown = true; await f.send('4'); f.state.interestDown = false;
  await f.send('4'); assert.equal(f.state.interest.length, 1); assert.equal(f.outbound().length, 1);
});

// Recovery is explicitly opt-in, separate from the service menu flag.
test('concurrent experimental duplicate generates only one reply', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_RECOVERY_ENABLED: 'true' } });
  await Promise.all([f.send('4'), f.send('4')]);
  assert.equal(f.outbound().length, 1);
  assert.equal(f.state.messages.filter(m => m.role === 'user').length, 1);
  assert.equal(f.state.messages.filter(m => m.role === 'assistant').length, 1);
});
test('uncertain provider outcome never automatically resends', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_RECOVERY_ENABLED: 'true' } });
  f.state.outboundDown = true; await f.send('4'); f.state.outboundDown = false;
  await f.send('4'); assert.equal(f.outbound().length, 1);
  assert.equal(f.state.deliveries.get('qa-msg-1').state, 'uncertain');
});
test('payload mismatch cannot reuse a ledger identity', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_RECOVERY_ENABLED: 'true' } });
  await f.send('4'); const result = await f.send('5');
  assert.ok(result.errors.includes('WHATSAPP_DUPLICATE_PAYLOAD_MISMATCH'));
  assert.equal(f.outbound().length, 1); assert.equal(f.state.interest.length, 1);
});
test('successful re-delivery repairs missing assistant history without a resend', async () => {
  const f = fixture({ env: { AXIRA_WHATSAPP_RECOVERY_ENABLED: 'true' } });
  await f.send('4'); f.state.messages = f.state.messages.filter(m => m.role !== 'assistant');
  await f.send('4'); assert.equal(f.outbound().length, 1);
  assert.equal(f.state.messages.filter(m => m.role === 'assistant').length, 1);
});
