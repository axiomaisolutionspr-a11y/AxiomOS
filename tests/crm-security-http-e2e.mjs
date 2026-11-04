/**
 * AxiomOS CRM security QA HTTP E2E.
 * Runs the production Next.js build against the isolated Neon security database.
 * It creates only synthetic sessions/login-attempt rows and removes them before success.
 */
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { neon } from "@neondatabase/serverless";

const qaUrl = process.env.CRM_QA_DATABASE_URL;
if (!qaUrl) throw Error("CRM_QA_DATABASE_URL is required in isolated QA");
const parsed = new URL(qaUrl);
assert.equal(parsed.protocol, "postgresql:", "PostgreSQL URL only");
assert.equal(parsed.username, "axiomos_security_qa_runtime", "scoped QA runtime role only");
assert.equal(parsed.hostname, process.env.CRM_QA_DATABASE_HOST, "independently pinned Neon QA host required");
assert.ok(parsed.hostname.endsWith(".neon.tech"), "Neon host only");
assert.equal(parsed.pathname, "/axiomos_security_qa", "isolated CRM QA database only");
assert.equal(parsed.searchParams.get("sslmode"), "require", "TLS required");

const port = Number(process.env.CRM_SECURITY_E2E_PORT || "3251");
const base = "http://127.0.0.1:" + port;
const pin = "crm-qa-" + randomBytes(24).toString("hex");
const rateSecret = randomBytes(48).toString("hex");
const loginIp = "203.0.113.41";
const secondLoginIp = "203.0.113.42";
const rateIp = "203.0.113.43";
const env = {
  ...process.env,
  DATABASE_URL: qaUrl,
  DATABASE_URL_UNPOOLED: "",
  AXIOMOS_CRM_ACCESS_PIN: pin,
  AXIOMOS_CRM_SESSION_V2_ENABLED: "true",
  AXIOMOS_CRM_RATE_LIMIT_SECRET: rateSecret,
  AXIOMOS_TELNYX_SIGNATURE_REQUIRED: "false",
  AXIOMOS_WHATSAPP_WEBHOOK_AUTH_MODE: "off",
  PORT: String(port),
};

