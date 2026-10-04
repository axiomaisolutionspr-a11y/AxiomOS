import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const COOKIE_NAME = "axiomos_crm_session";
const SESSION_SECONDS = 60 * 60 * 12;

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

export async function POST(request: NextRequest) {
  const accessPin =
    process.env.AXIOMOS_CRM_ACCESS_PIN;

  if (!accessPin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El acceso privado de AxiomOS no está configurado.",
      },
      { status: 503 }
    );
  }

  let submittedPin = "";

  try {
    const body = await request.json();
    submittedPin = String(body?.pin ?? "").trim();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Solicitud inválida.",
      },
      { status: 400 }
    );
  }

  if (!submittedPin) {
    return NextResponse.json(
      {
        ok: false,
        error: "Escribe el PIN de acceso.",
      },
      { status: 400 }
    );
  }

  const expectedToken =
    await crearToken(accessPin);

  const submittedToken =
    await crearToken(submittedPin);

  if (submittedToken !== expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "PIN incorrecto.",
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set(
    COOKIE_NAME,
    expectedToken,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    }
  );

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set(
    COOKIE_NAME,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    }
  );

  return response;
}