export default function BrainButton() {
  return (
    <a
      href="/brain"
      style={{
        width: "180px",
        height: "180px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        cursor: "pointer",
        background:
          "radial-gradient(circle at 30% 30%, #93c5fd 0%, #3b82f6 35%, #1d4ed8 70%, #1e3a8a 100%)",
        color: "white",
        fontSize: "28px",
        fontWeight: "bold",
        letterSpacing: "1px",
        boxShadow:
          "0 0 25px rgba(59,130,246,.55), 0 18px 45px rgba(0,0,0,.60), inset 0 6px 12px rgba(255,255,255,.35)",
      }}
    >
      Brain
    </a>
  );
}
