import { NextResponse } from "next/server";
import {
  endDemoSession, hasDemoSession, isSameOrigin,
  isValidDemoAccessCode, setDemoSession
} from "../../../lib/demo-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}

export async function GET() {
  return json({ authenticated: await hasDemoSession() });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Origen no autorizado" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Formato no permitido" }, 415);
  }
  try {
    const body = await request.text();
    if (body.length > 512) return json({ error: "Solicitud demasiado grande" }, 413);
    const candidate: unknown = JSON.parse(body);
    const code = candidate && typeof candidate === "object" && "code" in candidate
      ? (candidate as { code: unknown }).code : null;
    if (!isValidDemoAccessCode(code)) return json({ error: "Código de acceso incorrecto" }, 401);
    if (!process.env.AXIOMAI_DEMO_QA_SESSION_SECRET) return json({ error: "Acceso no configurado" }, 503);
    return setDemoSession(json({ authenticated: true }));
  } catch {
    return json({ error: "Solicitud inválida" }, 400);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Origen no autorizado" }, 403);
  return endDemoSession(json({ authenticated: false }));
}
