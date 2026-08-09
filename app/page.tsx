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

        .axiom-service-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          width: 100%;
          max-width: 1120px;
          margin: 34px auto 0;
        }

        .axiom-service-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(125, 211, 252, 0.18);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(2, 6, 23, 0.92));
          border-radius: 28px;
          padding: 28px;
          min-height: 245px;
          box-shadow: 0 24px 90px rgba(0, 0, 0, 0.35);
        }

        .axiom-service-card::before {
          content: "";
          position: absolute;
          inset: -80px -80px auto auto;
          width: 190px;
          height: 190px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.13);
          filter: blur(8px);
        }

        .axiom-service-number {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          box-shadow: 0 0 34px rgba(56, 189, 248, 0.28);
          margin-bottom: 22px;
        }

        .axiom-service-card h3 {
          position: relative;
          z-index: 2;
          margin: 0 0 12px;
          color: white;
          font-size: 22px;
          letter-spacing: -0.4px;
        }

        .axiom-service-card p {
          position: relative;
          z-index: 2;
          margin: 0;
          color: #c7d2fe;
          font-size: 15.5px;
          line-height: 1.65;
        }

        .axiom-process-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          max-width: 1120px;
          width: 100%;
          margin: 34px auto 0;
        }

        .axiom-process-card {
          border: 1px solid rgba(147, 197, 253, 0.18);
          background: rgba(2, 6, 23, 0.62);
          border-radius: 26px;
          padding: 24px;
          min-height: 190px;
        }

        .axiom-process-orb {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #38bdf8;
          box-shadow: 0 0 28px rgba(56, 189, 248, 0.72);
          margin-bottom: 18px;
        }

        .axiom-process-card h3 {
          margin: 0 0 10px;
          color: white;
          font-size: 18px;
        }

        .axiom-process-card p {
          margin: 0;
          color: #bfdbfe;
          font-size: 14.5px;
          line-height: 1.6;
        }

        .axiom-contact-card {
          border: 1px solid rgba(125, 211, 252, 0.18);
          background: rgba(2, 6, 23, 0.68);
          border-radius: 26px;
          padding: 24px;
        }

        @media (max-width: 900px) {
          .axiom-service-grid,
          .axiom-process-grid {
            grid-template-columns: 1fr;
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
        <div style={glowOrbStyle} />

        <div style={logoWrapStyle}>
          <Logo />
        </div>

        <p style={pillStyle}>INTELIGENCIA • AUTOMATIZACIÓN • SOFTWARE</p>

        <h1 style={titleStyle}>AxiomOS</h1>

        <h2 style={subtitleStyle}>Soluciones inteligentes para empresas</h2>

        <p style={descriptionStyle}>
          Creamos páginas web, automatizaciones, asistentes con IA y sistemas
          digitales para que tu negocio trabaje más rápido, se vea más
          profesional y atienda mejor a sus clientes.
        </p>

        <div style={buttonAreaStyle}>
          <BrainButton />
        </div>

        <div style={heroBadgesStyle}>
          <span style={badgeStyle}>Evaluación gratuita</span>
          <span style={badgeStyle}>Servicio 24/7</span>
          <span style={badgeStyle}>IA para negocios reales</span>
        </div>
      </section>

      <section id="servicios" style={servicesSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>SERVICIOS</p>
          <h2 style={sectionTitleStyle}>Tecnología clara para negocios que quieren crecer.</h2>
          <p style={sectionTextStyle}>
            Ayudamos a negocios pequeños y medianos a organizar procesos,
            automatizar tareas repetitivas y ofrecer una imagen digital más
            profesional.
          </p>
        </div>

        <div className="axiom-service-grid">
          <article className="axiom-service-card">
            <div className="axiom-service-number">01</div>
            <h3>Páginas web profesionales</h3>
            <p>
              Diseñamos páginas modernas, rápidas y enfocadas en convertir
              visitantes en clientes.
            </p>
          </article>

          <article className="axiom-service-card">
            <div className="axiom-service-number">02</div>
            <h3>Automatización de procesos</h3>
            <p>
              Organizamos solicitudes, órdenes, mensajes y tareas internas para
              reducir trabajo manual.
            </p>
          </article>

          <article className="axiom-service-card">
            <div className="axiom-service-number">03</div>
            <h3>Asistentes con IA</h3>
            <p>
              Creamos asistentes para responder preguntas, orientar clientes y
              apoyar decisiones del negocio.
            </p>
          </article>
        </div>

        <p style={servicesNoteStyle}>
          Nuestro enfoque es práctico: primero entendemos el problema, luego
          construimos una solución que puedas usar.
        </p>
      </section>

      <section id="proceso" style={processSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>PROCESO EJECUTIVO</p>
          <h2 style={sectionTitleStyle}>De una idea a un sistema funcionando.</h2>
          <p style={sectionTextStyle}>
            Trabajamos paso a paso para que el cliente entienda qué se va a
            crear, por qué se necesita y cómo le ayuda al negocio.
          </p>
        </div>

        <div className="axiom-process-grid">
          <article className="axiom-process-card">
            <div className="axiom-process-orb" />
            <h3>1. Diagnóstico</h3>
            <p>Revisamos el proceso actual y detectamos dónde se pierde tiempo.</p>
          </article>

          <article className="axiom-process-card">
            <div className="axiom-process-orb" />
            <h3>2. Estrategia</h3>
            <p>Definimos la solución más útil: web, automatización, IA o sistema.</p>
          </article>

          <article className="axiom-process-card">
            <div className="axiom-process-orb" />
            <h3>3. Desarrollo</h3>
            <p>Construimos una versión clara, funcional y lista para probar.</p>
          </article>

          <article className="axiom-process-card">
            <div className="axiom-process-orb" />
            <h3>4. Mejora</h3>
            <p>Ajustamos el sistema para que se adapte al uso real del negocio.</p>
          </article>
        </div>
      </section>

      <section id="evaluacion" style={evaluationSectionStyle}>
        <div style={evaluationGlowStyle} />

        <div style={evaluationGridStyle}>
          <div style={evaluationTextStyle}>
            <p style={sectionLabelStyle}>EVALUACIÓN GRATUITA</p>

            <h2 style={evaluationTitleStyle}>
              Descubre dónde tu negocio está perdiendo tiempo, dinero y
              oportunidades.
            </h2>

            <p style={evaluationParagraphStyle}>
              Analizamos tu operación y te recomendamos el primer sistema,
              automatización o asistente de IA que puede generar valor real sin
              complicar tu negocio.
            </p>

            <div style={evaluationListStyle}>
              <div style={checkLineStyle}>✓ Revisión de procesos actuales</div>
              <div style={checkLineStyle}>✓ Ideas claras para automatizar</div>
              <div style={checkLineStyle}>✓ Recomendación inicial sin costo</div>
              <div style={checkLineStyle}>✓ Enfoque práctico para pequeñas empresas</div>
            </div>

            <div style={ctaButtonsStyle}>
              <a href={requestMailLink} style={primaryLinkStyle}>
                Solicitar evaluación
              </a>

              <a href="#contacto" style={secondaryLinkStyle}>
                Ver contacto
              </a>
            </div>
          </div>

          <div style={evaluationPanelStyle}>
            <div style={panelTopLineStyle}>
              <span style={statusDotStyle} />
              Diagnóstico inicial
            </div>

            <h3 style={panelTitleStyle}>AxiomAI Review</h3>

            <p style={panelTextStyle}>
              Cuéntanos qué parte de tu negocio quieres mejorar y te orientamos
              con una primera ruta clara.
            </p>

            <div style={panelBoxStyle}>
              <span style={panelLabelStyle}>Enfoque</span>
              Automatización • IA • Web • Organización digital
            </div>

            <div style={panelBoxStyle}>
              <span style={panelLabelStyle}>Correo de solicitudes</span>
              {requestEmail}
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" style={contactSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>CONTACTO</p>
          <h2 style={sectionTitleStyle}>Hablemos de tu próximo sistema.</h2>
          <p style={sectionTextStyle}>
            Escríbenos para evaluar tu idea, tu proceso actual o la página web
            que necesitas para tu negocio.
          </p>
        </div>

        <div style={contactGridStyle}>
          <div className="axiom-contact-card">
            <p style={contactLabelStyle}>Correo</p>
            <a href={requestMailLink} style={contactTitleStyle}>
              {requestEmail}
            </a>
            <p style={contactTextStyle}>Solicitudes, evaluaciones y propuestas.</p>
          </div>

          <div className="axiom-contact-card">
            <p style={contactLabelStyle}>Horario</p>
            <h3 style={contactTitleStyle}>Servicio 24/7</h3>
            <p style={contactTextStyle}>Recibimos solicitudes en cualquier momento.</p>
          </div>

          <div className="axiom-contact-card">
            <p style={contactLabelStyle}>Especialidad</p>
            <h3 style={contactTitleStyle}>IA y automatización</h3>
            <p style={contactTextStyle}>
              Soluciones prácticas para negocios que quieren modernizarse.
            </p>
          </div>
        </div>
      </section>

      <footer style={footerStyle}>
        <div style={footerInfoStyle}>
          © 2026 AxiomAI Solutions. Todos los derechos reservados.
        </div>

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
    "radial-gradient(circle at top, rgba(37, 99, 235, 0.26), transparent 34%), linear-gradient(180deg, #020617 0%, #030712 45%, #000 100%)",
  color: "white",
  overflowX: "hidden",
};

const headerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "24px",
  padding: "22px clamp(18px, 5vw, 70px)",
  background: "rgba(2, 6, 23, 0.76)",
  backdropFilter: "blur(18px)",
  borderBottom: "1px solid rgba(125, 211, 252, 0.12)",
};

const brandStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 950,
  letterSpacing: "-0.3px",
  color: "white",
};

const navStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
};

