import type { CSSProperties } from "react";
// Logo oficial de AxiomAI. Un mismo marcado sirve a los dos modos:
// - "3d" (futuro-3d.css): relieve de 7 capas sobre un proyector holográfico; al tocarlo sale de la
//   pantalla, gira, se abre el relieve y suelta una onda de energía.
// - "sobrio" (futuro.css): dentro de un marco de pantalla; al interactuar crece un poco y sobresale
//   del borde con sombra.
// El toque lo maneja futuro-fx.tsx.
const LAYERS = 7;

export default function HoloLogo({ label = "AxiomAI Solutions" }: { label?: string }) {
  return <button type="button" className="fx-logo" aria-label={label}>
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
