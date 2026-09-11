import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getText(
  body: Record<string, unknown>,
  key: string,
  maxLength = 5000
) {
  const value = body[key];

  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");

  if (!digits) return null;

  // Puerto Rico / Estados Unidos:
  // usamos los últimos 10 dígitos como identidad CRM.
  return digits.slice(-10);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "AxiomOS Web Prospect API",
    database: "Neon",
    status: "ready",
  });
}

export async function POST(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "DATABASE_URL no está configurado.",
        },
        { status: 500 }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "La solicitud recibida no contiene JSON válido.",
        },
        { status: 400 }
      );
    }

    const nombre = getText(body, "nombre", 180);
    const telefono = getText(body, "telefono", 80);
    const negocio = getText(body, "negocio", 220);
    const email = getText(body, "email", 320);
    const mensaje = getText(body, "mensaje", 5000);

    const submissionId =
      getText(body, "id_solicitud", 120) ||
      `WEB-${Date.now()}`;

    const origen =
      getText(body, "origen", 120) ||
      "Formulario web AxiomAI";

    const consultaBrain = getText(
      body,
      "consulta_brain",
      1600
    );

    const tipoNegocioBrain = getText(
      body,
      "tipo_de_negocio_brain",
      500
    );

    const focoBrain = getText(
      body,
      "foco_brain",
      800
    );

    const canalesBrain = getText(
      body,
      "canales_mencionados_brain",
      800
    );

    const prioridadBrain = getText(
      body,
      "prioridad_brain",
      300
    );

    const complejidadBrain = getText(
      body,
      "complejidad_brain",
      300
    );

    const lecturaBrain = getText(
      body,
      "lectura_principal_brain",
      1600
    );

    const contextoBrain = getText(
      body,
      "contexto_del_cliente_brain",
      2800
    );

    const analisisBrain = getText(
      body,
      "analisis_brain",
      3800
    );

    const normalizedPhone = normalizePhone(telefono);

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta el nombre del prospecto.",
        },
        { status: 400 }
      );
    }

    if (!normalizedPhone) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta un teléfono válido.",
        },
        { status: 400 }
      );
    }

    const prospectKey = `phone:${normalizedPhone}`;

    const noteParts = [
      `WEB / AXIOMOS — NUEVA SOLICITUD`,
      `ID: ${submissionId}`,
      `Origen: ${origen}`,
      email ? `Correo: ${email}` : "",
      negocio ? `Negocio: ${negocio}` : "",
      mensaje ? `\nSolicitud del cliente:\n${mensaje}` : "",
      consultaBrain
        ? `\nConsulta original en Brain:\n${consultaBrain}`
        : "",
      tipoNegocioBrain
        ? `\nTipo de negocio detectado: ${tipoNegocioBrain}`
        : "",
      focoBrain
        ? `Foco detectado: ${focoBrain}`
        : "",
      canalesBrain
        ? `Canales mencionados: ${canalesBrain}`
        : "",
      prioridadBrain
        ? `Prioridad Brain: ${prioridadBrain}`
        : "",
      complejidadBrain
        ? `Complejidad Brain: ${complejidadBrain}`
        : "",
      lecturaBrain
        ? `\nLectura principal Brain:\n${lecturaBrain}`
        : "",
      contextoBrain
        ? `\nContexto del cliente:\n${contextoBrain}`
        : "",
      analisisBrain
        ? `\nAnálisis Brain:\n${analisisBrain}`
        : "",
    ].filter(Boolean);

    const crmNotes = noteParts
      .join("\n")
      .slice(0, 14000);

    const sql = neon(databaseUrl);

    const rows = await sql`
      INSERT INTO prospects (
        prospect_key,
        caller_name,
        caller_phone,
        caller_company,
        crm_stage,
        assigned_to,
        crm_notes,
        first_seen_at,
        last_seen_at,
        created_at,
        updated_at
      )
      VALUES (
        ${prospectKey},
        ${nombre},
        ${telefono},
        ${negocio || null},
        ${"Nuevo"},
        ${"Rolando"},
        ${crmNotes},
        NOW(),
        NOW(),
        NOW(),
        NOW()
      )

      ON CONFLICT (prospect_key)
      DO UPDATE SET

        caller_name =
          COALESCE(
            NULLIF(EXCLUDED.caller_name, ''),
            prospects.caller_name
          ),

        caller_phone =
          COALESCE(
            NULLIF(EXCLUDED.caller_phone, ''),
            prospects.caller_phone
          ),

        caller_company =
          COALESCE(
            NULLIF(EXCLUDED.caller_company, ''),
            prospects.caller_company
          ),

        crm_stage =
          COALESCE(
            NULLIF(prospects.crm_stage, ''),
            ${"Nuevo"}
          ),

        assigned_to =
          COALESCE(
            NULLIF(prospects.assigned_to, ''),
            ${"Rolando"}
          ),

        crm_notes =
          CASE
            WHEN prospects.crm_notes IS NULL
              OR BTRIM(prospects.crm_notes) = ''
            THEN EXCLUDED.crm_notes

            ELSE
              prospects.crm_notes
              || E'\n\n'
              || EXCLUDED.crm_notes
          END,

        last_seen_at = NOW(),
        updated_at = NOW()

      RETURNING
        id::text AS id,
        prospect_key
    `;

    return NextResponse.json({
      ok: true,
      saved: true,
      prospectId: rows[0]?.id ?? null,
      prospectKey,
      submissionId,
    });
  } catch (error) {
    console.error(
      "AXIOMOS WEB CRM ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el prospecto en AxiomOS.",
      },
      { status: 500 }
    );
  }
}
