import type { CSSProperties } from "react";
// Logo oficial de AxiomAI dentro de un "marco de pantalla". En modo 3D, al tocarlo, pasar el
// puntero o enfocarlo con el teclado, crece un poco y sobresale del marco (efecto de pantalla 3D).
// En modo sobrio solo se ilumina el borde del marco. Estilos en futuro.css; el toque lo maneja futuro-fx.tsx.
const LAYERS = 4;

export default function HoloLogo({ label = "AxiomAI Solutions" }: { label?: string }) {
  return <button type="button" className="fx-logo" aria-label={label}>
    <span className="fx-logo-shadow" aria-hidden="true" />
    <span className="fx-logo-stage" aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) =>
        <img key={i} src="/axiomos-logo-holo.webp" alt="" className="fx-logo-depth"
          style={{ "--fx-d": LAYERS - i } as CSSProperties} />)}
      <img src="/axiomos-logo-holo.webp" alt="" className="fx-logo-face" />
    </span>
  </button>;
}
