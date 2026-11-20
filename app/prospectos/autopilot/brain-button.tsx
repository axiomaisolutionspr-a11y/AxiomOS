"use client";
// Botón de Brain arriba a la derecha de cada pantalla de Autopilot: el cerebro de Brain con los
// mismos efectos del logo (relieve 3D que sale de la pantalla en modo 3D; marco en modo sobrio).
// El efecto lo dispara futuro-fx.tsx (.fx-logo); aquí solo se espera un instante para que se vea
// antes de abrir Brain.
import { useRouter } from "next/navigation";
import { useEffect, type CSSProperties } from "react";

const HREF = "/prospectos/autopilot/brain";
const LAYERS = 6;
const IMG = "/axiomos-brain-3d.webp";

export default function BrainButton({ label, current = false }: { label: string; current?: boolean }) {
  const router = useRouter();
  useEffect(() => { if (!current) router.prefetch(HREF); }, [current, router]);

  const open = () => {
    if (current) return;
    const main = document.querySelector<HTMLElement>("main.fx");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const full = main?.getAttribute("data-fx-mode") === "3d" && !still;
    window.setTimeout(() => router.push(HREF), full ? 650 : still ? 0 : 180);
  };

  return <button type="button" onClick={open} aria-label={label} title={label} aria-current={current ? "page" : undefined}
    className="fx-logo fx-brain">
    <span className="fx-logo-shadow" aria-hidden="true" />
    <span className="fx-logo-stage" aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) =>
        <img key={i} src={IMG} alt="" className="fx-logo-depth" style={{ "--fx-d": LAYERS - i } as CSSProperties} />)}
      <img src={IMG} alt="" className="fx-logo-face" />
      <span className="fx-logo-shine" />
    </span>
    <span className="fx-logo-base" aria-hidden="true" />
  </button>;
}
