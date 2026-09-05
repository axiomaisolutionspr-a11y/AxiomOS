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
  "Seguimiento",
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

  const normalizado = valor.trim().toLowerCase();

  if (
    normalizado === "not provided" ||
    normalizado === "not specified" ||
    normalizado === "unknown"
  ) {
    return "Prospecto sin identificar";
  }

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
    "Call Back": "Devolver llamada",
    "Human Follow-up": "Seguimiento humano",
    "Follow-up": "Dar seguimiento",
    "Schedule Appointment": "Agendar cita",
    "Send Information": "Enviar información",
    "Caller Hung Up": "Llamada finalizada",
    Transferred: "Transferida",
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

function colorEtapa(etapa: string) {
  if (etapa === "Vendido") return "#57e39b";
  if (etapa === "Perdido") return "#ff7d8b";
  if (etapa === "Seguimiento") return "#ffd166";
  if (etapa === "Nuevo") return "#71e8ff";
  return "#67bfff";
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
      <main className="crm-page">
        <div className="shell">
          <h1>Error de configuración</h1>
          <p>No se encontró DATABASE_URL.</p>
        </div>
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

  const totalLlamadasNuevas = prospectos.reduce(
    (total, prospecto) => total + llamadasNuevas(prospecto).length,
    0
  );

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
    <main className="crm-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .crm-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, #0b1d37 0%, #05070b 42%, #020305 100%);
          color: white;
          padding: 34px 20px 70px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shell {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .eyebrow {
          color: #37b7ff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2.4px;
          margin: 0 0 8px;
        }

        .title {
          margin: 0;
          font-size: clamp(32px, 5vw, 48px);
          line-height: 1;
        }

        .subtitle {
          margin: 10px 0 0;
          color: #9caec4;
          font-size: 16px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin: 26px 0 18px;
        }

        .stat {
          background: rgba(9, 21, 39, 0.9);
          border: 1px solid #17375f;
          border-radius: 14px;
          padding: 14px;
          min-height: 84px;
        }

        .stat-label {
          color: #8ba0ba;
          font-size: 12px;
          line-height: 1.25;
        }

        .stat-value {
          margin-top: 7px;
          font-size: 26px;
          font-weight: 900;
          color: #38a9ff;
        }

        .toolbar {
          display: grid;
          grid-template-columns: minmax(220px, 2fr) minmax(180px, 1fr) auto auto;
          gap: 10px;
          margin: 0 0 18px;
          padding: 13px;
          border: 1px solid #163456;
          background: #09111d;
          border-radius: 14px;
        }

        .input,
        .select,
        .textarea {
          width: 100%;
          border: 1px solid #244d77;
          background: #0b1625;
          color: white;
          border-radius: 9px;
          padding: 11px 12px;
          outline: none;
        }

        .textarea {
          resize: vertical;
          min-height: 92px;
        }

        .button,
        .link-button {
          border: 1px solid #45b9ff;
          background: #0877c5;
          color: white;
          border-radius: 9px;
          padding: 10px 16px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .button.secondary,
        .link-button.secondary {
          background: transparent;
          border-color: #344a63;
          color: #c7d4e4;
        }

        .button.success {
          background: #0b6f91;
          border-color: #71e8ff;
        }

        .results {
          color: #8ba0ba;
          margin: 0 0 14px;
          font-size: 14px;
        }

        .prospect-list {
          display: grid;
          gap: 12px;
        }

        .prospect-card {
          background: #09111d;
          border: 1px solid #17375f;
          border-radius: 17px;
          overflow: hidden;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
        }

        .prospect-card.new {
          border-color: #28cfff;
          box-shadow: 0 0 24px rgba(40, 207, 255, 0.14);
        }

        .prospect-card.overdue {
          border-color: #a64c58;
        }

        .prospect-summary {
          list-style: none;
          cursor: pointer;
          padding: 16px 18px;
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(130px, .8fr) minmax(150px, 1fr) auto;
          gap: 14px;
          align-items: center;
        }

        .prospect-summary::-webkit-details-marker {
          display: none;
        }

        .name {
          font-size: 19px;
          font-weight: 900;
          margin: 0;
        }

        .company {
          margin-top: 4px;
          color: #47b7ff;
          font-size: 13px;
          font-weight: 700;
        }

        .phone {
          margin-top: 4px;
          color: #aab9cb;
          font-size: 13px;
        }

        .mini-label {
          color: #73869e;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .7px;
          margin-bottom: 4px;
        }

        .mini-value {
          color: #dbe8f5;
          font-size: 13px;
          line-height: 1.35;
        }

        .badges {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          border: 1px solid #2b78b8;
          color: #66c1ff;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge.new {
          border-color: #28cfff;
          background: #063348;
          color: #71e8ff;
        }

        .badge.overdue {
          border-color: #bd525c;
          background: #35151c;
          color: #ff9a9a;
        }

        .card-body {
          border-top: 1px solid #17375f;
          padding: 18px;
        }

        .alert {
          padding: 13px;
          border: 1px solid #28cfff;
          background: #062231;
          border-radius: 12px;
          margin-bottom: 15px;
        }

        .alert strong {
          color: #71e8ff;
        }

        .crm-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .section {
          padding: 16px;
          background: #060c15;
          border: 1px solid #132b47;
          border-radius: 13px;
          margin-bottom: 15px;
        }

        .section-title {
          color: #43b2ff;
          margin: 0 0 13px;
          font-size: 16px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
          color: #c9d7e6;
        }

        .call-list {
          display: grid;
          gap: 8px;
        }

        .call {
          border: 1px solid #17375f;
          background: #060c15;
          border-radius: 11px;
          overflow: hidden;
        }

        .call.new {
          border-color: #28cfff;
          background: #062231;
        }

        .call summary {
          cursor: pointer;
          padding: 11px 13px;
          font-weight: 800;
          color: #52baff;
          font-size: 13px;
        }

        .call.new summary {
          color: #71e8ff;
        }

        .call-body {
          padding: 0 13px 13px;
          color: #d0dceb;
          font-size: 13px;
          line-height: 1.55;
        }

        .call-body p {
          margin: 7px 0;
        }

        .call-body hr {
          border: 0;
          border-top: 1px solid #17375f;
          margin: 12px 0;
        }

        .actions-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .phone-link {
          color: #75d8ff;
          text-decoration: none;
        }

        @media (max-width: 950px) {
          .stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .prospect-summary {
            grid-template-columns: 1fr 1fr;
          }

          .badges {
            justify-content: flex-start;
          }

          .crm-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .crm-page {
            padding: 24px 12px 50px;
          }

          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .prospect-summary {
            grid-template-columns: 1fr;
          }

          .stat {
            min-height: 74px;
          }

          .card-body {
            padding: 13px;
          }
        }
      `}</style>

      <div className="shell">
        <p className="eyebrow">AXIOMAI SOLUTIONS</p>
        <h1 className="title">Prospectos</h1>
        <p className="subtitle">
          CRM inteligente con seguimiento e historial de llamadas
        </p>

        <section className="stats">
          {[
            ["Prospectos únicos", prospectos.length],
            ["Llamadas totales", llamadas.length],
            ["Nuevas llamadas", totalLlamadasNuevas],
            ["Nuevos", nuevos],
            ["Vencidos", vencidos],
            ["Seguimientos hoy", seguimientosHoy],
          ].map(([titulo, cantidad]) => (
            <div className="stat" key={String(titulo)}>
              <div className="stat-label">{titulo}</div>
              <div
                className="stat-value"
                style={{
                  color:
                    titulo === "Vencidos" && Number(cantidad) > 0
                      ? "#ff8585"
                      : titulo === "Nuevas llamadas" &&
                          Number(cantidad) > 0
                        ? "#71e8ff"
                        : "#38a9ff",
                }}
              >
                {cantidad}
              </div>
            </div>
          ))}
        </section>

        <form method="GET" className="toolbar">
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Buscar nombre, teléfono, empresa, responsable..."
          />

          <select
            className="select"
            name="estado"
            defaultValue={filtroEstado}
          >
            <option value="">Todos los estados</option>

            {ETAPAS.map((etapa) => (
              <option key={etapa} value={etapa}>
                {etapa}
              </option>
            ))}
          </select>

          <button className="button" type="submit">
            Buscar
          </button>

          <a className="link-button secondary" href="/prospectos">
            Limpiar
          </a>
        </form>

        <p className="results">
          Mostrando {filtrados.length} de {prospectos.length} prospectos
        </p>

        <section className="prospect-list">
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
              Boolean(seguimiento) &&
              !cerrado &&
              seguimiento!.getTime() < ahora.getTime();

            const etapa = prospecto.crm_stage || "Nuevo";

            return (
              <details
                key={prospecto.id}
                className={`prospect-card${
                  tieneNueva ? " new" : ""
                }${vencido ? " overdue" : ""}`}
                open={tieneNueva}
              >
                <summary className="prospect-summary">
                  <div>
                    <p className="name">
                      {texto(prospecto.caller_name)}
                    </p>
                    <div className="company">
                      {texto(prospecto.caller_company)}
                    </div>
                    <div className="phone">
                      {prospecto.caller_phone ? (
                        <a
                          className="phone-link"
                          href={`tel:${prospecto.caller_phone}`}
                        >
                          {prospecto.caller_phone}
                        </a>
                      ) : (
                        "Teléfono no disponible"
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mini-label">Responsable</div>
                    <div className="mini-value">
                      {texto(prospecto.assigned_to)}
                    </div>
                  </div>

                  <div>
                    <div className="mini-label">
                      Próximo seguimiento
                    </div>
                    <div className="mini-value">
                      {prospecto.follow_up_at
                        ? formatearFecha(prospecto.follow_up_at)
                        : "Sin programar"}
                    </div>
                  </div>

                  <div className="badges">
                    {tieneNueva && (
                      <span className="badge new">
                        {nuevas.length} nueva
                        {nuevas.length === 1 ? "" : "s"}
                      </span>
                    )}

                    {vencido && (
                      <span className="badge overdue">Vencido</span>
                    )}

                    <span
                      className="badge"
                      style={{
                        borderColor: colorEtapa(etapa),
                        color: colorEtapa(etapa),
                      }}
                    >
                      {etapa}
                    </span>

                    <span className="badge">
                      {historial.length} llamada
                      {historial.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </summary>

                <div className="card-body">
                  {tieneNueva && (
                    <div className="alert">
                      <strong>
                        {nuevas.length === 1
                          ? "Hay 1 llamada nueva sin revisar."
                          : `Hay ${nuevas.length} llamadas nuevas sin revisar.`}
                      </strong>

                      <form
                        action={marcarComoRevisada}
                        className="actions-row"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={prospecto.id}
                        />
                        <button
                          className="button success"
                          type="submit"
                        >
                          Marcar como revisada
                        </button>
                      </form>
                    </div>
                  )}

                  <section className="section">
                    <h3 className="section-title">
                      Seguimiento CRM
                    </h3>

                    <form action={actualizarProspecto}>
                      <input
                        type="hidden"
                        name="id"
                        value={prospecto.id}
                      />

                      <div className="crm-grid">
                        <label>
                          <span className="field-label">Estado</span>
                          <select
                            className="select"
                            name="crm_stage"
                            defaultValue={etapa}
                          >
                            {ETAPAS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span className="field-label">
                            Responsable
                          </span>
                          <input
                            className="input"
                            name="assigned_to"
                            defaultValue={
                              prospecto.assigned_to ?? ""
                            }
                            placeholder="Ej. Rolando"
                          />
                        </label>

                        <label>
                          <span className="field-label">
                            Próximo seguimiento
                          </span>
                          <input
                            className="input"
                            type="datetime-local"
                            name="follow_up_at"
                            defaultValue={fechaParaInput(
                              prospecto.follow_up_at
                            )}
                          />
                        </label>
                      </div>

                      <label style={{ display: "block", marginTop: 12 }}>
                        <span className="field-label">
                          Notas internas
                        </span>
                        <textarea
                          className="textarea"
                          name="crm_notes"
                          defaultValue={prospecto.crm_notes ?? ""}
                          rows={3}
                          placeholder="Notas internas del seguimiento..."
                        />
                      </label>

                      <div className="actions-row">
                        <button className="button" type="submit">
                          Guardar seguimiento
                        </button>

                        {prospecto.caller_phone && (
                          <a
                            className="link-button secondary"
                            href={`tel:${prospecto.caller_phone}`}
                          >
                            Llamar
                          </a>
                        )}
                      </div>
                    </form>
                  </section>

                  <section className="section">
                    <h3 className="section-title">
                      Historial de llamadas ({historial.length})
                    </h3>

                    <div className="call-list">
                      {historial.map((llamada, index) => {
                        const esNueva = nuevas.some(
                          (nueva) => nueva.id === llamada.id
                        );

                        return (
                          <details
                            className={`call${esNueva ? " new" : ""}`}
                            key={llamada.id}
                            open={index === 0}
                          >
                            <summary>
                              {esNueva ? "🔵 NUEVA — " : ""}
                              Llamada {historial.length - index} —{" "}
                              {formatearFecha(llamada.created_at)}
                            </summary>

                            <div className="call-body">
                              <p>
                                <strong>Nombre:</strong>{" "}
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
                                  Próxima acción sugerida:
                                </strong>{" "}
                                {traducir(llamada.next_action)}
                              </p>

                              <hr />

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
                  </section>

                  <div className="mini-value">
                    <strong>Primera llamada:</strong>{" "}
                    {formatearFecha(prospecto.first_seen_at)}
                    {" · "}
                    <strong>Último contacto:</strong>{" "}
                    {formatearFecha(prospecto.last_seen_at)}
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      </div>
    </main>
  );
}