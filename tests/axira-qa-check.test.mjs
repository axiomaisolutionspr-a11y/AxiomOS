import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../app/api/qa/axira/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;

function fixture(overrides = {}, failDatabase = false) {
  const state = { connections: 0, queries: [] };
  const env = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature/axira-whatsapp-service-menu',
    DATABASE_URL: 'postgresql://fictional:fictional@ep-flat-art-av3pifin-pooler.c-11.us-east-1.aws.neon.tech/neondb',
    AXIRA_WHATSAPP_MENU_ENABLED: 'false', WHATSAPP_SMS_ALERTS_ENABLED: 'false', EMAIL_ENABLED: 'false', ...overrides };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, process: { env }, URL, Response,
    require: name => {
      assert.equal(name, '@neondatabase/serverless');
      return { neon: () => { state.connections++; return async strings => {
        state.queries.push(strings.join(''));
        if (failDatabase) throw new Error('sensitive driver error');
        return [{ connected: 1 }];
      }; } };
    } });
  return { state, GET: module.exports.GET };
}

for (const env of [{ VERCEL_ENV: 'production' }, { VERCEL_GIT_COMMIT_REF: 'main' }]) {
  test('unavailable outside the designated Preview branch: ' + JSON.stringify(env), async () => {
    const f = fixture(env); assert.equal((await f.GET()).status, 404); assert.equal(f.state.connections, 0);
  });
}
for (const env of [{ DATABASE_URL: 'postgresql://fake:fake@production.invalid/neondb' },
  { DATABASE_URL: 'invalid' }, { AXIRA_WHATSAPP_MENU_ENABLED: 'true' },
  { WHATSAPP_SMS_ALERTS_ENABLED: 'true' }, { EMAIL_ENABLED: 'true' }, { DUALHOOK_API_KEY: 'fictional' }]) {
  test('unsafe configuration stops before database access: ' + Object.keys(env)[0], async () => {
    const f = fixture(env); assert.equal((await f.GET()).status, 503); assert.equal(f.state.connections, 0);
  });
}
test('safe configuration executes only SELECT 1 and returns booleans', async () => {
  const f = fixture(); const response = await f.GET(); const payload = await response.json();
  assert.equal(response.status, 200); assert.equal(payload.ok, true);
  assert.deepEqual(f.state.queries, ['SELECT 1 AS connected']);
  assert.equal(JSON.stringify(payload).includes('postgresql'), false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('database error is sanitized', async () => {
  const f = fixture({}, true); const response = await f.GET();
  assert.equal(response.status, 503); assert.equal((await response.text()).includes('sensitive'), false);
});
