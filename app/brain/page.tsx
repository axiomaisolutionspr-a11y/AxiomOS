"use client";

import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import Link from "next/link";

type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

type BrainResponse = {
  result?: string;
  error?: string;
};

type BrainCase = {
  source: "AxiomOS Brain";
  query: string;
  analysis: string;
  createdAt: string;
};

const quickPrompts = [
  "¿Qué tareas de mi negocio puedo automatizar?",
  "Ayúdame a mejorar la atención a mis clientes.",
  "¿Cómo puedo usar IA para conseguir más prospectos?",
];

function cleanMarkdownEscapes(text: string) {
  return text
    .replace(/\\\./g, ".")
    .replace(/\\-/g, "-")
    .replace(/\\#/g, "#")
    .replace(/\\>/g, ">")
    .replace(/\\\*/g, "*");
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const cleaned = cleanMarkdownEscapes(text);

  return cleaned.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={`${part}-${index}`}
          style={{
            color: "#ffffff",
            fontWeight: 800,
          }}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function BrainText({ text }: { text: string }) {
  const cleanedText = cleanMarkdownEscapes(text);
  const lines = cleanedText.replace(/\r/g, "").split("\n");

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={`space-${index}`} style={{ height: "3px" }} />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={`h4-${index}`}
              style={{
                margin: "12px 0 2px",
                color: "#ffffff",
                fontSize: "17px",
                lineHeight: 1.4,
              }}
            >
              {renderInlineMarkdown(trimmed.slice(4))}
            </h4>
          );
        }

        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          const content = trimmed.startsWith("## ")
            ? trimmed.slice(3)
            : trimmed.slice(2);

          return (
            <div
              key={`section-${index}`}
              style={{
                marginTop: "18px",
                paddingTop: "18px",
                borderTop: "1px solid rgba(92, 198, 255, 0.15)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "20px",
                  lineHeight: 1.35,
                  fontWeight: 800,
                }}
              >
                {renderInlineMarkdown(content)}
              </h3>
            </div>
          );
        }

        if (trimmed.startsWith(">")) {
          const quote = trimmed.replace(/^>\s?/, "");

          return (
            <div
              key={`quote-${index}`}
              style={{
                margin: "3px 0",
                padding: "13px 16px",
                borderLeft: "3px solid #39c5ff",
                borderRadius: "0 12px 12px 0",
                background: "rgba(23, 99, 158, 0.18)",
                color: "#d7efff",
                lineHeight: 1.65,
              }}
            >
              {renderInlineMarkdown(quote)}
            </div>
          );
        }

        const bulletMatch = trimmed.match(/^[-*•]\s*(.*)$/);

        if (bulletMatch && bulletMatch[1]) {
          return (
            <div
              key={`bullet-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "20px minmax(0, 1fr)",
                gap: "5px",
                alignItems: "start",
                color: "#d8e4f2",
                lineHeight: 1.68,
                paddingLeft: "2px",
              }}
            >
              <span
                style={{
                  color: "#55c7ff",
                  fontWeight: 900,
                  fontSize: "18px",
                  lineHeight: 1.45,
                }}
              >
                •
              </span>

              <span>{renderInlineMarkdown(bulletMatch[1])}</span>
            </div>
          );
        }

        const numberedMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);

        if (numberedMatch) {
          const number = numberedMatch[1];
          const content = numberedMatch[2];

          if (!content) {
            return null;
          }

          return (
            <div
              key={`number-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "34px minmax(0, 1fr)",
                gap: "4px",
                alignItems: "start",
                color: "#d8e4f2",
                lineHeight: 1.68,
                margin: "2px 0",
              }}
            >
              <span
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#07111f",
                  background: "#62d5ff",
                  fontWeight: 900,
                  fontSize: "13px",
                  marginTop: "1px",
                }}
              >
                {number}
              </span>

              <span>{renderInlineMarkdown(content)}</span>
            </div>
          );
        }

        const labelMatch = trimmed.match(
          /^(Diagnóstico|Oportunidades de automatización|Solución recomendada|Prioridad|Complejidad|Impacto esperado|Próximos pasos|Cómo puede ayudar AxiomAI)$/i
        );

        if (labelMatch) {
          return (
            <div
              key={`label-${index}`}
              style={{
                marginTop: "18px",
                paddingTop: "18px",
                borderTop: "1px solid rgba(92, 198, 255, 0.15)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "20px",
                  fontWeight: 800,
                  lineHeight: 1.35,
                }}
              >
                {trimmed}
              </h3>
            </div>
          );
        }

        return (
          <p
            key={`p-${index}`}
            style={{
              margin: 0,
              color: "#d8e4f2",
              lineHeight: 1.72,
              fontSize: "15.5px",
            }}
          >
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function BrainPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const answerRef = useRef<HTMLDivElement | null>(null);

  async function askBrain(text?: string) {
    const finalMessage = (text ?? message).trim();

    if (!finalMessage || loading) {
      return;
    }

    const nextConversation: ConversationMessage[] = [
      ...conversation,
      {
        role: "user",
        text: finalMessage,
      },
    ];

    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/brain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextConversation,
        }),
      });

      const data = (await response.json()) as BrainResponse;

      if (!response.ok) {
        throw new Error(data.error || "No se pudo completar la consulta.");
      }

      const answer =
        data.result || "AxiomOS Brain no devolvió una respuesta.";

      setConversation([
        ...nextConversation,
        {
          role: "assistant",
          text: answer,
        },
      ]);

      setResult(answer);
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al conectar con AxiomOS Brain."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askBrain();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askBrain();
    }
  }

  function startAnotherQuestion() {
    setResult("");
    setError("");
    setMessage("");

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  function implementSolution() {
    const lastUserMessage = [...conversation]
      .reverse()
      .find((item) => item.role === "user");

    const brainCase: BrainCase = {
      source: "AxiomOS Brain",
      query:
        lastUserMessage?.text ||
        "El cliente desea implementar una solución analizada por AxiomOS Brain.",
      analysis: result,
      createdAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(
        "axiomai_brain_case",
        JSON.stringify(brainCase)
      );
    } catch (storageError) {
      console.error(
        "No se pudo guardar temporalmente el análisis de Brain:",
        storageError
      );
    }

    window.location.href = "/#evaluacion";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, #123b72 0%, #071326 32%, #02050a 72%, #000 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "28px 18px 60px",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "980px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
            marginBottom: "38px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#9ccfff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "15px",
            }}
          >
            ← Volver a AxiomAI
          </Link>

          <div
            style={{
              color: "#53b7ff",
              letterSpacing: "3px",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            AXIOMOS • BRAIN
          </div>
        </header>

        <section
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <button
            type="button"
            aria-label="Activar AxiomOS Brain"
            onClick={() => inputRef.current?.focus()}
            style={{
              width: "94px",
              height: "94px",
              margin: "0 auto 22px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontSize: "42px",
              background:
                "radial-gradient(circle at 35% 30%, #5ce8ff, #147de8 42%, #082e68 72%, #031229)",
              border: "1px solid rgba(117, 225, 255, 0.65)",
              boxShadow:
                "0 0 30px rgba(42, 170, 255, 0.52), inset 0 0 25px rgba(255,255,255,0.14)",
              cursor: "pointer",
              color: "white",
            }}
          >
            🧠
          </button>

          <p
            style={{
              color: "#55c7ff",
              fontWeight: 800,
              letterSpacing: "4px",
              fontSize: "13px",
              marginBottom: "10px",
            }}
          >
            INTELIGENCIA OPERATIVA
          </p>

          <h1
            style={{
              fontSize: "clamp(40px, 8vw, 72px)",
              margin: "0 0 12px",
              letterSpacing: "-2px",
            }}
          >
            AxiomOS Brain
          </h1>

          <p
            style={{
              color: "#b7c8dc",
              maxWidth: "700px",
              margin: "0 auto",
              lineHeight: 1.7,
              fontSize: "17px",
            }}
          >
            Describe un problema, una tarea o una meta de tu negocio. Brain
            analizará la situación, identificará oportunidades y propondrá próximos
            pasos prácticos.
          </p>
        </section>

        <section
          style={{
            border: "1px solid rgba(83, 183, 255, 0.32)",
            borderRadius: "26px",
            padding: "clamp(20px, 4vw, 34px)",
            background:
              "linear-gradient(145deg, rgba(9, 26, 51, 0.92), rgba(3, 10, 21, 0.94))",
            boxShadow: "0 28px 80px rgba(0, 0, 0, 0.42)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "22px",
            }}
          >
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setMessage(prompt);
                  void askBrain(prompt);
                }}
                disabled={loading}
                style={{
                  padding: "10px 13px",
                  borderRadius: "999px",
                  border: "1px solid rgba(83, 183, 255, 0.28)",
                  background: "rgba(12, 42, 76, 0.66)",
                  color: "#cdeeff",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="brain-message"
              style={{
                display: "block",
                fontWeight: 700,
                marginBottom: "10px",
                color: "#dcecff",
              }}
            >
              ¿En qué quieres que Brain te ayude?
            </label>

            <textarea
              ref={inputRef}
              id="brain-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
              maxLength={4000}
              disabled={loading}
              placeholder="Ejemplo: Tengo un negocio pequeño y pierdo mucho tiempo respondiendo las mismas preguntas por WhatsApp. ¿Qué puedo automatizar primero?"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "18px",
                borderRadius: "16px",
                border: "1px solid #285680",
                background: "rgba(2, 9, 19, 0.9)",
                color: "white",
                fontSize: "16px",
                lineHeight: 1.6,
                resize: "vertical",
                outline: "none",
                fontFamily: "Arial, sans-serif",
                opacity: loading ? 0.72 : 1,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                marginTop: "14px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "#7186a0", fontSize: "12px" }}>
                Enter para enviar • Shift + Enter para nueva línea
              </span>

              <button
                type="submit"
                disabled={loading || !message.trim()}
                style={{
                  padding: "14px 24px",
                  border: "none",
                  borderRadius: "13px",
                  background:
                    loading || !message.trim()
                      ? "#25445f"
                      : "linear-gradient(135deg, #1a79f2, #37d5ff)",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: 800,
                  cursor:
                    loading || !message.trim() ? "not-allowed" : "pointer",
                  boxShadow:
                    loading || !message.trim()
                      ? "none"
                      : "0 0 28px rgba(53, 189, 255, 0.32)",
                }}
              >
                {loading ? "Brain está analizando..." : "Consultar a Brain"}
              </button>
            </div>
          </form>

          {loading && (
            <div
              style={{
                marginTop: "22px",
                padding: "17px 18px",
                borderRadius: "14px",
                border: "1px solid rgba(83, 183, 255, 0.24)",
                background: "rgba(10, 38, 68, 0.48)",
                color: "#bfe7ff",
                fontWeight: 700,
              }}
            >
              🧠 Brain está analizando el negocio y preparando recomendaciones...
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "24px",
                padding: "18px",
                borderRadius: "15px",
                border: "1px solid rgba(255, 111, 111, 0.45)",
                background: "rgba(94, 18, 24, 0.35)",
                color: "#ffd2d2",
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}

          {result && !loading && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "26px",
                }}
              >
                <strong
                  style={{
                    color: "#9ee6ff",
                    fontSize: "14px",
                  }}
                >
                  ✓ Análisis completado
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    answerRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: "1px solid rgba(83,183,255,0.4)",
                    background: "rgba(26,121,242,0.22)",
                    color: "#d9f5ff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Ver análisis completo ↓
                </button>
              </div>

              <div
                ref={answerRef}
                id="brain-answer"
                style={{
                  marginTop: "14px",
                  padding: "clamp(20px, 4vw, 30px)",
                  borderRadius: "20px",
                  border: "1px solid rgba(82, 205, 255, 0.42)",
                  background:
                    "linear-gradient(145deg, rgba(3,15,29,0.96), rgba(4,22,40,0.92))",
                  textAlign: "left",
                  scrollMarginTop: "24px",
                  boxShadow:
                    "0 18px 55px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "18px",
                    paddingBottom: "16px",
                    borderBottom: "1px solid rgba(98,203,255,0.15)",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background:
                        "radial-gradient(circle at 35% 30%, #5ce8ff, #147de8 45%, #082e68)",
                      boxShadow: "0 0 18px rgba(42,170,255,0.35)",
                      fontSize: "18px",
                    }}
                  >
                    🧠
                  </div>

                  <div>
                    <div
                      style={{
                        color: "#62cbff",
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "2.5px",
                      }}
                    >
                      AXIOMOS BRAIN
                    </div>

                    <div
                      style={{
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: 800,
                        marginTop: "3px",
                      }}
                    >
                      Análisis de inteligencia operativa
                    </div>
                  </div>
                </div>

                <BrainText text={result} />

                <div
                  style={{
                    marginTop: "30px",
                    padding: "22px",
                    borderRadius: "18px",
                    border: "1px solid rgba(74, 197, 255, 0.28)",
                    background:
                      "linear-gradient(135deg, rgba(11,52,91,0.58), rgba(5,25,48,0.72))",
                  }}
                >
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: "18px",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    ¿Quieres convertir este análisis en una solución real?
                  </div>

                  <p
                    style={{
                      margin: "0 0 18px",
                      color: "#afc8dd",
                      lineHeight: 1.65,
                      fontSize: "14px",
                    }}
                  >
                    AxiomAI Solutions puede evaluar tu caso, definir la
                    automatización adecuada y ayudarte a llevarla a implementación.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={implementSolution}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "48px",
                        padding: "0 21px",
                        border: "none",
                        borderRadius: "13px",
                        background:
                          "linear-gradient(135deg, #147df5, #35d4ff)",
                        color: "#ffffff",
                        fontWeight: 900,
                        fontSize: "14px",
                        cursor: "pointer",
                        boxShadow: "0 0 28px rgba(53,189,255,0.3)",
                      }}
                    >
                      Quiero implementar esta solución →
                    </button>

                    <button
                      type="button"
                      onClick={startAnotherQuestion}
                      style={{
                        minHeight: "48px",
                        padding: "0 18px",
                        borderRadius: "13px",
                        border: "1px solid rgba(83,183,255,0.34)",
                        background: "rgba(12,42,76,0.72)",
                        color: "#d8f4ff",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Hacer otra pregunta
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: "13px",
                      color: "#7893aa",
                      fontSize: "12px",
                    }}
                  >
                    Evaluación inicial gratuita • Sin compromiso
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <p
          style={{
            textAlign: "center",
            color: "#61758e",
            fontSize: "12px",
            marginTop: "24px",
            lineHeight: 1.6,
          }}
        >
          AxiomOS Brain ofrece orientación inicial. Las decisiones importantes de
          negocio deben validarse con información específica de cada caso.
        </p>
      </div>
    </main>
  );
}