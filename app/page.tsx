import type { CSSProperties } from "react";
import Logo from "./components/Logo";
import BrainButton from "./components/BrainButton";

export default function Home() {
  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={brandStyle}>AxiomAI Solutions</div>

        <nav style={navStyle}>
          <a href="#inicio" style={navLinkStyle}>
            Inicio
          </a>
          <a href="#servicios" style={navLinkStyle}>
            Servicios
          </a>
          <a href="#proceso" style={navLinkStyle}>
            Cómo trabajamos
          </a>
          <a href="#evaluacion" style={navLinkStyle}>
            Evaluación
          </a>
          <a href="#contacto" style={navLinkStyle}>
            Contacto
          </a>
        </nav>
      </header>

      <section id="inicio" style={heroStyle}>
        <div style={glowOrbStyle} />

        <div style={logoWrapStyle}>
          <Logo />
        </div>

        <div style={pillStyle}>INTELIGENCIA • AUTOMATIZACIÓN • SOFTWARE</div>

        <h1 style={titleStyle}>AxiomOS</h1>

        <h2 style={subtitleStyle}>Soluciones Inteligentes para Empresas</h2>

        <p style={descriptionStyle}>
          Creamos sistemas con inteligencia artificial, automatización y
          software a la medida para que tu negocio responda más rápido, opere
          mejor y crezca con menos trabajo manual.
        </p>

        <div style={buttonAreaStyle}>
          <BrainButton />
        </div>

        <div style={heroBadgesStyle}>
          <span style={badgeStyle}>Evaluación inicial gratuita</span>
          <span style={badgeStyle}>Servicio 24/7</span>
          <span style={badgeStyle}>Automatización empresarial</span>
        </div>
      </section>

      <section id="servicios" style={servicesSectionStyle}>
        <style>
          {`
            .axiom-service-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 26px;
              max-width: 1180px;
              margin: 0 auto;
            }

            .axiom-service-card {
              position: relative;
              min-height: 245px;
              padding: 30px;
              border-radius: 30px;
              background:
                linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(30, 64, 175, 0.24));
              border: 1px solid rgba(125, 211, 252, 0.24);
              box-shadow:
                0 22px 60px rgba(2, 6, 23, 0.42),
                inset 0 1px 0 rgba(255, 255, 255, 0.08);
              color: #e0f2fe;
              overflow: hidden;
              transition:
                transform 220ms ease,
                border-color 220ms ease,
                box-shadow 220ms ease,
                background 220ms ease;
            }

            .axiom-service-card::before {
              content: "";
              position: absolute;
              inset: -1px;
              background:
                radial-gradient(circle at top left, rgba(56, 189, 248, 0.22), transparent 34%),
                radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.18), transparent 38%);
              opacity: 0;
              transition: opacity 220ms ease;
              pointer-events: none;
            }

            .axiom-service-card:hover {
              transform: translateY(-8px);
              border-color: rgba(125, 211, 252, 0.56);
              box-shadow:
                0 28px 80px rgba(37, 99, 235, 0.32),
                0 0 38px rgba(56, 189, 248, 0.18),
                inset 0 1px 0 rgba(255, 255, 255, 0.12);
            }

            .axiom-service-card:hover::before {
              opacity: 1;
            }

            .axiom-service-icon {
              position: relative;
              z-index: 2;
              width: 54px;
              height: 54px;
              border-radius: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 22px;
              font-size: 25px;
              background:
                linear-gradient(135deg, rgba(56,189,248,0.32), rgba(37,99,235,0.24));
              border: 1px solid rgba(125, 211, 252, 0.34);
              box-shadow: 0 0 28px rgba(56, 189, 248, 0.22);
            }

            .axiom-service-card h3 {
              position: relative;
              z-index: 2;
              margin: 0 0 12px;
              color: white;
              font-size: 21px;
              letter-spacing: -0.4px;
            }

            .axiom-service-card p {
              position: relative;
              z-index: 2;
              margin: 0;
              color: #bfdbfe;
              font-size: 15.5px;
              line-height: 1.7;
            }

            .axiom-service-number {
              position: absolute;
              top: 26px;
              right: 28px;
              color: rgba(125, 211, 252, 0.28);
              font-size: 13px;
              font-weight: 900;
              letter-spacing: 3px;
            }

            @media (max-width: 980px) {
              .axiom-service-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }

            @media (max-width: 640px) {
              .axiom-service-grid {
                grid-template-columns: 1fr;
              }
            }
          `}
        </style>

        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>SERVICIOS PREMIUM</p>

          <h2 style={sectionTitleStyle}>
            Tecnología inteligente para operar como una empresa de alto nivel
          </h2>

          <p style={sectionTextStyle}>
            AxiomAI diseña sistemas elegantes, rápidos y prácticos para
            automatizar operaciones, atender clientes y transformar procesos de
            negocio con IA.
          </p>
        </div>

        <div className="axiom-service-grid">
          <article className="axiom-service-card">
            <span className="axiom-service-number">01</span>
            <div className="axiom-service-icon">⚙️</div>
            <h3>Automatización empresarial</h3>
            <p>
              Convertimos tareas repetitivas en procesos automáticos: órdenes,
              mensajes, formularios, seguimientos, reportes y flujos internos.
            </p>
          </article>

          <article className="axiom-service-card">
            <span className="axiom-service-number">02</span>
            <div className="axiom-service-icon">🧠</div>
            <h3>Asistentes con inteligencia artificial</h3>
            <p>
              Creamos asistentes inteligentes para responder clientes, organizar
              datos, apoyar decisiones y reducir trabajo manual.
            </p>
          </article>

          <article className="axiom-service-card">
            <span className="axiom-service-number">03</span>
            <div className="axiom-service-icon">💬</div>
            <h3>Atención por WhatsApp y web</h3>
            <p>
              Diseñamos flujos de respuesta, captación y seguimiento para que tu
              negocio atienda clientes incluso cuando no estás disponible.
            </p>
          </article>

          <article className="axiom-service-card">
            <span className="axiom-service-number">04</span>
            <div className="axiom-service-icon">📊</div>
            <h3>Dashboards de control</h3>
            <p>
              Paneles modernos para visualizar clientes, solicitudes, proyectos,
              documentos, ventas y métricas importantes en un solo lugar.
            </p>
          </article>

          <article className="axiom-service-card">
            <span className="axiom-service-number">05</span>
            <div className="axiom-service-icon">🌐</div>
            <h3>Páginas web premium</h3>
            <p>
              Sitios rápidos, elegantes y orientados a convertir visitantes en
              clientes, con diseño profesional y estructura comercial clara.
            </p>
          </article>

          <article className="axiom-service-card">
            <span className="axiom-service-number">06</span>
            <div className="axiom-service-icon">🚀</div>
            <h3>AxiomOS Brain</h3>
            <p>
              El centro operativo inteligente donde conectaremos IA, clientes,
              documentos, servicios, automatizaciones y análisis del negocio.
            </p>
          </article>
        </div>

        <div style={servicesNoteStyle}>
          <strong style={{ color: "white" }}>Nuestro enfoque:</strong>{" "}
          soluciones limpias, modernas y útiles. Tecnología que no solo se ve
          bien, sino que ayuda a tu empresa a trabajar mejor desde el primer día.
        </div>
      </section>

      <section id="proceso" style={darkSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>PROCESO</p>

          <h2 style={sectionTitleStyle}>Cómo trabajamos</h2>

          <p style={sectionTextStyle}>
            Primero entendemos tu negocio. Después construimos soluciones
            simples, útiles y escalables.
          </p>
        </div>

        <div style={processGridStyle}>
          <div style={processCardStyle}>
            <span style={stepNumberStyle}>01</span>
            <h3>Evaluamos</h3>
            <p>
              Identificamos qué tareas consumen más tiempo y dónde la IA puede
              ayudar.
            </p>
          </div>

          <div style={processCardStyle}>
            <span style={stepNumberStyle}>02</span>
            <h3>Diseñamos</h3>
            <p>
              Creamos un plan claro con la primera automatización o sistema
              recomendado.
            </p>
          </div>

          <div style={processCardStyle}>
            <span style={stepNumberStyle}>03</span>
            <h3>Construimos</h3>
            <p>
              Desarrollamos la solución y la ajustamos a la forma real en que
              trabaja tu empresa.
            </p>
          </div>

          <div style={processCardStyle}>
            <span style={stepNumberStyle}>04</span>
            <h3>Optimizamos</h3>
            <p>
              Medimos resultados y seguimos mejorando para ahorrar más tiempo y
              aumentar eficiencia.
            </p>
          </div>
        </div>
      </section>

      <section id="evaluacion" style={ctaSectionStyle}>
        <div style={ctaBoxStyle}>
          <p style={sectionLabelStyle}>EVALUACIÓN GRATUITA</p>

          <h2 style={ctaTitleStyle}>
            Descubre qué puedes automatizar primero
          </h2>

          <p style={ctaTextStyle}>
            Te ayudamos a identificar oportunidades reales para mejorar tu
            negocio con inteligencia artificial, automatización y software.
          </p>

          <div style={ctaButtonsStyle}>
            <a href="mailto:axiomaI@outlook.com" style={primaryLinkStyle}>
              Solicitar evaluación
            </a>

            <a href="#contacto" style={secondaryLinkStyle}>
              Ver contacto
            </a>
          </div>
        </div>
      </section>

      <footer id="contacto" style={footerStyle}>
        <div>
          <h2 style={{ margin: 0, color: "white" }}>AxiomAI Solutions</h2>

          <p style={{ marginTop: "10px" }}>
            Inteligencia • Automatización • Software
          </p>

          <p style={{ color: "#7dd3fc" }}>
            Evaluación inicial gratuita • Servicio 24/7
          </p>
        </div>

        <div style={footerInfoStyle}>
          <p>Correo:</p>

          <a href="mailto:axiomaI@outlook.com" style={footerLinkStyle}>
            axiomaI@outlook.com
          </a>
        </div>
      </footer>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #1552b8 0%, #071a3a 42%, #020617 100%)",
  color: "white",
  fontFamily: "Arial, sans-serif",
  overflowX: "hidden",
};

const headerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "16px 5%",
  background: "rgba(2, 6, 23, 0.88)",
  backdropFilter: "blur(16px)",
  borderBottom: "1px solid rgba(125, 211, 252, 0.18)",
};

const brandStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 900,
  letterSpacing: "-0.5px",
  whiteSpace: "nowrap",
};

const navStyle: CSSProperties = {
  display: "flex",
  gap: "18px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  alignItems: "center",
};

const navLinkStyle: CSSProperties = {
  color: "white",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const heroStyle: CSSProperties = {
  position: "relative",
  minHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: "72px 24px 60px",
};

const glowOrbStyle: CSSProperties = {
  position: "absolute",
  top: "90px",
  width: "620px",
  height: "620px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(56,189,248,0.32), rgba(37,99,235,0.12), transparent 68%)",
  filter: "blur(10px)",
  zIndex: 0,
};

const logoWrapStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  marginBottom: "4px",
};

const pillStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  marginTop: "8px",
  padding: "10px 18px",
  borderRadius: "999px",
  border: "1px solid rgba(125, 211, 252, 0.3)",
  background: "rgba(2, 6, 23, 0.35)",
  color: "#bae6fd",
  fontSize: "13px",
  fontWeight: 900,
  letterSpacing: "5px",
};

const titleStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  fontSize: "78px",
  lineHeight: 1,
  margin: "24px 0 18px",
  letterSpacing: "-3px",
  textShadow: "0 0 42px rgba(56, 189, 248, 0.42)",
};

const subtitleStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  fontSize: "36px",
  margin: "0 0 18px",
};

const descriptionStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: "820px",
  fontSize: "18px",
  lineHeight: 1.75,
  color: "#dbeafe",
  margin: "0 0 36px",
};

const buttonAreaStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  transform: "scale(0.92)",
};

const heroBadgesStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  justifyContent: "center",
  marginTop: "26px",
};

const badgeStyle: CSSProperties = {
  padding: "9px 14px",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.65)",
  border: "1px solid rgba(125, 211, 252, 0.2)",
  color: "#bfdbfe",
  fontSize: "14px",
  fontWeight: 700,
};

const servicesSectionStyle: CSSProperties = {
  position: "relative",
  padding: "110px 6%",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 34%), linear-gradient(180deg, rgba(2,6,23,0.35), rgba(2,6,23,0.78))",
  borderTop: "1px solid rgba(125, 211, 252, 0.16)",
  overflow: "hidden",
};

const servicesNoteStyle: CSSProperties = {
  maxWidth: "980px",
  margin: "48px auto 0",
  padding: "24px 28px",
  borderRadius: "26px",
  background: "rgba(2, 6, 23, 0.48)",
  border: "1px solid rgba(125, 211, 252, 0.2)",
  color: "#dbeafe",
  textAlign: "center",
  lineHeight: 1.7,
  boxShadow: "0 0 40px rgba(37, 99, 235, 0.18)",
};

