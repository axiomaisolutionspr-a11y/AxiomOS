import Link from "next/link";

export default function GraciasPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
        background:
          "radial-gradient(circle at 50% 18%, rgba(18, 115, 255, 0.26), transparent 34%), linear-gradient(180deg, #07111f 0%, #03070d 100%)",
        color: "#ffffff",
      }}
    >
      <style>{`
        .gracias-home-button {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 210px !important;
          min-height: 54px !important;
          padding: 0 26px !important;
          border-radius: 15px !important;
          border: 1px solid rgba(120, 225, 255, 0.72) !important;
          background: linear-gradient(135deg, #0a6cff 0%, #16bfff 58%, #32e0ff 100%) !important;
          background-color: #0a6cff !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          text-decoration: none !important;
          font-size: 15px !important;
          font-weight: 900 !important;
          letter-spacing: 0.2px !important;
          opacity: 1 !important;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35) !important;
          box-shadow:
            0 14px 30px rgba(7, 92, 255, 0.34),
            0 0 30px rgba(28, 206, 255, 0.2),
            inset 0 1px 0 rgba(255,255,255,0.28) !important;
          transition:
            transform 180ms ease,
            box-shadow 180ms ease,
            filter 180ms ease !important;
        }

        .gracias-home-button:hover {
          transform: translateY(-3px) scale(1.025);
          filter: brightness(1.06);
          box-shadow:
            0 16px 34px rgba(18, 126, 255, 0.34),
            0 0 36px rgba(45, 205, 255, 0.22),
            inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .gracias-home-button:active {
          transform: translateY(0) scale(0.985);
        }

        .success-badge {
          position: relative;
          width: 68px;
          height: 68px;
          margin: 0 auto 22px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          isolation: isolate;
          background:
            radial-gradient(circle at 34% 25%, rgba(255,255,255,0.95) 0 7%, rgba(118,232,255,0.8) 8% 14%, transparent 15%),
            linear-gradient(145deg, #36d9ff 0%, #137cff 48%, #0750ba 100%);
          border: 1px solid rgba(198, 247, 255, 0.9);
          color: white;
          font-size: 31px;
          font-weight: 1000;
          text-shadow:
            0 2px 2px rgba(0,0,0,0.28),
            0 0 12px rgba(255,255,255,0.55);
          box-shadow:
            0 11px 0 rgba(0, 40, 112, 0.52),
            0 16px 28px rgba(0, 72, 210, 0.42),
            0 0 34px rgba(58, 219, 255, 0.48),
            inset 0 2px 2px rgba(255,255,255,0.7),
            inset 0 -5px 9px rgba(0,50,145,0.48);
          animation:
            successPop 720ms cubic-bezier(.2,.95,.25,1.2) both,
            successFloat 3.2s ease-in-out 900ms infinite;
          transform-style: preserve-3d;
        }

        .success-badge::before {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: inherit;
          border: 1px solid rgba(78, 221, 255, 0.58);
          box-shadow:
            0 0 18px rgba(46, 210, 255, 0.45),
            inset 0 0 14px rgba(60, 218, 255, 0.2);
          animation: successRing 2.7s ease-in-out 900ms infinite;
          z-index: -1;
        }

        .success-badge::after {
          content: "";
          position: absolute;
          top: 8px;
          left: 12px;
          width: 35px;
          height: 13px;
          border-radius: 999px;
          background: linear-gradient(
            100deg,
            rgba(255,255,255,0),
            rgba(255,255,255,0.62),
            rgba(255,255,255,0)
          );
          transform: rotate(-18deg);
          filter: blur(0.4px);
          animation: successShine 3.1s ease-in-out 1.15s infinite;
          pointer-events: none;
        }

        @keyframes successPop {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.62) rotateX(18deg);
          }
          58% {
            opacity: 1;
            transform: translateY(-4px) scale(1.1) rotateX(0deg);
          }
          78% {
            transform: translateY(2px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes successFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow:
              0 11px 0 rgba(0, 40, 112, 0.52),
              0 16px 28px rgba(0, 72, 210, 0.42),
              0 0 34px rgba(58, 219, 255, 0.48),
              inset 0 2px 2px rgba(255,255,255,0.7),
              inset 0 -5px 9px rgba(0,50,145,0.48);
          }
          50% {
            transform: translateY(-5px) scale(1.025);
            box-shadow:
              0 14px 0 rgba(0, 40, 112, 0.44),
              0 22px 34px rgba(0, 72, 210, 0.48),
              0 0 44px rgba(58, 219, 255, 0.62),
              inset 0 2px 2px rgba(255,255,255,0.76),
              inset 0 -5px 9px rgba(0,50,145,0.45);
          }
        }

        @keyframes successRing {
          0%, 100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }

        @keyframes successShine {
          0%, 55%, 100% {
            opacity: 0.15;
            transform: translateX(-5px) rotate(-18deg);
          }
          68% {
            opacity: 0.95;
            transform: translateX(12px) rotate(-18deg);
          }
          82% {
            opacity: 0.15;
            transform: translateX(28px) rotate(-18deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gracias-home-button {
            transition: none;
          }

          .success-badge,
          .success-badge::before,
          .success-badge::after {
            animation: none !important;
          }
        }
      `}</style>

      <section
        style={{
          width: "100%",
          maxWidth: "650px",
          padding: "clamp(34px, 6vw, 54px)",
          borderRadius: "28px",
          border: "1px solid rgba(80, 200, 255, 0.42)",
          background:
            "linear-gradient(145deg, rgba(12, 60, 122, 0.92), rgba(4, 18, 39, 0.96))",
          boxShadow:
            "0 30px 90px rgba(0, 0, 0, 0.5), 0 0 50px rgba(26, 143, 255, 0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
          textAlign: "center",
        }}
      >
        <div aria-hidden="true" className="success-badge">
          ✓
        </div>

        <div
          style={{
            color: "#72dcff",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "3px",
            marginBottom: "14px",
          }}
        >
          AXIOMAI SOLUTIONS
        </div>

        <h1
          style={{
            margin: "0 0 22px",
            fontSize: "clamp(40px, 8vw, 58px)",
            lineHeight: 1.05,
            letterSpacing: "-1.5px",
          }}
        >
          Solicitud recibida
        </h1>

        <p
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            color: "#d9e8f5",
            fontSize: "17px",
            lineHeight: 1.7,
          }}
        >
          Gracias por comunicarte con AxiomAI Solutions. Hemos recibido tu
          información y revisaremos las necesidades de tu negocio para
          identificar posibles soluciones de automatización, inteligencia
          artificial y software.
        </p>

        <div
          style={{
            marginTop: "28px",
            padding: "15px 18px",
            borderRadius: "14px",
            border: "1px solid rgba(117, 210, 255, 0.25)",
            background: "rgba(4, 15, 32, 0.48)",
            color: "#c9e7f8",
            fontSize: "14px",
            fontWeight: 800,
          }}
        >
          Evaluación inicial gratuita • Servicio 24/7
        </div>

        <div style={{ marginTop: "28px" }}>
          <Link
            href="/"
            className="gracias-home-button"
            style={{
              background:
                "linear-gradient(135deg, #0a6cff 0%, #16bfff 58%, #32e0ff 100%)",
              color: "#ffffff",
              WebkitTextFillColor: "#ffffff",
              textDecoration: "none",
            }}
          >
            Volver al inicio →
          </Link>
        </div>

        <p
          style={{
            margin: "18px 0 0",
            color: "#7896ad",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Tu solicitud fue enviada correctamente.
        </p>
      </section>
    </main>
  );
}
