"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = {
  role: "brain" | "user";
  text: string;
};

const suggestions = [
  "Quiero automatizar mensajes de clientes",
  "Necesito una página web profesional",
  "Quiero organizar órdenes y solicitudes",
  "Quiero usar IA en mi negocio",
];

export default function BrainPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "brain",
      text: "Bienvenido a AxiomOS Brain. Describe qué proceso de tu negocio quieres automatizar y te mostraré una idea inicial.",
    },
  ]);

  const [input, setInput] = useState("");
  const [lastAction, setLastAction] = useState("Brain listo para analizar.");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function createDemoResponse(value: string) {
    const lowerValue = value.toLowerCase();

    if (lowerValue.includes("whatsapp") || lowerValue.includes("mensaje")) {
      return "Análisis demo: podemos crear un flujo para recibir mensajes de clientes, clasificar la solicitud, responder preguntas frecuentes y enviar los casos importantes a una persona. Primer paso recomendado: definir las preguntas frecuentes, horarios, servicios y tipo de cliente.";
    }

    if (lowerValue.includes("web") || lowerValue.includes("página")) {
      return "Análisis demo: podemos preparar una página profesional enfocada en confianza, servicios, evaluación gratuita y contacto directo. Primer paso recomendado: definir el servicio principal, público ideal y llamada a la acción.";
    }

    if (
      lowerValue.includes("orden") ||
      lowerValue.includes("solicitud") ||
      lowerValue.includes("cliente")
    ) {
      return "Análisis demo: podemos organizar órdenes, solicitudes y clientes en un sistema central para ver estado, prioridad, fecha, responsable y seguimiento. Primer paso recomendado: listar las etapas del proceso actual.";
    }

    if (lowerValue.includes("ia") || lowerValue.includes("inteligencia")) {
      return "Análisis demo: podemos usar IA para resumir mensajes, contestar preguntas, crear propuestas, clasificar solicitudes y ayudar con decisiones repetitivas. Primer paso recomendado: identificar qué información usa tu negocio todos los días.";
    }

    return "Análisis demo: AxiomOS Brain detecta una oportunidad para simplificar procesos, reducir trabajo manual y organizar mejor la operación. Primer paso recomendado: describir qué tarea se repite, qué información entra y qué resultado quieres obtener.";
  }

  function sendMessage(text?: string) {
    const value = (text ?? input).trim();

    if (!value) {
      setLastAction("Escribe una idea o toca una sugerencia para analizar.");
      return;
    }

    const userMessage: Message = {
      role: "user",
      text: value,
    };

    const brainMessage: Message = {
      role: "brain",
      text: createDemoResponse(value),
    };

    setMessages((current) => [...current, userMessage, brainMessage]);
    setInput("");
    setLastAction("Brain generó una recomendación demo.");
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <Link href="/" style={backLinkStyle}>
          ← Volver
        </Link>

        <div style={brandStyle}>AxiomOS Brain</div>

        <div style={statusStyle}>
          <span style={statusDotStyle} />
          Brain Online
        </div>
      </header>

      <section style={heroStyle}>
        <div style={glowStyle} />

        <div style={panelStyle}>
          <div style={topBarStyle}>
            <div>
              <p style={eyebrowStyle}>AXIOMAI CONTROL CENTER</p>
              <h1 style={titleStyle}>AxiomOS Brain</h1>
            </div>

            <div style={demoBadgeStyle}>DEMO MODE</div>
          </div>

          <p style={subtitleStyle}>
            Centro inteligente para explorar automatizaciones, asistentes de IA,
            procesos internos y soluciones digitales para empresas.
          </p>

          <div style={dashboardGridStyle}>
            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>Estado</span>
              <strong>Operativo</strong>
            </div>

            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>Modo</span>
              <strong>Demo seguro</strong>
            </div>

            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>Objetivo</span>
              <strong>Diagnóstico inicial</strong>
            </div>
          </div>

          <div style={chatShellStyle}>
            <div style={chatHeaderStyle}>
              <div>
                <strong>AxiomOS Brain Console</strong>
                <p style={smallTextStyle}>
                  Describe una tarea, problema o proceso de tu negocio.
                </p>
              </div>

              <span style={livePillStyle}>LIVE PREVIEW</span>
            </div>

            <div style={messagesStyle}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  style={
                    message.role === "user"
                      ? userMessageStyle
                      : brainMessageStyle
                  }
                >
                  <span style={messageRoleStyle}>
                    {message.role === "user" ? "Tú" : "Brain"}
                  </span>
                  <p style={messageTextStyle}>{message.text}</p>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            <div style={lastActionStyle}>{lastAction}</div>

            <div style={suggestionsStyle}>
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => sendMessage(item)}
                  style={suggestionButtonStyle}
                >
                  {item}
                </button>
              ))}
            </div>

            <form
              style={inputFormStyle}
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <textarea
                value={input}
                autoFocus
                tabIndex={0}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Escribe aquí. Ejemplo: quiero automatizar los mensajes de clientes..."
                style={textareaStyle}
              />

              <button type="submit" style={sendButtonStyle}>
                Enviar
              </button>
            </form>
          </div>
        </div>

        <div style={noteStyle}>
          <strong>Nota:</strong> esta versión es una demostración visual. La
          conexión real con IA se activará cuando configuremos la API y el saldo
          correctamente.
        </div>
      </section>
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
  zIndex: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "18px 6%",
  background: "rgba(2, 6, 23, 0.9)",
  backdropFilter: "blur(16px)",
  borderBottom: "1px solid rgba(125, 211, 252, 0.18)",
};

