import type { CSSProperties } from "react";
import Link from "next/link";

export default function SolicitudPage() {
  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Volver a inicio
        </Link>

        <p style={labelStyle}>EVALUACION GRATUITA</p>

        <h1 style={titleStyle}>Cuentanos que necesita tu negocio</h1>

        <p style={textStyle}>
          Completa esta solicitud y revisaremos que proceso podemos automatizar,
          mejorar o convertir en un sistema inteligente para tu empresa.
        </p>

        <form
          action="https://formsubmit.co/axiomaisolutionspr@gmail.com"
          method="POST"
          style={formStyle}
        >
          <input
            type="hidden"
            name="_subject"
            value="Nueva solicitud de evaluacion - AxiomAI Solutions"
          />
          <input
            type="hidden"
            name="_next"
            value="https://www.axiomaisolutions.org/gracias"
          />
          <input type="hidden" name="_captcha" value="false" />

          <div style={gridStyle}>
            <input style={inputStyle} type="text" name="nombre" placeholder="Tu nombre" required />
            <input style={inputStyle} type="text" name="negocio" placeholder="Nombre del negocio" required />
          </div>

          <div style={gridStyle}>
            <input style={inputStyle} type="tel" name="telefono" placeholder="Telefono" required />
            <input style={inputStyle} type="email" name="email" placeholder="Tu email" required />
          </div>

          <textarea
            style={textareaStyle}
            name="necesidad"
            placeholder="Que quieres automatizar, organizar o mejorar?"
            required
          />

          <button type="submit" style={buttonStyle}>
            Enviar solicitud
          </button>

          <p style={noteStyle}>
            La solicitud llegara a axiomaisolutionspr@gmail.com.
          </p>
        </form>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 18px",
  background:
    "radial-gradient(circle at top, rgba(56, 189, 248, 0.25), transparent 34%), linear-gradient(180deg, #020617 0%, #030712 48%, #000 100%)",
  color: "white",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "920px",
  borderRadius: "36px",
  padding: "clamp(28px, 5vw, 54px)",
  background:
    "linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.95))",
  border: "1px solid rgba(125, 211, 252, 0.24)",
  boxShadow: "0 30px 110px rgba(0, 0, 0, 0.45)",
};

const backLinkStyle: CSSProperties = {
  display: "inline-flex",
  marginBottom: "28px",
  color: "#7dd3fc",
  textDecoration: "none",
  fontWeight: 850,
};

const labelStyle: CSSProperties = {
  margin: 0,
  color: "#7dd3fc",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "1.8px",
};

const titleStyle: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "clamp(36px, 6vw, 68px)",
  lineHeight: 1,
  fontWeight: 1000,
  letterSpacing: "-2px",
};

const textStyle: CSSProperties = {
  maxWidth: "760px",
  margin: "20px 0 0",
  color: "#c7d2fe",
  fontSize: "18px",
  lineHeight: 1.7,
};

const formStyle: CSSProperties = {
  marginTop: "34px",
  display: "grid",
  gap: "16px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: "18px",
  border: "1px solid rgba(125, 211, 252, 0.3)",
  background: "rgba(2, 6, 23, 0.72)",
  color: "white",
  outline: "none",
  fontSize: "15px",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "150px",
  padding: "16px 18px",
  borderRadius: "18px",
  border: "1px solid rgba(125, 211, 252, 0.3)",
  background: "rgba(2, 6, 23, 0.72)",
  color: "white",
  outline: "none",
  fontSize: "15px",
  resize: "vertical",
};

const buttonStyle: CSSProperties = {
  border: "none",
  cursor: "pointer",
  justifySelf: "start",
  padding: "16px 28px",
  borderRadius: "999px",
  color: "white",
  fontWeight: 950,
  fontSize: "15px",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  boxShadow: "0 0 34px rgba(56, 189, 248, 0.36)",
};

const noteStyle: CSSProperties = {
  margin: 0,
  color: "#bfdbfe",
  fontSize: "14px",
};