"use client";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
// Logo oficial de AxiomAI. Un mismo marcado sirve a los dos modos:
// - "3d" (futuro-3d.css): relieve de 7 capas sobre un proyector holográfico; al tocarlo sale de la
//   pantalla, gira, se abre el relieve y suelta una onda de energía.
// - "sobrio" (futuro.css): dentro de un marco de pantalla; al interactuar crece un poco y sobresale
//   del borde con sombra.
// El toque lo maneja futuro-fx.tsx. Con `href`, después del efecto lleva a esa pantalla (el CRM).
const LAYERS = 7;

export default function HoloLogo({ label = "AxiomAI Solutions", href }: { label?: string; href?: string }) {
  const router = useRouter();
  const open = () => {
    if (!href) return;
    const main = document.querySelector<HTMLElement>("main.fx");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const full = main?.getAttribute("data-fx-mode") === "3d" && !still;
    window.setTimeout(() => router.push(href), full ? 650 : still ? 0 : 180);
  };
  return <button type="button" className="fx-logo" aria-label={label} title={label} onClick={open}>
    <span className="fx-logo-shadow" aria-hidden="true" />
    <span className="fx-logo-stage" aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) =>
        <img key={i} src="/axiomos-logo-holo.webp" alt="" className="fx-logo-depth"
          style={{ "--fx-d": LAYERS - i } as CSSProperties} />)}
      <img src="/axiomos-logo-holo.webp" alt="" className="fx-logo-face" />
      <span className="fx-logo-shine" />
    </span>
    <span className="fx-logo-base" aria-hidden="true" />
  </button>;
}
