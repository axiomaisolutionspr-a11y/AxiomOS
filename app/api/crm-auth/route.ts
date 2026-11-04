import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { readLimitedUtf8Body, RequestBodyTooLargeError } from "../../lib/limited-request-body";
import {
  CRM_COOKIE, crmV2Enabled, crmCookieOptions, claimCrmLoginAttempt,
  resetCrmLoginAttempts, createCrmSession, revokeCrmSession, validCrmSession
} from "../../lib/crm/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validPin(submitted: string, configured: string): boolean {
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(configured).digest();
  return timingSafeEqual(a, b);
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || host.includes(",") || /[\\/\s]/.test(host)) return false;
  try {
    // Next.js may normalize request.url to localhost while preserving the actual Host header.
    // Browsers cannot select Host independently, so this comparison still rejects CSRF.
    const protocol = new URL(request.url).protocol;
    if (protocol !== "http:" && protocol !== "https:") return false;
    return new URL(origin).origin === new URL(protocol + "//" + host).origin;
  } catch { return false; }
}

export async function GET(request: NextRequest) {
  try {
    const accepted = await validCrmSession(request.cookies.get(CRM_COOKIE)?.value);
    return NextResponse.json(
      accepted ? {ok:true,authenticated:true} : {ok:false,authenticated:false},
      {status:accepted?200:401,headers:{"Cache-Control":"no-store"}}
    );
  } catch {
    return NextResponse.json(
      {ok:false,error:"No se pudo verificar la sesión."},
      {status:503,headers:{"Cache-Control":"no-store"}}
    );
  }
}

export async function POST(request: NextRequest) {
  const accessPin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  if (!accessPin) return NextResponse.json({ok:false,error:"El acceso privado no está configurado."},{status:503});
  if (!sameOrigin(request))
    return NextResponse.json({ok:false,error:"Origen no autorizado."},{status:403});
  let submitted = "";
  try {
    const body = JSON.parse(await readLimitedUtf8Body(request, 1024));
    submitted = typeof body?.pin === "string" ? body.pin.trim() : "";
    if (!submitted || submitted.length > 256)
      return NextResponse.json({ok:false,error:"PIN no válido."},{status:400});
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return NextResponse.json({ok:false,error:"Solicitud demasiado grande."},{status:413});
    return NextResponse.json({ok:false,error:"Solicitud inválida."},{status:400});
  }
  try {
    if (!(await claimCrmLoginAttempt(request.headers)))
      return NextResponse.json({ok:false,error:"Demasiados intentos. Intenta más tarde."},{status:429,headers:{"Retry-After":"900"}});
    if (!validPin(submitted,accessPin))
      return NextResponse.json({ok:false,error:"PIN incorrecto."},{status:401});
    const token = crmV2Enabled()
      ? await createCrmSession()
      : createHash("sha256").update(`axiomos-crm:${accessPin}`).digest("hex");
    await resetCrmLoginAttempts(request.headers);
    const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    response.cookies.set(CRM_COOKIE, token, crmCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ok:false,error:"No se pudo verificar el acceso."},{status:503});
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ok:false,error:"Origen no autorizado."},{status:403});
  let verified = true;
  if (crmV2Enabled()) {
    try { await revokeCrmSession(request.cookies.get(CRM_COOKIE)?.value); }
    catch { verified = false; }
  }
  const response=NextResponse.json(verified ? {ok:true}:{ok:false,error:"No se pudo confirmar la revocación."},
    {status:verified?200:503,headers:{"Cache-Control":"no-store"}});
  response.cookies.set(CRM_COOKIE,"",crmCookieOptions(0));
  response.cookies.set("axiomos_crm_call_session","",{...crmCookieOptions(0),path:"/prospectos"});
  return response;
}
