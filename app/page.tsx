"use client";

import { useState } from "react";
import BrainButton from "./components/BrainButton";
import Logo from "./components/Logo";

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

const demoCardStyle = {
  padding: "24px",
  border: "1px solid rgba(83, 183, 255, 0.28)",
  borderRadius: "18px",
  background:
    "linear-gradient(145deg, rgba(9, 28, 54, 0.9), rgba(4, 12, 24, 0.88))",
  textAlign: "left" as const,
  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.22)",
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

const selectStyle = {
  ...inputStyle,
  appearance: "none" as const,
};

type DiagnosticAnswers = {
  businessType: string;
  teamSize: string;
  biggestChallenge: string;
  repetitiveWork: string;
  customerMessages: string;
  digitalTools: string;
};

const initialAnswers: DiagnosticAnswers = {
  businessType: "",
  teamSize: "",
  biggestChallenge: "",
  repetitiveWork: "",
  customerMessages: "",
  digitalTools: "",
};

function buildDiagnostic(answers: DiagnosticAnswers) {
  const recommendations: string[] = [];

  if (
    answers.biggestChallenge === "mensajes" ||
    answers.customerMessages === "muchos"
  ) {
    recommendations.push(
      "Automatizar la atención inicial, preguntas frecuentes y clasificación de mensajes de clientes."
    );
  }

  if (
    answers.biggestChallenge === "seguimiento" ||
    answers.repetitiveWork === "alto"
  ) {
    recommendations.push(
      "Crear flujos automáticos para seguimiento de prospectos, recordatorios y tareas repetitivas."
    );
  }

  if (
    answers.biggestChallenge === "ordenes" ||
    answers.digitalTools === "basico"
  ) {
    recommendations.push(
      "Centralizar órdenes, solicitudes y datos de clientes en un sistema digital organizado."
    );
  }

  if (
    answers.biggestChallenge === "organizacion" ||
    answers.teamSize === "6-20" ||
    answers.teamSize === "21+"
  ) {
    recommendations.push(
      "Conectar procesos internos y herramientas para reducir trabajo manual y mejorar la coordinación."
    );
  }

  if (answers.digitalTools === "ninguno") {
    recommendations.push(
      "Comenzar con una base digital sencilla: presencia web profesional, captación de clientes y automatización esencial."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Realizar una evaluación personalizada para detectar el proceso con mayor potencial de ahorro de tiempo y costos."
    );
  }

  return recommendations.slice(0, 3);
}

