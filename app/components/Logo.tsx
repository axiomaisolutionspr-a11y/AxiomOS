import type { CSSProperties } from "react";

export default function Logo() {
  return (
    <div style={logoFrameStyle}>
      <img src="/logo.png" alt="AxiomAI Solutions logo" style={logoImageStyle} />
    </div>
  );
}

const logoFrameStyle: CSSProperties = {
  width: "min(360px, 78vw)",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  filter:
    "drop-shadow(0 0 28px rgba(56, 189, 248, 0.65)) drop-shadow(0 0 70px rgba(37, 99, 235, 0.35))",
};

const logoImageStyle: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  objectFit: "contain",
}