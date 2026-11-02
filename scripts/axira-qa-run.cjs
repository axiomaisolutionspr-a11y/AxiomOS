// Deliberate deployment-time QA. Never fetch or copy credentials off Vercel.
// Run only when AXIRA_QA_RUN_COMMIT matches this exact Preview commit.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const ts = require('typescript');
const { neon } = require('@neondatabase/serverless');
const { NextRequest, NextResponse } = require('next/server');

const platform = process.env;
const requested = platform.AXIRA_QA_RUN_COMMIT;
if (!requested || requested !== platform.VERCEL_GIT_COMMIT_SHA || platform.VERCEL_ENV !== 'preview' ||
    platform.VERCEL_GIT_COMMIT_REF !== 'feature/axira-whatsapp-service-menu') {
  console.log('AXIRA_QA_SKIPPED: exact Preview commit not selected');
} else {
  let stage = 'configuration';
  main().catch(() => { console.error('AXIRA_QA_FAILED', JSON.stringify({ stage })); process.exitCode = 1; });

  async function main() {
    const connection = new URL(platform.DATABASE_URL || '');
    assert.ok(['postgres:', 'postgresql:'].includes(connection.protocol));
    assert.ok(['ep-flat-art-av3pifin.c-11.us-east-1.aws.neon.tech',
      'ep-flat-art-av3pifin-pooler.c-11.us-east-1.aws.neon.tech'].includes(connection.hostname));
    for (const key of ['AXIRA_WHATSAPP_MENU_ENABLED', 'EMAIL_ENABLED', 'WHATSAPP_SMS_ALERTS_ENABLED']) assert.equal(platform[key], 'false');
    assert.ok(!platform.DUALHOOK_API_KEY);

    const sql = neon(platform.DATABASE_URL);
    const runId = `qa:axira:${requested.slice(0, 10)}:${randomUUID()}`;
    const company = 'Empresa Ficticia QA Axira';
    const phones = Array.from({ length: 9 }, (_, i) => `120255501${String(i + 10).padStart(2, '0')}`);
    const cases = [];
    let liveBrainCalls = 0;
    // Preflight all synthetic identities before writing any fixture. Never
    // overwrite an inherited record that is not explicitly our QA fixture.
    stage = 'fixture-identity-preflight';
    for (const phone of phones) {
      const rows = await sql`SELECT caller_company FROM prospects WHERE prospect_key = ${`phone:${phone.slice(-10)}`}`;
      assert.ok(rows.every(row => row.caller_company === company));
    }
    stage = 'fixture-seed';
    for (const phone of phones) {
      await sql`INSERT INTO prospects (prospect_key, caller_name, caller_phone, caller_company)
        VALUES (${`phone:${phone.slice(-10)}`}, 'Cliente ficticio QA Axira', ${`+${phone}`}, ${company})
        ON CONFLICT (prospect_key) DO NOTHING`;
    }

    function loadModule(file, context, overrides, cache = new Map()) {
      if (cache.has(file)) return cache.get(file);
      const module = { exports: {} }; cache.set(file, module.exports);
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022 } }).outputText;
      const imports = specifier => {
        if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
        if (specifier.startsWith('.')) {
          const next = path.normalize(path.join(path.dirname(file), specifier)) + '.ts';
          assert.ok(next.startsWith('app/lib/'));
          return loadModule(next, context, overrides, cache);
        }
        throw new Error('QA_IMPORT_BLOCKED');
      };
      vm.runInContext('(function(require,module,exports){' + code + '\n})', context,
        { filename: file })(imports, module, module.exports);
      cache.set(file, module.exports); return module.exports;
    }

    const quiet = { log() {}, error() {}, warn() {} };
    const brainContext = vm.createContext({ process: { env: {
      OPENAI_API_KEY: platform.OPENAI_API_KEY, OPENAI_MODEL: platform.OPENAI_MODEL,
    } }, Response, Request, URL, AbortController, AbortSignal, setTimeout, clearTimeout, console: quiet,
      fetch: async (url, init) => {
        assert.equal(String(url), 'https://api.openai.com/v1/responses'); liveBrainCalls++;
        return fetch(url, init);
      } });
    const realBrain = loadModule('app/api/brain/route.ts', brainContext, { 'next/server': { NextResponse } });

    function fixture(phone, options = {}) {
      const state = { calls: [], brainInputs: [], failBrain: false, failSend: false, failDb: false, failInterest: false };
      const env = { DATABASE_URL: platform.DATABASE_URL, EMAIL_ENABLED: 'false', WHATSAPP_SMS_ALERTS_ENABLED: 'false',
        WHATSAPP_PHONE_NUMBER_ID: 'qa-fictional-id', DUALHOOK_API_KEY: 'qa-no-provider-credential',
        AXIRA_WHATSAPP_MENU_ENABLED: 'true', AXIRA_WHATSAPP_RECOVERY_ENABLED: 'true',
        AXIRA_WHATSAPP_TEST_PHONES: phones.join(','), ...options.env };
      const guardedSql = (strings, ...values) => {
        if (state.failDb) throw new Error('QA_DATABASE_FAILURE');
        if (state.failInterest && strings.join('').includes('UPDATE prospects') && values.some(v => typeof v === 'string' && v.includes('[WA_INTEREST:'))) {
          throw new Error('QA_INTEREST_FAILURE');
        }
        return sql(strings, ...values);
      };
      const context = vm.createContext({ process: { env }, URL, AbortSignal, console: quiet,
        fetch: async (url, init) => {
          const target = String(url), body = JSON.parse(init.body);
          if (target === 'https://qa.invalid/api/brain') {
            state.brainInputs.push(body);
            if (state.failBrain) return Response.json({ error: 'QA_BRAIN_FAILURE' }, { status: 503 });
            if (options.liveBrain) return realBrain.POST(new NextRequest(target, { method: 'POST', body: init.body }));
            return Response.json({ result: 'Respuesta ficticia de Brain para pruebas de recuperación.' });
          }
          // There is no real network request for WhatsApp, SMS or email.
          assert.equal(target, 'https://api.dualhook.com/v25.0/qa-fictional-id/messages');
          state.calls.push(body);
          if (state.failSend) throw new Error('QA_SEND_RESULT_UNCERTAIN');
          return Response.json({ messages: [{ id: `qa-outbound-${state.calls.length}` }] });
        } });
      const handler = loadModule('app/api/whatsapp/route.ts', context, {
        'next/server': { NextRequest, NextResponse }, '@neondatabase/serverless': { neon: () => guardedSql },
        'node:crypto': { createHash, randomUUID },
      });
      async function send(text, suffix, extra = {}) {
        const id = `${runId}:${suffix}`;
        const message = { from: phone, from_user_id: `${runId}:${phone}`, type: 'text', text: { body: text }, id, ...extra };
        const body = { entry: [{ changes: [{ value: { messages: [message] } }] }] };
        const response = await handler.POST(new NextRequest('https://qa.invalid/api/whatsapp', { method: 'POST', body: JSON.stringify(body) }));
        return { status: response.status, ...(await response.json()), id };
      }
      return { state, send, phone };
    }
    async function check(name, fn) { stage = name; await fn(); cases.push({ name, passed: true }); }
    async function verifyStored(f, id, label) {
      const prospects = await sql`SELECT caller_name, caller_company, crm_notes FROM prospects WHERE prospect_key = ${`phone:${f.phone.slice(-10)}`}`;
      assert.equal(prospects.length, 1); assert.equal(prospects[0].caller_company, company);
      assert.equal(prospects[0].caller_name, 'Cliente ficticio QA Axira');
      assert.equal(prospects[0].crm_notes.split(`[WA_INTEREST:${id}]`).length - 1, 1);
      assert.ok(prospects[0].crm_notes.includes(label));
      const messages = await sql`SELECT role, message FROM whatsapp_messages WHERE whatsapp_message_id IN
        (${id}, ${`axiomos:reply:${createHash('sha256').update(id).digest('hex')}`})`;
      assert.equal(messages.filter(m => m.role === 'user').length, 1);
      assert.equal(messages.filter(m => m.role === 'assistant').length, 1);
    }
    const labels = ['WhatsApp y atención al cliente', 'Llamadas y recepcionista virtual', 'CRM, ventas y seguimiento',
      'Administración, inventario y facturación', 'Robótica y automatización', 'Todas las soluciones'];
    for (let i = 0; i < 6; i++) await check(`service-${i + 1}-crm-and-duplicate`, async () => {
      const f = fixture(phones[i]); const result = await f.send(String(i + 1), `service-${i + 1}`);
      assert.equal(result.repliesSent, 1); assert.equal(result.errors.length, 0);
      await f.send(String(i + 1), `service-${i + 1}`); assert.equal(f.state.calls.length, 1);
      await verifyStored(f, result.id, labels[i]);
    });
    await check('live-brain-continuity', async () => {
      const f = fixture(phones[3], { liveBrain: true });
      await f.send('4', 'live-selection');
      const result = await f.send('Somos una tienda ficticia de pruebas. Usamos hojas de cálculo y queremos organizar el inventario.', 'live-follow-up');
      assert.equal(result.repliesSent, 1); assert.equal(result.errors.length, 0);
      const history = f.state.brainInputs.at(-1).messages;
      assert.ok(history.some(m => m.text.includes(company)));
      assert.ok(history.some(m => m.role === 'assistant' && m.text.includes('facturación')));
      assert.ok(history.at(-1).text.includes('hojas de cálculo'));
      const reply = f.state.calls.at(-1).text.body;
      assert.ok(typeof reply === 'string' && reply.length > 20);
      assert.ok(/inventario|hojas|stock|productos|tienda/i.test(reply));
    });
    await check('brain-failure-503-then-recovery', async () => {
      const f = fixture(phones[6]); f.state.failBrain = true;
      const first = await f.send('Hola, esta es una prueba ficticia', 'brain-recovery');
      assert.equal(first.status, 503); assert.equal(f.state.calls.length, 0);
      f.state.failBrain = false; const second = await f.send('Hola, esta es una prueba ficticia', 'brain-recovery');
      assert.equal(second.repliesSent, 1); await f.send('Hola, esta es una prueba ficticia', 'brain-recovery');
      assert.equal(f.state.calls.length, 1);
      const rows = await sql`SELECT state, attempts FROM axira_whatsapp_delivery WHERE message_id = ${first.id}`;
      assert.equal(rows[0].state, 'sent'); assert.equal(rows[0].attempts, 2);
    });
    await check('concurrent-duplicate', async () => {
      const f = fixture(phones[7]); const results = await Promise.all([f.send('3', 'concurrent'), f.send('3', 'concurrent')]);
      assert.equal(f.state.calls.length, 1); assert.equal(results.reduce((n, r) => n + r.repliesSent, 0), 1);
      await verifyStored(f, results[0].id, labels[2]);
    });
    await check('uncertain-send-is-not-repeated', async () => {
      const f = fixture(phones[8]); f.state.failSend = true;
      const result = await f.send('5', 'uncertain'); f.state.failSend = false; await f.send('5', 'uncertain');
      assert.equal(f.state.calls.length, 1);
      const rows = await sql`SELECT state FROM axira_whatsapp_delivery WHERE message_id = ${result.id}`;
      assert.equal(rows[0].state, 'uncertain');
    });
    await check('interest-write-recovery', async () => {
      const f = fixture(phones[5]); f.state.failInterest = true;
      const result = await f.send('6', 'interest-recovery'); f.state.failInterest = false; await f.send('6', 'interest-recovery');
      assert.equal(f.state.calls.length, 1); await verifyStored(f, result.id, labels[5]);
    });
    await check('unlisted-phone-does-not-activate-menu', async () => {
      const f = fixture(phones[6], { env: { AXIRA_WHATSAPP_TEST_PHONES: '' } });
      await f.send('4', 'unlisted'); assert.equal(f.state.brainInputs.length, 1);
    });
    await check('database-outage-no-send', async () => {
      const f = fixture(phones[6]); f.state.failDb = true;
      const result = await f.send('4', 'database-outage'); assert.equal(result.status, 503); assert.equal(f.state.calls.length, 0);
    });
    await check('missing-message-id-no-send', async () => {
      const f = fixture(phones[6]); const result = await f.send('4', 'missing-id', { id: undefined });
      assert.equal(result.repliesSent, 0); assert.equal(f.state.calls.length, 0);
      assert.ok(result.errors.includes('WHATSAPP_MESSAGE_ID_REQUIRED'));
    });
    await check('missing-identity-no-send', async () => {
      const f = fixture(phones[6]); const result = await f.send('4', 'missing-identity', { from: undefined, from_user_id: undefined });
      assert.equal(result.messagesReceived, 0); assert.equal(f.state.calls.length, 0);
    });
    await check('media-recorded-without-fabricated-reply', async () => {
      const f = fixture(phones[6]); const result = await f.send(undefined, 'image', { type: 'image', text: undefined, image: {} });
      assert.equal(result.repliesSent, 0); assert.equal(f.state.calls.length, 0);
      const rows = await sql`SELECT state FROM axira_whatsapp_delivery WHERE message_id = ${result.id}`;
      assert.equal(rows[0].state, 'ignored');
    });
    await check('reset-preserves-new-conversation', async () => {
      const f = fixture(phones[6]); await f.send('#reset', 'reset'); await f.send('Hola otra vez', 'after-reset');
      const history = f.state.brainInputs.at(-1).messages;
      assert.equal(history.filter(m => m.role === 'user' && !m.text.includes('Información verificada')).length, 1);
    });
    console.log('AXIRA_QA_RESULT', JSON.stringify({ runId, commit: requested, passed: cases.length,
      failed: 0, liveBrainCalls, realMessagingCalls: 0, cases }));
  }
}
