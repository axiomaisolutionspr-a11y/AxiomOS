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

            .axiom-process-shell {
              max-width: 1160px;
              margin: 0 auto;
              position: relative;
            }

            .axiom-process-line {
              position: absolute;
              left: 50%;
              top: 18px;
              bottom: 18px;
              width: 1px;
              background: linear-gradient(
                180deg,
                transparent,
                rgba(56, 189, 248, 0.75),
                rgba(37, 99, 235, 0.45),
                transparent
              );
              box-shadow: 0 0 28px rgba(56, 189, 248, 0.45);
              transform: translateX(-50%);
            }

            .axiom-process-step {
              position: relative;
              display: grid;
              grid-template-columns: 1fr 92px 1fr;
              gap: 28px;
              align-items: center;
              margin-bottom: 34px;
            }

            .axiom-process-card {
              position: relative;
              min-height: 190px;
              padding: 30px;
              border-radius: 30px;
              background:
                linear-gradient(145deg, rgba(15,23,42,0.92), rgba(14,116,144,0.14));
              border: 1px solid rgba(125, 211, 252, 0.24);
              box-shadow:
                0 24px 70px rgba(2, 6, 23, 0.45),
                inset 0 1px 0 rgba(255,255,255,0.08);
              overflow: hidden;
            }

            .axiom-process-card::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                radial-gradient(circle at top right, rgba(56,189,248,0.2), transparent 32%),
                linear-gradient(135deg, rgba(255,255,255,0.06), transparent 34%);
              pointer-events: none;
            }

            .axiom-process-card h3 {
              position: relative;
              z-index: 2;
              margin: 0 0 12px;
              font-size: 24px;
              color: white;
              letter-spacing: -0.5px;
            }

            .axiom-process-card p {
              position: relative;
              z-index: 2;
              margin: 0;
              color: #c7ddff;
              line-height: 1.7;
              font-size: 16px;
            }

            .axiom-process-orb {
              position: relative;
              z-index: 3;
              width: 92px;
              height: 92px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background:
                radial-gradient(circle at 30% 25%, #ffffff, #67e8f9 22%, #2563eb 68%, #071a3a 100%);
              border: 1px solid rgba(186, 230, 253, 0.66);
              box-shadow:
                0 0 34px rgba(56, 189, 248, 0.58),
                0 24px 65px rgba(37, 99, 235, 0.38);
              color: white;
              font-weight: 950;
              letter-spacing: 2px;
            }

            .axiom-process-meta {
              color: #38bdf8;
              font-size: 12px;
              font-weight: 900;
              letter-spacing: 4px;
              margin-bottom: 12px;
              position: relative;
              z-index: 2;
            }

            .axiom-process-empty {
              min-height: 1px;
            }

            .axiom-metric-strip {
              max-width: 1060px;
              margin: 54px auto 0;
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 18px;
            }

            .axiom-metric {
              padding: 24px;
              border-radius: 26px;
              text-align: center;
              background: rgba(2, 6, 23, 0.52);
              border: 1px solid rgba(125, 211, 252, 0.2);
              box-shadow: 0 0 38px rgba(37, 99, 235, 0.18);
            }

            .axiom-metric strong {
              display: block;
              color: white;
              font-size: 24px;
              margin-bottom: 8px;
            }

            .axiom-metric span {
              color: #bfdbfe;
              font-size: 14px;
              line-height: 1.5;
            }

            .axiom-contact-card {
              position: relative;
              padding: 30px;
              border-radius: 30px;
              background:
                linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(14, 116, 144, 0.16));
              border: 1px solid rgba(125, 211, 252, 0.24);
              box-shadow:
                0 24px 70px rgba(2, 6, 23, 0.42),
                inset 0 1px 0 rgba(255,255,255,0.08);
              overflow: hidden;
            }

            .axiom-contact-card::before {
              content: "";
              position: absolute;
              inset: 0;
              background:
                radial-gradient(circle at top right, rgba(56,189,248,0.22), transparent 34%),
                linear-gradient(135deg, rgba(255,255,255,0.06), transparent 40%);
              pointer-events: none;
            }

            .axiom-contact-card > * {
              position: relative;
              z-index: 2;
            }

            .axiom-contact-link {
              color: #7dd3fc;
              text-decoration: none;
              font-weight: 900;
              word-break: break-word;
            }

            .axiom-contact-link:hover {
              color: white;
              text-shadow: 0 0 16px rgba(56,189,248,0.75);
            }

            @media (max-width: 980px) {
              .axiom-service-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }

              .axiom-process-line {
                left: 46px;
              }

              .axiom-process-step {
                grid-template-columns: 92px 1fr;
                gap: 22px;
              }

              .axiom-process-step .axiom-process-empty {
                display: none;
              }

              .axiom-process-step:nth-child(even) .axiom-process-orb {
                grid-column: 1;
                grid-row: 1;
              }

              .axiom-process-step:nth-child(even) .axiom-process-card {
                grid-column: 2;
                grid-row: 1;
              }

              .axiom-metric-strip {
                grid-template-columns: 1fr;
              }
            }

            @media (max-width: 640px) {
              .axiom-service-grid {
                grid-template-columns: 1fr;
              }

              .axiom-process-step {
                grid-template-columns: 1fr;
              }

              .axiom-process-line {
                display: none;
              }

              .axiom-process-orb {
                width: 72px;
                height: 72px;
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

      <section id="proceso" style={processSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>PROCESO EJECUTIVO</p>

          <h2 style={sectionTitleStyle}>
            Cómo convertimos una idea en un sistema inteligente
          </h2>

          <p style={sectionTextStyle}>
            Nuestro proceso está diseñado para que el negocio entienda el valor
            rápido, vea resultados claros y pueda crecer sin perder control.
          </p>
        </div>

        <div className="axiom-process-shell">
          <div className="axiom-process-line" />

          <div className="axiom-process-step">
            <div className="axiom-process-card">
              <div className="axiom-process-meta">DIAGNÓSTICO</div>
              <h3>Evaluamos tu operación</h3>
              <p>
                Identificamos tareas repetitivas, puntos lentos, oportunidades
                de automatización y áreas donde la inteligencia artificial puede
                generar impacto inmediato.
              </p>
            </div>

            <div className="axiom-process-orb">01</div>

            <div className="axiom-process-empty" />
          </div>

          <div className="axiom-process-step">
            <div className="axiom-process-empty" />

            <div className="axiom-process-orb">02</div>

            <div className="axiom-process-card">
              <div className="axiom-process-meta">DISEÑO</div>
              <h3>Diseñamos la solución</h3>
              <p>
                Creamos una arquitectura clara: qué se automatiza primero, qué
                herramientas se conectan y cómo el sistema debe trabajar para tu
                negocio.
              </p>
            </div>
          </div>

          <div className="axiom-process-step">
            <div className="axiom-process-card">
              <div className="axiom-process-meta">CONSTRUCCIÓN</div>
              <h3>Desarrollamos AxiomOS</h3>
              <p>
                Construimos páginas, paneles, flujos, asistentes y conexiones
                inteligentes con una experiencia moderna, estable y fácil de
                usar.
              </p>
            </div>

            <div className="axiom-process-orb">03</div>

            <div className="axiom-process-empty" />
          </div>

          <div className="axiom-process-step">
            <div className="axiom-process-empty" />

            <div className="axiom-process-orb">04</div>

            <div className="axiom-process-card">
              <div className="axiom-process-meta">OPTIMIZACIÓN</div>
              <h3>Medimos y mejoramos</h3>
              <p>
                Revisamos resultados, ajustamos procesos y seguimos mejorando el
                sistema para ahorrar más tiempo, responder mejor y escalar.
              </p>
            </div>
          </div>
        </div>

        <div className="axiom-metric-strip">
          <div className="axiom-metric">
            <strong>Menos trabajo manual</strong>
            <span>Automatizaciones enfocadas en tareas repetitivas.</span>
          </div>

          <div className="axiom-metric">
            <strong>Más velocidad</strong>
            <span>Respuestas, procesos y decisiones más rápidas.</span>
          </div>

          <div className="axiom-metric">
            <strong>Más control</strong>
            <span>Información organizada en sistemas claros y modernos.</span>
          </div>
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
              <a href="mailto:axiomai@outlook.com" style={primaryLinkStyle}>
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
              AxiomAI Assessment
            </div>

            <h3 style={panelTitleStyle}>Diagnóstico inicial</h3>

            <p style={panelTextStyle}>
              Te ayudamos a identificar qué parte de tu negocio conviene
              automatizar primero para obtener resultados rápidos y medibles.
            </p>

            <div style={panelBoxStyle}>
              <span style={panelLabelStyle}>Prioridad</span>
              <strong>Reducir trabajo manual</strong>
            </div>

            <div style={panelBoxStyle}>
              <span style={panelLabelStyle}>Objetivo</span>
              <strong>Mejor servicio + más eficiencia</strong>
            </div>

            <div style={panelBoxStyle}>
              <span style={panelLabelStyle}>Resultado</span>
              <strong>Plan inicial claro</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="contacto" style={contactSectionStyle}>
        <div style={sectionHeaderStyle}>
          <p style={sectionLabelStyle}>CONTACTO</p>

          <h2 style={sectionTitleStyle}>Hablemos de tu próximo sistema</h2>

          <p style={sectionTextStyle}>
            Escríbenos con una idea, problema o proceso que quieras mejorar.
            Nosotros te ayudamos a convertirlo en una solución inteligente.
          </p>
        </div>

        <div style={contactGridStyle}>
          <div className="axiom-contact-card">
            <p style={contactLabelStyle}>Correo principal</p>
            <h3 style={contactTitleStyle}>AxiomAI Solutions</h3>
            <a href="mailto:axiomai@outlook.com" className="axiom-contact-link">
              axiomai@outlook.com
            </a>
          </div>

          <div className="axiom-contact-card">
            <p style={contactLabelStyle}>Disponibilidad</p>
            <h3 style={contactTitleStyle}>Servicio 24/7</h3>
            <p style={contactTextStyle}>
              Podemos preparar soluciones para negocios que necesitan responder,
              organizarse y operar fuera del horario tradicional.
            </p>
          </div>

          <div className="axiom-contact-card">
            <p style={contactLabelStyle}>Primera reunión</p>
            <h3 style={contactTitleStyle}>Evaluación inicial gratuita</h3>
            <p style={contactTextStyle}>
              Revisamos tu necesidad y te recomendamos un primer paso claro,
              realista y útil para tu empresa.
            </p>
          </div>
        </div>
      </section>

      <footer style={footerStyle}>
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

          <a href="mailto:axiomai@outlook.com" style={footerLinkStyle}>
            axiomai@outlook.com
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

const processSectionStyle: CSSProperties = {
  position: "relative",
  padding: "110px 6%",
  background:
    "radial-gradient(circle at top right, rgba(37,99,235,0.18), transparent 34%), linear-gradient(180deg, rgba(2,6,23,0.78), rgba(15,23,42,0.9))",
  borderTop: "1px solid rgba(125, 211, 252, 0.16)",
  overflow: "hidden",
};

const evaluationSectionStyle: CSSProperties = {
  position: "relative",
  padding: "115px 6%",
  background:
    "radial-gradient(circle at center, rgba(56,189,248,0.16), transparent 36%), linear-gradient(180deg, rgba(15,23,42,0.9), rgba(2,6,23,0.86))",
  borderTop: "1px solid rgba(125, 211, 252, 0.16)",
  overflow: "hidden",
};

const evaluationGlowStyle: CSSProperties = {
  position: "absolute",
  right: "-180px",
  top: "80px",
  width: "520px",
  height: "520px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(56,189,248,0.22), rgba(37,99,235,0.12), transparent 70%)",
  filter: "blur(8px)",
};

const evaluationGridStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: "1160px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: "34px",
  alignItems: "center",
};

const evaluationTextStyle: CSSProperties = {
  padding: "10px 0",
};

const evaluationTitleStyle: CSSProperties = {
  fontSize: "48px",
  lineHeight: 1.05,
  margin: "0 0 22px",
  letterSpacing: "-1.5px",
  textShadow: "0 0 34px rgba(56, 189, 248, 0.24)",
};

const evaluationParagraphStyle: CSSProperties = {
  color: "#c7ddff",
  fontSize: "18px",
  lineHeight: 1.75,
  maxWidth: "700px",
  margin: "0 0 28px",
};

const evaluationListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  marginBottom: "30px",
};

const checkLineStyle: CSSProperties = {
  padding: "13px 16px",
  borderRadius: "18px",
  background: "rgba(2, 6, 23, 0.42)",
  border: "1px solid rgba(125, 211, 252, 0.18)",
  color: "#dbeafe",
  fontWeight: 800,
};

const evaluationPanelStyle: CSSProperties = {
  borderRadius: "34px",
  padding: "34px",
  background:
    "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,64,175,0.24))",
  border: "1px solid rgba(125, 211, 252, 0.3)",
  boxShadow:
    "0 30px 90px rgba(2, 6, 23, 0.45), 0 0 48px rgba(56,189,248,0.16)",
};

const panelTopLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#bae6fd",
  fontSize: "13px",
  fontWeight: 900,
  letterSpacing: "3px",
  textTransform: "uppercase",
  marginBottom: "22px",
};