let server;
let stderr = "";
const issuedCookies = [];
const outcomes = {};
function cookieValue(cookie) {
  return cookie?.split("=",2)[1] || "";
}
async function call(method, route, options = {}) {
  const headers = {Accept: "application/json", Host: "127.0.0.1:" + port, ...(options.headers || {})};
  if (options.origin !== false && method !== "GET")
    headers.Origin = options.origin || base;
  if (options.cookie) headers.Cookie = options.cookie;
  let body;
  if (Object.hasOwn(options,"raw")) {
    headers["Content-Type"] = "application/json";
    body = options.raw;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  const response = await fetch(base + route, {
    method, redirect: "manual", headers, body,
    signal: AbortSignal.timeout(20000),
  });
  const bodyText = await response.text();
  let resultBody;
  try { resultBody = JSON.parse(bodyText); } catch { resultBody = bodyText.slice(0,180); }
  return {
    status: response.status,
    body: resultBody,
    location: response.headers.get("location"),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    cookiePolicy: response.headers.get("set-cookie") || "",
  };
}
function expectStatus(key,result,status) {
  outcomes[key]=result.status;
  assert.equal(result.status,status,key+": HTTP "+result.status+" "+
    (typeof result.body === "object" ? (result.body?.error || "") : ""));
}
async function ready() {
  for(let i=0;i<70;i++) {
    try {
      const response=await call("GET","/api/crm-auth");
      if(response.status===401) return;
    } catch {}
    await sleep(500);
  }
  throw Error("Next.js HTTP test server did not become ready");
}
async function cleanup() {
  const sql=neon(qaUrl);
  for(const cookie of issuedCookies) {
    const value=cookieValue(cookie);
    if(value) {
      const hash=createHash("sha256").update(value).digest("hex");
      await sql`DELETE FROM crm_admin_sessions WHERE token_hash=${hash}`;
    }
  }
  const rateHash=createHmac("sha256",rateSecret).update(rateIp).digest("hex");
  await sql`DELETE FROM crm_auth_attempts WHERE client_hash=${rateHash}`;
}
async function main() {
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port)],{
    cwd:process.cwd(),env,stdio:["ignore","ignore","pipe"],
  });
  server.stderr.on("data",part=>{stderr=(stderr+part.toString()).slice(-1000);});
  try {
    await ready();
    expectStatus("guestSession",await call("GET","/api/crm-auth"),401);
    const guestProbe=await call("GET","/prospectos/__qa_session_probe__");
    expectStatus("guestProtectedRoute",guestProbe,307);
    assert.match(guestProbe.location || "",/\/prospectos\/acceso/);

    expectStatus("csrfMissingOrigin",await call("POST","/api/crm-auth",{
      origin:false,headers:{"x-vercel-forwarded-for":loginIp},body:{pin}
    }),403);
    expectStatus("csrfOtherOrigin",await call("POST","/api/crm-auth",{
      origin:"https://untrusted.invalid",headers:{"x-vercel-forwarded-for":loginIp},body:{pin}
    }),403);
    expectStatus("invalidJson",await call("POST","/api/crm-auth",{
      headers:{"x-vercel-forwarded-for":loginIp},raw:"{"
    }),400);
    expectStatus("oversizedBody",await call("POST","/api/crm-auth",{
      headers:{"x-vercel-forwarded-for":loginIp},raw:JSON.stringify({pin:"x".repeat(1200)})
    }),413);

    const rateStatuses=[];
    for(let i=0;i<7;i++) {
      const attempt=await call("POST","/api/crm-auth",{
        headers:{"x-vercel-forwarded-for":rateIp},body:{pin:"wrong-"+i}
      });
      rateStatuses.push(attempt.status);
    }
    assert.deepEqual(rateStatuses,[401,401,401,401,401,429,429]);
    outcomes.rateLimit=rateStatuses.join(",");

    const login=await call("POST","/api/crm-auth",{
      headers:{"x-vercel-forwarded-for":loginIp},body:{pin}
    });
    expectStatus("loginValid",login,200);
    assert.ok(login.cookie?.startsWith("axiomos_crm_session=v2."),"opaque v2 session cookie");
    assert.match(login.cookiePolicy,/HttpOnly/i);
    assert.match(login.cookiePolicy,/Secure/i);
    assert.match(login.cookiePolicy,/SameSite=Strict/i);
    issuedCookies.push(login.cookie);

    expectStatus("sessionActive",await call("GET","/api/crm-auth",{cookie:login.cookie}),200);
    expectStatus("protectedRoutePassesSession",await call(
      "GET","/prospectos/__qa_session_probe__",{cookie:login.cookie}
    ),404);

    expectStatus("logoutMissingOrigin",await call("DELETE","/api/crm-auth",{
      origin:false,cookie:login.cookie
    }),403);
    expectStatus("sessionSurvivesRejectedLogout",await call(
      "GET","/api/crm-auth",{cookie:login.cookie}
    ),200);

    expectStatus("logout",await call("DELETE","/api/crm-auth",{cookie:login.cookie}),200);
    expectStatus("replayedSessionRejected",await call(
      "GET","/api/crm-auth",{cookie:login.cookie}
    ),401);
    expectStatus("replayedProtectedRouteRejected",await call(
      "GET","/prospectos/__qa_session_probe__",{cookie:login.cookie}
    ),307);

    const second=await call("POST","/api/crm-auth",{
      headers:{"x-vercel-forwarded-for":secondLoginIp},body:{pin}
    });
    expectStatus("freshLoginAfterLogout",second,200);
    assert.notEqual(second.cookie,login.cookie);
    issuedCookies.push(second.cookie);
    expectStatus("freshSessionValid",await call("GET","/api/crm-auth",{cookie:second.cookie}),200);
    expectStatus("oldSessionRemainsDead",await call("GET","/api/crm-auth",{cookie:login.cookie}),401);
    expectStatus("secondLogout",await call("DELETE","/api/crm-auth",{cookie:second.cookie}),200);

    await cleanup();
    console.log("CRM_SECURITY_QA_E2E_SUCCESS "+JSON.stringify(outcomes));
  } catch(error) {
    console.error("CRM_SECURITY_QA_E2E_FAILURE "+(error instanceof Error?error.message:String(error))+
      (stderr?" | server: "+stderr.replace(/postgres(?:ql)?:\/\/\S+/g,"[REDACTED]"):""));
    process.exitCode=1;
    try { await cleanup(); } catch {}
  } finally {
    if(server) server.kill("SIGTERM");
  }
}
await main();
