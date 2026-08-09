import type { CSSProperties } from "react";
import Link from "next/link";

export default function BrainButton() {
  return (
    <Link href="/brain" style={buttonStyle}>
      <span style={shineStyle} />
      <span style={innerGlowStyle} />
      <span style={textStyle}>Brain</span>
    </Link>
  );
}

const buttonStyle: CSSProperties = {
  position: "relative",
  width: "170px",
  height: "170px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 32% 24%, #ffffff 0%, #dffbff 12%, #67e8f9 28%, #0ea5e9 58%, #1d4ed8 100%)",
  boxShadow:
    "0 0 38px rgba(56, 189, 248, 0.76), 0 0 90px rgba(37, 99, 235, 0.42), inset 0 0 24px rgba(255,255,255,0.42)",
  border: "1px solid rgba(186, 230, 253, 0.75)",
  cursor: "pointer",
  transition: "transform 220ms ease, box-shadow 220ms ease",
};

const shineStyle: CSSProperties = {
  position: "absolute",
  top: "18px",
  left: "32px",
  width: "70px",
  height: "42px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.58)",
  filter: "blur(10px)",
  transform: "rotate(-28deg)",
};

const innerGlowStyle: CSSProperties = {
  position: "absolute",
  inset: "18px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.24)",
  boxShadow: "inset 0 0 28px rgba(255,255,255,0.25)",
};

const textStyle: CSSProperties = {
  position: "relative",
  zIndex: 2,
  color: "white",
  fontSize: "25px",
  fontWeight: 950,
  letterSpacing: "-0.5px",
  textShadow: "0 0 18px rgba(255,255,255,0.72)",
};