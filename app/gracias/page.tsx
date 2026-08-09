export default function GraciasPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #102040 0%, #050914 45%, #000000 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          padding: "50px 30px",
          borderRadius: "24px",
          border: "1px solid rgba(83, 183, 255, 0.3)",
          background:
            "linear-gradient(135deg, rgba(16, 42, 78, 0.88), rgba(4, 11, 22, 0.95))",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <p
          style={{
            color: "#53b7ff",
            letterSpacing: "3px",
            fontWeight: 700,
            fontSize: "14px",
            marginBottom: "12px",
          }}
        >
          AXIOMAI SOLUTIONS
        </p>

        <h1
          style={{
            fontSize: "clamp(36px, 7vw, 58px)",
            margin: "0 0 18px",
          }}
        >
          Solicitud recibida
        </h1>

        <p
          style={{
            color: "#b9c6d8",
            fontSize: "18px",
            lineHeight: 1.7,
            maxWidth: "560px",
            margin: "0 auto 32px",
          }}
        >
          Gracias por comunicarte con AxiomAI Solutions. Hemos recibido tu
          información y revisaremos las necesidades de tu negocio para
          identificar posibles soluciones de automatización, inteligencia
          artificial y software.
        </p>

        <div
          style={{
            padding: "18px",
            borderRadius: "16px",
            background: "rgba(3, 12, 24, 0.75)",
            border: "1px solid rgba(83, 183, 255, 0.18)",
            color: "#8fd4ff",
            marginBottom: "32px",
          }}
        >
          Evaluación inicial gratuita • Servicio 24/7
        </div>

        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "15px 28px",
            borderRadius: "12px",
            textDecoration: "none",
            background:
              "linear-gradient(135deg, #1d7fff 0%, #42dfff 100%)",
            color: "white",
            fontWeight: 700,
            fontSize: "16px",
            boxShadow: "0 0 25px rgba(45, 151, 255, 0.35)",
            cursor: "pointer",
          }}
        >
          Volver al inicio
        </a>
      </div>
    </main>
  );
}