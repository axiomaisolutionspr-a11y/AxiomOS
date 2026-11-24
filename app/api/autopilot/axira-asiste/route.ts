import { NextRequest, NextResponse } from "next/server";
import { commercialIdentityAuth } from "../../../lib/commercial-identity-auth";
import { commercialIdentityDatabase, commercialMember } from "../../../lib/commercial-identity";
import {
  AXIRA_ASISTE_SCHEMA, asisteInstructions, asisteModelInput,
  extractAsisteText, parseAsisteModelOutput, validateAsisteRequest,
  getAsisteQaProviderConfig,
} from "../../../lib/axira-asiste.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  // Bloqueo duro: imposible ejecutar en producción, incluso por error de configuración.
  if (process.env.VERCEL_ENV !== "preview" || process.env.AXIRA_ASISTE_QA_ENABLED !== "true") {
    return reply({ error: "Axira Asiste está desactivada fuera de QA." }, 404);
  }

  // Esta ruta solo redacta; no accede a canales, no guarda CRM ni envía comunicaciones.
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return reply({ error: "Origen de la solicitud no autorizado." }, 403);
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return reply({ error: "Se requiere JSON." }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > 30000) return reply({ error: "Solicitud demasiado extensa." }, 413);

  const auth = commercialIdentityAuth();
  const sql = commercialIdentityDatabase();
  if (!auth || !sql) return reply({ error: "Identidad QA no disponible." }, 503);
  try {
    const { data, error } = await auth.getSession();
    if (error || !data?.user?.id) return reply({ error: "Inicia sesión para continuar." }, 401);
    const membership = await commercialMember(sql, data.user.id);
    if (!membership || membership.role === "viewer") return reply({ error: "Permiso insuficiente." }, 403);
  } catch {
    return reply({ error: "No se pudo validar el acceso QA." }, 503);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 30000) return reply({ error: "Solicitud demasiado extensa." }, 413);
    input = validateAsisteRequest(JSON.parse(raw));
  } catch {
    return reply({ error: "JSON inválido." }, 400);
  }
  if (!input.ok) return reply({ error: input.error }, 400);

  const provider = getAsisteQaProviderConfig();
  if (!provider) {
    return reply({ error: "El proveedor de IA QA no está configurado y certificado como aislado." }, 503);
  }
  const { apiKey, model } = provider;

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
      body: JSON.stringify({
        model,
        instructions: asisteInstructions(),
        input: [{ role: "user", content: asisteModelInput(input.value) }],
        text: {
          format: {
            type: "json_schema",
            name: "axira_asiste_v1",
            strict: true,
            schema: AXIRA_ASISTE_SCHEMA,
          },
        },
        max_output_tokens: 1400,
        store: false,
      }),
    });
    if (!upstream.ok) {
      console.warn("AXIRA_ASISTE_QA_PROVIDER_FAILED", { status: upstream.status });
      return reply({ error: "El proveedor de IA no respondió correctamente en QA." }, 502);
    }
    const modelOutput = await upstream.json();
    const result = parseAsisteModelOutput(extractAsisteText(modelOutput));
    if (!result) {
      return reply({ error: "No se recibió una recomendación válida. No se enviará nada." }, 502);
    }
    return reply({
      ok: true,
      mode: "qa_human_review",
      sent: false,
      saved: false,
      result,
    });
  } catch {
    return reply({ error: "No se pudo generar la recomendación. No se envió ningún mensaje." }, 504);
  }
}