const statusDotStyle: CSSProperties = {
  width: "11px",
  height: "11px",
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 16px #22c55e",
};

const panelTitleStyle: CSSProperties = {
  fontSize: "30px",
  margin: "0 0 14px",
  color: "white",
};

const panelTextStyle: CSSProperties = {
  color: "#c7ddff",
  lineHeight: 1.7,
  marginBottom: "24px",
};

const panelBoxStyle: CSSProperties = {
  padding: "18px",
  borderRadius: "20px",
  background: "rgba(2, 6, 23, 0.5)",
  border: "1px solid rgba(125, 211, 252, 0.2)",
  marginTop: "14px",
};

const panelLabelStyle: CSSProperties = {
  display: "block",
  color: "#38bdf8",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "3px",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const contactSectionStyle: CSSProperties = {
  padding: "105px 6%",
  background:
    "radial-gradient(circle at bottom left, rgba(56,189,248,0.14), transparent 34%), linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.96))",
  borderTop: "1px solid rgba(125, 211, 252, 0.16)",
};

const contactGridStyle: CSSProperties = {
  maxWidth: "1160px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "24px",
};

const contactLabelStyle: CSSProperties = {
  color: "#38bdf8",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "4px",
  textTransform: "uppercase",
  marginBottom: "12px",
};

const contactTitleStyle: CSSProperties = {
  color: "white",
  fontSize: "24px",
  margin: "0 0 14px",
};

const contactTextStyle: CSSProperties = {
  color: "#c7ddff",
  lineHeight: 1.7,
  margin: 0,
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

const ctaButtonsStyle: CSSProperties = {
  display: "flex",
  gap: "14px",
  justifyContent: "flex-start",
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
  background: "rgba(2, 6, 23, 0.98)",
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