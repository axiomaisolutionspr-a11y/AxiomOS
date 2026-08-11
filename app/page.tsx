"use client";

import { useEffect, useState } from "react";
import BrainButton from "./components/BrainButton";
import Logo from "./components/Logo";

type BrainCase = {
  source?: string;
  query?: string;
  analysis?: string;
  createdAt?: string;
};

const serviceCardStyle = {
  padding: "28px",
  border: "1px solid #173b66",
  borderRadius: "18px",
  background: "rgba(10, 25, 48, 0.65)",
};

const automationCardStyle = {
  padding: "24px",
  border: "1px solid rgba(83, 183, 255, 0.22)",
  borderRadius: "16px",
  background: "rgba(5, 14, 28, 0.78)",
  textAlign: "left" as const,
};

const inputStyle = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: "12px",
  border: "1px solid #285680",
  background: "rgba(4, 12, 24, 0.9)",
  color: "white",
  fontSize: "16px",
  outline: "none",
  boxSizing: "border-box" as const,
};

export default function Home() {
  const [evaluationMessage, setEvaluationMessage] = useState("");
  const [brainQuery, setBrainQuery] = useState("");
  const [brainAnalysis, setBrainAnalysis] = useState("");
  const [cameFromBrain, setCameFromBrain] = useState(false);

  useEffect(() => {
    try {
      const storedCase = sessionStorage.getItem("axiomai_brain_case");

      if (!storedCase) {
        return;
      }

      const parsedCase = JSON.parse(storedCase) as BrainCase;

      const query =
        typeof parsedCase.query === "string"
          ? parsedCase.query.trim()
          : "";

      const analysis =
        typeof parsedCase.analysis === "string"
          ? parsedCase.analysis.trim()
          : "";

      if (!query && !analysis) {
        return;
      }

      setBrainQuery(query);
      setBrainAnalysis(analysis);
      setCameFromBrain(true);

      if (query) {
        setEvaluationMessage(
          `Quiero implementar una solución para este caso analizado por AxiomOS Brain:\n\n${query}`
        );
      } else {
        setEvaluationMessage(
          "Quiero implementar una solución basada en el análisis realizado por AxiomOS Brain."
        );
      }

      window.setTimeout(() => {
        document.getElementById("evaluacion")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 250);
    } catch (error) {
      console.error(
        "No se pudo recuperar el análisis de AxiomOS Brain:",
        error
      );
    }
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #102040 0%, #050914 45%, #000000 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        overflowX: "hidden",
      }}
    >
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 20px 80px",
        }}
      >
        <Logo />

        <p
          style={{
            marginTop: "24px",
            marginBottom: "8px",
            fontSize: "18px",
            letterSpacing: "4px",
            color: "#53b7ff",
          }}
        >
          AXIOM AI
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(42px, 8vw, 82px)",
            fontWeight: 800,
            letterSpacing: "-2px",
          }}
        >
          AxiomOS
        </h1>

        <h2
          style={{
            marginTop: "16px",
            marginBottom: "12px",
            fontSize: "clamp(22px, 4vw, 38px)",
            fontWeight: 500,
          }}
        >
          Soluciones Inteligentes para Empresas
        </h2>

        <p
          style={{
            maxWidth: "720px",
            margin: "0 auto 30px",
            color: "#b9c6d8",
            fontSize: "18px",
            lineHeight: 1.7,
          }}
        >
          Automatización, inteligencia artificial y desarrollo de software
          diseñados para transformar la manera en que opera tu negocio.
        </p>

        <BrainButton />

        <p
          style={{
            marginTop: "24px",
            fontSize: "15px",
            color: "#7f91aa",
          }}
        >
          Evaluación inicial gratuita • Servicio 24/7
        </p>

        <div
          style={{
            marginTop: "70px",
            width: "100%",
            maxWidth: "1100px",
          }}
        >
          <h2 style={{ fontSize: "32px", marginBottom: "12px" }}>
            Soluciones para hacer crecer tu negocio
          </h2>

          <p
            style={{
              color: "#9fb0c7",
              fontSize: "17px",
              marginBottom: "35px",
            }}
          >
            Tecnología inteligente diseñada para ahorrar tiempo, reducir costos
            y mejorar la atención a tus clientes.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "20px",
            }}
          >
            <div style={serviceCardStyle}>
              <h3>Automatización</h3>
              <p>
                Automatizamos tareas y procesos repetitivos de tu empresa.
              </p>
            </div>

            <div style={serviceCardStyle}>
              <h3>Inteligencia Artificial</h3>
              <p>
                Soluciones de IA adaptadas a las necesidades de tu negocio.
              </p>
            </div>

            <div style={serviceCardStyle}>
              <h3>Software Empresarial</h3>
              <p>
                Desarrollamos herramientas digitales hechas para tu empresa.
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "90px",
            width: "100%",
            maxWidth: "1100px",
          }}
        >
          <p
            style={{
              marginBottom: "8px",
              fontSize: "14px",
              letterSpacing: "3px",
              color: "#53b7ff",
              fontWeight: 700,
            }}
          >
            AXIOM AUTOMATION
          </p>

          <h2
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              marginBottom: "14px",
            }}
          >
            ¿Qué podemos automatizar?
          </h2>

          <p
            style={{
              maxWidth: "760px",
              margin: "0 auto 40px",
              color: "#9fb0c7",
              fontSize: "17px",
              lineHeight: 1.7,
            }}
          >
            Analizamos cómo funciona tu empresa y creamos soluciones que
            trabajan automáticamente para que puedas concentrarte en hacer
            crecer el negocio.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Atención al cliente
              </h3>
              <p
                style={{
                  color: "#b9c6d8",
                  lineHeight: 1.6,
                }}
              >
                Respuestas automáticas a preguntas frecuentes,
                solicitudes, horarios, servicios y consultas de clientes.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                WhatsApp y mensajería
              </h3>
              <p
                style={{
                  color: "#b9c6d8",
                  lineHeight: 1.6,
                }}
              >
                Sistemas para responder mensajes, recopilar información y
                dirigir cada cliente al servicio correcto.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Órdenes y solicitudes
              </h3>
              <p
                style={{
                  color: "#b9c6d8",
                  lineHeight: 1.6,
                }}
              >
                Recibe pedidos, solicitudes de servicios y datos de
                clientes desde tu página web de forma organizada.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Seguimiento de clientes
              </h3>
              <p
                style={{
                  color: "#b9c6d8",
                  lineHeight: 1.6,
                }}
              >
                Automatiza recordatorios, seguimiento de prospectos y
                comunicaciones posteriores a una venta o servicio.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Tareas administrativas
              </h3>
              <p
                style={{
                  color: "#b9c6d8",
                  lineHeight: 1.6,
                }}
              >
                Reduce trabajo manual en procesos internos, organización
                de información y tareas repetitivas.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Soluciones personalizadas
              </h3>
              <p
                style={{
                  color: "#b9c6d8",
                  lineHeight: 1.6,
                }}
              >
                Si tu negocio tiene un proceso particular, podemos diseñar
                una solución tecnológica específicamente para él.
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "90px",
            width: "100%",
            maxWidth: "900px",
            padding: "45px 25px",
            borderRadius: "22px",
            border: "1px solid rgba(83, 183, 255, 0.3)",
            background:
              "linear-gradient(135deg, rgba(16, 42, 78, 0.8), rgba(4, 11, 22, 0.9))",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "32px",
            }}
          >
            Tu negocio puede trabajar de forma más inteligente
          </h2>

          <p
            style={{
              color: "#b9c6d8",
              fontSize: "17px",
              lineHeight: 1.7,
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            Cuéntanos qué tareas consumen más tiempo en tu empresa. AxiomAI
            Solutions puede ayudarte a identificar qué procesos se pueden
            automatizar y qué solución tecnológica tiene más sentido para tu
            negocio.
          </p>
        </div>

        <div
          id="evaluacion"
          style={{
            marginTop: "90px",
            width: "100%",
            maxWidth: "760px",
            scrollMarginTop: "30px",
          }}
        >
          <p
            style={{
              color: "#53b7ff",
              fontWeight: 700,
              letterSpacing: "3px",
              fontSize: "14px",
            }}
          >
            COMIENZA AQUÍ
          </p>

          <h2
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              marginBottom: "12px",
            }}
          >
            Solicita tu evaluación gratuita
          </h2>

          <p
            style={{
              color: "#9fb0c7",
              fontSize: "17px",
              lineHeight: 1.7,
              marginBottom: cameFromBrain ? "20px" : "35px",
            }}
          >
            Cuéntanos brevemente sobre tu negocio y qué necesitas mejorar.
            Evaluaremos tu caso para identificar oportunidades de
            automatización e inteligencia artificial.
          </p>

          {cameFromBrain && (
            <div
              style={{
                marginBottom: "22px",
                padding: "18px 20px",
                borderRadius: "16px",
                border:
                  "1px solid rgba(71, 210, 255, 0.38)",
                background:
                  "linear-gradient(135deg, rgba(17, 73, 125, 0.52), rgba(5, 27, 52, 0.72))",
                textAlign: "left",
                boxShadow:
                  "0 0 28px rgba(39, 171, 255, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background:
                      "linear-gradient(135deg, #147df5, #35d4ff)",
                    fontSize: "17px",
                  }}
                >
                  🧠
                </div>

                <div>
                  <div
                    style={{
                      color: "#62cbff",
                      fontSize: "11px",
                      letterSpacing: "2px",
                      fontWeight: 800,
                    }}
                  >
                    CASO RECIBIDO DE AXIOMOS BRAIN
                  </div>

                  <div
                    style={{
                      color: "#ffffff",
                      fontWeight: 800,
                      marginTop: "3px",
                    }}
                  >
                    Tu análisis ya está conectado con esta evaluación.
                  </div>
                </div>
              </div>

              <p
                style={{
                  color: "#aac3d7",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  margin: "12px 0 0",
                }}
              >
                No necesitas volver a explicar todo desde cero. Revisa el
                mensaje precargado, añade tus datos y envía la solicitud.
              </p>
            </div>
          )}

          <form
            action="https://formsubmit.co/axiomaisolutionspr@gmail.com"
            method="POST"
            style={{
              display: "grid",
              gap: "18px",
              padding: "32px",
              borderRadius: "22px",
              border: "1px solid rgba(83, 183, 255, 0.3)",
              background: "rgba(5, 15, 30, 0.88)",
              textAlign: "left",
            }}
          >
            <input
              type="hidden"
              name="_subject"
              value={
                cameFromBrain
                  ? "Nuevo caso desde AxiomOS Brain - AxiomAI Solutions"
                  : "Nueva solicitud - AxiomAI Solutions"
              }
            />

            <input
              type="hidden"
              name="_template"
              value="table"
            />

            <input
              type="hidden"
              name="_next"
              value="https://axiomaisolutions.org/gracias"
            />

            <input
              type="hidden"
              name="_captcha"
              value="false"
            />

            <input
              type="text"
              name="_honey"
              style={{
                display: "none",
              }}
              tabIndex={-1}
              autoComplete="off"
            />

            {cameFromBrain && (
              <>
                <input
                  type="hidden"
                  name="origen"
                  value="AxiomOS Brain"
                />

                <input
                  type="hidden"
                  name="consulta_brain"
                  value={brainQuery}
                />

                <input
                  type="hidden"
                  name="analisis_brain"
                  value={brainAnalysis}
                />
              </>
            )}

            <div>
              <label>Nombre</label>

              <input
                required
                name="nombre"
                type="text"
                placeholder="Tu nombre"
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                }}
              />
            </div>

            <div>
              <label>Nombre del negocio</label>

              <input
                name="negocio"
                type="text"
                placeholder="Nombre de tu empresa o negocio"
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                }}
              />
            </div>

            <div>
              <label>Teléfono / WhatsApp</label>

              <input
                required
                name="telefono"
                type="tel"
                placeholder="Tu número de contacto"
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                }}
              />
            </div>

            <div>
              <label>Correo electrónico</label>

              <input
                required
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                }}
              />
            </div>

            <div>
              <label>
                ¿Qué necesitas automatizar o mejorar?
              </label>

              <textarea
                required
                name="mensaje"
                rows={7}
                value={evaluationMessage}
                onChange={(event) =>
                  setEvaluationMessage(event.target.value)
                }
                placeholder="Explícanos brevemente qué necesitas..."
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                  resize: "vertical",
                  fontFamily: "Arial, sans-serif",
                  lineHeight: 1.6,
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "8px",
                padding: "16px 24px",
                border: "none",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #1d7fff 0%, #42dfff 100%)",
                color: "white",
                fontSize: "17px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow:
                  "0 0 25px rgba(45, 151, 255, 0.35)",
              }}
            >
              {cameFromBrain
                ? "Enviar caso para evaluación"
                : "Solicitar evaluación gratuita"}
            </button>

            <p
              style={{
                textAlign: "center",
                color: "#71839c",
                fontSize: "13px",
                margin: 0,
              }}
            >
              Sin compromiso • Evaluación inicial gratuita
            </p>
          </form>
        </div>

        <footer
          style={{
            marginTop: "80px",
            paddingTop: "30px",
            borderTop:
              "1px solid rgba(255,255,255,0.08)",
            width: "100%",
            maxWidth: "1100px",
            color: "#71839c",
            fontSize: "14px",
          }}
        >
          © 2026 AxiomAI Solutions
        </footer>
      </section>
    </main>
  );
}