export default function Home() {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(initialAnswers);
  const [diagnostic, setDiagnostic] = useState<string[]>([]);
  const [diagnosticReady, setDiagnosticReady] = useState(false);

  const updateAnswer = (field: keyof DiagnosticAnswers, value: string) => {
    setAnswers((current) => ({ ...current, [field]: value }));
    setDiagnosticReady(false);
  };

  const runDiagnostic = () => {
    const completed = Object.values(answers).every(Boolean);

    if (!completed) {
      setDiagnostic([
        "Completa las 6 preguntas para que AxiomOS pueda preparar tu diagnóstico inicial.",
      ]);
      setDiagnosticReady(false);
      return;
    }

    setDiagnostic(buildDiagnostic(answers));
    setDiagnosticReady(true);
  };

  const diagnosticText = diagnosticReady
    ? diagnostic.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "Diagnóstico no completado";

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
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "20px",
            }}
          >
            <div style={serviceCardStyle}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>⚙️</div>
              <h3>Automatización</h3>
              <p>Automatizamos tareas y procesos repetitivos de tu empresa.</p>
            </div>

            <div style={serviceCardStyle}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>🧠</div>
              <h3>Inteligencia Artificial</h3>
              <p>Soluciones de IA adaptadas a las necesidades de tu negocio.</p>
            </div>

            <div style={serviceCardStyle}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>🚀</div>
              <h3>Software Empresarial</h3>
              <p>Desarrollamos herramientas digitales hechas para tu empresa.</p>
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
            AXIOM EN ACCIÓN
          </p>

          <h2
            style={{
              fontSize: "clamp(30px, 5vw, 44px)",
              marginBottom: "14px",
            }}
          >
            Así puede trabajar la tecnología por ti
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
            No se trata solo de tener inteligencia artificial. Se trata de
            convertir tareas diarias en procesos más rápidos, organizados y
            útiles para tu negocio.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "18px",
            }}
          >
            <div style={demoCardStyle}>
              <div style={{ color: "#53b7ff", fontWeight: 800, fontSize: "13px" }}>
                01 • MENSAJERÍA
              </div>
              <h3 style={{ color: "#dff4ff" }}>Cliente escribe</h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.65 }}>
                El sistema recibe la consulta, identifica qué necesita el
                cliente y organiza la información para responder o continuar el
                proceso.
              </p>
            </div>

            <div style={demoCardStyle}>
              <div style={{ color: "#53b7ff", fontWeight: 800, fontSize: "13px" }}>
                02 • PROSPECTOS
              </div>
              <h3 style={{ color: "#dff4ff" }}>Solicitud recibida</h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.65 }}>
                Los datos del prospecto se recopilan de forma estructurada para
                facilitar evaluación, seguimiento y contacto comercial.
              </p>
            </div>

            <div style={demoCardStyle}>
              <div style={{ color: "#53b7ff", fontWeight: 800, fontSize: "13px" }}>
                03 • SEGUIMIENTO
              </div>
              <h3 style={{ color: "#dff4ff" }}>El proceso continúa</h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.65 }}>
                Recordatorios, comunicaciones y próximos pasos pueden
                automatizarse para reducir oportunidades perdidas.
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
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Atención al cliente
              </h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                Respuestas automáticas a preguntas frecuentes, solicitudes,
                horarios, servicios y consultas de clientes.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                WhatsApp y mensajería
              </h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                Sistemas para responder mensajes, recopilar información y
                dirigir cada cliente al servicio correcto.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Órdenes y solicitudes
              </h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                Recibe pedidos, solicitudes de servicios y datos de clientes
                desde tu página web de forma organizada.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Seguimiento de clientes
              </h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                Automatiza recordatorios, seguimiento de prospectos y
                comunicaciones posteriores a una venta o servicio.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Tareas administrativas
              </h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                Reduce trabajo manual en procesos internos, organización de
                información y tareas repetitivas.
              </p>
            </div>

            <div style={automationCardStyle}>
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                Soluciones personalizadas
              </h3>
              <p style={{ color: "#b9c6d8", lineHeight: 1.6 }}>
                Si tu negocio tiene un proceso particular, podemos diseñar una
                solución tecnológica específicamente para él.
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
          <p
            style={{
              color: "#53b7ff",
              fontWeight: 800,
              letterSpacing: "3px",
              fontSize: "13px",
              marginTop: 0,
            }}
          >
            DIAGNÓSTICO AXIOMOS
          </p>

          <h2 style={{ marginTop: "10px", fontSize: "32px" }}>
            Descubre qué puede automatizar tu negocio
          </h2>

          <p
            style={{
              color: "#b9c6d8",
              fontSize: "17px",
              lineHeight: 1.7,
              maxWidth: "700px",
              margin: "0 auto 30px",
            }}
          >
            Responde seis preguntas. AxiomOS preparará una evaluación inicial
            para mostrarte dónde puede haber oportunidades de ahorro de tiempo,
            mejor servicio y mayor organización.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
              textAlign: "left",
            }}
          >
            <div>
              <label>1. ¿Qué tipo de negocio tienes?</label>
              <select
                value={answers.businessType}
                onChange={(e) => updateAnswer("businessType", e.target.value)}
                style={{ ...selectStyle, marginTop: "8px" }}
              >
                <option value="" style={{ color: "black" }}>Selecciona una opción</option>
                <option value="servicios" style={{ color: "black" }}>Servicios profesionales</option>
                <option value="comercio" style={{ color: "black" }}>Comercio / ventas</option>
                <option value="restaurante" style={{ color: "black" }}>Restaurante / alimentos</option>
                <option value="salud" style={{ color: "black" }}>Salud / bienestar</option>
                <option value="construccion" style={{ color: "black" }}>Construcción / servicios técnicos</option>
                <option value="otro" style={{ color: "black" }}>Otro</option>
              </select>
            </div>

            <div>
              <label>2. ¿Cuántas personas trabajan en el negocio?</label>
              <select
                value={answers.teamSize}
                onChange={(e) => updateAnswer("teamSize", e.target.value)}
                style={{ ...selectStyle, marginTop: "8px" }}
              >
                <option value="" style={{ color: "black" }}>Selecciona una opción</option>
                <option value="1" style={{ color: "black" }}>Solo yo</option>
                <option value="2-5" style={{ color: "black" }}>2 a 5</option>
                <option value="6-20" style={{ color: "black" }}>6 a 20</option>
                <option value="21+" style={{ color: "black" }}>21 o más</option>
              </select>
            </div>

            <div>
              <label>3. ¿Cuál es tu mayor reto ahora mismo?</label>
              <select
                value={answers.biggestChallenge}
                onChange={(e) => updateAnswer("biggestChallenge", e.target.value)}
                style={{ ...selectStyle, marginTop: "8px" }}
              >
                <option value="" style={{ color: "black" }}>Selecciona una opción</option>
                <option value="mensajes" style={{ color: "black" }}>Responder mensajes</option>
                <option value="seguimiento" style={{ color: "black" }}>Dar seguimiento a clientes</option>
                <option value="ordenes" style={{ color: "black" }}>Manejar órdenes o solicitudes</option>
                <option value="organizacion" style={{ color: "black" }}>Organizar información y procesos</option>
                <option value="ventas" style={{ color: "black" }}>Conseguir más clientes / ventas</option>
              </select>
            </div>

            <div>
              <label>4. ¿Cuánto trabajo repetitivo haces manualmente?</label>
              <select
                value={answers.repetitiveWork}
                onChange={(e) => updateAnswer("repetitiveWork", e.target.value)}
                style={{ ...selectStyle, marginTop: "8px" }}
              >
                <option value="" style={{ color: "black" }}>Selecciona una opción</option>
                <option value="bajo" style={{ color: "black" }}>Muy poco</option>
                <option value="medio" style={{ color: "black" }}>Algo todos los días</option>
                <option value="alto" style={{ color: "black" }}>Mucho; consume bastante tiempo</option>
              </select>
            </div>

            <div>
              <label>5. ¿Recibes muchas consultas de clientes?</label>
              <select
                value={answers.customerMessages}
                onChange={(e) => updateAnswer("customerMessages", e.target.value)}
                style={{ ...selectStyle, marginTop: "8px" }}
              >
                <option value="" style={{ color: "black" }}>Selecciona una opción</option>
                <option value="pocos" style={{ color: "black" }}>Pocas</option>
                <option value="medio" style={{ color: "black" }}>Una cantidad moderada</option>
                <option value="muchos" style={{ color: "black" }}>Muchas durante el día</option>
              </select>
            </div>

            <div>
              <label>6. ¿Qué tan digitalizado está tu negocio?</label>
              <select
                value={answers.digitalTools}
                onChange={(e) => updateAnswer("digitalTools", e.target.value)}
                style={{ ...selectStyle, marginTop: "8px" }}
              >
                <option value="" style={{ color: "black" }}>Selecciona una opción</option>
                <option value="ninguno" style={{ color: "black" }}>Casi todo es manual</option>
                <option value="basico" style={{ color: "black" }}>Uso algunas herramientas</option>
                <option value="avanzado" style={{ color: "black" }}>Ya uso varios sistemas digitales</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={runDiagnostic}
            style={{
              marginTop: "28px",
              padding: "16px 26px",
              border: "1px solid rgba(99, 210, 255, 0.7)",
              borderRadius: "14px",
              background:
                "linear-gradient(135deg, #1168d7 0%, #19b8ee 100%)",
              color: "white",
              fontSize: "17px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(45, 151, 255, 0.3)",
            }}
          >
            🧠 Analizar mi negocio con AxiomOS
          </button>

          {diagnostic.length > 0 && (
            <div
              style={{
                marginTop: "28px",
                padding: "24px",
                borderRadius: "18px",
                border: diagnosticReady
                  ? "1px solid rgba(76, 216, 255, 0.5)"
                  : "1px solid rgba(255, 193, 7, 0.45)",
                background: "rgba(3, 12, 24, 0.72)",
                textAlign: "left",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#8fd4ff" }}>
                {diagnosticReady
                  ? "Tu diagnóstico inicial"
                  : "Falta información"}
              </h3>

              {diagnostic.map((item, index) => (
                <p
                  key={`${item}-${index}`}
                  style={{ color: "#d2deec", lineHeight: 1.65 }}
                >
                  {diagnosticReady ? `✓ ${item}` : item}
                </p>
              ))}

              {diagnosticReady && (
                <a
                  href="#evaluacion"
                  style={{
                    display: "inline-block",
                    marginTop: "8px",
                    color: "#74d2ff",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  Solicitar evaluación completa →
                </a>
              )}
            </div>
          )}
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
              marginBottom: "35px",
            }}
          >
            Cuéntanos brevemente sobre tu negocio. Revisaremos tu caso y las
            oportunidades detectadas para recomendarte los próximos pasos.
          </p>

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
              value="Nueva evaluación - AxiomAI Solutions"
            />
            <input type="hidden" name="_template" value="table" />
            <input
              type="hidden"
              name="_next"
              value="https://axiomaisolutions.org/gracias"
            />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="diagnostico_axiomos" value={diagnosticText} />
            <input type="hidden" name="tipo_de_negocio" value={answers.businessType} />
            <input type="hidden" name="tamano_del_equipo" value={answers.teamSize} />
            <input type="hidden" name="reto_principal" value={answers.biggestChallenge} />
            <input type="hidden" name="trabajo_repetitivo" value={answers.repetitiveWork} />
            <input type="hidden" name="volumen_de_mensajes" value={answers.customerMessages} />
            <input type="hidden" name="nivel_digital" value={answers.digitalTools} />

            <input
              type="text"
              name="_honey"
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <label>Nombre</label>
              <input
                required
                name="nombre"
                type="text"
                placeholder="Tu nombre"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>Nombre del negocio</label>
              <input
                name="negocio"
                type="text"
                placeholder="Nombre de tu empresa o negocio"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>Teléfono / WhatsApp</label>
              <input
                required
                name="telefono"
                type="tel"
                placeholder="Tu número de contacto"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>Correo electrónico</label>
              <input
                required
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                style={{ ...inputStyle, marginTop: "8px" }}
              />
            </div>

            <div>
              <label>¿Qué te gustaría automatizar o mejorar?</label>
              <textarea
                required
                name="mensaje"
                rows={6}
                placeholder="Explícanos brevemente qué necesitas..."
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                  resize: "vertical",
                  fontFamily: "Arial, sans-serif",
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
                boxShadow: "0 0 25px rgba(45, 151, 255, 0.35)",
              }}
            >
              Solicitar evaluación gratuita
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
            borderTop: "1px solid rgba(255,255,255,0.08)",
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