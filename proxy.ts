import { NextRequest, NextResponse } from "next/server";
import { CRM_COOKIE, validCrmSession } from "./app/lib/crm/security";

export async function proxy(request: NextRequest) {
  const pathname=request.nextUrl.pathname;
  if (pathname==="/prospectos/acceso" || pathname==="/prospectos/icon") return NextResponse.next();
  if (!process.env.AXIOMOS_CRM_ACCESS_PIN)
    return new NextResponse("El acceso privado de AxiomOS no está configurado.", {status:503,headers:{"Cache-Control":"no-store"}});
  try {
    const accepted=await validCrmSession(request.cookies.get(CRM_COOKIE)?.value);
    if (accepted) {
      const res=NextResponse.next();
      res.headers.set("Cache-Control","private, no-store");
      return res;
    }
  } catch {
    // Database unavailable in v2: never silently fall back to the shared PIN.
    return new NextResponse("La verificación del CRM no está disponible.", {status:503,headers:{"Cache-Control":"no-store"}});
  }
  const url=new URL("/prospectos/acceso",request.url);
  url.searchParams.set("from",`${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}
export const config={matcher:["/prospectos/:path*"]};
