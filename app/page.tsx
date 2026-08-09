import Logo from "./components/Logo";
import BrainButton from "./components/BrainButton";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #123c8c 0%, #07152f 45%, #020617 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 8%",
          background: "rgba(2, 6, 23, 0.82)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(56, 189, 248, 0.18)",
        }}
      >
        <strong style={{ fontSize: "20px" }}>AxiomAI Solutions</strong>

        <nav
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          <a href="#inicio" style={{ color: "white", textDecoration: "none" }}>
            Inicio
          </a>
          <a
            href="#servicios"
            style={{ color: "white", textDecoration: "none" }}
          >
            Servicios
          </a>
          <a
            href="#evaluacion"
            style={{ color: "white", textDecoration: "none" }}
          >
            Evaluación
          </a>
          <a href="#contacto" style={{ color: "white", textDecoration: "none" }}>
            Contacto
          </a>
        </nav>
      </header>

      <section
        id="inicio"
        style={{
          minHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "70px 24px",
        }}
      >
        <Logo />

        <p
          style={{
            marginTop: "8px",
            letterSpacing: "8px",
            color: "#7dd3fc",
            fontSize: "15px",
            fontWeight: 700,
          }}
        >
          AXIOM AI
        </p>

        <h1
          style={{
            fontSize: "72px",
            lineHeight: 1,
            margin: "18px 0 20px",
            textShadow: "0 0 35px rgba(56, 189, 248, 0.35)",
          }}
        >
          AxiomOS
        </h1>

        <h2
          style={{
            fontSize: "34px",
            margin: "0 0 18px",
          }}
        >
          Soluciones Inteligentes para Empresas
        </h2>

        <p
          style={{
            maxWidth: "760px",
            fontSize: "18px",
            lineHeight: 1.7,
            color: "#dbeafe",
            marginBottom: "38px",
          }}
        >
          Automatización, inteligencia artificial y desarrollo de software
          diseñados para transformar la manera en que opera tu negocio.
        </p>

        <BrainButton />

        <p
          style={{
            marginTop: "28px",
            color: "#bae6fd",
            fontSize: "15px",
          }}
        >
          Evaluación inicial gratuita • Servicio 24/7
        </p>
      </section>

      <section
        id="servicios"
        style={{
          padding: "80px 8%",
          background: "rgba(2, 6, 23, 0.45)",
          borderTop: "1px solid rgba(125, 211, 252, 0.16)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "42px",
            marginBottom: "14px",
          }}
        >
          Servicios principales
        </h2>

        <p
          style={{
            textAlign: "center",
            maxWidth: "720px",
            margin: "0 auto 46px",
            color: "#bfdbfe",
            fontSize: "17px",
            lineHeight: 1.6,
          }}
        >
          Creamos herramientas digitales para que tu empresa venda más, responda
          más rápido y opere con menos trabajo manual.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px",
          }}
        >
          <div style={cardStyle}>
            <h3>Automatización</h3>
            <p>
              Procesos automáticos para órdenes, mensajes, formularios,
              seguimientos y tareas repetitivas.
            </p>
          </div>

          <div style={cardStyle}>
            <h3>Asistentes con IA</h3>
            <p>
              Chatbots y agentes inteligentes para responder clientes,
              organizar información y acelerar decisiones.
            </p>
          </div>

          <div style={cardStyle}>
            <h3>Software a la medida</h3>
            <p>
              Sistemas internos, dashboards, páginas web y herramientas
              conectadas al flujo de trabajo real del negocio.
            </p>
          </div>

          <div style={cardStyle}>
            <h3>AxiomOS Brain</h3>
            <p>
              El núcleo inteligente para conectar clientes, documentos,
              servicios, operaciones y análisis en un solo lugar.
            </p>
          </div>
        </div>
      </section>

      <section
        id="evaluacion"
        style={{
          padding: "90px 8%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "850px",
            margin: "0 auto",
            padding: "46px",
            borderRadius: "32px",
            background:
              "linear-gradient(145deg, rgba(14, 116, 144, 0.25), rgba(30, 64, 175, 0.18))",
            border: "1px solid rgba(125, 211, 252, 0.28)",
            boxShadow: "0 0 60px rgba(37, 99, 235, 0.25)",
          }}
        >
          <h2 style={{ fontSize: "38px", marginBottom: "16px" }}>
            Evaluación gratuita
          </h2>

          <p
            style={{
              color: "#dbeafe",
              fontSize: "18px",
              lineHeight: 1.7,
              marginBottom: "28px",
            }}
          >
            Analizamos tu negocio y te decimos qué puedes automatizar primero
            para ahorrar tiempo, mejorar servicio y aumentar eficiencia.
          </p>

          <a
            href="#contacto"
            style={{
              display: "inline-block",
              padding: "16px 28px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #38bdf8, #2563eb)",
              color: "white",
              textDecoration: "none",
              fontWeight: 800,
              boxShadow: "0 0 28px rgba(56, 189, 248, 0.45)",
            }}
          >
            Solicitar evaluación
          </a>
        </div>
      </section>

      <footer
        id="contacto"
        style={{
          padding: "42px 8%",
          borderTop: "1px solid rgba(125, 211, 252, 0.16)",
          background: "rgba(2, 6, 23, 0.82)",
          textAlign: "center",
          color: "#bfdbfe",
        }}
      >
        <strong style={{ color: "white", fontSize: "20px" }}>
          AxiomAI Solutions
        </strong>

        <p style={{ marginTop: "12px" }}>
          Inteligencia • Automatización • Software
        </p>

        <p style={{ marginTop: "8px", color: "#7dd3fc" }}>
          Servicio 24/7 • Evaluación inicial gratuita
        </p>
      </footer>
    </main>
  );
}

const cardStyle = {
  padding: "28px",
  borderRadius: "26px",
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid rgba(125, 211, 252, 0.22)",
  boxShadow: "0 0 35px rgba(37, 99, 235, 0.18)",
  color: "#e0f2fe",
  lineHeight: 1.6,
};