const backLinkStyle: CSSProperties = {
  color: "#bae6fd",
  textDecoration: "none",
  fontWeight: 900,
};

const brandStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: 950,
  letterSpacing: "-0.5px",
};

const statusStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#bbf7d0",
  fontSize: "13px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "2px",
};

const statusDotStyle: CSSProperties = {
  width: "11px",
  height: "11px",
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 16px #22c55e",
};

const heroStyle: CSSProperties = {
  position: "relative",
  minHeight: "calc(100vh - 72px)",
  padding: "70px 6% 90px",
};

const glowStyle: CSSProperties = {
  position: "absolute",
  top: "80px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "680px",
  height: "680px",
  borderRadius: "50%",
  background:
    "radial-gradient(circle, rgba(56,189,248,0.24), rgba(37,99,235,0.12), transparent 68%)",
  filter: "blur(10px)",
};

const panelStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: "1120px",
  margin: "0 auto",
  padding: "38px",
  borderRadius: "36px",
  background:
    "linear-gradient(145deg, rgba(15,23,42,0.94), rgba(30,64,175,0.26))",
  border: "1px solid rgba(125, 211, 252, 0.32)",
  boxShadow:
    "0 34px 100px rgba(2, 6, 23, 0.55), 0 0 70px rgba(56,189,248,0.18)",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "24px",
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  color: "#38bdf8",
  letterSpacing: "6px",
  fontSize: "13px",
  fontWeight: 900,
  margin: "0 0 12px",
};

const titleStyle: CSSProperties = {
  fontSize: "64px",
  lineHeight: 1,
  margin: 0,
  letterSpacing: "-2px",
  textShadow: "0 0 40px rgba(56, 189, 248, 0.34)",
};

const demoBadgeStyle: CSSProperties = {
  padding: "12px 18px",
  borderRadius: "999px",
  background: "rgba(2, 6, 23, 0.55)",
  border: "1px solid rgba(125, 211, 252, 0.28)",
  color: "#bae6fd",
  fontSize: "12px",
  fontWeight: 950,
  letterSpacing: "3px",
};

const subtitleStyle: CSSProperties = {
  maxWidth: "780px",
  color: "#c7ddff",
  fontSize: "18px",
  lineHeight: 1.75,
  margin: "22px 0 32px",
};

const dashboardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "18px",
  marginBottom: "28px",
};

const metricCardStyle: CSSProperties = {
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(2, 6, 23, 0.5)",
  border: "1px solid rgba(125, 211, 252, 0.2)",
};

const metricLabelStyle: CSSProperties = {
  display: "block",
  color: "#38bdf8",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "3px",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const chatShellStyle: CSSProperties = {
  borderRadius: "30px",
  background: "rgba(2, 6, 23, 0.58)",
  border: "1px solid rgba(125, 211, 252, 0.24)",
  overflow: "hidden",
};

const chatHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "22px 24px",
  borderBottom: "1px solid rgba(125, 211, 252, 0.16)",
  background: "rgba(15, 23, 42, 0.58)",
};

const smallTextStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#93c5fd",
  fontSize: "14px",
};

const livePillStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "999px",
  color: "#bbf7d0",
  background: "rgba(34, 197, 94, 0.12)",
  border: "1px solid rgba(34, 197, 94, 0.28)",
  fontSize: "12px",
  fontWeight: 900,
};

const messagesStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
  padding: "24px",
  minHeight: "280px",
  maxHeight: "420px",
  overflowY: "auto",
};

const brainMessageStyle: CSSProperties = {
  maxWidth: "780px",
  padding: "18px",
  borderRadius: "22px",
  background:
    "linear-gradient(145deg, rgba(30,64,175,0.38), rgba(14,116,144,0.18))",
  border: "1px solid rgba(125, 211, 252, 0.24)",
  color: "#dbeafe",
};

const userMessageStyle: CSSProperties = {
  justifySelf: "end",
  maxWidth: "720px",
  padding: "18px",
  borderRadius: "22px",
  background: "rgba(56, 189, 248, 0.14)",
  border: "1px solid rgba(125, 211, 252, 0.28)",
  color: "white",
};

const messageRoleStyle: CSSProperties = {
  display: "block",
  color: "#38bdf8",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "3px",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const messageTextStyle: CSSProperties = {
  margin: 0,
  lineHeight: 1.65,
};

const lastActionStyle: CSSProperties = {
  padding: "0 24px 18px",
  color: "#7dd3fc",
  fontSize: "14px",
  fontWeight: 800,
};

const suggestionsStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  padding: "0 24px 22px",
};

const suggestionButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.78)",
  border: "1px solid rgba(125, 211, 252, 0.22)",
  color: "#dbeafe",
  fontWeight: 800,
  cursor: "pointer",
};

const inputFormStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "12px",
  padding: "22px 24px 24px",
  borderTop: "1px solid rgba(125, 211, 252, 0.16)",
  background: "rgba(15, 23, 42, 0.45)",
  position: "relative",
  zIndex: 5,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "92px",
  padding: "18px",
  borderRadius: "22px",
  border: "2px solid rgba(56, 189, 248, 0.65)",
  background: "rgba(2, 6, 23, 0.82)",
  color: "white",
  outline: "none",
  fontSize: "16px",
  lineHeight: 1.5,
  resize: "vertical",
  fontFamily: "Arial, sans-serif",
  boxShadow: "0 0 24px rgba(56, 189, 248, 0.2)",
  pointerEvents: "auto",
};

const sendButtonStyle: CSSProperties = {
  alignSelf: "stretch",
  padding: "16px 24px",
  borderRadius: "22px",
  border: "none",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  color: "white",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 0 28px rgba(56, 189, 248, 0.38)",
};

const noteStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  maxWidth: "900px",
  margin: "26px auto 0",
  padding: "18px 22px",
  borderRadius: "22px",
  background: "rgba(2, 6, 23, 0.52)",
  border: "1px solid rgba(125, 211, 252, 0.18)",
  color: "#c7ddff",
  textAlign: "center",
  lineHeight: 1.6,
};