const navLinkStyle: CSSProperties = {
  color: "#bfdbfe",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 750,
};

const heroStyle: CSSProperties = {
  position: "relative",
  minHeight: "calc(100vh - 82px)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "80px 18px 90px",
};

const glowOrbStyle: CSSProperties = {
  position: "absolute",
  width: "520px",
  height: "520px",
  borderRadius: "999px",
  background: "rgba(37, 99, 235, 0.24)",
  filter: "blur(80px)",
  top: "12%",
  left: "50%",
  transform: "translateX(-50%)",
};

const logoWrapStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "min(360px, 76vw)",
  marginBottom: "20px",
};

const pillStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  margin: "0 0 18px",
  padding: "10px 18px",
  borderRadius: "999px",
  color: "#bae6fd",
  background: "rgba(14, 165, 233, 0.12)",
  border: "1px solid rgba(125, 211, 252, 0.22)",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "1.8px",
};

const titleStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  margin: 0,
  fontSize: "clamp(62px, 12vw, 150px)",
  lineHeight: 0.92,
  fontWeight: 1000,
  letterSpacing: "-6px",
  background: "linear-gradient(180deg, #ffffff, #7dd3fc 58%, #2563eb)",
  WebkitBackgroundClip: "text",
  color: "transparent",
  textShadow: "0 0 80px rgba(37, 99, 235, 0.38)",
};

const subtitleStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  margin: "20px 0 0",
  fontSize: "clamp(26px, 4vw, 54px)",
  lineHeight: 1.08,
  fontWeight: 950,
  letterSpacing: "-1.8px",
};

const descriptionStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: "820px",
  margin: "22px auto 0",
  color: "#c7d2fe",
  fontSize: "19px",
  lineHeight: 1.7,
};

const buttonAreaStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  marginTop: "38px",
};

const heroBadgesStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "34px",
};

const badgeStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: "999px",
  border: "1px solid rgba(147, 197, 253, 0.18)",
  background: "rgba(2, 6, 23, 0.56)",
  color: "#dbeafe",
  fontSize: "14px",
  fontWeight: 800,
};

const servicesSectionStyle: CSSProperties = {
  padding: "100px clamp(18px, 5vw, 70px)",
};

const servicesNoteStyle: CSSProperties = {
  maxWidth: "860px",
  margin: "32px auto 0",
  textAlign: "center",
  color: "#bfdbfe",
  fontSize: "17px",
  lineHeight: 1.7,
};

const processSectionStyle: CSSProperties = {
  padding: "100px clamp(18px, 5vw, 70px)",
  background: "rgba(2, 6, 23, 0.42)",
  borderTop: "1px solid rgba(125, 211, 252, 0.08)",
  borderBottom: "1px solid rgba(125, 211, 252, 0.08)",
};

const evaluationSectionStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  padding: "110px clamp(18px, 5vw, 70px)",
};

const evaluationGlowStyle: CSSProperties = {
  position: "absolute",
  width: "420px",
  height: "420px",
  borderRadius: "999px",
  background: "rgba(56, 189, 248, 0.16)",
  filter: "blur(90px)",
  right: "-120px",
  top: "80px",
};

const evaluationGridStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: "1120px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: "30px",
  alignItems: "center",
};

const evaluationTextStyle: CSSProperties = {
  minWidth: 0,
};

const evaluationTitleStyle: CSSProperties = {
  margin: "14px 0 0",
  color: "white",
  fontSize: "clamp(34px, 5vw, 64px)",
  lineHeight: 1.02,
  fontWeight: 980,
  letterSpacing: "-2px",
};

const evaluationParagraphStyle: CSSProperties = {
  margin: "22px 0 0",
  color: "#c7d2fe",
  fontSize: "18px",
  lineHeight: 1.75,
  maxWidth: "760px",
};

const evaluationListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginTop: "26px",
};

const checkLineStyle: CSSProperties = {
  color: "#e0f2fe",
  fontSize: "16px",
  fontWeight: 800,
};

const ctaButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "32px",
};

const primaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "15px 22px",
  borderRadius: "999px",
  textDecoration: "none",
  color: "white",
  fontWeight: 950,
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  boxShadow: "0 0 30px rgba(56, 189, 248, 0.32)",
};

const secondaryLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "15px 22px",
  borderRadius: "999px",
  textDecoration: "none",
  color: "#dbeafe",
  fontWeight: 900,
  background: "rgba(2, 6, 23, 0.58)",
  border: "1px solid rgba(125, 211, 252, 0.22)",
};

const evaluationPanelStyle: CSSProperties = {
  border: "1px solid rgba(125, 211, 252, 0.22)",
  borderRadius: "34px",
  padding: "30px",
  background:
    "linear-gradient(180deg, rgba(15, 23, 42, 0.86), rgba(2, 6, 23, 0.92))",
  boxShadow: "0 28px 100px rgba(0, 0, 0, 0.38)",
};

const panelTopLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#bae6fd",
  fontSize: "13px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "1.2px",
};

const statusDotStyle: CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#22c55e",
  boxShadow: "0 0 18px rgba(34, 197, 94, 0.72)",
};

const panelTitleStyle: CSSProperties = {
  margin: "24px 0 0",
  color: "white",
  fontSize: "34px",
  fontWeight: 950,
  letterSpacing: "-1px",
};

const panelTextStyle: CSSProperties = {
  margin: "14px 0 0",
  color: "#bfdbfe",
  fontSize: "16px",
  lineHeight: 1.7,
};

const panelBoxStyle: CSSProperties = {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "22px",
  background: "rgba(2, 6, 23, 0.62)",
  border: "1px solid rgba(125, 211, 252, 0.16)",
  color: "#dbeafe",
  fontSize: "15px",
  lineHeight: 1.6,
};

const panelLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#7dd3fc",
  fontSize: "12px",
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const contactSectionStyle: CSSProperties = {
  padding: "100px clamp(18px, 5vw, 70px)",
  background: "rgba(2, 6, 23, 0.42)",
};

const contactGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "18px",
  maxWidth: "1120px",
  margin: "34px auto 0",
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

const sectionHeaderStyle: CSSProperties = {
  maxWidth: "880px",
  margin: "0 auto",
  textAlign: "center",
};

const sectionLabelStyle: CSSProperties = {
  margin: 0,
  color: "#7dd3fc",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "1.7px",
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
  margin: "18px auto 0",
  color: "#c7d2fe",
  fontSize: "18px",
  lineHeight: 1.7,
  maxWidth: "760px",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
  padding: "32px clamp(18px, 5vw, 70px)",
  borderTop: "1px solid rgba(125, 211, 252, 0.12)",
  background: "#020617",
};

const footerInfoStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: "14px",
};

const footerLinkStyle: CSSProperties = {
  color: "#7dd3fc",
  fontSize: "14px",
  fontWeight: 850,
  textDecoration: "none",
};