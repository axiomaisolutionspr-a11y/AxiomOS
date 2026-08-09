"use client";

import { useState } from "react";
import Link from "next/link";

export default function BrainPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function analizar() {
    if (!message.trim()) {
      setResult("Escribe primero qué necesita tu negocio.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/brain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult(data.error || "No se pudo completar el análisis.");
      } else {
        setResult(data.result || "Brain no recibió una respuesta.");
      }
    } catch {
      setResult("No se pudo conectar con Brain.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #123b8f 0%, #061632 45%, #020711 100%)",
        color: "white",
        padding: "35px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "145px",
            height: "145px",
            margin: "0 auto 25px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "radial-gradient(circle at 30% 30%, white 0%, #3bcfff 35%, #1d4ed8 75%, #102a68 100%)",
            boxShadow:
              "0 0 35px rgba(59,207,255,.8), 0 0 80px rgba(29,78,216,.6)",
            fontSize: "27px",
            fontWeight: "bold",
          }}
        >
          Brain
        </div>

        <p
          style={{
            letterSpacing: "6px",
            fontWeight: "bold",
            color: "#7dd3fc",
          }}
        >
          AXIOM AI
        </p>

        <h1
          style={{
            fontSize: "clamp(48px,8vw,78px)",
            margin: "10px 0",
          }}
        >
          AxiomOS
        </h1>

        <h2
          style={{
            fontSize: "28px",
            marginBottom: "15px",
          }}
        >
          Inteligencia para tu negocio
        </h2>

        <p
          style={{
            maxWidth: "680px",
            margin: "0 auto 30px",
            lineHeight: 1.7,
            color: "#cbd5e1",
          }}
        >
          Describe qué necesita tu empresa. Brain analizará oportunidades de
          automatización, inteligencia artificial y software para tu negocio.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ejemplo: Quiero automatizar las consultas de mis clientes por WhatsApp..."
          style={{
            width: "100%",
            minHeight: "150px",
            padding: "20px",
            borderRadius: "18px",
            border: "1px solid #38bdf8",
            background: "rgba(3,15,35,.85)",
            color: "white",
            fontSize: "17px",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={analizar}
          disabled={loading}
          style={{
            marginTop: "22px",
            padding: "16px 34px",
            borderRadius: "30px",
            border: "none",
            background: "#38bdf8",
            color: "#00152c",
            fontSize: "17px",
            fontWeight: "bold",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Brain está analizando..." : "Analizar con Brain"}
        </button>

        {result && (
          <div
            style={{
              marginTop: "25px",
              padding: "22px",
              borderRadius: "18px",
              border: "1px solid #38bdf8",
              background: "rgba(3,15,35,.85)",
              textAlign: "left",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {result}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginTop: "28px",
          }}
        >
          <Link
            href="/#evaluacion"
            style={{
              padding: "15px 28px",
              borderRadius: "30px",
              background: "#38bdf8",
              color: "#00152c",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Solicitar evaluación gratuita
          </Link>

          <Link
            href="/"
            style={{
              padding: "15px 28px",
              borderRadius: "30px",
              border: "1px solid #38bdf8",
              color: "white",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Volver al inicio
          </Link>
        </div>

        <p
          style={{
            marginTop: "35px",
            color: "#7dd3fc",
            fontSize: "14px",
          }}
        >
          AxiomAI Solutions · Servicio 24/7
        </p>
      </div>
    </main>
  );
}