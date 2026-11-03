import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  CRM_COOKIE, crmV2Enabled, crmCookieOptions, claimCrmLoginAttempt,
  resetCrmLoginAttempts, createCrmSession, revokeCrmSession
} from "../../lib/crm/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validPin(submitted: string, configured: string): boolean {
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(configured).digest();
  return timingSafeEqual(a, b);
}
export async function POST(request: NextRequest) {
  const accessPin = process.env.AXIOMOS_CRM_ACCESS_PIN;
  if (!accessPin) return NextResponse.json({ok:false,error:"El acceso privado no está configurado."},{status:503});
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ok:false,error:"Origen no autorizado."},{status:403});
  let submitted = "";
  try {
    if (Number(request.headers.get("content-length") || 0) > 1024)
      return NextResponse.json({ok:false,error:"Solicitud demasiado grande."},{status:413});
    const body = await request.json();
    submitted = typeof body?.pin === "string" ? body.pin.trim() : "";
    if (!submitted || submitted.length > 256)
      return NextResponse.json({ok:false,error:"PIN no válido."},{status:400});
  } catch {
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
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
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
