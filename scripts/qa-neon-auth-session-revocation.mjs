#!/usr/bin/env node
// QA only: HTTP session sign-in -> revoke -> replay-denied evidence.
// Use an OTP entered locally. Never paste OTP, cookie or token into logs or ChatGPT.
// Requires Node >=22. No persistence of secrets.
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const QA_BASE="https://ep-muddy-cloud-avprxkpx.neonauth.c-11.us-east-1.aws.neon.tech/neondb/auth";
const EMAIL="axiomaisolutionspr@gmail.com";
const ORIGIN="https://www.axiomaisolutions.org";
const endpoint=(p)=>QA_BASE+p;
const requireOk=async(res,operation)=>{if(!res.ok)throw new Error(operation+": HTTP "+res.status);return res;};
function cookies(res) {
  const list=typeof res.headers.getSetCookie==="function"?res.headers.getSetCookie():[res.headers.get("set-cookie")].filter(Boolean);
  return list.map(v=>v.split(";")[0]).filter(v=>/^[^=]+=/.test(v)).join("; ");
}
async function request(path,opts={}) {
  return fetch(endpoint(path),{...opts,redirect:"manual",headers:{"Origin":ORIGIN,"Content-Type":"application/json",...(opts.headers||{})},signal:AbortSignal.timeout(12000)});
}
async function getSession(cookie) {
  const r=await requireOk(await request("/get-session",{headers:cookie?{cookie}:{}}),"Get session");
  return r.json();
}
let sessionCookie="";
try {
  const empty=await getSession("");
  if(empty!==null)throw new Error("Unauthenticated request returned a session");
  const send=await request("/email-otp/send-verification-otp",{method:"POST",body:JSON.stringify({email:EMAIL,type:"sign-in"})});
  await requireOk(send,"Send QA OTP");
  console.log("Código enviado al correo QA. Escríbelo solamente aquí; no lo compartas.");
  const rl=createInterface({input,output});
  const otp=(await rl.question("Código OTP: ")).trim();
  rl.close();
  if(!/^\d{6}$/.test(otp))throw new Error("OTP must have 6 digits");
  const login=await request("/sign-in/email-otp",{method:"POST",body:JSON.stringify({email:EMAIL,otp})});
  await requireOk(login,"QA sign-in");
  sessionCookie=cookies(login);
  if(!sessionCookie)throw new Error("QA sign-in returned no session cookie");
  const valid=await getSession(sessionCookie);
  if(!valid?.user?.id)throw new Error("Authenticated QA get-session did not return a user");
  console.log("PASS: sesión QA autenticada.");
  const signout=await request("/sign-out",{method:"POST",headers:{cookie:sessionCookie},body:JSON.stringify({})});
  await requireOk(signout,"QA sign-out");
  const after=await getSession(sessionCookie);
  if(after!==null)throw new Error("FAIL: sesión anterior todavía se acepta");
  console.log("PASS: cookie anterior rechazada después de cerrar/revocar sesión.");
  console.log("QA_HTTP_SESSION_REVOCATION_PASS");
}catch(e){
  console.error("QA_HTTP_SESSION_REVOCATION_NOT_CERTIFIED:",e instanceof Error?e.message:"unknown");
  process.exitCode=1;
}finally {
  // The value is kept only in this process and never written to disk.
  sessionCookie="";
}
