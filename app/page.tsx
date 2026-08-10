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

        .solutions-layout {
          max-width: 1220px;
          margin: 58px auto 0;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 26px;
          align-items: stretch;
        }

        .solution-main-card {
          position: relative;
          overflow: hidden;
          min-height: 430px;
          padding: 42px;
          border-radius: 42px;
          border: 1px solid rgba(125, 211, 252, 0.44);
          background:
            radial-gradient(circle at 80% 18%, rgba(56, 189, 248, 0.55), transparent 32%),
            radial-gradient(circle at 18% 85%, rgba(37, 99, 235, 0.38), transparent 35%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.96));
          box-shadow:
            0 44px 140px rgba(0, 0, 0, 0.72),
            0 0 90px rgba(56, 189, 248, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .solution-main-card::before {
          content: "AXIOM";
          position: absolute;
          right: -10px;
          top: 8px;
          font-size: 120px;
          font-weight: 1000;
          letter-spacing: -8px;
          color: rgba(125, 211, 252, 0.08);
          text-shadow: 0 0 80px rgba(56, 189, 248, 0.4);
        }

        .solution-main-card::after {
          content: "";
          position: absolute;
          width: 320px;
          height: 320px;
          right: -120px;
          bottom: -120px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.2);
          filter: blur(18px);
        }

        .solution-kicker {
          position: relative;
          z-index: 2;
          display: inline-flex;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(2, 6, 23, 0.55);
          border: 1px solid rgba(125, 211, 252, 0.32);
          color: #bae6fd;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 1.4px;
          margin-bottom: 28px;
        }

        .solution-main-card h3 {
          position: relative;
          z-index: 2;
          margin: 0;
          color: white;
          font-size: clamp(38px, 5vw, 72px);
          line-height: 0.95;
          letter-spacing: -3px;
          max-width: 680px;
          text-shadow: 0 0 42px rgba(56, 189, 248, 0.25);
        }

        .solution-main-card p {
          position: relative;
          z-index: 2;
          max-width: 650px;
          margin: 24px 0 0;
          color: #dbeafe;
          font-size: 18px;
          line-height: 1.75;
        }

        .feature-row {
          position: relative;
          z-index: 2;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 34px;
        }

        .feature-pill {
          padding: 12px 15px;
          border-radius: 999px;
          background: rgba(2, 6, 23, 0.62);
          border: 1px solid rgba(125, 211, 252, 0.24);
          color: #e0f2fe;
          font-size: 14px;
          font-weight: 850;
        }

        .side-solutions {
          display: grid;
          gap: 26px;
        }

        .side-card {
          position: relative;
          overflow: hidden;
          min-height: 202px;
          padding: 30px;
          border-radius: 34px;
          border: 1px solid rgba(125, 211, 252, 0.35);
          background:
            radial-gradient(circle at 88% 16%, rgba(56, 189, 248, 0.42), transparent 32%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.95));
          box-shadow:
            0 28px 90px rgba(0, 0, 0, 0.58),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .icon-box {
          display: inline-flex;
          width: 58px;
          height: 58px;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: radial-gradient(circle at 30% 20%, #ffffff, #7dd3fc 34%, #2563eb 100%);
          color: white;
          font-size: 22px;
          font-weight: 1000;
          box-shadow: 0 0 36px rgba(56, 189, 248, 0.7);
          margin-bottom: 24px;
        }

        .side-card h3 {
          margin: 0 0 12px;
          color: white;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: -1px;
        }

        .side-card p {
          margin: 0;
          color: #dbeafe;
          font-size: 16px;
          line-height: 1.65;
        }

        .process-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
          max-width: 1180px;
          margin: 54px auto 0;
        }

        .process-card {
          min-height: 250px;
          padding: 26px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 80% 12%, rgba(56, 189, 248, 0.18), transparent 30%),
            linear-gradient(180deg, rgba(12, 20, 46, 0.96), rgba(20, 30, 66, 0.92));
          border: 1px solid rgba(125, 211, 252, 0.24);
          box-shadow:
            0 22px 60px rgba(0, 0, 0, 0.34),
            inset 0 0 0 1px rgba(255, 255, 255, 0.04);
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
        }

        .process-card:hover {
          transform: translateY(-6px);
          border-color: rgba(96, 194, 255, 0.55);
          box-shadow:
            0 24px 70px rgba(2, 6, 23, 0.38),
            0 0 38px rgba(56, 189, 248, 0.14);
        }

        .process-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .process-step {
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid rgba(125, 211, 252, 0.24);
          background: rgba(6, 14, 35, 0.48);
          color: #9fe8ff;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .process-card h3 {
          margin: 0 0 12px;
          color: #ffffff;
          font-size: 26px;
          font-weight: 950;
          line-height: 1.08;
        }

        .process-card p {
          margin: 0;
          color: #dbeafe;
          line-height: 1.65;
          font-size: 15px;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          max-width: 1150px;
          margin: 42px auto 0;
        }

        .contact-card {
          padding: 26px;
          border-radius: 28px;
          border: 1px solid rgba(125, 211, 252, 0.2);
          background: rgba(2, 6, 23, 0.72);
        }

        @media (max-width: 950px) {
          .solutions-layout {
            grid-template-columns: 1fr;
          }

          .process-grid,
          .contact-grid {
            grid-template-columns: 1fr;
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
            Como trabajamos
          </a>
          <a href="#evaluacion" style={navLinkStyle}>
            Evaluacion
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

        <p style={pillStyle}>INTELIGENCIA • AUTOMATIZACION • SOFTWARE</p>

        <h1 style={titleStyle}>AxiomOS</h1>

        <h2 style={subtitleStyle}>Soluciones inteligentes para empresas</h2>

        <p style={descriptionStyle}>
          Automatizacion, inteligencia artificial y desarrollo de software para
          que tu negocio trabaje mas rapido, atienda mejor y se vea como una
          empresa moderna.
        </p>

        <div style={brainAreaStyle}>
          <BrainButton />
        </div>

        <div style={heroBadgesStyle}>
          <span style={badgeStyle}>Evaluacion inicial gratuita</span>
          <span style={badgeStyle}>Servicio 24/7</span>
          <span style={badgeStyle}>IA aplicada a negocios reales</span>
        </div>
      </section>

      <section id="servicios" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>SERVICIOS</p>
          <h2 style={sectionTitleStyle}>
            Soluciones inteligentes para negocios que quieren crecer.
          </h2>
          <p style={sectionTextStyle}>
            No vendemos solo paginas. Creamos sistemas, automatizaciones y
            herramientas de IA que ayudan a tu negocio a operar mejor desde el
            primer dia.
          </p>
        </div>

        <div className="solutions-layout">
          <article className="solution-main-card">
            <div className="solution-kicker">SISTEMA PRINCIPAL</div>

            <h3>Tu negocio puede tener su propio centro operativo digital.</h3>

            <p>
              Disenamos paginas web, formularios, flujos de seguimiento,
              automatizacion de mensajes y asistentes inteligentes para que
              recibas solicitudes, organices clientes y reduzcas trabajo manual.
            </p>

            <div className="feature-row">
              <span className="feature-pill">Paginas web premium</span>
              <span className="feature-pill">Formularios de solicitud</span>
              <span className="feature-pill">Automatizacion de clientes</span>
              <span className="feature-pill">Asistentes con IA</span>
            </div>
          </article>

          <div className="side-solutions">
            <article className="side-card">
              <div className="icon-box">⚙️</div>
              <h3>Automatizacion</h3>
              <p>
                Organizamos mensajes, solicitudes, ordenes y seguimiento para
                que tu negocio responda mas rapido.
              </p>
            </article>

            <article className="side-card">
              <div className="icon-box">🤖</div>
              <h3>Inteligencia artificial</h3>
              <p>
                Creamos asistentes y herramientas que ayudan a contestar,
                clasificar y tomar mejores decisiones.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="proceso" style={darkSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>PROCESO</p>
          <h2 style={sectionTitleStyle}>Como trabajamos</h2>
          <p style={sectionTextStyle}>
            Desde la primera evaluacion hasta la implementacion de la solucion.
          </p>
        </div>

        <div className="process-grid">
          <article className="process-card">
            <div className="process-card-top">
              <div className="icon-box">🔎</div>
              <div className="process-step">01 / DIAG</div>
            </div>
            <h3>Evaluamos</h3>
            <p>
              Identificamos tareas que consumen tiempo y procesos que pueden
              mejorar.
            </p>
          </article>

          <article className="process-card">
            <div className="process-card-top">
              <div className="icon-box">🧩</div>
              <div className="process-step">02 / PLAN</div>
            </div>
            <h3>Disenamos</h3>
            <p>
              Creamos una estrategia de automatizacion, IA o software adaptada.
            </p>
          </article>

          <article className="process-card">
            <div className="process-card-top">
              <div className="icon-box">🚀</div>
              <div className="process-step">03 / BUILD</div>
            </div>
            <h3>Implementamos</h3>
            <p>
              Configuramos y ponemos la solucion a funcionar con tu operacion.
            </p>
          </article>

          <article className="process-card">
            <div className="process-card-top">
              <div className="icon-box">📈</div>
              <div className="process-step">04 / SCALE</div>
            </div>
            <h3>Mejoramos</h3>
            <p>
              Revisamos resultados y hacemos ajustes para mantener eficiencia.
            </p>
          </article>
        </div>
      </section>

      <section id="evaluacion" style={evaluationStyle}>
        <div style={evaluationBoxStyle}>
          <p style={sectionLabelStyle}>COMIENZA AQUI</p>

          <h2 style={evaluationTitleStyle}>
            Tu negocio puede trabajar de forma mas inteligente.
          </h2>

          <p style={evaluationTextStyle}>
            Cuentanos que tareas consumen mas tiempo en tu empresa. Podemos
            ayudarte a identificar que procesos se pueden automatizar y que
            solucion tecnologica tiene mas sentido para tu negocio.
          </p>

          <a href="/solicitud" style={primaryButtonStyle}>
            Solicitar evaluacion gratuita →
          </a>
        </div>
      </section>

      <section id="contacto" style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>CONTACTO</p>
          <h2 style={sectionTitleStyle}>Hablemos de tu proximo sistema.</h2>
          <p style={sectionTextStyle}>
            Estamos listos para recibir tu solicitud y ayudarte a crear una
            solucion util, moderna y profesional.
          </p>
        </div>

        <div className="contact-grid">
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
            <p style={contactTextStyle}>
              Recibimos solicitudes en cualquier momento.
            </p>
          </div>

          <div className="contact-card">
            <p style={contactLabelStyle}>Especialidad</p>
            <h3 style={contactTitleStyle}>IA y automatizacion</h3>
            <p style={contactTextStyle}>
              Soluciones practicas para negocios reales.
            </p>
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
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "34px",
  padding: "18px 32px",
  borderRadius: "999px",
  textDecoration: "none",
  color: "white",
  fontWeight: 1000,
  fontSize: "16px",
  letterSpacing: "0.2px",
  background:
    "linear-gradient(135deg, #38bdf8 0%, #2563eb 52%, #1d4ed8 100%)",
  boxShadow:
    "0 0 34px rgba(56, 189, 248, 0.45), 0 18px 50px rgba(37, 99, 235, 0.32), inset 0 1px 0 rgba(255,255,255,0.28)",
  border: "1px solid rgba(186, 230, 253, 0.58)",
  overflow: "hidden",
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
