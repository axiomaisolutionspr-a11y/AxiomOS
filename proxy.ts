import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "axiomos_crm_session";

async function crearToken(pin: string) {
  const contenido = new TextEncoder().encode(
    `axiomos-crm:${pin}`
  );

  const hash = await crypto.subtle.digest(
    "SHA-256",
    contenido
  );

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /*
    La pantalla para ingresar el PIN debe permanecer pública.
  */
  if (pathname === "/prospectos/acceso") {
    return NextResponse.next();
  }

  const accessPin =
    process.env.AXIOMOS_CRM_ACCESS_PIN;

  if (!accessPin) {
    return new NextResponse(
      "El acceso privado de AxiomOS no está configurado.",
      {
        status: 503,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const expectedToken =
    await crearToken(accessPin);

  const currentToken =
    request.cookies.get(COOKIE_NAME)?.value;

  if (currentToken === expectedToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL(
    "/prospectos/acceso",
    request.url
  );

  loginUrl.searchParams.set(
    "from",
    `${pathname}${request.nextUrl.search}`
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/prospectos/:path*"],
};