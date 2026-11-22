import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  getInstagramAccessToken,
  refreshInstagramAccessToken,
  REFRESH_EVERY_MS,
} from "../app/lib/instagram-token.mjs";

const ENV_TOKEN = "IGenv_token_value_1234567890";
const NEW_TOKEN = "IGnew_token_value_0987654321";
const h = (v) => createHash("sha256").update(v).digest("hex");

function fakeSql(row = null, { failRead = false } = {}) {
  const state = { row, writes: [] };
  const sql = async (strings, ...values) => {
    const text = strings.join("?");
    if (text.includes("SELECT")) {
      if (failRead) throw new Error("db down");
      return state.row ? [state.row] : [];
    }
    if (text.includes("INSERT")) {
      const [, token, seed_hash, expires_at, refreshed_at] = values;
      state.row = { token, seed_hash, expires_at, refreshed_at };
      state.writes.push(state.row);
      return [];
    }
    throw new Error("unexpected query");
  };
  return { sql, state };
}

const okFetch = (calls) => async (url) => {
  calls.push(String(url));
  return { ok: true, status: 200, json: async () => ({ access_token: NEW_TOKEN, token_type: "bearer", expires_in: 5184000 }) };
};

test("get: falls back to env token without DB or stored row", async () => {
  const env = { INSTAGRAM_ACCESS_TOKEN: ENV_TOKEN };
  assert.equal(await getInstagramAccessToken(null, env), ENV_TOKEN);
  assert.equal(await getInstagramAccessToken(fakeSql().sql, env), ENV_TOKEN);
  assert.equal(await getInstagramAccessToken(fakeSql(null, { failRead: true }).sql, env), ENV_TOKEN);
});

test("get: uses stored token only when it was seeded from the current env token", async () => {
  const env = { INSTAGRAM_ACCESS_TOKEN: ENV_TOKEN };
  const same = fakeSql({ token: NEW_TOKEN, seed_hash: h(ENV_TOKEN), refreshed_at: new Date() });
  assert.equal(await getInstagramAccessToken(same.sql, env), NEW_TOKEN);
  const stale = fakeSql({ token: NEW_TOKEN, seed_hash: h("older-env-token-xxxxxxxx"), refreshed_at: new Date() });
  assert.equal(await getInstagramAccessToken(stale.sql, env), ENV_TOKEN);
});

test("refresh: first run refreshes from env token and stores result", async () => {
  const calls = [];
  const { sql, state } = fakeSql();
  const now = new Date("2026-11-22T10:17:00Z");
  const r = await refreshInstagramAccessToken({ sql, env: { INSTAGRAM_ACCESS_TOKEN: ENV_TOKEN }, fetchImpl: okFetch(calls), now });
  assert.equal(r.status, "refreshed");
  assert.equal(r.expiresAt, "2027-01-21T10:17:00.000Z");
  assert.ok(calls[0].includes("grant_type=ig_refresh_token") && calls[0].includes(ENV_TOKEN));
  assert.equal(state.row.token, NEW_TOKEN);
  assert.equal(state.row.seed_hash, h(ENV_TOKEN));
  assert.ok(!JSON.stringify(r).includes(NEW_TOKEN) && !JSON.stringify(r).includes(ENV_TOKEN));
});

test("refresh: skips when refreshed less than 7 days ago, refreshes stored token after", async () => {
  const now = new Date("2026-11-30T10:17:00Z");
  const recent = fakeSql({ token: NEW_TOKEN, seed_hash: h(ENV_TOKEN), refreshed_at: new Date(now.getTime() - REFRESH_EVERY_MS + 60000) });
  const calls = [];
  assert.equal((await refreshInstagramAccessToken({ sql: recent.sql, env: { INSTAGRAM_ACCESS_TOKEN: ENV_TOKEN }, fetchImpl: okFetch(calls), now })).status, "fresh");
  assert.equal(calls.length, 0);
  const old = fakeSql({ token: "IGstored_token_abcdefghijk", seed_hash: h(ENV_TOKEN), refreshed_at: new Date(now.getTime() - REFRESH_EVERY_MS - 60000) });
  assert.equal((await refreshInstagramAccessToken({ sql: old.sql, env: { INSTAGRAM_ACCESS_TOKEN: ENV_TOKEN }, fetchImpl: okFetch(calls), now })).status, "refreshed");
  assert.ok(calls[0].includes("IGstored_token_abcdefghijk"));
});

test("refresh: failure keeps current token and reports no secrets", async () => {
  const { sql, state } = fakeSql();
  const failFetch = async () => ({ ok: false, status: 400, json: async () => ({ error: { code: 190, message: `bad ${ENV_TOKEN}` } }) });
  const r = await refreshInstagramAccessToken({ sql, env: { INSTAGRAM_ACCESS_TOKEN: ENV_TOKEN }, fetchImpl: failFetch });
  assert.deepEqual(r, { status: "refresh_failed", httpStatus: 400, errorCode: 190 });
  assert.equal(state.writes.length, 0);
});

test("refresh: missing env token or DB", async () => {
  assert.equal((await refreshInstagramAccessToken({ sql: fakeSql().sql, env: {} })).status, "missing_env_token");
  assert.equal((await refreshInstagramAccessToken({ sql: null, env: { INSTAGRAM_ACCESS_TOKEN: ENV_TOKEN } })).status, "missing_database");
});
