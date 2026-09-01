import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

type Prospecto = {
  id: string;
  prospect_key: string;
  caller_name: string | null;
  caller_phone: string | null;
  caller_company: string | null;
  crm_stage: string | null;
  assigned_to: string | null;
  follow_up_at: string | Date | null;
  crm_notes: string | null;
  first_seen_at: string | Date;
  last_seen_at: string | Date;
  last_reviewed_at: string | Date | null;
};

type Llamada = {
  id: number;
  prospect_id: string;
  created_at: string | Date;
  caller_name: string | null;
  caller_phone: string | null;
  caller_company: string | null;
  call_reason: string | null;
  call_classification: string | null;
  call_summary: string | null;
  call_outcome: string | null;
  next_action: string | null;
};

const ETAPAS = [
  "Nuevo",
  "Contactado",
  "Interesado",
  "Cita agendada",
  "Cotización enviada",
  "Negociación",
  "Vendido",
  "Perdido",
];

function texto(valor: string | null) {
  if (!valor || valor.trim() === "") return "No disponible";
  return valor;
}

function traducir(valor: string | null) {
  if (!valor) return "No disponible";

  const traducciones: Record<string, string> = {
    "New Prospect": "Nuevo prospecto",
    "Information Provided": "Información proporcionada",
    "Follow-up Required": "Seguimiento requerido",
    "Information Provided, Follow-up Required":
      "Información proporcionada, seguimiento requerido",
    "Call Back": "Llamar nuevamente",
    "Human Follow-up": "Seguimiento humano",
    "Follow-up": "Dar seguimiento",
    "Schedule Appointment": "Agendar cita",
    "Send Information": "Enviar información",
    "Caller Hung Up": "Llamada finalizada",
    Other: "Otro",
  };

  return traducciones[valor] ?? valor;
}

function formatearFecha(fecha: string | Date) {
  return new Intl.DateTimeFormat("es-PR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Puerto_Rico",
  }).format(new Date(fecha));
}

function fechaParaInput(fecha: string | Date | null) {
  if (!fecha) return "";

  const date = new Date(fecha);

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const obtener = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  return `${obtener("year")}-${obtener("month")}-${obtener(
    "day"
  )}T${obtener("hour")}:${obtener("minute")}`;
}

function fechaPuertoRico(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Puerto_Rico",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const obtener = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "";

  return `${obtener("year")}-${obtener("month")}-${obtener("day")}`;
}

async function actualizarProspecto(formData: FormData) {
  "use server";

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("No se encontró DATABASE_URL.");
  }

  const id = String(formData.get("id") || "").trim();
  const crmStage = String(formData.get("crm_stage") || "Nuevo");
  const assignedTo = String(formData.get("assigned_to") || "").trim();
  const followUpLocal = String(formData.get("follow_up_at") || "").trim();
  const crmNotes = String(formData.get("crm_notes") || "").trim();

  if (!/^\d+$/.test(id)) {
    throw new Error("ID inválido.");
  }

  if (!ETAPAS.includes(crmStage)) {
    throw new Error("Estado inválido.");
  }

  let followUpIso: string | null = null;

  if (followUpLocal) {
    const fecha = new Date(`${followUpLocal}:00-04:00`);

    if (Number.isNaN(fecha.getTime())) {
      throw new Error("Fecha inválida.");
    }

    followUpIso = fecha.toISOString();
  }

  const sql = neon(databaseUrl);

  await sql`
    UPDATE prospects
    SET
      crm_stage = ${crmStage},
      assigned_to = ${assignedTo || null},
      follow_up_at = ${followUpIso},
      crm_notes = ${crmNotes || null},
      updated_at = NOW()
    WHERE id = ${id}
  `;

  revalidatePath("/prospectos");
}

