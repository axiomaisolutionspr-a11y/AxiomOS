"use client";

import {
  FormEvent,
  useState,
} from "react";

export default function AccesoProspectosPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function iniciarSesion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setEnviando(true);

    try {
      const response = await fetch(
        "/api/crm-auth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pin }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.ok) {
        setError(
          result?.error ||
            "No se pudo verificar el acceso."
        );
        return;
      }

      window.location.assign("/prospectos");
    } catch {
      setError(
        "No se pudo conectar con AxiomOS. Intenta nuevamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="access-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .access-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(
              circle at top,
              #0b2c55 0%,
              #061427 40%,
              #02050a 100%
            );
          color: #ffffff;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .access-card {
          width: min(430px, 100%);
          padding: 34px;
          border: 1px solid #18578a;
          border-radius: 24px;
          background:
            linear-gradient(
              180deg,
              rgba(10, 35, 66, 0.97),
              rgba(4, 14, 27, 0.98)
            );
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.48),
            0 0 40px rgba(26, 176, 255, 0.1);
        }

        .brand {
          margin: 0 0 10px;
          color: #56d6ff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2.4px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.08;
        }

        .description {
          margin: 14px 0 26px;
          color: #a9bdd2;
          font-size: 15px;
          line-height: 1.6;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: #dcecff;
          font-size: 13px;
          font-weight: 800;
        }

        input {
          width: 100%;
          padding: 14px 15px;
          border: 1px solid #286693;
          border-radius: 11px;
          background: #061323;
          color: #ffffff;
          font-size: 18px;
          letter-spacing: 3px;
          outline: none;
        }

        input:focus {
          border-color: #43cfff;
          box-shadow:
            0 0 0 3px rgba(67, 207, 255, 0.12);
        }

        button {
          width: 100%;
          margin-top: 16px;
          padding: 14px 18px;
          border: 0;
          border-radius: 11px;
          background:
            linear-gradient(
              90deg,
              #158cff,
              #32d4ed
            );
          color: #03101d;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .error {
          margin: 14px 0 0;
          padding: 11px 12px;
          border: 1px solid #b74b5a;
          border-radius: 10px;
          background: #32141b;
          color: #ffb2bc;
          font-size: 13px;
          line-height: 1.4;
        }

        .security {
          margin: 20px 0 0;
          color: #7188a0;
          font-size: 12px;
          line-height: 1.5;
          text-align: center;
        }
      `}</style>

      <section className="access-card">
        <p className="brand">
          AXIOMAI SOLUTIONS
        </p>

        <h1>Acceso privado a AxiomOS</h1>

        <p className="description">
          Ingresa el PIN administrativo para abrir
          el CRM de prospectos.
        </p>

        <form onSubmit={iniciarSesion}>
          <label htmlFor="pin">
            PIN administrativo
          </label>

          <input
            id="pin"
            name="pin"
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(event) =>
              setPin(event.target.value)
            }
            required
            autoFocus
          />

          <button
            type="submit"
            disabled={enviando}
          >
            {enviando
              ? "Verificando..."
              : "Entrar a AxiomOS"}
          </button>
        </form>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        <p className="security">
          Sesión privada y protegida durante 12 horas.
        </p>
      </section>
    </main>
  );
}