const darkSectionStyle: CSSProperties = {
  padding: "90px 8%",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.35), rgba(15,23,42,0.72))",
  borderTop: "1px solid rgba(125, 211, 252, 0.16)",
};

const sectionHeaderStyle: CSSProperties = {
  textAlign: "center",
  maxWidth: "860px",
  margin: "0 auto 58px",
  position: "relative",
  zIndex: 2,
};

const sectionLabelStyle: CSSProperties = {
  color: "#38bdf8",
  letterSpacing: "6px",
  fontSize: "13px",
  fontWeight: 900,
  marginBottom: "14px",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: "46px",
  lineHeight: 1.08,
  margin: "0 0 18px",
  color: "white",
  letterSpacing: "-1.4px",
  textShadow: "0 0 34px rgba(56, 189, 248, 0.28)",
};

const sectionTextStyle: CSSProperties = {
  color: "#c7ddff",
  fontSize: "18px",
  lineHeight: 1.7,
  margin: 0,
};

const processGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "22px",
};

const processCardStyle: CSSProperties = {
  padding: "26px",
  borderRadius: "24px",
  background: "rgba(2, 6, 23, 0.58)",
  border: "1px solid rgba(125, 211, 252, 0.2)",
  color: "#dbeafe",
  lineHeight: 1.6,
};

const stepNumberStyle: CSSProperties = {
  display: "inline-block",
  color: "#38bdf8",
  fontSize: "14px",
  fontWeight: 900,
  letterSpacing: "3px",
  marginBottom: "12px",
};

const ctaSectionStyle: CSSProperties = {
  padding: "95px 8%",
  textAlign: "center",
};

const ctaBoxStyle: CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "52px",
  borderRadius: "34px",
  background:
    "linear-gradient(145deg, rgba(14, 116, 144, 0.28), rgba(30, 64, 175, 0.22))",
  border: "1px solid rgba(125, 211, 252, 0.3)",
  boxShadow: "0 0 70px rgba(37, 99, 235, 0.28)",
};

const ctaTitleStyle: CSSProperties = {
  fontSize: "40px",
  margin: "0 0 18px",
};

const ctaTextStyle: CSSProperties = {
  color: "#dbeafe",
  fontSize: "18px",
  lineHeight: 1.7,
  marginBottom: "30px",
};

const ctaButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "14px",
  justifyContent: "center",
  flexWrap: "wrap",
};

const primaryLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "16px 28px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  color: "white",
  textDecoration: "none",
  fontWeight: 900,
  boxShadow: "0 0 28px rgba(56, 189, 248, 0.45)",
};

const secondaryLinkStyle: CSSProperties = {
  display: "inline-block",
  padding: "16px 28px",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.75)",
  color: "#dbeafe",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid rgba(125, 211, 252, 0.25)",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "24px",
  flexWrap: "wrap",
  padding: "44px 8%",
  borderTop: "1px solid rgba(125, 211, 252, 0.16)",
  background: "rgba(2, 6, 23, 0.88)",
  color: "#bfdbfe",
};

const footerInfoStyle: CSSProperties = {
  textAlign: "right",
};

const footerLinkStyle: CSSProperties = {
  color: "#7dd3fc",
  textDecoration: "none",
  fontWeight: 800,
};
