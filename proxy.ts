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

  // This read-only pilot uses the isolated project's Vercel Authentication.
  if (pathname === "/prospectos/ofertas" && request.method === "GET" &&
    process.env.VERCEL_ENV === "preview" &&
    process.env.AXIRA_OFFERS_QA_ENABLED === "true" &&
    process.env.AXIRA_OFFERS_QA_REVIEW_ONLY === "true") {
    return NextResponse.next();
  }

  /*
    La pantalla de acceso y el icono de marca (sin datos CRM) son públicos.
  */
  if (pathname === "/prospectos/acceso" || pathname === "/prospectos/icon") {
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