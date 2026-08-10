import type { CSSProperties } from "react";
import Logo from "./components/Logo";
import BrainButton from "./components/BrainButton";

const requestEmail = "axiomaisolutionspr@gmail.com";
const requestMailLink =
  "mailto:axiomaisolutionspr@gmail.com?subject=Solicitud%20de%20evaluacion%20gratuita";

export default function Home() {
  return (
    <main style={pageStyle}>
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          max-width: 1150px;
          margin: 42px auto 0;
        }

        .service-card {
          position: relative;
          overflow: hidden;
          min-height: 250px;
          padding: 30px;
          border-radius: 30px;
          border: 1px solid rgba(125, 211, 252, 0.22);
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.92));
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
        }

        .service-card::before {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          right: -70px;
          top: -70px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.18);
          filter: blur(12px);
        }

        .service-number {
          position: relative;
          z-index: 2;
          width: 46px;
          height: 46px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          color: white;
          font-weight: 950;
          margin-bottom: 22px;
          box-shadow: 0 0 30px rgba(56, 189, 248, 0.4);
        }

        .service-card h3 {
          position: relative;
          z-index: 2;
          margin: 0 0 12px;
          color: white;
          font-size: 23px;
        }

        .service-card p {
          position: relative;
          z-index: 2;
          margin: 0;
          color: #c7d2fe;
          font-size: 16px;
          line-height: 1.65;
        }

        .process-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          max-width: 1150px;
          margin: 42px auto 0;
        }

        .process-card {
          padding: 26px;
          border-radius: 28px;
          border: 1px solid rgba(125, 211, 252, 0.2);
          background: rgba(2, 6, 23, 0.66);
        }

        .process-card span {
          display: inline-flex;
          margin-bottom: 18px;
          color: #7dd3fc;
          font-size: 34px;
          font-weight: 950;
        }

        .process-card h3 {
          margin: 0 0 10px;
          color: white;
          font-size: 18px;
        }

        .process-card p {
          margin: 0;
          color: #bfdbfe;
          font-size: 15px;
          line-height: 1.6;
        }

        .contact-card {
          padding: 26px;
          border-radius: 28px;
          border: 1px solid rgba(125, 211, 252, 0.2);
          background: rgba(2, 6, 23, 0.72);
        }

        @media (max-width: 900px) {
          .service-grid,
          .process-grid,
          .contact-grid {
            grid-template-columns: 1fr !important;
          }

          nav {
            display: none !important;
          }
        }
      `}</style>

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
        <div style={heroGlowOneStyle} />
        <div style={heroGlowTwoStyle} />

        <div style={logoHeroStyle}>
          <Logo />
        </div>

        <p style={pillStyle}>INTELIGENCIA • AUTOMATIZACIÓN • SOFTWARE</p>

        <h1 style={titleStyle}>AxiomOS</h1>

        <h2 style={subtitleStyle}>Soluciones inteligentes para empresas</h2>

        <p style={descriptionStyle}>
          Automatización, inteligencia artificial y desarrollo de software para
          que tu negocio trabaje más rápido, atienda mejor y se vea como una
          empresa moderna.
        </p>

        <div style={brainAreaStyle}>
          <BrainButton />
        </div>

        <div style={heroBadgesStyle}>
          <span style={badgeStyle}>Evaluación inicial gratuita</span>
          <span style={badgeStyle}>Servicio 24/7</span>
          <span style={badgeStyle}>IA aplicada a negocios reales</span>
        </div>
      </section>

      <section id="servicios" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>SERVICIOS</p>
          <h2 style={sectionTitleStyle}>
            Sistemas digitales para vender, atender y operar mejor.
          </h2>
          <p style={sectionTextStyle}>
            Creamos soluciones claras para negocios que quieren ahorrar tiempo,
            organizar solicitudes y modernizar su operación.
          </p>
        </div>

        <div className="service-grid">
          <article className="service-card">
            <div className="service-number">01</div>
            <h3>Páginas web premium</h3>
            <p>
              Sitios rápidos, modernos y orientados a convertir visitantes en
              clientes con una imagen profesional.
            </p>
          </article>

          <article className="service-card">
            <div className="service-number">02</div>
            <h3>Automatización</h3>
            <p>
              Flujos para mensajes, solicitudes, órdenes, seguimiento de
              clientes y tareas repetitivas.
            </p>
          </article>

          <article className="service-card">
            <div className="service-number">03</div>
            <h3>Asistentes con IA</h3>
            <p>
              Herramientas inteligentes para responder preguntas, orientar
              clientes y apoyar decisiones.
            </p>
          </article>
        </div>
      </section>

      <section id="proceso" style={darkSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>PROCESO</p>
          <h2 style={sectionTitleStyle}>Cómo trabajamos</h2>
          <p style={sectionTextStyle}>
            Desde la primera evaluación hasta la implementación de la solución.
          </p>
        </div>

        <div className="process-grid">
          <article className="process-card">
            <span>01</span>
            <h3>Evaluamos</h3>
            <p>Identificamos tareas que consumen tiempo y procesos que pueden mejorar.</p>
          </article>

          <article className="process-card">
            <span>02</span>
            <h3>Diseñamos</h3>
            <p>Creamos una estrategia de automatización, IA o software adaptada.</p>
          </article>

          <article className="process-card">
            <span>03</span>
            <h3>Implementamos</h3>
            <p>Configuramos y ponemos la solución a funcionar con tu operación.</p>
          </article>

          <article className="process-card">
            <span>04</span>
            <h3>Mejoramos</h3>
            <p>Revisamos resultados y hacemos ajustes para mantener eficiencia.</p>
          </article>
        </div>
      </section>

      <section id="evaluacion" style={evaluationStyle}>
        <div style={evaluationBoxStyle}>
          <p style={sectionLabelStyle}>COMIENZA AQUÍ</p>

          <h2 style={evaluationTitleStyle}>
            Tu negocio puede trabajar de forma más inteligente.
          </h2>

          <p style={evaluationTextStyle}>
            Cuéntanos qué tareas consumen más tiempo en tu empresa. Podemos
            ayudarte a identificar qué procesos se pueden automatizar y qué
            solución tecnológica tiene más sentido para tu negocio.
          </p>

          <a href={requestMailLink} style={primaryButtonStyle}>
            Solicitar evaluación gratuita
          </a>
        </div>
      </section>

      <section id="contacto" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>CONTACTO</p>
          <h2 style={sectionTitleStyle}>Hablemos de tu próximo sistema.</h2>
          <p style={sectionTextStyle}>
            Estamos listos para recibir tu solicitud y ayudarte a crear una
            solución útil, moderna y profesional.
          </p>
        </div>

        <div style={contactGridStyle} className="contact-grid">
          <div className="contact-card">
            <p style={contactLabelStyle}>Correo</p>
            <a href={requestMailLink} style={contactTitleStyle}>
              {requestEmail}
            </a>
            <p style={contactTextStyle}>Solicitudes, evaluaciones y propuestas.</p>
          </div>

          <div className="contact-card">
            <p style={contactLabelStyle}>Horario</p>
            <h3 style={contactTitleStyle}>Servicio 24/7</h3>
            <p style={contactTextStyle}>Recibimos solicitudes en cualquier momento.</p>
          </div>

          <div className="contact-card">
            <p style={contactLabelStyle}>Especialidad</p>
            <h3 style={contactTitleStyle}>IA y automatización</h3>
            <p style={contactTextStyle}>Soluciones prácticas para negocios reales.</p>
          </div>
        </div>
      </section>

      <footer style={footerStyle}>
        <span>© 2026 AxiomAI Solutions. Todos los derechos reservados.</span>
        <a href={requestMailLink} style={footerLinkStyle}>
          {requestEmail}
        </a>
      </footer>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(37, 99, 235, 0.34), transparent 32%), linear-gradient(180deg, #020617 0%, #030712 44%, #000000 100%)",
  color: "white",
  overflowX: "hidden",
};

const headerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "22px clamp(18px, 5vw, 72px)",
  background: "rgba(2, 6, 23, 0.82)",
  backdropFilter: "blur(18px)",
  borderBottom: "1px solid rgba(125, 211, 252, 0.12)",
};

const brandStyle: CSSProperties = {
  fontSize: "19px",
  fontWeight: 950,
  color: "white",
};

const navStyle: CSSProperties = {
  display: "flex",
  gap: "20px",
  alignItems: "center",
};

const navLinkStyle: CSSProperties = {
  color: "#dbeafe",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 800,
};

const heroStyle: CSSProperties = {
  position: "relative",
  minHeight: "calc(100vh - 82px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "80px 18px 95px",
};

const heroGlowOneStyle: CSSProperties = {
  position: "absolute",
  width: "600px",
  height: "600px",
  borderRadius: "999px",
  background: "rgba(56, 189, 248, 0.2)",
  filter: "blur(90px)",
  top: "12%",
  left: "50%",
  transform: "translateX(-50%)",
};

const heroGlowTwoStyle: CSSProperties = {
  position: "absolute",
  width: "420px",
  height: "420px",
  borderRadius: "999px",
  background: "rgba(37, 99, 235, 0.25)",
  filter: "blur(90px)",
  bottom: "8%",
  right: "8%",
};

const logoHeroStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "min(520px, 86vw)",
  marginBottom: "24px",
};

const pillStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  margin: "0 0 18px",
  padding: "10px 18px",
  borderRadius: "999px",
  border: "1px solid rgba(125, 211, 252, 0.28)",
  background: "rgba(2, 6, 23, 0.52)",
  color: "#bae6fd",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "2px",
};

const titleStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  margin: 0,
  fontSize: "clamp(64px, 12vw, 150px)",
  lineHeight: 0.92,
  fontWeight: 1000,
  letterSpacing: "-6px",
  background: "linear-gradient(180deg, #ffffff, #7dd3fc 58%, #2563eb)",
  WebkitBackgroundClip: "text",
  color: "transparent",
  textShadow: "0 0 85px rgba(56, 189, 248, 0.35)",
};

const subtitleStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  margin: "22px 0 0",
  fontSize: "clamp(28px, 4.5vw, 58px)",
  lineHeight: 1.05,
  fontWeight: 950,
};

const descriptionStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: "830px",
  margin: "22px auto 0",
  color: "#c7d2fe",
  fontSize: "19px",
  lineHeight: 1.7,
};

const brainAreaStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  marginTop: "42px",
};

const heroBadgesStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "34px",
};

const badgeStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: "999px",
  background: "rgba(2, 6, 23, 0.6)",
  border: "1px solid rgba(147, 197, 253, 0.22)",
  color: "#dbeafe",
  fontSize: "14px",
  fontWeight: 800,
};

const sectionStyle: CSSProperties = {
  padding: "105px clamp(18px, 5vw, 72px)",
};

const darkSectionStyle: CSSProperties = {
  padding: "105px clamp(18px, 5vw, 72px)",
  background: "rgba(2, 6, 23, 0.48)",
  borderTop: "1px solid rgba(125, 211, 252, 0.08)",
  borderBottom: "1px solid rgba(125, 211, 252, 0.08)",
};

const sectionHeaderStyle: CSSProperties = {
  maxWidth: "900px",
  margin: "0 auto",
  textAlign: "center",
};

const sectionLabelStyle: CSSProperties = {
  margin: 0,
  color: "#7dd3fc",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "1.8px",
  textTransform: "uppercase",
};

const sectionTitleStyle: CSSProperties = {
  margin: "14px 0 0",
  color: "white",
  fontSize: "clamp(34px, 5vw, 62px)",
  lineHeight: 1.03,
  fontWeight: 980,
  letterSpacing: "-2px",
};

const sectionTextStyle: CSSProperties = {
  maxWidth: "760px",
  margin: "18px auto 0",
  color: "#c7d2fe",
  fontSize: "18px",
  lineHeight: 1.7,
};

const evaluationStyle: CSSProperties = {
  padding: "110px clamp(18px, 5vw, 72px)",
};

const evaluationBoxStyle: CSSProperties = {
  maxWidth: "980px",
  margin: "0 auto",
  padding: "48px",
  borderRadius: "38px",
  textAlign: "center",
  border: "1px solid rgba(125, 211, 252, 0.28)",
  background:
    "linear-gradient(135deg, rgba(37, 99, 235, 0.36), rgba(2, 6, 23, 0.86))",
  boxShadow: "0 30px 110px rgba(0, 0, 0, 0.42)",
};

const evaluationTitleStyle: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "clamp(32px, 5vw, 56px)",
  lineHeight: 1.05,
  fontWeight: 980,
};

const evaluationTextStyle: CSSProperties = {
  maxWidth: "780px",
  margin: "18px auto 0",
  color: "#dbeafe",
  fontSize: "18px",
  lineHeight: 1.7,
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  marginTop: "30px",
  padding: "16px 24px",
  borderRadius: "999px",
  textDecoration: "none",
  color: "white",
  fontWeight: 950,
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  boxShadow: "0 0 34px rgba(56, 189, 248, 0.36)",
};

const contactGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "20px",
  maxWidth: "1150px",
  margin: "42px auto 0",
};

const contactLabelStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#7dd3fc",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "1.2px",
  textTransform: "uppercase",
};

const contactTitleStyle: CSSProperties = {
  margin: 0,
  color: "white",
  fontSize: "20px",
  fontWeight: 950,
  textDecoration: "none",
};

const contactTextStyle: CSSProperties = {
  margin: "12px 0 0",
  color: "#bfdbfe",
  fontSize: "15px",
  lineHeight: 1.6,
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
  padding: "32px clamp(18px, 5vw, 72px)",
  borderTop: "1px solid rgba(125, 211, 252, 0.12)",
  background: "#020617",
  color: "#94a3b8",
  fontSize: "14px",
};

const footerLinkStyle: CSSProperties = {
  color: "#7dd3fc",
  textDecoration: "none",
  fontWeight: 850,
};