async function marcarComoRevisada(formData: FormData) {
  "use server";

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("No se encontró DATABASE_URL.");
  }

  const id = String(formData.get("id") || "").trim();

  if (!/^\d+$/.test(id)) {
    throw new Error("ID inválido.");
  }

  const sql = neon(databaseUrl);

  await sql`
    UPDATE prospects
    SET
      last_reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id}
  `;

  revalidatePath("/prospectos");
}

export default async function ProspectosPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    estado?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};

  const busqueda = (params.q ?? "").trim().toLowerCase();
  const filtroEstado = params.estado ?? "";

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#05070b",
          color: "white",
          padding: "40px",
        }}
      >
        <h1>Error de configuración</h1>
        <p>No se encontró DATABASE_URL.</p>
      </main>
    );
  }

  const sql = neon(databaseUrl);

  const prospectos = (await sql`
    SELECT
      id::text AS id,
      prospect_key,
      caller_name,
      caller_phone,
      caller_company,
      crm_stage,
      assigned_to,
      follow_up_at,
      crm_notes,
      first_seen_at,
      last_seen_at,
      last_reviewed_at
    FROM prospects
    ORDER BY last_seen_at DESC
  `) as Prospecto[];

  const llamadas = (await sql`
    SELECT
      id,
      prospect_id::text AS prospect_id,
      created_at,
      caller_name,
      caller_phone,
      caller_company,
      call_reason,
      call_classification,
      call_summary,
      call_outcome,
      next_action
    FROM call_leads
    WHERE prospect_id IS NOT NULL
    ORDER BY created_at DESC
  `) as Llamada[];

  const llamadasPorProspecto = new Map<string, Llamada[]>();

  for (const llamada of llamadas) {
    const historial =
      llamadasPorProspecto.get(llamada.prospect_id) ?? [];

    historial.push(llamada);
    llamadasPorProspecto.set(llamada.prospect_id, historial);
  }

  function llamadasNuevas(prospecto: Prospecto) {
    const historial =
      llamadasPorProspecto.get(prospecto.id) ?? [];

    if (!prospecto.last_reviewed_at) {
      return historial;
    }

    const revisado = new Date(
      prospecto.last_reviewed_at
    ).getTime();

    return historial.filter(
      (llamada) =>
        new Date(llamada.created_at).getTime() > revisado
    );
  }

  const ahora = new Date();
  const hoyPR = fechaPuertoRico(ahora);

  const prospectosConLlamadasNuevas = prospectos.filter(
    (p) => llamadasNuevas(p).length > 0
  ).length;

  const nuevos = prospectos.filter(
    (p) => (p.crm_stage || "Nuevo") === "Nuevo"
  ).length;

  const vencidos = prospectos.filter((p) => {
    if (!p.follow_up_at) return false;

    if (
      p.crm_stage === "Vendido" ||
      p.crm_stage === "Perdido"
    ) {
      return false;
    }

    return new Date(p.follow_up_at).getTime() < ahora.getTime();
  }).length;

  const seguimientosHoy = prospectos.filter((p) => {
    if (!p.follow_up_at) return false;

    if (
      p.crm_stage === "Vendido" ||
      p.crm_stage === "Perdido"
    ) {
      return false;
    }

    return (
      fechaPuertoRico(new Date(p.follow_up_at)) === hoyPR
    );
  }).length;

  const filtrados = prospectos.filter((prospecto) => {
    const estado = prospecto.crm_stage || "Nuevo";

    if (filtroEstado && estado !== filtroEstado) {
      return false;
    }

    if (!busqueda) {
      return true;
    }

    const historial =
      llamadasPorProspecto.get(prospecto.id) ?? [];

    const contenido = [
      prospecto.caller_name,
      prospecto.caller_phone,
      prospecto.caller_company,
      prospecto.assigned_to,
      prospecto.crm_notes,
      ...historial.flatMap((llamada) => [
        llamada.caller_name,
        llamada.caller_phone,
        llamada.caller_company,
        llamada.call_reason,
        llamada.call_summary,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return contenido.includes(busqueda);
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0a1830 0%, #05070b 45%, #020305 100%)",
        color: "white",
        padding: "40px 24px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <p
          style={{
            color: "#39a8ff",
            fontWeight: 700,
            letterSpacing: "2px",
          }}
        >
          AXIOMAI SOLUTIONS
        </p>

        <h1 style={{ fontSize: "42px", marginBottom: "8px" }}>
          Prospectos
        </h1>

        <p style={{ color: "#aab4c3", fontSize: "17px" }}>
          CRM inteligente con historial completo de llamadas
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
            margin: "30px 0",
          }}
        >
          {[
            ["Prospectos únicos", prospectos.length],
            ["Llamadas totales", llamadas.length],
            ["Nuevas llamadas", prospectosConLlamadasNuevas],
            ["Nuevos", nuevos],
            ["Seguimientos vencidos", vencidos],
            ["Seguimientos hoy", seguimientosHoy],
          ].map(([titulo, cantidad]) => (
            <div
              key={String(titulo)}
              style={{
                minWidth: "155px",
                background: "rgba(9,21,39,.9)",
                border: "1px solid #17375f",
                borderRadius: "16px",
                padding: "18px 22px",
              }}
            >
              <div
                style={{
                  color: "#8ba0ba",
                  fontSize: "14px",
                }}
              >
                {titulo}
              </div>

              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color:
                    titulo === "Nuevas llamadas" &&
                    Number(cantidad) > 0
                      ? "#58e6ff"
                      : titulo === "Seguimientos vencidos" &&
                          Number(cantidad) > 0
                        ? "#ff7777"
                        : "#38a9ff",
                }}
              >
                {cantidad}
              </div>
            </div>
          ))}
        </div>

        <form
          method="GET"
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(250px, 2fr) minmax(200px, 1fr) auto auto",
            gap: "12px",
            marginBottom: "24px",
            padding: "18px",
            background: "#09111d",
            border: "1px solid #163456",
            borderRadius: "16px",
          }}
        >
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar nombre, teléfono, empresa, responsable..."
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #244d77",
              background: "#0b1625",
              color: "white",
            }}
          />

          <select
            name="estado"
            defaultValue={filtroEstado}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #244d77",
              background: "#0b1625",
              color: "white",
            }}
          >
            <option value="">Todos los estados</option>

            {ETAPAS.map((etapa) => (
              <option key={etapa} value={etapa}>
                {etapa}
              </option>
            ))}
          </select>

          <button
            type="submit"
            style={{
              border: "1px solid #45b9ff",
              borderRadius: "10px",
              background: "#0877c5",
              color: "white",
              padding: "12px 20px",
              fontWeight: 800,
            }}
          >
            Buscar
          </button>

          <a
            href="/prospectos"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #344a63",
              borderRadius: "10px",
              color: "#c7d4e4",
              textDecoration: "none",
              padding: "12px 20px",
            }}
          >
            Limpiar
          </a>
        </form>

        <p style={{ color: "#8ba0ba" }}>
          Mostrando {filtrados.length} de {prospectos.length} prospectos únicos
        </p>

        <div style={{ display: "grid", gap: "24px" }}>
          {filtrados.map((prospecto) => {
            const historial =
              llamadasPorProspecto.get(prospecto.id) ?? [];

            const nuevas = llamadasNuevas(prospecto);

            const tieneNueva = nuevas.length > 0;

            const seguimiento = prospecto.follow_up_at
              ? new Date(prospecto.follow_up_at)
              : null;

            const cerrado =
              prospecto.crm_stage === "Vendido" ||
              prospecto.crm_stage === "Perdido";

            const vencido =
              seguimiento &&
              !cerrado &&
              seguimiento.getTime() < ahora.getTime();

            return (
              <article
                key={prospecto.id}
                style={{
                  marginTop: "18px",
                  background: "#09111d",
                  border: tieneNueva
                    ? "2px solid #28cfff"
                    : vencido
                      ? "1px solid #bd525c"
                      : "1px solid #163456",
                  borderRadius: "22px",
                  padding: "26px",
                  boxShadow: tieneNueva
                    ? "0 0 28px rgba(40,207,255,.2)"
                    : "0 12px 35px rgba(0,0,0,.25)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: "0 0 6px",
                        fontSize: "28px",
                      }}
                    >
                      {texto(prospecto.caller_name)}
                    </h2>

                    <p
                      style={{
                        color: "#40adff",
                        fontWeight: 700,
                      }}
                    >
                      {texto(prospecto.caller_company)}
                    </p>

                    <p>
                      <strong>Teléfono:</strong>{" "}
                      {texto(prospecto.caller_phone)}
                    </p>

                    <p>
                      <strong>Primera llamada:</strong>{" "}
                      {formatearFecha(prospecto.first_seen_at)}
                    </p>

                    <p>
                      <strong>Último contacto:</strong>{" "}
                      {formatearFecha(prospecto.last_seen_at)}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "9px",
                    }}
                  >
                    {tieneNueva && (
                      <span
                        style={{
                          padding: "9px 15px",
                          borderRadius: "999px",
                          background: "#063348",
                          border: "1px solid #28cfff",
                          color: "#71e8ff",
                          fontWeight: 900,
                        }}
                      >
                        🔵 NUEVA LLAMADA
                      </span>
                    )}

                    <span
                      style={{
                        padding: "8px 14px",
                        borderRadius: "999px",
                        border: "1px solid #2b78b8",
                        color: "#66c1ff",
                        fontWeight: 700,
                      }}
                    >
                      {prospecto.crm_stage || "Nuevo"}
                    </span>

                    <span
                      style={{
                        padding: "8px 14px",
                        borderRadius: "999px",
                        border: "1px solid #244d77",
                        color: "#c4d7eb",
                      }}
                    >
                      {historial.length} llamadas
                    </span>
                  </div>
                </div>

                {tieneNueva && (
                  <div
                    style={{
                      marginTop: "18px",
                      padding: "16px",
                      background: "#062231",
                      border: "1px solid #28cfff",
                      borderRadius: "14px",
                    }}
                  >
                    <strong style={{ color: "#71e8ff" }}>
                      {nuevas.length === 1
                        ? "Hay 1 llamada nueva sin revisar."
                        : `Hay ${nuevas.length} llamadas nuevas sin revisar.`}
                    </strong>

                    <form
                      action={marcarComoRevisada}
                      style={{ marginTop: "12px" }}
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={prospecto.id}
                      />

                      <button
                        type="submit"
                        style={{
                          border: "1px solid #71e8ff",
                          borderRadius: "9px",
                          background: "#0b6f91",
                          color: "white",
                          padding: "10px 16px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Marcar como revisada
                      </button>
                    </form>
                  </div>
                )}

                {prospecto.follow_up_at && (
                  <p
                    style={{
                      marginTop: "18px",
                      color: vencido ? "#ff9a9a" : "#d6e4f2",
                    }}
                  >
                    <strong>Próximo seguimiento:</strong>{" "}
                    {formatearFecha(prospecto.follow_up_at)}
                  </p>
                )}

                <form
                  action={actualizarProspecto}
                  style={{
                    marginTop: "24px",
                    padding: "22px",
                    background: "#060c15",
                    border: "1px solid #132b47",
                    borderRadius: "16px",
                  }}
                >
                  <input
                    type="hidden"
                    name="id"
                    value={prospecto.id}
                  />

                  <h3 style={{ color: "#43b2ff" }}>
                    Seguimiento CRM
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <label>
                      <strong>Estado</strong>

                      <select
                        name="crm_stage"
                        defaultValue={prospecto.crm_stage || "Nuevo"}
                        style={{
                          width: "100%",
                          marginTop: "7px",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid #244d77",
                          background: "#0b1625",
                          color: "white",
                        }}
                      >
                        {ETAPAS.map((etapa) => (
                          <option key={etapa} value={etapa}>
                            {etapa}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <strong>Responsable</strong>

                      <input
                        name="assigned_to"
                        defaultValue={prospecto.assigned_to ?? ""}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          marginTop: "7px",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid #244d77",
                          background: "#0b1625",
                          color: "white",
                        }}
                      />
                    </label>

                    <label>
                      <strong>Próximo seguimiento</strong>

                      <input
                        type="datetime-local"
                        name="follow_up_at"
                        defaultValue={fechaParaInput(
                          prospecto.follow_up_at
                        )}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          marginTop: "7px",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid #244d77",
                          background: "#0b1625",
                          color: "white",
                        }}
                      />
                    </label>
                  </div>

                  <label
                    style={{
                      display: "block",
                      marginTop: "16px",
                    }}
                  >
                    <strong>Notas internas</strong>

                    <textarea
                      name="crm_notes"
                      defaultValue={prospecto.crm_notes ?? ""}
                      rows={4}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: "7px",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid #244d77",
                        background: "#0b1625",
                        color: "white",
                      }}
                    />
                  </label>

                  <button
                    type="submit"
                    style={{
                      marginTop: "16px",
                      border: "1px solid #45b9ff",
                      borderRadius: "10px",
                      background: "#0877c5",
                      color: "white",
                      padding: "12px 22px",
                      fontWeight: 800,
                    }}
                  >
                    Guardar seguimiento
                  </button>
                </form>

                <div style={{ marginTop: "24px" }}>
                  <h3>
                    Historial de llamadas ({historial.length})
                  </h3>

                  {historial.map((llamada, index) => {
                    const esNueva = nuevas.some(
                      (nueva) => nueva.id === llamada.id
                    );

                    return (
                      <details
                        key={llamada.id}
                        open={index === 0}
                        style={{
                          marginBottom: "10px",
                          background: esNueva
                            ? "#062231"
                            : "#060c15",
                          border: esNueva
                            ? "1px solid #28cfff"
                            : "1px solid #17375f",
                          borderRadius: "14px",
                          padding: "14px 16px",
                        }}
                      >
                        <summary
                          style={{
                            cursor: "pointer",
                            fontWeight: 800,
                            color: esNueva
                              ? "#71e8ff"
                              : "#52baff",
                          }}
                        >
                          {esNueva ? "🔵 NUEVA — " : ""}
                          Llamada {historial.length - index} —{" "}
                          {formatearFecha(llamada.created_at)}
                        </summary>

                        <div
                          style={{
                            marginTop: "16px",
                            lineHeight: 1.6,
                          }}
                        >
                          <p>
                            <strong>Nombre registrado:</strong>{" "}
                            {texto(llamada.caller_name)}
                          </p>

                          <p>
                            <strong>Empresa:</strong>{" "}
                            {texto(llamada.caller_company)}
                          </p>

                          <p>
                            <strong>Teléfono:</strong>{" "}
                            {texto(llamada.caller_phone)}
                          </p>

                          <p>
                            <strong>Clasificación:</strong>{" "}
                            {traducir(
                              llamada.call_classification
                            )}
                          </p>

                          <p>
                            <strong>Resultado:</strong>{" "}
                            {traducir(llamada.call_outcome)}
                          </p>

                          <p>
                            <strong>Motivo:</strong>{" "}
                            {texto(llamada.call_reason)}
                          </p>

                          <p>
                            <strong>
                              Próxima acción sugerida por IA:
                            </strong>{" "}
                            {traducir(llamada.next_action)}
                          </p>

                          <hr
                            style={{
                              border: 0,
                              borderTop: "1px solid #17375f",
                            }}
                          />

                          <p>
                            <strong>Resumen:</strong>
                            <br />
                            {texto(llamada.call_summary)}
                          </p>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}