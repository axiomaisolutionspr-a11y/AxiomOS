const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('scripts/axira-qa-run.cjs', 'utf8');
const selected = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feature/axira-whatsapp-service-menu',
  VERCEL_GIT_COMMIT_SHA: 'qa-commit', AXIRA_QA_RUN_COMMIT: 'qa-commit' };

for (const [name, env] of [
  ['production', { ...selected, VERCEL_ENV: 'production' }],
  ['another branch', { ...selected, VERCEL_GIT_COMMIT_REF: 'main' }],
  ['unselected commit', { ...selected, AXIRA_QA_RUN_COMMIT: 'other' }],
  ['unset activation', {}],
  ['production database hostname', { ...selected, DATABASE_URL: 'postgresql://fictional@production.invalid/db' }],
]) test(`QA build runner never connects for ${name}`, async () => {
  let connections = 0;
  const processStub = { env, cwd: () => process.cwd() };
  vm.runInNewContext(source, { process: processStub, URL, console: { log() {}, error() {} },
    require: module => {
      if (module === '@neondatabase/serverless') return { neon() { connections++; throw new Error('No DB allowed'); } };
      return require(module);
    } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(connections, 0);
  if (name === 'production database hostname') assert.equal(processStub.exitCode, 1);
});
