/**
 * AxiomAI POS QA HTTP E2E.
 * Run only against isolated Neon QA; requires POS_QA_DATABASE_URL supplied securely
 * to the process (not inherited from a Vercel production deployment).
 * No bank requests, no production data, and no real customer credentials.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const qaUrl = process.env.POS_QA_DATABASE_URL;
if (!qaUrl) throw Error("POS_QA_DATABASE_URL is required in isolated QA process");
const parsed = new URL(qaUrl);
assert.equal(parsed.username, "pos_qa_app_login", "QA app role only");
assert.ok(parsed.hostname.endsWith(".neon.tech"), "Neon host only");

const port = Number(process.env.POS_E2E_PORT || "3247");
const base = "http://127.0.0.1:" + port;
const username = "qa-e2e-" + randomBytes(5).toString("hex");
const password = randomBytes(30).toString("base64url");
const salt = randomBytes(32);
const passwordHash = "scrypt$" + salt.toString("hex") + "$" +
  scryptSync(password, salt, 64).toString("hex");
const merchantId = "9db8e793-4bc2-48ff-aa29-ea673bc850b1";
const actorId = "14619154-a263-4a70-930d-b79c0d86abe4";
const fakeCrmPin = "qa-only-" + randomBytes(16).toString("hex");
const env = {
  ...process.env,
  VERCEL_ENV: "preview",
  POS_QA_ENABLED: "true",
  POS_QA_DATABASE_HOST: parsed.hostname,
  POS_QA_SESSION_SECRET: randomBytes(48).toString("hex"),
  POS_QA_USERS_JSON: JSON.stringify([{username, passwordHash, merchantId, actorId}]),
  AXIOMOS_CRM_ACCESS_PIN: fakeCrmPin,
  PORT: String(port),
};

let server;
const outcomes = {};
async function call(method, route, options = {}) {
  const headers = {Accept: "application/json", ...(options.headers || {})};
  if (options.origin !== false && method !== "GET")
    headers.Origin = options.origin || base;
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(base + route, {
    method, redirect: "manual", headers,
    ...(options.body ? {body: JSON.stringify(options.body)} : {}),
    signal: AbortSignal.timeout(20000),
  });
  let body = null;
  const bodyText = await response.text();
  try { body = JSON.parse(bodyText); } catch { body = bodyText.slice(0, 180); }
  return {status: response.status, body, cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    cookiePolicy: response.headers.get("set-cookie") || ""};
}
function expectStatus(key, result, status) {
  outcomes[key] = result.status;
  assert.equal(result.status, status, key + ": HTTP " + result.status + " " +
    (typeof result.body === "object" ? (result.body?.reason || result.body?.error || "") : ""));
}
async function ready() {
  for (let i=0;i<70;i++) {
    try {
      const response = await call("GET", "/api/pos/qa/session");
      if (response.status === 401) return;
    } catch {}
    await sleep(500);
  }
  throw Error("Next.js HTTP test server did not become ready");
}
async function main() {
  // Run the production build itself, not a mocked route handler.
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: process.cwd(), env, stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  server.stderr.on("data", part => { stderr = (stderr + part.toString()).slice(-800); });
  try {
    await ready();
    expectStatus("guestSession", await call("GET", "/api/pos/qa/session"), 401);
    expectStatus("csrfMissingOrigin", await call("POST", "/api/pos/qa/session",
      {origin: false, body: {username,password}}), 403);
    expectStatus("csrfOtherOrigin", await call("POST", "/api/pos/qa/session",
      {origin: "https://untrusted.invalid", body: {username,password}}), 403);
    expectStatus("wrongPassword", await call("POST", "/api/pos/qa/session",
      {body: {username,password: "incorrect-password"}}), 401);

    const login = await call("POST", "/api/pos/qa/session", {body: {username,password}});
    expectStatus("loginValid", login, 200);
    assert.ok(login.cookie?.startsWith("axiomos_pos_qa_session="), "signed session cookie");
    assert.match(login.cookiePolicy, /HttpOnly/i);
    assert.match(login.cookiePolicy, /Secure/i);
    assert.match(login.cookiePolicy, /SameSite=Strict/i);
    const signedCookie = login.cookie;
    expectStatus("sessionActive", await call("GET", "/api/pos/qa/session", {cookie:signedCookie}), 200);

    const catalog = await call("GET", "/api/pos/qa/catalog", {cookie:signedCookie});
    expectStatus("catalogAuthenticated", catalog, 200);
    assert.ok(catalog.body?.products?.some(p=>p.sku==="QA-SKU"), "QA product exists");
    assert.ok(catalog.body?.stations?.length, "QA station exists");
    const station = catalog.body.stations[0];
    const key = "e2e-" + randomBytes(12).toString("hex");
    const orderInput = {
      locationId: station.location_id, stationId: station.id,
      idempotencyKey: key, items: [{sku:"QA-SKU", quantity:1}],
      merchantId:"c62222f1-878d-4bc9-8014-20fb93ea4221",
    };
    const first = await call("POST", "/api/pos/qa/orders",
      {cookie:signedCookie,body:orderInput});
    expectStatus("createDraft", first, 201);
    assert.equal(first.body?.order?.status, "draft");
    assert.ok(first.body?.order?.id);
    assert.equal(Number(first.body?.order?.total_cents),1115);

    const retry = await call("POST", "/api/pos/qa/orders",
      {cookie:signedCookie,body:orderInput});
    expectStatus("idempotentRetry", retry, 201);
    assert.equal(retry.body?.order?.id, first.body?.order?.id);
    outcomes.sameOrderAfterRetry = true;

    const listing = await call("GET", "/api/pos/qa/orders", {cookie:signedCookie});
    expectStatus("listOrders", listing, 200);
    assert.ok(listing.body?.orders?.some(o=>o.id===first.body.order.id));

    const crmToken = createHash("sha256").update("axiomos-crm:"+fakeCrmPin).digest("hex");
    const protectedPage = await call("GET", "/prospectos/cobros/qa",
      {cookie:"axiomos_crm_session="+crmToken});
    expectStatus("qaPageWithCrmAccess", protectedPage, 200);

    const logout = await call("DELETE", "/api/pos/qa/session", {cookie:signedCookie});
    expectStatus("logout", logout, 200);
    expectStatus("replayedSessionRejected",await call("GET", "/api/pos/qa/session", {cookie:signedCookie}),401);
    expectStatus("replayedCatalogRejected",await call("GET", "/api/pos/qa/catalog", {cookie:signedCookie}),401);
    expectStatus("replayedOrdersRejected",await call("GET", "/api/pos/qa/orders", {cookie:signedCookie}),401);
    expectStatus("replayedWriteRejected",await call("POST", "/api/pos/qa/orders",
      {cookie:signedCookie,body:{...orderInput,idempotencyKey:"e2e-"+randomBytes(12).toString("hex")}}),401);

    const second = await call("POST", "/api/pos/qa/session", {body:{username,password}});
    expectStatus("freshLoginAfterLogout",second,200);
    assert.notEqual(second.cookie,signedCookie);
    expectStatus("freshSessionValid", await call("GET","/api/pos/qa/session",{cookie:second.cookie}),200);
    expectStatus("oldSessionRemainsDead",await call("GET","/api/pos/qa/session",{cookie:signedCookie}),401);
    expectStatus("secondLogout",await call("DELETE","/api/pos/qa/session",{cookie:second.cookie}),200);

    const fakeUser = "missing-"+randomBytes(9).toString("hex");
    const lockout = [];
    for (let i=0;i<7;i++) {
      const attempt = await call("POST", "/api/pos/qa/session",
        {body:{username:fakeUser,password:"wrong"}});
      lockout.push(attempt.status);
    }
    assert.deepEqual(lockout,[401,401,401,401,401,429,429]);
    outcomes.rateLimit = lockout.join(",");
    console.log("POS_QA_E2E_SUCCESS "+JSON.stringify(outcomes));
  } catch(error) {
    console.error("POS_QA_E2E_FAILURE "+(error instanceof Error ? error.message : String(error))+
      (stderr ? " | server: "+stderr.replace(/postgres(?:ql)?:\/\/\S+/g,"[REDACTED]") : ""));
    process.exitCode=1;
  } finally {
    if(server) server.kill("SIGTERM");
  }
}
await main();
