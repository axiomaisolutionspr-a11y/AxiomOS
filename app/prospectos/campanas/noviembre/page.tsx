import Link from "next/link";
import {
  CAMPAIGN_KEY,
  TEMPLATE_BODY,
  TEMPLATE_FOOTER,
  campaignSnapshot,
  getNovemberCampaignData,
  getNovemberTemplateState,
} from "./campaign";
import {
  createNovemberTemplate,
  sendNovemberCampaign,
} from "./actions";

export const dynamic = "force-dynamic";

const box = {
  background: "#ffffff",
  border: "1px solid #dbe3ee",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-PR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Puerto_Rico",
  }).format(new Date(value));
}

function statusLabel(status: string | null) {
  if (!status) return "Pendiente";
  if (status === "accepted") return "Aceptado por WhatsApp";
  if (status === "held") return "En revisión de calidad";
  if (status === "failed") return "Fallido; revisión manual";
  if (status === "reserved") return "Reservado; no reenviar";
  return status;
}

export default async function NovemberCampaignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [campaign, template, query] = await Promise.all([
    getNovemberCampaignData(),
    getNovemberTemplateState(),
    searchParams,
  ]);

  const pending = campaign.recipients.filter((item) => !item.sendStatus);
  const snapshot = campaignSnapshot(pending);
  const ok = typeof query.ok === "string" ? query.ok : "";
  const error = campaign.configurationError ?? (typeof query.error === "string" ? query.error : "");
  const sendReady =
    campaign.migrationReady &&
    template.approved &&
    template.category === "MARKETING" &&
    pending.length > 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#172033",
        padding: "28px 18px 56px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <nav style={{ marginBottom: 18 }}>
          <Link href="/prospectos/simple">← Volver al CRM</Link>
        </nav>

        <header style={{ marginBottom: 24 }}>
          <p
            style={{
              margin: "0 0 8px",
              color: "#4f46e5",
              fontWeight: 700,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              fontSize: 13,
            }}
          >
            Campaña controlada
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(30px, 5vw, 46px)" }}>
            Oferta Fundadores — noviembre 2026
          </h1>
          <p style={{ maxWidth: 760, lineHeight: 1.6, color: "#526078" }}>
            Esta pantalla solo incluye prospectos de Puerto Rico que iniciaron
            una conversación por WhatsApp, no están cerrados y no parecen ser
            pruebas. Cada número puede enviarse una sola vez para la campaña{" "}
            <code>{CAMPAIGN_KEY}</code>.
          </p>
        </header>

        {ok ? (
          <div
            role="status"
            style={{
              ...box,
              borderColor: "#86efac",
              background: "#f0fdf4",
              marginBottom: 18,
            }}
          >
            {ok}
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            style={{
              ...box,
              borderColor: "#fca5a5",
              background: "#fef2f2",
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div style={box}>
            <strong>Registro anti-duplicados</strong>
            <p style={{ marginBottom: 0, color: "#526078" }}>
              {campaign.migrationReady
                ? "Listo."
                : "Pendiente de aplicar la migración aprobada."}
            </p>
          </div>
          <div style={box}>
            <strong>Plantilla de WhatsApp</strong>
            <p style={{ marginBottom: 0, color: "#526078" }}>
              {!template.configured
                ? "Falta identificar la cuenta WABA."
                : template.found
                  ? `${template.status || "Estado desconocido"} · ${template.category || "sin categoría"}`
                  : "Aún no creada."}
            </p>
          </div>
          <div style={box}>
            <strong>Destinatarios pendientes</strong>
            <p style={{ marginBottom: 0, color: "#526078" }}>
              {pending.length} de {campaign.recipients.length} elegibles.
            </p>
          </div>
        </section>

        <section style={{ ...box, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>Contenido que verá el prospecto</h2>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
            {TEMPLATE_BODY}
          </p>
          <p style={{ color: "#526078", marginBottom: 0 }}>
            <small>{TEMPLATE_FOOTER}</small>
          </p>
        </section>

        <section style={{ ...box, marginBottom: 18, overflowX: "auto" }}>
          <h2 style={{ marginTop: 0 }}>Revisión de destinatarios</h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 780,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #dbe3ee" }}>
                <th style={{ padding: "10px 8px" }}>Prospecto</th>
                <th style={{ padding: "10px 8px" }}>Teléfono</th>
                <th style={{ padding: "10px 8px" }}>Evidencia</th>
                <th style={{ padding: "10px 8px" }}>Estado CRM</th>
                <th style={{ padding: "10px 8px" }}>Campaña</th>
              </tr>
            </thead>
            <tbody>
              {campaign.recipients.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e8edf4" }}>
                  <td style={{ padding: "12px 8px" }}>
                    <strong>{item.name}</strong>
                    {item.company ? (
                      <div style={{ color: "#667085", marginTop: 3 }}>
                        {item.company}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: "12px 8px" }}>{item.phone}</td>
                  <td style={{ padding: "12px 8px" }}>
                    {item.inboundCount} mensaje(s) entrante(s)
                    <div style={{ color: "#667085", marginTop: 3 }}>
                      {dateLabel(item.lastInboundAt)}
                    </div>
                  </td>
                  <td style={{ padding: "12px 8px" }}>{item.stage}</td>
                  <td style={{ padding: "12px 8px" }}>
                    {statusLabel(item.sendStatus)}
                    {item.sentAt ? (
                      <div style={{ color: "#667085", marginTop: 3 }}>
                        {dateLabel(item.sentAt)}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {campaign.recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 20, textAlign: "center" }}>
                    No hay prospectos que cumplan todos los filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 18,
          }}
        >
          <div style={box}>
            <h2 style={{ marginTop: 0 }}>1. Crear plantilla</h2>
            <p style={{ lineHeight: 1.55, color: "#526078" }}>
              Crear la plantilla la envía a revisión de Meta. No manda mensajes
              a clientes.
            </p>
            {template.error ? (
              <p style={{ color: "#b42318" }}>{template.error}</p>
            ) : null}
            <form action={createNovemberTemplate}>
              <label htmlFor="template-confirmation">
                Confirmación exacta
              </label>
              <input
                id="template-confirmation"
                name="confirmation"
                placeholder="CREAR PLANTILLA"
                autoComplete="off"
                required
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  margin: "8px 0 12px",
                  padding: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                }}
              />
              <button
                type="submit"
                disabled={!template.configured || template.found}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: "12px 16px",
                  background: "#334155",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: !template.configured || template.found ? 0.5 : 1,
                }}
              >
                Enviar plantilla a revisión
              </button>
            </form>
          </div>

          <div style={box}>
            <h2 style={{ marginTop: 0 }}>2. Enviar oferta</h2>
            <p style={{ lineHeight: 1.55, color: "#526078" }}>
              El envío se detiene si la lista cambió, la plantilla no está
              aprobada o falta el registro anti-duplicados. No hay reintentos
              automáticos.
            </p>
            <form action={sendNovemberCampaign}>
              <input type="hidden" name="recipientCount" value={pending.length} />
              <input type="hidden" name="snapshot" value={snapshot} />
              <label htmlFor="send-confirmation">Confirmación exacta</label>
              <input
                id="send-confirmation"
                name="confirmation"
                placeholder="ENVIAR OFERTA"
                autoComplete="off"
                required
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  margin: "8px 0 12px",
                  padding: 12,
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                }}
              />
              <button
                type="submit"
                disabled={!sendReady}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: "12px 16px",
                  background: "#4f46e5",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: sendReady ? 1 : 0.5,
                }}
              >
                Enviar a {pending.length} prospecto(s)
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
